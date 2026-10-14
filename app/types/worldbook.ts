/* eslint-disable @typescript-eslint/no-explicit-any -- Lorebook extensions are an open third-party namespace. */
/**
 * World Book / Lorebook Types
 * Based on SillyTavern Character Card V3 specification
 */

/**
 * 世界书条目接口
 * 基于 SillyTavern 源码的默认值定义
 */
export interface WorldBookEntry {
  // === 必填字段 ===
  uid: number;                    // 唯一ID
  keys: string[];                 // 主关键词
  content: string;                // 条目内容
  
  // === 核心设置 ===
  enabled: boolean;               // 是否启用
  constant: boolean;              // 永久激活（忽略关键词）
  selective: boolean;             // 选择性触发
  order: number;                  // 插入顺序（数字越小越早注入）
  position: number;               // 插入位置（0=before_char, 1=after_char）
  
  // === 备注与辅助 ===
  comment?: string;               // 备注说明
  keysecondary?: string[];        // 备用关键词
  
  // === 扫描与触发 ===
  depth?: number;                 // 扫描深度
  scanDepth?: number | null;      // 扫描深度（null=使用全局设置）
  probability?: number;           // 触发概率（0-100）
  useProbability?: boolean;       // 是否使用概率机制
  
  // === 匹配选项 ===
  caseSensitive?: boolean | null; // 区分大小写（null=全局设置）
  matchWholeWords?: boolean | null; // 全词匹配（null=全局设置）
  selectiveLogic?: number;        // 逻辑类型（0=AND_ANY）
  
  // === 递归控制 ===
  excludeRecursion?: boolean;     // 不被递归触发
  preventRecursion?: boolean;     // 不触发其他条目
  delayUntilRecursion?: number;   // 延迟到递归步骤
  
  // === 分组功能 ===
  group?: string;                 // 分组名称
  groupOverride?: boolean;        // 覆盖分组设置
  groupWeight?: number;           // 分组权重
  useGroupScoring?: boolean | null; // 使用分组评分
  
  // === 时间控制 ===
  sticky?: number | null;         // 粘性（保持N轮）
  cooldown?: number | null;       // 冷却（N轮内不再触发）
  delay?: number | null;          // 延迟（N轮后触发）
  
  // === 其他高级选项 ===
  role?: number;                  // 角色类型
  vectorized?: boolean;           // 向量化搜索
  automationId?: string;          // 自动化ID
  outletName?: string;            // 命名提示出口
  triggers?: string[];             // 触发器列表
  ignoreBudget?: boolean;          // 忽略世界书预算
  matchPersonaDescription?: boolean;
  matchCharacterDescription?: boolean;
  matchCharacterPersonality?: boolean;
  matchCharacterDepthPrompt?: boolean;
  matchScenario?: boolean;
  matchCreatorNotes?: boolean;

  // 原始数据保真：编辑器未识别的第三方字段仍在导出时保留
  source?: Record<string, any>;
  extensions?: Record<string, any>;
}

/**
 * 世界书完整结构
 */
export interface WorldBook {
  name?: string;                  // 世界书名称
  entries: WorldBookEntry[];      // 条目列表
}

/**
 * Character Card V3 中的 character_book 格式
 */
export interface CharacterBook {
  name?: string;
  description?: string;
  scan_depth?: number;            // 全局扫描深度
  token_budget?: number;          // token预算
  recursive_scanning?: boolean;   // 递归扫描
  extensions?: Record<string, any>;
  entries: CharacterBookEntry[];
}

/**
 * Character Card V3 条目格式（导出时使用）
 */
export interface CharacterBookEntry {
  id?: number;                    // 条目ID
  keys: string[];                 // 主关键词
  secondary_keys?: string[];      // 备用关键词
  comment?: string;               // 备注
  content: string;                // 内容
  constant: boolean;              // 永久激活
  selective: boolean;             // 选择性触发
  insertion_order: number;        // 插入顺序
  enabled: boolean;               // 是否启用
  position: string;               // 插入位置
  use_regex?: boolean;            // 使用正则表达式
  extensions: Record<string, any> & {
    position?: number;
    exclude_recursion?: boolean;
    display_index?: number;
    probability?: number;
    useProbability?: boolean;
    depth?: number;
    selectiveLogic?: number;
    group?: string;
    group_override?: boolean;
    group_weight?: number;
    prevent_recursion?: boolean;
    delay_until_recursion?: boolean | number;
    scan_depth?: number | null;
    match_whole_words?: boolean | null;
    use_group_scoring?: boolean | null;
    case_sensitive?: boolean | null;
    automation_id?: string;
    role?: number;
    vectorized?: boolean;
    sticky?: number | null;
    cooldown?: number | null;
    delay?: number | null;
  };
  [key: string]: any;
}

/**
 * 默认值常量
 */
export const WORLDBOOK_DEFAULTS = {
  // 核心默认值（来自 SillyTavern 源码）
  DEFAULT_DEPTH: 4,
  DEFAULT_ORDER: 100,
  DEFAULT_WEIGHT: 100,
  DEFAULT_PROBABILITY: 100,
  DEFAULT_POSITION: 1, // after_char
  
  // 全局设置
  DEFAULT_SCAN_DEPTH: 2,
  DEFAULT_TOKEN_BUDGET: 2048,
  DEFAULT_RECURSIVE_SCANNING: false,
};

/**
 * 创建新的世界书条目（带默认值）
 */
export function createDefaultWorldBookEntry(uid: number): WorldBookEntry {
  return {
    uid,
    keys: [],
    content: '',
    enabled: true,
    constant: false,
    selective: true,
    order: WORLDBOOK_DEFAULTS.DEFAULT_ORDER,
    position: WORLDBOOK_DEFAULTS.DEFAULT_POSITION,
    comment: '',
    keysecondary: [],
    depth: WORLDBOOK_DEFAULTS.DEFAULT_DEPTH,
    scanDepth: null,
    probability: WORLDBOOK_DEFAULTS.DEFAULT_PROBABILITY,
    useProbability: true,
    caseSensitive: null,
    matchWholeWords: null,
    selectiveLogic: 0,
    excludeRecursion: false,
    preventRecursion: false,
    delayUntilRecursion: 0,
    group: '',
    groupOverride: false,
    groupWeight: WORLDBOOK_DEFAULTS.DEFAULT_WEIGHT,
    useGroupScoring: null,
    sticky: null,
    cooldown: null,
    delay: null,
    role: 0,
    vectorized: false,
    automationId: '',
    outletName: '',
    triggers: [],
    ignoreBudget: false,
    matchPersonaDescription: false,
    matchCharacterDescription: false,
    matchCharacterPersonality: false,
    matchCharacterDepthPrompt: false,
    matchScenario: false,
    matchCreatorNotes: false,
    source: undefined,
    extensions: {},
  };
}

/**
 * 将内部格式转换为 Character Card V3 导出格式
 */
export function convertToCharacterBookEntry(entry: WorldBookEntry): CharacterBookEntry {
  // position 映射：0=before_char, 1=after_char
  const positionMap: Record<number, string> = {
    0: 'before_char',
    1: 'after_char',
  };

  const source = entry.source ? JSON.parse(JSON.stringify(entry.source)) : {};
  const sourceExtensions = entry.extensions
    ? JSON.parse(JSON.stringify(entry.extensions))
    : (source.extensions && typeof source.extensions === 'object' ? source.extensions : {});

  return {
    ...source,
    id: entry.uid,
    keys: entry.keys,
    secondary_keys: entry.keysecondary || [],
    comment: entry.comment || '',
    content: entry.content,
    constant: entry.constant,
    selective: entry.selective,
    insertion_order: entry.order,
    enabled: entry.enabled,
    position: positionMap[entry.position] || 'after_char',
    use_regex: source.use_regex ?? false,
    extensions: {
      ...sourceExtensions,
      position: entry.position,
      exclude_recursion: entry.excludeRecursion ?? false,
      display_index: sourceExtensions.display_index ?? entry.uid,
      probability: entry.probability ?? WORLDBOOK_DEFAULTS.DEFAULT_PROBABILITY,
      useProbability: entry.useProbability ?? true,
      depth: entry.depth ?? WORLDBOOK_DEFAULTS.DEFAULT_DEPTH,
      selectiveLogic: entry.selectiveLogic ?? 0,
      outlet_name: entry.outletName ?? '',
      group: entry.group ?? '',
      group_override: entry.groupOverride ?? false,
      group_weight: entry.groupWeight ?? WORLDBOOK_DEFAULTS.DEFAULT_WEIGHT,
      prevent_recursion: entry.preventRecursion ?? false,
      delay_until_recursion: entry.delayUntilRecursion || false,
      scan_depth: entry.scanDepth ?? null,
      match_whole_words: entry.matchWholeWords ?? null,
      use_group_scoring: entry.useGroupScoring ?? null,
      case_sensitive: entry.caseSensitive ?? null,
      automation_id: entry.automationId ?? '',
      role: entry.role ?? 0,
      vectorized: entry.vectorized ?? false,
      sticky: entry.sticky ?? null,
      cooldown: entry.cooldown ?? null,
      delay: entry.delay ?? null,
      triggers: entry.triggers ?? [],
      ignore_budget: entry.ignoreBudget ?? false,
      match_persona_description: entry.matchPersonaDescription ?? false,
      match_character_description: entry.matchCharacterDescription ?? false,
      match_character_personality: entry.matchCharacterPersonality ?? false,
      match_character_depth_prompt: entry.matchCharacterDepthPrompt ?? false,
      match_scenario: entry.matchScenario ?? false,
      match_creator_notes: entry.matchCreatorNotes ?? false,
    },
  };
}

/**
 * 将 Character Card V3 格式转换为内部格式
 */
export function convertFromCharacterBookEntry(entry: CharacterBookEntry, fallbackUid = 0): WorldBookEntry {
  // position 映射：反向
  const positionMap: Record<string, number> = {
    'before_char': 0,
    'after_char': 1,
  };

  return {
    uid: entry.id ?? fallbackUid,
    keys: entry.keys || [],
    content: entry.content || '',
    enabled: entry.enabled ?? true,
    constant: entry.constant ?? false,
    selective: entry.selective ?? true,
    order: entry.insertion_order ?? WORLDBOOK_DEFAULTS.DEFAULT_ORDER,
    position: entry.extensions?.position ?? positionMap[entry.position] ?? WORLDBOOK_DEFAULTS.DEFAULT_POSITION,
    comment: entry.comment,
    keysecondary: entry.secondary_keys,
    depth: entry.extensions?.depth,
    scanDepth: entry.extensions?.scan_depth,
    probability: entry.extensions?.probability,
    useProbability: entry.extensions?.useProbability,
    caseSensitive: entry.extensions?.case_sensitive,
    matchWholeWords: entry.extensions?.match_whole_words,
    selectiveLogic: entry.extensions?.selectiveLogic,
    excludeRecursion: entry.extensions?.exclude_recursion,
    preventRecursion: entry.extensions?.prevent_recursion,
    delayUntilRecursion: typeof entry.extensions?.delay_until_recursion === 'number'
      ? entry.extensions.delay_until_recursion
      : entry.extensions?.delay_until_recursion ? 1 : 0,
    group: entry.extensions?.group,
    groupOverride: entry.extensions?.group_override,
    groupWeight: entry.extensions?.group_weight,
    useGroupScoring: entry.extensions?.use_group_scoring,
    sticky: entry.extensions?.sticky,
    cooldown: entry.extensions?.cooldown,
    delay: entry.extensions?.delay,
    role: entry.extensions?.role,
    vectorized: entry.extensions?.vectorized,
    automationId: entry.extensions?.automation_id,
    outletName: entry.extensions?.outlet_name,
    triggers: entry.extensions?.triggers,
    ignoreBudget: entry.extensions?.ignore_budget,
    matchPersonaDescription: entry.extensions?.match_persona_description,
    matchCharacterDescription: entry.extensions?.match_character_description,
    matchCharacterPersonality: entry.extensions?.match_character_personality,
    matchCharacterDepthPrompt: entry.extensions?.match_character_depth_prompt,
    matchScenario: entry.extensions?.match_scenario,
    matchCreatorNotes: entry.extensions?.match_creator_notes,
    source: JSON.parse(JSON.stringify(entry)),
    extensions: entry.extensions ? JSON.parse(JSON.stringify(entry.extensions)) : {},
  };
}

