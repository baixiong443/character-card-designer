import {
  buildChunkEvidencePrompt,
  buildChunkEvidenceReviewPrompt,
  parseChunkEvidence,
  type ChunkEvidence,
  type EvidenceSectionKey,
  type SourceChunk,
} from './longTextImport.ts';
import {
  embedStorySourceChunks,
  type StoryEmbeddingProgress,
  type StoryEmbeddingSettings,
} from './storyEmbedding.ts';
import type {
  SourcePreparationMode,
  StoryEvidenceClaim,
  StorySourceCorpus,
  StorySourceLibraryRef,
  StorySourceTask,
} from './storySource.ts';
import {
  getStorySourceCorpus,
  listStorySourceTasks,
  putStorySourceEmbeddings,
  replaceStoryEvidenceClaimsForUnit,
  putStorySourceTask,
  updateStorySourceCompilation,
} from './storySourceDb.ts';

const CLAIM_CATEGORY: Record<EvidenceSectionKey, StoryEvidenceClaim['category']> = {
  overview: 'event',
  characters: 'identity',
  events: 'event',
  relationships: 'relationship',
  appearance: 'appearance',
  dialogue: 'dialogue',
  world: 'world',
  uncertainties: 'uncertainty',
};

const ANALYSIS_TASK_MAX_ATTEMPTS = 3;
const STALE_RUNNING_TASK_MS = 10 * 60 * 1000;

function evidenceClaims(
  corpus: StorySourceCorpus,
  unitId: string,
  evidence: ChunkEvidence,
  auditStatus: StoryEvidenceClaim['auditStatus'],
): StoryEvidenceClaim[] {
  const unit = corpus.analysisUnits.find(candidate => candidate.id === unitId);
  if (!unit) throw new Error(`找不到分析单元 ${unitId}`);
  const firstOrder = unit.retrievalChunkIds
    .map(id => corpus.retrievalChunks.find(chunk => chunk.id === id)?.chunkOrder)
    .find((order): order is number => order !== undefined) ?? 0;
  return (Object.entries(evidence.sections) as Array<[EvidenceSectionKey, string]>)
    .filter(([, statement]) => statement.trim())
    .map(([section, statement]) => ({
      schemaVersion: 1,
      id: `claim:${unit.id}:${section}`,
      statement: statement.trim(),
      category: CLAIM_CATEGORY[section],
      truthStatus: section === 'uncertainties' ? 'unknown' : 'reported',
      subjectIds: [],
      observerIds: [],
      sourceChunkIds: [...unit.retrievalChunkIds],
      validFromOrder: firstOrder,
      confidence: auditStatus === 'passed' ? 0.9 : 0.65,
      auditStatus,
    }));
}

function applyEvidence(
  corpus: StorySourceCorpus,
  unitId: string,
  evidence: ChunkEvidence,
  audited: boolean,
): StorySourceCorpus {
  const next = structuredClone(corpus);
  const claims = evidenceClaims(next, unitId, evidence, audited ? 'passed' : 'unreviewed');
  const prefix = `claim:${unitId}:`;
  next.claims = [...next.claims.filter(claim => !claim.id.startsWith(prefix)), ...claims];
  const record = next.compilation.find(candidate => candidate.sourceUnitId === unitId);
  if (!record) throw new Error(`找不到分析单元 ${unitId} 的编译记录`);
  record.level = Math.max(record.level, audited ? 3 : 2) as typeof record.level;
  record.skeletonStatus = 'completed';
  record.auditStatus = audited ? 'passed' : 'unreviewed';
  record.updatedAt = Date.now();
  record.error = undefined;
  return next;
}

export function mergeExtractedStoryEvidence(
  corpus: StorySourceCorpus,
  unitId: string,
  evidence: ChunkEvidence,
): StorySourceCorpus {
  return applyEvidence(corpus, unitId, evidence, false);
}

export function mergeReviewedStoryEvidence(
  corpus: StorySourceCorpus,
  unitId: string,
  evidence: ChunkEvidence,
): StorySourceCorpus {
  return applyEvidence(corpus, unitId, evidence, true);
}

export function chunkEvidenceFromCorpus(
  corpus: StorySourceCorpus,
  unitId: string,
): ChunkEvidence | null {
  const unit = corpus.analysisUnits.find(candidate => candidate.id === unitId);
  if (!unit) return null;
  const sections = Object.fromEntries((Object.keys(CLAIM_CATEGORY) as EvidenceSectionKey[]).map(section => [
    section,
    corpus.claims.find(claim => claim.id === `claim:${unitId}:${section}`)?.statement ?? '',
  ])) as Record<EvidenceSectionKey, string>;
  return Object.values(sections).some(Boolean)
    ? { chunkId: unit.id, title: unit.title, sections }
    : null;
}

export function mergeReviewedImportEvidence(
  corpus: StorySourceCorpus,
  evidence: readonly ChunkEvidence[],
): StorySourceCorpus {
  const next = structuredClone(corpus);
  evidence.forEach((item, index) => {
    const unit = next.analysisUnits.find(candidate => candidate.id === item.chunkId)
      ?? next.analysisUnits[index];
    if (!unit) return;
    const merged = applyEvidence(next, unit.id, item, true);
    next.claims = merged.claims;
    next.compilation = merged.compilation;
  });
  return next;
}

export function planStorySourceTasks(
  corpus: StorySourceCorpus,
  includeEmbeddings: boolean,
  now = Date.now(),
): StorySourceTask[] {
  const tasks: StorySourceTask[] = [];
  const add = (type: StorySourceTask['type'], targetId: string, priority: number) => tasks.push({
    schemaVersion: 1,
    id: `${type}:${targetId}`,
    corpusId: corpus.index.corpusId,
    type,
    targetId,
    status: 'pending',
    priority,
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  });
  if (includeEmbeddings) {
    corpus.retrievalChunks
      .filter(chunk => !corpus.embeddings.some(record => record.chunkId === chunk.id))
      .forEach((chunk, index) => add('embed_chunk', chunk.id, index < 8 ? 100 - index : 30));
  }
  corpus.analysisUnits.forEach((unit, index) => {
    const record = corpus.compilation.find(candidate => candidate.sourceUnitId === unit.id);
    if (!record || record.level < 2) add('extract_skeleton', unit.id, index < 2 ? 90 - index : 20);
    if (!record || record.level < 3) add('audit_skeleton', unit.id, index < 2 ? 80 - index : 15);
  });
  return tasks;
}

export async function seedStorySourceTasks(tasks: readonly StorySourceTask[]): Promise<void> {
  const existing = tasks.length > 0 ? await listStorySourceTasks(tasks[0]!.corpusId) : [];
  const existingById = new Map(existing.map(task => [task.id, task]));
  for (const task of tasks) {
    const current = existingById.get(task.id);
    if (current?.status === 'completed') continue;
    await putStorySourceTask(current ? {
      ...task,
      status: current.status,
      attempts: current.attempts,
      createdAt: current.createdAt,
      updatedAt: current.updatedAt,
      error: current.error,
    } : task);
  }
}

export interface StorySourceAnalysisAI {
  extract: (prompt: string, systemPrompt: string) => Promise<string>;
  audit: (prompt: string, systemPrompt: string) => Promise<string>;
}

export interface StorySourceAnalysisProgress {
  phase: 'extract' | 'audit';
  unitId: string;
  title: string;
  completed: number;
  total: number;
}

function sourceChunkForUnit(corpus: StorySourceCorpus, unitId: string): SourceChunk {
  const unit = corpus.analysisUnits.find(candidate => candidate.id === unitId);
  if (!unit) throw new Error(`找不到分析单元 ${unitId}`);
  const siblings = corpus.analysisUnits.filter(candidate => candidate.chapterId === unit.chapterId);
  return {
    id: unit.id,
    title: unit.title,
    text: unit.text,
    chapterIndex: unit.chapterOrder,
    partIndex: siblings.findIndex(candidate => candidate.id === unit.id),
    partCount: siblings.length,
  };
}

async function generateParsedEvidence(
  chunk: SourceChunk,
  kind: 'extract' | 'audit',
  ai: StorySourceAnalysisAI,
  draft?: ChunkEvidence,
): Promise<ChunkEvidence> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const compact = attempt > 0;
      const prompt = kind === 'extract'
        ? buildChunkEvidencePrompt(chunk, compact)
        : buildChunkEvidenceReviewPrompt(chunk, draft!, compact);
      const response = kind === 'extract'
        ? await ai.extract(prompt, '你是长篇小说摄入工程中的证据提取器。严格区分原文事实、推断与未知信息。')
        : await ai.audit(prompt, '你是独立的原作证据复核员。重新核对原文，修复遗漏、臆测、事实强化和时间线错误。');
      const parsed = parseChunkEvidence(response, chunk);
      if (parsed) return parsed;
      lastError = new Error(`分析单元 ${chunk.id} 的${kind === 'extract' ? '提取' : '审计'}标记不完整`);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`分析单元 ${chunk.id} 处理失败`);
}

function abortIfRequested(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('任务已暂停', 'AbortError');
}

export async function runPendingStoryAnalysis(
  corpusId: string,
  ai: StorySourceAnalysisAI,
  onProgress?: (progress: StorySourceAnalysisProgress) => void,
  signal?: AbortSignal,
): Promise<void> {
  const now = Date.now();
  const allTasks = await listStorySourceTasks(corpusId);
  for (const legacy of allTasks.filter(task => (
    task.type === 'compile_window' || task.type === 'audit_window'
  ) && task.status !== 'completed' && task.status !== 'stale')) {
    await putStorySourceTask({
      ...legacy,
      status: 'stale',
      updatedAt: now,
      error: 'L4 可执行事件改由 PTE 按当前分支在运行时懒编译。',
    });
  }
  const tasks = (await listStorySourceTasks(corpusId)).filter(task => (
    task.type === 'extract_skeleton' || task.type === 'audit_skeleton'
  ) && (
    task.status === 'pending'
    || task.status === 'failed'
    || (task.status === 'running' && now - task.updatedAt >= STALE_RUNNING_TASK_MS)
  ));
  let completed = 0;
  for (const task of tasks) {
    abortIfRequested(signal);
    if (task.attempts >= ANALYSIS_TASK_MAX_ATTEMPTS) {
      await putStorySourceTask({
        ...task,
        status: 'failed',
        updatedAt: Date.now(),
        error: `已达到连续处理上限（${task.attempts}/${ANALYSIS_TASK_MAX_ATTEMPTS}），请检查模型或提示词。`,
      });
      continue;
    }
    const running = {
      ...task,
      status: 'running' as const,
      attempts: task.attempts + 1,
      updatedAt: Date.now(),
      error: undefined,
    };
    await putStorySourceTask(running);
    try {
      let corpus = await getStorySourceCorpus(corpusId);
      if (!corpus) throw new Error('找不到需要继续处理的原文库');
      const chunk = sourceChunkForUnit(corpus, task.targetId);
      const phase = task.type === 'extract_skeleton' ? 'extract' : 'audit';
      onProgress?.({ phase, unitId: task.targetId, title: chunk.title, completed, total: tasks.length });
      const draft = phase === 'audit' ? chunkEvidenceFromCorpus(corpus, task.targetId) : undefined;
      if (phase === 'audit' && !draft) throw new Error(`分析单元 ${task.targetId} 缺少可审计的 L2 草稿`);
      const evidence = await generateParsedEvidence(chunk, phase, ai, draft ?? undefined);
      corpus = phase === 'extract'
        ? mergeExtractedStoryEvidence(corpus, task.targetId, evidence)
        : mergeReviewedStoryEvidence(corpus, task.targetId, evidence);
      const record = corpus.compilation.find(candidate => candidate.sourceUnitId === task.targetId)!;
      const claims = corpus.claims.filter(claim => claim.id.startsWith(`claim:${task.targetId}:`));
      await replaceStoryEvidenceClaimsForUnit(corpusId, task.targetId, claims);
      await updateStorySourceCompilation(corpusId, record);
      await putStorySourceTask({ ...running, status: 'completed', updatedAt: Date.now() });
      completed += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await putStorySourceTask({ ...running, status: 'failed', updatedAt: Date.now(), error: message });
      throw error;
    }
  }
}

async function updateEmbeddingTasks(
  tasks: readonly StorySourceTask[],
  status: StorySourceTask['status'],
  error?: string,
): Promise<void> {
  const now = Date.now();
  for (const task of tasks) {
    await putStorySourceTask({
      ...task,
      status,
      attempts: status === 'running' ? task.attempts + 1 : task.attempts,
      updatedAt: now,
      error,
    });
  }
}

export async function runPendingStoryEmbeddings(
  corpusId: string,
  settings: StoryEmbeddingSettings,
  onProgress?: (progress: StoryEmbeddingProgress) => void,
  signal?: AbortSignal,
): Promise<void> {
  const corpus = await getStorySourceCorpus(corpusId);
  if (!corpus) throw new Error('找不到需要向量化的原文库');
  const tasks = (await listStorySourceTasks(corpusId))
    .filter(task => task.type === 'embed_chunk' && (task.status === 'pending' || task.status === 'failed'));
  if (tasks.length === 0) return;
  const taskByChunk = new Map(tasks.map(task => [task.targetId, task]));
  const chunks = corpus.retrievalChunks.filter(chunk => taskByChunk.has(chunk.id));
  await updateEmbeddingTasks(tasks, 'running');
  try {
    const run = await embedStorySourceChunks(chunks, settings, { onProgress, signal });
    await putStorySourceEmbeddings(corpusId, run.config, run.records);
    await updateEmbeddingTasks(tasks, 'completed');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const paused = signal?.aborted || (error instanceof DOMException && error.name === 'AbortError');
    await updateEmbeddingTasks(tasks, paused ? 'pending' : 'failed', paused ? undefined : message);
    throw error;
  }
}

export function sourceLibraryRef(corpus: StorySourceCorpus): StorySourceLibraryRef {
  return {
    schemaVersion: 1,
    corpusId: corpus.index.corpusId,
    sourceFingerprint: corpus.index.sourceFingerprint,
    preparationMode: corpus.index.preparationMode,
  };
}

export function initialEvidenceChunkCount(mode: SourcePreparationMode, total: number): number {
  if (mode === 'complete') return total;
  return Math.min(total, mode === 'balanced' ? 6 : 2);
}
