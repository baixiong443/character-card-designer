import type { WorldBookEntry } from '@/types/worldbook';

export type AuditSeverity = 'error' | 'warning';

export interface WorldBookAuditFinding {
  uid: number;
  severity: AuditSeverity;
  code: string;
  message: string;
}

export interface WorldBookAuditCandidate {
  entry: WorldBookEntry;
  verdict: 'pass' | 'revised';
  issues: string[];
}

/**
 * The subset of a PTE projection needed to reason about knowledge scoping.
 *
 * PTE injects a fact's *truth* to the responding character only when that
 * character's knowledge state is one of `knows`, `suspects` or `hiding`
 * (see `formatKnowledge` in the engine's injection module). `unaware` and
 * `believes_false` receive something different, and a missing entry means the
 * character was never told. A world book entry, by contrast, is injected by
 * SillyTavern core on a keyword match and is not scoped to a speaker at all.
 */
export interface PrivateKnowledgeSource {
  facts?: Record<string, { truth?: string; status?: string }>;
  knowledge?: Record<string, Record<string, { state?: string } | undefined>>;
  characters?: Record<string, unknown>;
}

const TRUTH_BEARING_STATES = new Set(['knows', 'suspects', 'hiding']);
/** Below this many normalized characters a match is too weak to report. */
const MIN_FACT_MATCH_LENGTH = 6;

function normalizeForMatch(value: string): string {
  return value.replace(/\s+/g, '').toLocaleLowerCase('zh-CN');
}

const BROAD_WORLD_BOOK_KEYS = new Set([
  '我', '你', '他', '她', '它', '的', '了', '是', '在', '有', '这', '那',
  '一个', '角色', '人物', '地点', '东西', '事件', '世界',
]);

const FORMAT_RULE_PATTERN = /(状态栏|回复格式|输出格式|每次回复|每轮回复|【状态】|好感度|物品栏)/;

function normalizeKey(value: string): string {
  return value.trim().toLocaleLowerCase('zh-CN');
}

function finding(
  uid: number,
  severity: AuditSeverity,
  code: string,
  message: string,
): WorldBookAuditFinding {
  return { uid, severity, code, message };
}

export function findWorldBookAuditFindings(entries: WorldBookEntry[]): WorldBookAuditFinding[] {
  const findings: WorldBookAuditFinding[] = [];
  const keyOwners = new Map<string, number[]>();

  for (const entry of entries) {
    const keys = entry.keys.map(normalizeKey).filter(Boolean);
    if (!entry.content.trim()) {
      findings.push(finding(entry.uid, 'error', 'empty-content', '条目内容为空，无法在运行时提供知识。'));
    }
    if (!entry.constant && keys.length === 0) {
      findings.push(finding(entry.uid, 'error', 'missing-keys', '非恒常条目没有关键词，运行时永远不会触发。'));
    }

    const broadKeys = keys.filter(key => BROAD_WORLD_BOOK_KEYS.has(key));
    if (broadKeys.length > 0) {
      findings.push(finding(
        entry.uid,
        'warning',
        'broad-key',
        `关键词过宽，容易在无关对话中误触发：${broadKeys.join('、')}`,
      ));
    }

    for (const key of new Set(keys)) {
      keyOwners.set(key, [...(keyOwners.get(key) || []), entry.uid]);
    }

    if (entry.constant && !entry.preventRecursion) {
      findings.push(finding(
        entry.uid,
        'warning',
        'constant-recursion',
        '恒常条目仍允许触发其他递归条目，可能造成无意的连锁注入。',
      ));
    }

    if (entry.content.length > 1_800) {
      findings.push(finding(
        entry.uid,
        'warning',
        'large-entry',
        `条目长度为 ${entry.content.length} 字，可能长期占用过多上下文。`,
      ));
    }

    if (FORMAT_RULE_PATTERN.test(`${entry.comment || ''}\n${entry.content}`)) {
      if (!entry.constant) {
        findings.push(finding(entry.uid, 'warning', 'format-not-constant', '格式规范需要每轮生效，建议设为恒常。'));
      }
      if (entry.position !== 4 || (entry.depth ?? 1) !== 1 || (entry.role ?? 0) !== 0) {
        findings.push(finding(
          entry.uid,
          'warning',
          'format-position',
          '格式规范建议使用聊天深度 1，并以 System 角色注入。',
        ));
      }
      if (!entry.ignoreBudget || !entry.preventRecursion) {
        findings.push(finding(
          entry.uid,
          'warning',
          'format-runtime-guards',
          '格式规范建议忽略预算并阻止继续触发递归条目。',
        ));
      }
    }
  }

  for (const [key, owners] of keyOwners) {
    const uniqueOwners = [...new Set(owners)];
    if (uniqueOwners.length < 2) continue;
    for (const uid of uniqueOwners) {
      findings.push(finding(
        uid,
        'warning',
        'duplicate-key',
        `关键词“${key}”同时存在于条目 ${uniqueOwners.join('、')}，可能重复注入。`,
      ));
    }
  }

  return findings;
}

/**
 * Detect world book entries that publish a fact some character is not supposed
 * to know.
 *
 * The check is deterministic, not heuristic. It only fires when both sides are
 * known for certain:
 *
 * 1. the entry's content carries a fact's exact `truth` text from the compiled
 *    timeline, and
 * 2. at least one registered character does NOT have a truth-bearing knowledge
 *    state for that fact.
 *
 * That combination proves a leak: PTE would withhold the fact from that
 * character, but SillyTavern injects the world book entry on a keyword match
 * with no speaker scoping, so the withheld truth reaches every responder.
 *
 * It deliberately stays silent when the timeline is absent, when a fact is
 * unknown to *everyone* (nothing is proven private yet - the fact is more
 * likely an objective world fact), or when the match is too short to be
 * meaningful.
 */
export function findPrivateKnowledgeLeaks(
  entries: WorldBookEntry[],
  source: PrivateKnowledgeSource | null | undefined,
  characters?: string[],
): WorldBookAuditFinding[] {
  if (!source?.facts) return [];
  const knowledge = source.knowledge ?? {};
  const registered = characters && characters.length > 0
    ? characters
    : Object.keys(knowledge);
  if (registered.length === 0) return [];

  const findings: WorldBookAuditFinding[] = [];
  const normalizedContents = entries.map(entry => normalizeForMatch(entry.content));

  for (const [factId, fact] of Object.entries(source.facts)) {
    const truth = typeof fact?.truth === 'string' ? normalizeForMatch(fact.truth) : '';
    if (truth.length < MIN_FACT_MATCH_LENGTH) continue;

    // Characters PTE would *not* give this fact's truth to.
    const withheldFrom = registered.filter(characterId => {
      const state = knowledge[characterId]?.[factId]?.state;
      return !TRUTH_BEARING_STATES.has(String(state));
    });
    // Private knowledge means "some know it, some do not". If nobody may know
    // it, the fact is not proven private - it is more likely an objective world
    // fact the author intends everyone to see - so stay silent.
    if (withheldFrom.length === 0 || withheldFrom.length === registered.length) continue;

    normalizedContents.forEach((content, index) => {
      if (!content || !content.includes(truth)) return;
      const entry = entries[index];
      if (!entry) return;
      findings.push(finding(
        entry.uid,
        'warning',
        'private-knowledge-leak',
        `条目内容包含事实“${factId}”的真相，但 ${withheldFrom.join('、')} 并不知晓它。`
          + `世界书条目不区分发言角色，会对所有成员注入，可能绕过时间线的知识隔离。`,
      ));
    });
  }

  return findings;
}

/**
 * Deterministic findings for one world book: structural rules plus, when a
 * compiled timeline is supplied, private-knowledge leak detection.
 */
export function findWorldBookFindings(
  entries: WorldBookEntry[],
  source?: PrivateKnowledgeSource | null,
  characters?: string[],
): WorldBookAuditFinding[] {
  return [
    ...findWorldBookAuditFindings(entries),
    ...findPrivateKnowledgeLeaks(entries, source, characters),
  ];
}

function serializeWorldBookEntry(entry: WorldBookEntry) {
  return {
    uid: entry.uid,
    keys: entry.keys,
    content: entry.content,
    comment: entry.comment || '',
    enabled: entry.enabled,
    constant: entry.constant,
    selective: entry.selective,
    order: entry.order,
    position: entry.position,
    depth: entry.depth ?? 4,
    role: entry.role ?? 0,
    probability: entry.probability ?? 100,
    useProbability: entry.useProbability ?? true,
    ignoreBudget: entry.ignoreBudget ?? false,
    preventRecursion: entry.preventRecursion ?? false,
    excludeRecursion: entry.excludeRecursion ?? false,
    cooldown: entry.cooldown ?? null,
    sticky: entry.sticky ?? null,
    delay: entry.delay ?? null,
  };
}

export function buildWorldBookAuditPrompt(
  evidenceContext: string,
  discussionRecord: string,
  entries: WorldBookEntry[],
  source?: PrivateKnowledgeSource | null,
  characters?: string[],
): string {
  const deterministicFindings = findWorldBookFindings(entries, source, characters);
  return `你是独立的 SillyTavern 世界书审计 AI。候选条目由另一位 AI 或用户创建，你必须逐条对照角色设定与用户决定，返回可供用户确认的修订候选。

审计原则：
- 不为了显得有修改而改写正确内容；没有问题的条目原样返回。
- 只能保留证据或用户明确决定支持的事实，不得根据题材常识补设定。
- 关键词必须具体、可触发，删除“我、你、他、的、角色、地点”等过宽词。
- 合并或消除条目内部重复，但本次不得新增、删除条目，也不得改变 uid。
- 普通知识条目按关键词触发；真正需要每轮执行的格式规范才设为恒常。
- 格式规范使用 constant=true、position=4、depth=1、role=0、ignoreBudget=true、preventRecursion=true。
- 保留未列出的高级运行参数；只修订下方 JSON 中允许出现的字段。
- issues 只写仍值得用户知道的具体问题；不要写泛泛的表扬。
- 世界书条目不区分发言角色。若某条目含有只有部分角色知晓的事实，必须写进 issues 提醒用户；不要把这类内容改写成更直白的版本。

程序预检结果：
${deterministicFindings.length > 0
    ? deterministicFindings.map(item => `- UID ${item.uid} [${item.severity}/${item.code}] ${item.message}`).join('\n')
    : '- 未发现确定性结构问题，仍需检查语义忠实度、重复与关键词质量。'}

--- 角色设定与原作证据 ---
${evidenceContext || '没有额外证据，只检查条目内部一致性与运行参数。'}

--- 用户在世界整合阶段的决定 ---
${discussionRecord || '无额外决定。'}

--- 待审计条目 JSON ---
${JSON.stringify({ entries: entries.map(serializeWorldBookEntry) }, null, 2)}

严格输出有效 JSON，并用以下标记包裹。entries 必须包含全部原 uid，数量和顺序不得改变：
<<<WORLDBOOK_AUDIT>>>
{"entries":[{"uid":0,"verdict":"pass","issues":[],"keys":["具体关键词"],"content":"完整条目内容","comment":"条目类型或备注","enabled":true,"constant":false,"selective":true,"order":100,"position":1,"depth":4,"role":0,"probability":100,"useProbability":true,"ignoreBudget":false,"preventRecursion":false,"excludeRecursion":false,"cooldown":null,"sticky":null,"delay":null}]}
<<<END_WORLDBOOK_AUDIT>>>`;
}

function extractMarkedBody(response: string, start: string, end: string): string | null {
  const startIndex = response.indexOf(start);
  const endIndex = response.indexOf(end);
  if (startIndex < 0 || endIndex <= startIndex) return null;
  return response.slice(startIndex + start.length, endIndex).trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

function stringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const items = value.filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean);
  return [...new Set(items)];
}

function optionalBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function boundedNumber(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function nullableNonNegativeNumber(value: unknown, fallback: number | null | undefined): number | null | undefined {
  if (value === null) return null;
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function parseWorldBookAuditResponse(
  response: string,
  originals: WorldBookEntry[],
): WorldBookAuditCandidate[] {
  const body = extractMarkedBody(response, '<<<WORLDBOOK_AUDIT>>>', '<<<END_WORLDBOOK_AUDIT>>>');
  if (!body) throw new Error('世界书审计结果缺少完整标记');

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new Error('世界书审计结果不是有效 JSON');
  }

  const rawEntries = payload && typeof payload === 'object' && Array.isArray((payload as { entries?: unknown }).entries)
    ? (payload as { entries: unknown[] }).entries
    : null;
  if (!rawEntries || rawEntries.length !== originals.length) {
    throw new Error('世界书审计不得新增或删除条目');
  }

  const rawByUid = new Map<number, Record<string, unknown>>();
  for (const raw of rawEntries) {
    if (!raw || typeof raw !== 'object') throw new Error('世界书审计条目格式无效');
    const item = raw as Record<string, unknown>;
    if (typeof item.uid !== 'number' || rawByUid.has(item.uid)) {
      throw new Error('世界书审计返回了无效或重复的 uid');
    }
    rawByUid.set(item.uid, item);
  }

  const candidates = originals.map(original => {
    const raw = rawByUid.get(original.uid);
    if (!raw) throw new Error(`世界书审计遗漏了 UID ${original.uid}`);
    const content = typeof raw.content === 'string' ? raw.content.trim() : original.content;
    const comment = typeof raw.comment === 'string' ? raw.comment.trim() : original.comment;
    const entry: WorldBookEntry = {
      ...original,
      keys: stringArray(raw.keys, original.keys),
      content,
      comment,
      enabled: optionalBoolean(raw.enabled, original.enabled),
      constant: optionalBoolean(raw.constant, original.constant),
      selective: optionalBoolean(raw.selective, original.selective),
      order: boundedNumber(raw.order, original.order, -10_000, 10_000),
      position: boundedNumber(raw.position, original.position, 0, 7),
      depth: boundedNumber(raw.depth, original.depth ?? 4, 0, 100),
      role: boundedNumber(raw.role, original.role ?? 0, 0, 2),
      probability: boundedNumber(raw.probability, original.probability ?? 100, 0, 100),
      useProbability: optionalBoolean(raw.useProbability, original.useProbability ?? true),
      ignoreBudget: optionalBoolean(raw.ignoreBudget, original.ignoreBudget ?? false),
      preventRecursion: optionalBoolean(raw.preventRecursion, original.preventRecursion ?? false),
      excludeRecursion: optionalBoolean(raw.excludeRecursion, original.excludeRecursion ?? false),
      cooldown: nullableNonNegativeNumber(raw.cooldown, original.cooldown),
      sticky: nullableNonNegativeNumber(raw.sticky, original.sticky),
      delay: nullableNonNegativeNumber(raw.delay, original.delay),
    };
    const issues = stringArray(raw.issues, []);
    return {
      entry,
      verdict: raw.verdict === 'revised' ? 'revised' as const : 'pass' as const,
      issues,
    };
  });

  const remainingFindings = findWorldBookAuditFindings(candidates.map(candidate => candidate.entry));
  return candidates.map(candidate => ({
    ...candidate,
    issues: [
      ...candidate.issues,
      ...remainingFindings
        .filter(item => item.uid === candidate.entry.uid)
        .map(item => item.message),
    ].filter((item, index, all) => all.indexOf(item) === index),
  }));
}

export function buildStageSummaryAuditPrompt(options: {
  stageNumber: number;
  stageTitle: string;
  previousStages: string;
  importedBase: string;
  discussionRecord: string;
  candidate: string;
}): string {
  return `你是独立的角色卡阶段审计 AI。另一位 AI 已经总结了阶段 ${options.stageNumber}“${options.stageTitle}”，请对照已有设定和用户本阶段的明确决定，直接返回修订后的完整阶段结论。

规则：
- 用户本阶段明确提出的创作决定优先；不要把 AI 在讨论中的建议当成用户确认。
- 没有被用户修改的导入事实必须保留，不能用更流畅但更空泛的说法替换。
- 不得新增姓名、外貌、经历、关系、动机、物件或时间线事实。
- 检查与之前阶段是否矛盾；无法确认的内容保留为未知，不替用户擅自拍板。
- 这是阶段结论，不要输出审计报告、寒暄或讨论过程。

--- 之前阶段的已确认内容 ---
${options.previousStages || '这是第一阶段。'}

--- 本阶段导入底稿 ---
${options.importedBase || '没有导入底稿，本阶段从用户讨论创建。'}

--- 本阶段完整讨论 ---
${options.discussionRecord}

--- 主生成 AI 的候选总结 ---
${options.candidate}

严格使用标记：
<<<AUDITED_RESULT>>>
（修订后的完整阶段结论）
<<<END_AUDITED_RESULT>>>`;
}

export function parseAuditedResult(response: string, minimumLength = 20): string {
  const result = extractMarkedBody(response, '<<<AUDITED_RESULT>>>', '<<<END_AUDITED_RESULT>>>');
  if (!result || result.length < minimumLength) throw new Error('独立审计结果不完整');
  return result;
}

export function buildFinalFieldAuditPrompt(options: {
  label: string;
  evidence: string;
  candidate: string;
  requiredMarkers: string[];
  extraRules?: string;
}): string {
  return `你是角色卡最终编译的独立审计 AI。主生成 AI 已把阶段资料转换成“${options.label}”字段块。请逐项核对并返回修订后的完整字段块。

规则：
- 只修复遗漏、错误归类、无依据补写、时间线倒灌、角色错位和格式错误。
- 正确内容原样保留，不为了显得有修改而改写文风。
- 不得从常识补齐证据中没有的信息。
- 必须保留这些字段标记：${options.requiredMarkers.map(marker => `【${marker}】`).join('、')}。
- 标记外不要解释，不要输出其他角色卡字段。
${options.extraRules || ''}

--- 已确认的阶段资料 ---
${options.evidence}

--- 待审计字段块 ---
${options.candidate}

<<<AUDITED_RESULT>>>
（修订后的完整字段块）
<<<END_AUDITED_RESULT>>>`;
}

export function parseAuditedFieldResult(
  response: string,
  requiredMarkers: string[],
): string {
  const result = parseAuditedResult(response, 10);
  const missing = requiredMarkers.filter(marker => !result.includes(`【${marker}】`));
  if (missing.length > 0) {
    throw new Error(`审计结果缺少字段标记：${missing.join('、')}`);
  }
  return result;
}
