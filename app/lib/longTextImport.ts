import type { PsycheTimelineProjectState } from '@/lib/psycheTimeline';

export const LONG_TEXT_THRESHOLD = 18_000;
export const SOURCE_CHUNK_TARGET = 11_000;
export const SOURCE_CHUNK_MAX = 15_000;
export const EVIDENCE_CONTEXT_MAX = 30_000;
export const AUDIT_PIPELINE_VERSION = 3;

export const EVIDENCE_FIDELITY_RULES = `【原作证据忠实度硬约束】
- 标题、姓名、别名、地名、组织名、物件名、数字、时间和固定表达必须逐字保留，不得改写或为姓名编造含义。
- 只把原文明确陈述或用户明确确认的内容写成事实；合理推断、传闻、假新闻、角色谎言、来源冲突和未知信息必须分别标明，不能混为已验证事实。
- 原文未提供的身高、体型、肤色、眼睛、服装、经历、心理史、物件或场景陈设必须标为未知或省略，不得用常见印象补齐。
- 不得强化原文结论，例如不能把“被带走调查”改成“已入狱”，不能把“动机包含调查”改成“复仇”。
- 用户在讨论阶段的明确纠正优先于早期摘要和模型推断；没有被用户修改的原文事实仍须保留。
- 必须以用户确认的故事起点为时间边界；边界之后的事件只能写入潜在剧情轨迹，不能写入角色当前记忆、既往经历、当前关系或首条消息。
- 关系网络必须独立整理双方态度、信任边界、隐瞒事项、合作条件和当前时间点，不能只给单向关系标签。`;

export const EVIDENCE_SECTION_KEYS = [
  'overview',
  'characters',
  'events',
  'relationships',
  'appearance',
  'dialogue',
  'world',
  'uncertainties',
] as const;

export type EvidenceSectionKey = typeof EVIDENCE_SECTION_KEYS[number];

export interface SourceChunk {
  id: string;
  title: string;
  text: string;
  chapterIndex: number;
  partIndex: number;
  partCount: number;
}

export interface ChunkEvidence {
  chunkId: string;
  title: string;
  sections: Record<EvidenceSectionKey, string>;
}

export interface LongTextImportCheckpoint {
  version: 1;
  fingerprint: string;
  chunkIds: string[];
  evidence: ChunkEvidence[];
  reviewedEvidenceIds?: string[];
  auditPipelineVersion?: number;
  discussionContext?: string;
  stageEvidence?: Record<string, string>;
  decisionFingerprint?: string;
  stageResults?: string[];
  psycheTimeline?: PsycheTimelineProjectState;
  updatedAt: number;
}

export function normalizeWorkflowCommand(input: string): string {
  return input.trim().replace(/[。！？!?]+$/g, '').trim();
}

export function matchesExactWorkflowCommand(input: string, commands: string[]): boolean {
  const normalized = normalizeWorkflowCommand(input).toLocaleLowerCase('zh-CN');
  return commands.some(command => normalized === command.toLocaleLowerCase('zh-CN'));
}

export function isFormalStorylineConclusion(text: string): boolean {
  return /(?:^|\n)\s*【\s*剧情结论\s*】\s*(?:\n|$)/.test(text)
    && /(?:^|\n)\s*\*\*扮演设定\*\*/.test(text)
    && /(?:^|\n)\s*\*\*故事起点\*\*/.test(text);
}

export interface ImportStageSpec {
  id: string;
  stageIndex: number;
  title: string;
  evidenceKeys: EvidenceSectionKey[];
  requirements: string;
}

export const IMPORT_STAGE_SPECS: ImportStageSpec[] = [
  {
    id: 'identity',
    stageIndex: 0,
    title: '基础身份',
    evidenceKeys: ['characters', 'events', 'uncertainties'],
    requirements: '写清正式名、别名、物种/种族、性别、年龄、身份、社会位置、表层与内在性格、核心动机和扮演归属。只写证据支持的内容。',
  },
  {
    id: 'background',
    stageIndex: 1,
    title: '深度背景',
    evidenceKeys: ['characters', 'events', 'world', 'uncertainties'],
    requirements: '按因果链整理成长经历、关键事件、创伤与转折、渴望、恐惧、价值观、决策模式和角色弧光。区分故事开始前背景与故事中经历。',
  },
  {
    id: 'relationships',
    stageIndex: 2,
    title: '关系网络',
    evidenceKeys: ['characters', 'relationships', 'events', 'dialogue'],
    requirements: '逐个整理重要关系的双向态度、依赖、权力动态、冲突、亲密方式、变化节点和可观察证据，不要只写朋友/敌人等标签。',
  },
  {
    id: 'appearance',
    stageIndex: 3,
    title: '物理描写',
    evidenceKeys: ['appearance', 'characters', 'uncertainties'],
    requirements: '整理体型、面部、毛发或皮肤、眼睛、服装、伤痕、气味、声音、姿态、习惯动作和情绪时的身体反应。明确标注原文未说明的项目，不要擅自补全。',
  },
  {
    id: 'interaction',
    stageIndex: 5,
    title: '互动设计',
    evidenceKeys: ['dialogue', 'characters', 'relationships', 'events'],
    requirements: '给出可直接指导扮演的说话规则、句长、口语程度、常用句式、口头禅、隐瞒/愤怒/害羞时的变化、行为习惯、禁区，并保留有代表性的原文对白锚点。',
  },
  {
    id: 'world',
    stageIndex: 6,
    title: '世界整合',
    evidenceKeys: ['world', 'events', 'relationships'],
    requirements: '只保留与目标角色和互动直接相关的时代、地点、社会结构、种族或能力规则、组织、资源、风险及故事起点，不要把整本书的百科全塞进角色卡。',
  },
];

export const PLOT_TRAJECTORY_SPEC: ImportStageSpec = {
  id: 'plot-trajectory',
  stageIndex: 9,
  title: '剧情轨迹',
  evidenceKeys: ['events', 'relationships', 'world', 'characters'],
  requirements: '按时间顺序列出原作剧情锚点、触发条件、因果关系、关系与态度变化、可改变性。它们是潜在发展方向，不得写成角色已经经历的历史。',
};

const CHAPTER_HEADING = /^(?:#{1,6}\s*)?(?:第[0-9零〇一二三四五六七八九十百千万两]+[章节卷回部篇]|序章|楔子|引子|尾声|后记|番外(?:\s*[0-9零〇一二三四五六七八九十]*)?|chapter\s+[0-9ivxlcdm]+).*$/i;

function normalizeSourceText(text: string): string {
  return text
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function splitByChapterHeading(text: string): Array<{ title: string; text: string }> {
  const lines = text.split('\n');
  const units: Array<{ title: string; lines: string[] }> = [];
  let current = { title: '开篇', lines: [] as string[] };
  let headingCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && CHAPTER_HEADING.test(trimmed)) {
      headingCount += 1;
      if (current.lines.some(item => item.trim())) units.push(current);
      current = { title: trimmed.replace(/^#{1,6}\s*/, ''), lines: [line] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.some(item => item.trim())) units.push(current);

  if (headingCount < 2) return [{ title: '全文', text }];
  return units.map(unit => ({ title: unit.title, text: unit.lines.join('\n').trim() }));
}

function findNaturalBreak(text: string, desiredEnd: number, minimumEnd: number): number {
  const candidates = ['\n\n', '\n', '。', '！', '？', '.', '!', '?'];
  for (const token of candidates) {
    const index = text.lastIndexOf(token, desiredEnd);
    if (index >= minimumEnd) return index + token.length;
  }
  return desiredEnd;
}

function splitTextToLimit(
  text: string,
  maxChars: number,
  targetChars = Math.min(SOURCE_CHUNK_TARGET, maxChars),
): string[] {
  const parts: string[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const remaining = text.length - cursor;
    if (remaining <= maxChars) {
      parts.push(text.slice(cursor).trim());
      break;
    }
    const desiredEnd = cursor + targetChars;
    const minimumEnd = cursor + Math.floor(targetChars * 0.65);
    const end = findNaturalBreak(text, desiredEnd, minimumEnd);
    parts.push(text.slice(cursor, end).trim());
    cursor = end;
  }
  return parts.filter(Boolean);
}

export function splitSourceText(source: string): SourceChunk[] {
  const text = normalizeSourceText(source);
  if (!text) return [];

  const chapterUnits = splitByChapterHeading(text);
  const expanded = chapterUnits.flatMap((unit, chapterIndex) => {
    const parts = unit.text.length > SOURCE_CHUNK_MAX
      ? splitTextToLimit(unit.text, SOURCE_CHUNK_MAX)
      : [unit.text];
    return parts.map((part, partIndex) => ({
      chapterIndex,
      partIndex,
      partCount: parts.length,
      title: parts.length > 1 ? `${unit.title} (${partIndex + 1}/${parts.length})` : unit.title,
      text: part,
    }));
  });

  const chunks: SourceChunk[] = [];
  let pending: typeof expanded = [];
  let pendingLength = 0;

  const flush = () => {
    if (pending.length === 0) return;
    const first = pending[0];
    const last = pending[pending.length - 1];
    const title = pending.length === 1 ? first.title : `${first.title} - ${last.title}`;
    const index = chunks.length + 1;
    chunks.push({
      id: `S${String(index).padStart(4, '0')}`,
      title,
      text: pending.map(item => item.text).join('\n\n'),
      chapterIndex: first.chapterIndex,
      partIndex: first.partIndex,
      partCount: first.partCount,
    });
    pending = [];
    pendingLength = 0;
  };

  for (const item of expanded) {
    const nextLength = pendingLength + (pending.length ? 2 : 0) + item.text.length;
    if (pending.length > 0 && nextLength > SOURCE_CHUNK_TARGET) flush();
    pending.push(item);
    pendingLength += (pending.length > 1 ? 2 : 0) + item.text.length;
    if (pendingLength >= SOURCE_CHUNK_TARGET || item.text.length >= SOURCE_CHUNK_TARGET) flush();
  }
  flush();
  return chunks;
}

function markerName(key: EvidenceSectionKey): string {
  return key.toUpperCase();
}

export function buildChunkEvidencePrompt(chunk: SourceChunk, compact = false): string {
  const sectionGuide: Record<EvidenceSectionKey, string> = {
    overview: '本段在全书中的作用、时间位置、主要场景与内容摘要。',
    characters: '逐个角色记录身份、动机、恐惧、性格、决策模式、关键行为、弧光变化；每条注明[原文事实]或[合理推断]。',
    events: '按发生顺序拆成细粒度事件，保留因果、时间、地点、参与者、情绪与叙事目的。',
    relationships: '记录双向态度、权力与依赖、冲突、亲密模式及本段发生的变化。',
    appearance: '记录外貌、服装、声音、气味、姿态、习惯动作和身体反应；没有就写“无新增证据”。',
    dialogue: '摘录能体现说话风格的短句，并总结句长、语气、用词、隐瞒或激动时的变化和禁区。',
    world: '记录时代、地点、组织、种族、能力、社会规则、资源与限制，只写本段有证据的内容。',
    uncertainties: '记录矛盾、暂不能确认、可能在后文被修正的信息，不要强行定论。',
  };
  const markers = EVIDENCE_SECTION_KEYS.map(key => {
    const marker = markerName(key);
    return `<<<${marker}>>>\n${sectionGuide[key]}\n<<<END_${marker}>>>`;
  }).join('\n\n');

  return `你正在为角色卡建立“原作证据索引”，不是直接写最终角色卡。\n\n` +
    `来源编号：${chunk.id}\n来源标题：${chunk.title}\n\n` +
    `规则：\n` +
    `1. 只分析当前来源段，不假装知道其他章节。\n` +
    `2. 每条事实尽量带“[${chunk.id}]”；推断必须写成“[合理推断]”，不得混成原文事实。\n` +
    `3. 人物必须区分故事初始状态、当前段状态和后续变化。\n` +
    `4. 保留具体动作、对白与关系变化，不要只写空泛形容词。\n` +
    `5. 严格输出下面八组标记，标记不得改名或缺失。${compact ? '\n6. 本次使用精简模式，每组只保留最高价值证据，全文控制在约2500字以内。' : '\n6. 全文控制在约4000字以内，避免输出截断。'}\n\n` +
    `${markers}\n\n--- 原文开始 ---\n${chunk.text}\n--- 原文结束 ---`;
}

export function buildChunkEvidenceReviewPrompt(
  chunk: SourceChunk,
  draft: ChunkEvidence,
  compact = false,
): string {
  const draftText = EVIDENCE_SECTION_KEYS.map(key => {
    const marker = markerName(key);
    return `<<<${marker}>>>\n${draft.sections[key]}\n<<<END_${marker}>>>`;
  }).join('\n\n');

  return `你是独立的原作证据复核员。第一位 AI 已经对来源 ${chunk.id} 做了证据提取，你必须重新对照原文审计，而不是默认草稿正确。\n\n` +
    `${EVIDENCE_FIDELITY_RULES}\n\n` +
    `复核要求：\n` +
    `1. 删除草稿中原文不支持、被强化或把推断写成事实的内容。\n` +
    `2. 补回遗漏的高价值事实，尤其是时间点、知识边界、双向关系、谎言、假新闻、来源冲突和未知状态。\n` +
    `3. 每条尽量保留 [${chunk.id}] 来源标记；合理推断必须显式标注。\n` +
    `4. 输出修订后的完整八组证据，不要输出审计报告。\n` +
    `5. 标记名必须与草稿一致且全部存在。${compact ? '\n6. 使用精简模式，每组只保留最高价值证据，全文控制在约3000字以内。' : '\n6. 全文控制在约4500字以内。'}\n\n` +
    `--- 第一位 AI 的证据草稿 ---\n${draftText}\n\n` +
    `--- 原文开始 ---\n${chunk.text}\n--- 原文结束 ---`;
}

export function parseChunkEvidence(response: string, chunk: SourceChunk): ChunkEvidence | null {
  const sections = {} as Record<EvidenceSectionKey, string>;
  for (const key of EVIDENCE_SECTION_KEYS) {
    const marker = markerName(key);
    const match = response.match(new RegExp(`<<<${marker}>>>\\s*([\\s\\S]*?)\\s*<<<END_${marker}>>>`, 'i'));
    if (!match) return null;
    sections[key] = match[1].trim();
  }
  return { chunkId: chunk.id, title: chunk.title, sections };
}

export function buildEvidenceBlocks(
  evidence: ChunkEvidence[],
  keys: EvidenceSectionKey[],
): string[] {
  return evidence.map(item => {
    const body = keys
      .map(key => item.sections[key]?.trim() ? `### ${key}\n${item.sections[key].trim()}` : '')
      .filter(Boolean)
      .join('\n\n');
    return `## ${item.chunkId} ${item.title}\n${body}`;
  }).filter(block => block.trim().length > 0);
}

export function groupTextBlocks(blocks: string[], maxChars = EVIDENCE_CONTEXT_MAX): string[][] {
  const groups: string[][] = [];
  let current: string[] = [];
  let length = 0;
  for (const block of blocks) {
    const pieces = block.length > maxChars
      ? splitTextToLimit(block, maxChars, Math.min(SOURCE_CHUNK_TARGET, maxChars))
      : [block];
    for (const piece of pieces) {
      const nextLength = length + (current.length ? 2 : 0) + piece.length;
      if (current.length && nextLength > maxChars) {
        groups.push(current);
        current = [];
        length = 0;
      }
      current.push(piece);
      length += (current.length > 1 ? 2 : 0) + piece.length;
    }
  }
  if (current.length) groups.push(current);
  return groups;
}

export function buildEvidenceMergePrompt(
  blocks: string[],
  purpose: string,
  compact = false,
): string {
  return `把下面多段原作证据合并成一份“${purpose}”工作索引。\n\n` +
    `要求：\n` +
    `- 去除重复，但保留来源编号、具体行为、关键对白和时间顺序。\n` +
    `- 后文修正前文时写明修正；无法判断的矛盾同时保留。\n` +
    `- 区分原文事实与推断，禁止补写原文没有的设定。\n` +
    `- 这是后续生成角色卡的证据，不要写成漂亮但空泛的散文。\n` +
    `- 严格使用 <<<EVIDENCE>>> 与 <<<END_EVIDENCE>>> 包裹结果。\n` +
    `- ${compact ? '只保留最高价值信息，控制在约3500字以内。' : '在不丢关键细节的前提下控制在约6000字以内。'}\n\n` +
    `<<<EVIDENCE>>>\n（合并结果）\n<<<END_EVIDENCE>>>\n\n--- 待合并证据 ---\n${blocks.join('\n\n')}`;
}

export function parseMarkedEvidence(response: string): string | null {
  return response.match(/<<<EVIDENCE>>>\s*([\s\S]*?)\s*<<<END_EVIDENCE>>>/i)?.[1]?.trim() || null;
}

export function buildNarrativeAuditPrompt(
  label: string,
  evidenceContext: string,
  userDecisions: string,
  candidate: string,
  requirements: string,
  compact = false,
): string {
  return `你是与生成模型相互独立的角色卡审计 AI。请把候选“${label}”逐条与原作证据和用户的主观选择对照，并直接输出修订后的完整版本。\n\n` +
    `${EVIDENCE_FIDELITY_RULES}\n\n` +
    `本次额外要求：\n${requirements}\n\n` +
    `审计规则：\n` +
    `- 不要相信候选文本的流畅度；每一项客观陈述都必须能由证据或用户选择支持。\n` +
    `- 自动修复遗漏、时间线倒灌、假新闻当事实、推断升级、关系单向化和无证据细节。\n` +
    `- 用户只负责创作偏好，不要求用户记忆原文章节事实；发现冲突时以证据为准并保留未知。\n` +
    `- 如果候选正确，原样保留；不要为了显得有修改而改写专名或增加细节。\n` +
    `- 严格用 <<<AUDITED_RESULT>>> 与 <<<END_AUDITED_RESULT>>> 包裹完整结果，不要在标记外解释。${compact ? ' 输出尽量精简，但不得删掉知识边界和关键约束。' : ''}\n\n` +
    `--- 原作证据 ---\n${evidenceContext}\n\n` +
    `--- 用户选择与讨论 ---\n${userDecisions || '无额外选择。'}\n\n` +
    `--- 待审计候选 ---\n${candidate}\n\n` +
    `<<<AUDITED_RESULT>>>\n（修订后的完整“${label}”）\n<<<END_AUDITED_RESULT>>>`;
}

export function parseAuditedResult(response: string): string | null {
  return response.match(/<<<AUDITED_RESULT>>>\s*([\s\S]*?)\s*<<<END_AUDITED_RESULT>>>/i)?.[1]?.trim() || null;
}

export interface EvidenceFidelityViolation {
  type: 'unresolved_life_status' | 'custody_status_strengthened';
  subject: string;
  message: string;
}

function collectSubjects(text: string, pattern: RegExp): Set<string> {
  const subjects = new Set<string>();
  for (const match of text.matchAll(pattern)) {
    const subject = match[1]?.trim();
    if (subject) subjects.add(subject);
  }
  return subjects;
}

function candidateWindows(candidate: string, subject: string, radius = 90): string[] {
  const windows: string[] = [];
  let cursor = 0;
  while (cursor < candidate.length) {
    const index = candidate.indexOf(subject, cursor);
    if (index < 0) break;
    windows.push(candidate.slice(Math.max(0, index - radius), index + subject.length + radius));
    cursor = index + subject.length;
  }
  return windows;
}

export function findEvidenceFidelityViolations(
  evidenceContext: string,
  candidate: string,
): EvidenceFidelityViolation[] {
  const violations: EvidenceFidelityViolation[] = [];
  const unresolvedSubjects = new Set([
    ...collectSubjects(
      evidenceContext,
      /([\u4e00-\u9fff]{2,4}?)(?:当前|目前|现在)(?:的)?(?:生死|下落)(?:仍|始终|目前|现在|当前)?(?:为|是|仍为)?(?:未知|未确认|不明)/g,
    ),
    ...collectSubjects(
      evidenceContext,
      /([\u4e00-\u9fff]{2,4}?)(?:的)?(?:生死|下落)(?:仍|始终|目前|现在|当前)?(?:为|是|仍为)?(?:未知|未确认|不明)/g,
    ),
  ]);
  const deathAssumption = /(遗言|临终|已故|遇难者|亡者|死者|确认死亡|已经死亡|死于|尸体)/;
  const deathNegation = /(不是|并非|不得|不能|不应|不可).{0,12}(遗言|临终|已故|遇难者|亡者|死者|确认死亡|已经死亡|死于|尸体)/;

  for (const subject of unresolvedSubjects) {
    const offending = candidateWindows(candidate, subject)
      .find(window => deathAssumption.test(window) && !deathNegation.test(window));
    if (offending) {
      violations.push({
        type: 'unresolved_life_status',
        subject,
        message: `${subject}在证据中生死或下落未确认，候选却使用了预设死亡的表述。`,
      });
    }
  }

  const custodySubjects = collectSubjects(
    evidenceContext,
    /([\u4e00-\u9fff]{2,4})[^。；\n]{0,24}被[^。；\n]{0,24}带走/g,
  );
  const custodyStrengthening = /(入狱|判刑|定罪|服刑|关进监狱)/;
  const custodyNegation = /(没有|尚未|并未|不得|不能|不应|不可).{0,12}(入狱|判刑|定罪|服刑|关进监狱)/;
  for (const subject of custodySubjects) {
    const offending = candidateWindows(candidate, subject)
      .find(window => custodyStrengthening.test(window) && !custodyNegation.test(window));
    if (offending) {
      violations.push({
        type: 'custody_status_strengthened',
        subject,
        message: `${subject}在证据中只确认被带走，候选却强化为入狱、判刑或定罪。`,
      });
    }
  }

  return violations;
}

export function buildStageGenerationPrompt(
  spec: ImportStageSpec,
  evidenceContext: string,
  discussionRecord: string,
  storylineMode: boolean,
  compact = false,
): string {
  const storylineRule = storylineMode
    ? '当前使用剧情线模式：角色正文只能写故事起点时已经成立的状态；小说中后来发生的事件只能作为变化证据或潜在轨迹，不能倒灌成既往背景。'
    : '当前使用普通模式：可以把原作中已经发生的经历整理为角色历史，但仍需标明时间顺序和性格变化。';
  return `你只负责生成角色卡导入流程中的“${spec.title}”这一项，不要输出其他阶段。\n\n` +
    `任务要求：${spec.requirements}\n${storylineRule}\n\n` +
    `${EVIDENCE_FIDELITY_RULES}\n\n` +
    `用户讨论与修正优先级高于原作推断，但不得无视用户没有修改的原文事实。\n` +
    `内容要具体到可直接指导角色扮演，使用清晰的 Markdown；保留必要的来源编号用于用户核对。\n` +
    `严格用 <<<STAGE_RESULT>>> 与 <<<END_STAGE_RESULT>>> 包裹正文。${compact ? ' 本次请精简到最关键但完整的内容。' : ''}\n\n` +
    `--- 用户讨论记录 ---\n${discussionRecord || '无额外讨论，按证据处理。'}\n\n` +
    `--- 原作证据 ---\n${evidenceContext}\n\n` +
    `<<<STAGE_RESULT>>>\n（只输出“${spec.title}”正文）\n<<<END_STAGE_RESULT>>>`;
}

export function buildStageAuditPrompt(
  spec: ImportStageSpec,
  evidenceContext: string,
  discussionRecord: string,
  candidate: string,
  storylineMode: boolean,
  compact = false,
): string {
  const timelineRule = storylineMode
    ? '角色当前状态必须停在用户选择的故事起点；未来事件只能进入剧情轨迹，不能进入其他字段。'
    : '按原作时间顺序整理已经发生的经历，不得混淆事件先后。';
  return buildNarrativeAuditPrompt(
    spec.title,
    evidenceContext,
    discussionRecord,
    candidate,
    `- 只审计并输出“${spec.title}”，不得生成其他阶段。\n- 字段任务：${spec.requirements}\n- ${timelineRule}\n- 保留必要的来源编号，便于后续核对。`,
    compact,
  );
}

export function parseStageResult(response: string): string | null {
  return response.match(/<<<STAGE_RESULT>>>\s*([\s\S]*?)\s*<<<END_STAGE_RESULT>>>/i)?.[1]?.trim() || null;
}

export function fingerprintText(text: string): string {
  let hash = 0x811c9dc5;
  const normalized = normalizeSourceText(text);
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${normalized.length.toString(36)}-${(hash >>> 0).toString(36)}`;
}

export function checkpointStorageKey(fingerprint: string): string {
  return `psyche-long-text-import-v1:${fingerprint}`;
}

export function loadLongTextCheckpoint(fingerprint: string): LongTextImportCheckpoint | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(checkpointStorageKey(fingerprint));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LongTextImportCheckpoint;
    return parsed.version === 1 && parsed.fingerprint === fingerprint ? parsed : null;
  } catch {
    return null;
  }
}

export function saveLongTextCheckpoint(checkpoint: LongTextImportCheckpoint): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(checkpointStorageKey(checkpoint.fingerprint), JSON.stringify(checkpoint));
  } catch (error) {
    console.warn('长文本导入检查点保存失败，将继续当前任务:', error);
  }
}
