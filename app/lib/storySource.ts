export const STORY_SOURCE_SCHEMA_VERSION = 1 as const;
export const RETRIEVAL_CHUNK_TARGET = 1_200;
export const RETRIEVAL_CHUNK_MAX = 1_600;
export const RETRIEVAL_CHUNK_OVERLAP = 160;
export const ANALYSIS_UNIT_TARGET = 11_000;
export const ANALYSIS_UNIT_MAX = 15_000;

export type SourcePreparationMode = 'quick' | 'balanced' | 'complete';
export type SourceCompilationLevel = 0 | 1 | 2 | 3 | 4;
export type SourceTaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'stale';
export type SourceAuditStatus = 'unreviewed' | 'passed' | 'warning' | 'failed';

export interface StorySourceChapter {
  id: string;
  order: number;
  title: string;
  startOffset: number;
  endOffset: number;
  firstRetrievalOrder: number;
  lastRetrievalOrder: number;
  firstAnalysisOrder: number;
  lastAnalysisOrder: number;
}

export interface StorySourceRetrievalChunk {
  schemaVersion: 1;
  id: string;
  chapterId: string;
  chapterOrder: number;
  chunkOrder: number;
  title: string;
  startOffset: number;
  endOffset: number;
  text: string;
  contentHash: string;
  previousChunkId?: string;
  nextChunkId?: string;
  keywordTokens: string[];
}

export interface StorySourceAnalysisUnit {
  schemaVersion: 1;
  id: string;
  chapterId: string;
  chapterOrder: number;
  unitOrder: number;
  title: string;
  startOffset: number;
  endOffset: number;
  text: string;
  retrievalChunkIds: string[];
}

export interface StorySourceEmbeddingConfig {
  provider: 'openai-compatible' | 'ollama' | 'browser-local' | 'custom';
  model: string;
  dimensions: number;
  normalized: boolean;
  distance: 'cosine';
  indexFingerprint: string;
}

export interface StorySourceEmbeddingRecord {
  schemaVersion: 1;
  chunkId: string;
  modelKey: string;
  vector: number[];
}

export interface StoryEvidenceClaim {
  schemaVersion: 1;
  id: string;
  statement: string;
  category: 'identity' | 'event' | 'relationship' | 'appearance' | 'dialogue' | 'world' | 'knowledge' | 'item' | 'uncertainty';
  truthStatus: 'true' | 'false' | 'unknown' | 'reported' | 'believed';
  subjectIds: string[];
  observerIds: string[];
  sourceChunkIds: string[];
  validFromOrder: number;
  validUntilOrder?: number;
  confidence: number;
  auditStatus: SourceAuditStatus;
}

export interface StorySourceCompilationRecord {
  schemaVersion: 1;
  sourceUnitId: string;
  level: SourceCompilationLevel;
  skeletonStatus: SourceTaskStatus;
  auditStatus: SourceAuditStatus;
  deepCompilationStatus: SourceTaskStatus;
  eventIds: string[];
  updatedAt: number;
  attemptCount?: number;
  maxAttempts?: number;
  lastAttemptAt?: number;
  error?: string;
}

export interface StorySourceIndex {
  schemaVersion: 1;
  storyId: string;
  corpusId: string;
  sourceFingerprint: string;
  sourceLength: number;
  preparationMode: SourcePreparationMode;
  chapters: StorySourceChapter[];
  retrievalChunkCount: number;
  analysisUnitCount: number;
  embedding: StorySourceEmbeddingConfig | null;
  retrievalDefaults: {
    sequentialBefore: number;
    sequentialAfter: number;
    semanticTopK: number;
    keywordTopK: number;
    maxContextChars: number;
  };
  createdAt: string;
}

export interface StorySourceCorpus {
  index: StorySourceIndex;
  retrievalChunks: StorySourceRetrievalChunk[];
  analysisUnits: StorySourceAnalysisUnit[];
  embeddings: StorySourceEmbeddingRecord[];
  claims: StoryEvidenceClaim[];
  compilation: StorySourceCompilationRecord[];
}

export interface StorySourceLibraryRef {
  schemaVersion: 1;
  corpusId: string;
  sourceFingerprint: string;
  preparationMode: SourcePreparationMode;
}

export function validateStorySourceLibraryRef(value: unknown): value is StorySourceLibraryRef {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Partial<StorySourceLibraryRef>;
  return candidate.schemaVersion === 1
    && typeof candidate.corpusId === 'string'
    && candidate.corpusId.length > 0
    && typeof candidate.sourceFingerprint === 'string'
    && candidate.sourceFingerprint.length > 0
    && ['quick', 'balanced', 'complete'].includes(String(candidate.preparationMode));
}

export interface StorySourceTask {
  schemaVersion: 1;
  id: string;
  corpusId: string;
  type: 'embed_chunk' | 'extract_skeleton' | 'audit_skeleton' | 'compile_window' | 'audit_window';
  targetId: string;
  status: SourceTaskStatus;
  priority: number;
  attempts: number;
  createdAt: number;
  updatedAt: number;
  error?: string;
}

const CHAPTER_HEADING = /^(?:#{1,6}\s*)?(?:第[0-9零〇一二三四五六七八九十百千万两]+[章节卷回部篇]|序章|楔子|引子|尾声|后记|番外(?:\s*[0-9零〇一二三四五六七八九十]*)?|chapter\s+[0-9ivxlcdm]+).*$/i;
const NATURAL_BREAKS = ['\n\n', '\n', '。', '！', '？', '.', '!', '?', '；', ';'];

function normalizeSourceText(text: string): string {
  return text
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function findBreak(text: string, desiredEnd: number, minimumEnd: number, hardEnd: number): number {
  for (const token of NATURAL_BREAKS) {
    const index = text.lastIndexOf(token, Math.min(desiredEnd, hardEnd));
    if (index >= minimumEnd) return index + token.length;
  }
  for (const token of NATURAL_BREAKS) {
    const index = text.indexOf(token, desiredEnd);
    if (index >= 0 && index + token.length <= hardEnd) return index + token.length;
  }
  return hardEnd;
}

interface ChapterSpan {
  id: string;
  order: number;
  title: string;
  startOffset: number;
  endOffset: number;
}

function chapterSpans(text: string): ChapterSpan[] {
  const lines = text.split('\n');
  const headings: Array<{ title: string; offset: number }> = [];
  let offset = 0;
  for (const line of lines) {
    if (line.trim() && CHAPTER_HEADING.test(line.trim())) {
      headings.push({ title: line.trim().replace(/^#{1,6}\s*/, ''), offset });
    }
    offset += line.length + 1;
  }
  if (headings.length < 2) {
    return [{ id: 'C0001', order: 0, title: headings[0]?.title ?? '全文', startOffset: 0, endOffset: text.length }];
  }
  if (headings[0]?.offset !== 0) headings.unshift({ title: '开篇', offset: 0 });
  return headings.map((heading, index) => ({
    id: `C${String(index + 1).padStart(4, '0')}`,
    order: index,
    title: heading.title,
    startOffset: heading.offset,
    endOffset: headings[index + 1]?.offset ?? text.length
  }));
}

interface TextSlice {
  startOffset: number;
  endOffset: number;
  text: string;
}

function splitSpan(
  source: string,
  startOffset: number,
  endOffset: number,
  target: number,
  max: number,
  overlap: number
): TextSlice[] {
  const slices: TextSlice[] = [];
  let cursor = startOffset;
  while (cursor < endOffset) {
    const remaining = endOffset - cursor;
    if (remaining <= max) {
      const text = source.slice(cursor, endOffset).trim();
      if (text) {
        const leading = source.slice(cursor, endOffset).indexOf(text);
        slices.push({ startOffset: cursor + Math.max(0, leading), endOffset, text });
      }
      break;
    }
    const desiredEnd = Math.min(endOffset, cursor + target);
    const hardEnd = Math.min(endOffset, cursor + max);
    const minimumEnd = Math.min(hardEnd, cursor + Math.floor(target * 0.65));
    const selectedEnd = Math.max(cursor + 1, findBreak(source, desiredEnd, minimumEnd, hardEnd));
    const raw = source.slice(cursor, selectedEnd);
    const text = raw.trim();
    if (text) {
      const leading = raw.indexOf(text);
      slices.push({ startOffset: cursor + Math.max(0, leading), endOffset: selectedEnd, text });
    }
    if (selectedEnd >= endOffset) break;
    const nextCursor = overlap > 0 ? Math.max(cursor + 1, selectedEnd - overlap) : selectedEnd;
    cursor = nextCursor;
  }
  return slices;
}

function keywordTokens(text: string): string[] {
  const normalized = text.toLocaleLowerCase('zh-CN');
  const latin = normalized.match(/[a-z0-9_]{2,}/g) ?? [];
  const chineseRuns = normalized.match(/[\p{Script=Han}]{2,}/gu) ?? [];
  const grams: string[] = [];
  for (const run of chineseRuns) {
    for (let index = 0; index < run.length - 1; index += 1) grams.push(run.slice(index, index + 2));
  }
  const counts = new Map<string, number>();
  for (const token of [...latin, ...grams]) counts.set(token, (counts.get(token) ?? 0) + 1);
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 96)
    .map(([token]) => token);
}

export function buildStorySourceCorpus(
  source: string,
  storyId: string,
  sourceFingerprint: string,
  preparationMode: SourcePreparationMode = 'balanced',
  createdAt = new Date().toISOString()
): StorySourceCorpus {
  const text = normalizeSourceText(source);
  if (!text) throw new Error('故事原文不能为空。');
  if (!storyId.trim()) throw new Error('storyId 不能为空。');
  const spans = chapterSpans(text);
  const retrievalChunks: StorySourceRetrievalChunk[] = [];
  const analysisUnits: StorySourceAnalysisUnit[] = [];

  for (const chapter of spans) {
    const retrievalSlices = splitSpan(
      text,
      chapter.startOffset,
      chapter.endOffset,
      RETRIEVAL_CHUNK_TARGET,
      RETRIEVAL_CHUNK_MAX,
      RETRIEVAL_CHUNK_OVERLAP
    );
    for (const slice of retrievalSlices) {
      const order = retrievalChunks.length;
      retrievalChunks.push({
        schemaVersion: 1,
        id: `R${String(order + 1).padStart(6, '0')}`,
        chapterId: chapter.id,
        chapterOrder: chapter.order,
        chunkOrder: order,
        title: chapter.title,
        startOffset: slice.startOffset,
        endOffset: slice.endOffset,
        text: slice.text,
        contentHash: `fnv1a:${fnv1a(slice.text)}`,
        keywordTokens: keywordTokens(slice.text)
      });
    }

    const analysisSlices = splitSpan(
      text,
      chapter.startOffset,
      chapter.endOffset,
      ANALYSIS_UNIT_TARGET,
      ANALYSIS_UNIT_MAX,
      0
    );
    for (const slice of analysisSlices) {
      const order = analysisUnits.length;
      analysisUnits.push({
        schemaVersion: 1,
        id: `A${String(order + 1).padStart(6, '0')}`,
        chapterId: chapter.id,
        chapterOrder: chapter.order,
        unitOrder: order,
        title: chapter.title,
        startOffset: slice.startOffset,
        endOffset: slice.endOffset,
        text: slice.text,
        retrievalChunkIds: retrievalChunks
          .filter(chunk => chunk.chapterId === chapter.id && chunk.endOffset > slice.startOffset && chunk.startOffset < slice.endOffset)
          .map(chunk => chunk.id)
      });
    }
  }

  retrievalChunks.forEach((chunk, index) => {
    chunk.previousChunkId = retrievalChunks[index - 1]?.id;
    chunk.nextChunkId = retrievalChunks[index + 1]?.id;
  });

  const chapters: StorySourceChapter[] = spans.map(chapter => {
    const retrieval = retrievalChunks.filter(chunk => chunk.chapterId === chapter.id);
    const analysis = analysisUnits.filter(unit => unit.chapterId === chapter.id);
    return {
      ...chapter,
      firstRetrievalOrder: retrieval[0]?.chunkOrder ?? -1,
      lastRetrievalOrder: retrieval.at(-1)?.chunkOrder ?? -1,
      firstAnalysisOrder: analysis[0]?.unitOrder ?? -1,
      lastAnalysisOrder: analysis.at(-1)?.unitOrder ?? -1
    };
  });
  const corpusId = `${storyId}:${sourceFingerprint}`;
  const compilation: StorySourceCompilationRecord[] = analysisUnits.map(unit => ({
    schemaVersion: 1,
    sourceUnitId: unit.id,
    level: 0,
    skeletonStatus: 'pending',
    auditStatus: 'unreviewed',
    deepCompilationStatus: 'pending',
    eventIds: [],
    updatedAt: 0
  }));
  return {
    index: {
      schemaVersion: 1,
      storyId,
      corpusId,
      sourceFingerprint,
      sourceLength: text.length,
      preparationMode,
      chapters,
      retrievalChunkCount: retrievalChunks.length,
      analysisUnitCount: analysisUnits.length,
      embedding: null,
      retrievalDefaults: {
        sequentialBefore: 1,
        sequentialAfter: 2,
        semanticTopK: 6,
        keywordTopK: 6,
        maxContextChars: 16_000
      },
      createdAt
    },
    retrievalChunks,
    analysisUnits,
    embeddings: [],
    claims: [],
    compilation
  };
}

export function validateStorySourceCorpus(corpus: StorySourceCorpus): string[] {
  const errors: string[] = [];
  const { index, retrievalChunks, analysisUnits } = corpus;
  if (index.schemaVersion !== STORY_SOURCE_SCHEMA_VERSION) errors.push('source index schemaVersion 必须为 1');
  if (index.retrievalChunkCount !== retrievalChunks.length) errors.push('retrievalChunkCount 与实际片段数不一致');
  if (index.analysisUnitCount !== analysisUnits.length) errors.push('analysisUnitCount 与实际分析单元数不一致');
  if (new Set(retrievalChunks.map(chunk => chunk.id)).size !== retrievalChunks.length) errors.push('检索片段 ID 不得重复');
  if (new Set(analysisUnits.map(unit => unit.id)).size !== analysisUnits.length) errors.push('分析单元 ID 不得重复');
  retrievalChunks.forEach((chunk, indexValue) => {
    if (chunk.chunkOrder !== indexValue) errors.push(`检索片段 ${chunk.id} 的 chunkOrder 不连续`);
    if (!chunk.text || chunk.text.length > RETRIEVAL_CHUNK_MAX) errors.push(`检索片段 ${chunk.id} 长度无效`);
    if (chunk.startOffset < 0 || chunk.endOffset <= chunk.startOffset || chunk.endOffset > index.sourceLength) {
      errors.push(`检索片段 ${chunk.id} 原文范围无效`);
    }
    if (chunk.previousChunkId !== retrievalChunks[indexValue - 1]?.id) errors.push(`检索片段 ${chunk.id} previousChunkId 无效`);
    if (chunk.nextChunkId !== retrievalChunks[indexValue + 1]?.id) errors.push(`检索片段 ${chunk.id} nextChunkId 无效`);
  });
  const retrievalIds = new Set(retrievalChunks.map(chunk => chunk.id));
  analysisUnits.forEach((unit, indexValue) => {
    if (unit.unitOrder !== indexValue) errors.push(`分析单元 ${unit.id} 的 unitOrder 不连续`);
    if (!unit.text || unit.text.length > ANALYSIS_UNIT_MAX) errors.push(`分析单元 ${unit.id} 长度无效`);
    if (unit.retrievalChunkIds.length === 0 || unit.retrievalChunkIds.some(id => !retrievalIds.has(id))) {
      errors.push(`分析单元 ${unit.id} 的检索片段引用无效`);
    }
  });
  return errors;
}
