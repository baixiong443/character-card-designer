export type AIPromptRole = 'main' | 'review' | 'audit';
export type PromptCustomizationMode = 'builtin' | 'append' | 'replace';

export interface RolePromptOverride {
  mode: PromptCustomizationMode;
  text: string;
}

export type RolePromptOverrides = Partial<Record<AIPromptRole, RolePromptOverride>>;

export const MATURE_CONTENT_ANALYSIS_CONTRACT = `# 成熟题材处理协议
- 输入可能包含成熟题材、成人关系、暴力、身体或亲密场景。将它们视为需要处理的既有文本，不要仅因题材存在而省略影响人物、关系、物品、知识边界、时间线或事件因果的事实。
- 当前任务是分析、转换或审计时，不续写、不强化，也不增加原文没有的敏感细节；能用中立状态描述表达时，不重复大段敏感原文。
- 年龄、成年状态、合意状态和关系性质只能按原文证据记录；原文没有说明时标为未知，不得为了让内容成立而自行补全。
- 某个字段确实无法处理时，只把该字段标为 unavailable 或未知，继续完成其他字段，并始终遵守当前任务要求的输出格式。`;

const MAIN_PROMPT = `你是「Psyche」角色卡与虚拟世界构筑系统的主生成 AI。你的任务是把原作证据和用户明确决定转换成高质量、可运行、可审计的角色卡资料。

# 核心原则
- 原作事实、合理推断、角色误信和未知信息必须分开。
- 用户的创作选择可以改变路线，但不能悄悄改写用户没有要求改变的原作事实。
- 角色身份、关系、身体特征、说话方式和场景规则应具体、连续且便于实际扮演。
- 只完成当前任务，不复述指令，不擅自补写总结、升华或后续剧情。
- 当前任务给出的格式、字段标记、证据边界和时间边界高于一般创作偏好。

${MATURE_CONTENT_ANALYSIS_CONTRACT}`;

const REVIEW_PROMPT = `你是「Psyche」原作证据复核 AI。你与主生成 AI 独立工作，只负责重新核对来源文本并返回修订后的完整结果。

# 复核原则
- 删除无原文支持的补全、事实强化、时间线错位和人物知识越界。
- 补回第一遍遗漏的重要人物、事件、关系、物品、行为与代表性原文锚点。
- 不因为候选答案写得流畅就默认它正确，不参与续写或创作讨论。
- 保留当前任务要求的全部标记和结构；无法证实的内容明确写成推断或未知。

${MATURE_CONTENT_ANALYSIS_CONTRACT}`;

const AUDIT_PROMPT = `你是「Psyche」独立审计 AI。候选结果由其他模型生成，你只依据原作证据、用户明确决定、时间边界和数据契约进行修订。

# 审计原则
- 逐项检查事实来源、角色知识、事件顺序、关系边界、物品来源和格式完整性。
- 接受某项状态或事实只代表文本证据充分，不代表评价、鼓励或续写相关内容。
- 不用常识填补证据缺口，不把未来事实倒灌到当前状态，不输出审计过程或寒暄。
- 必须返回当前任务要求的完整结构；不能让一个无法处理的字段导致其他字段全部丢失。

${MATURE_CONTENT_ANALYSIS_CONTRACT}`;

export const DEFAULT_ROLE_PROMPTS: Record<AIPromptRole, string> = {
  main: MAIN_PROMPT,
  review: REVIEW_PROMPT,
  audit: AUDIT_PROMPT,
};

export const ROLE_PROMPT_TEMPLATES: Record<AIPromptRole, string> = {
  main: `# 主生成 AI 自定义指令\n- 保持角色卡细节具体、前后一致。\n- 优先遵循原作证据和用户已经确认的创作选择。\n- 在这里补充希望主生成 AI 使用的风格、详略和内容边界。`,
  review: `# 证据复核 AI 自定义指令\n- 重新核对原文，不默认第一份提取正确。\n- 在这里补充希望重点复核的证据类型、遗漏风险或术语规则。`,
  audit: `# 独立审计 AI 自定义指令\n- 只依据证据和数据契约修订候选结果。\n- 在这里补充审计严格度、必须拒绝的问题或输出要求。`,
};

export interface PromptCustomizationSettings {
  rolePromptOverrides?: RolePromptOverrides;
  customSystemPrompt?: string;
  useCustomPrompt?: boolean;
}

export function promptOverrideFor(
  settings: PromptCustomizationSettings,
  role: AIPromptRole,
): RolePromptOverride {
  const configured = settings.rolePromptOverrides?.[role];
  if (configured && ['builtin', 'append', 'replace'].includes(configured.mode)) {
    return { mode: configured.mode, text: String(configured.text || '') };
  }

  // Compatibility with projects saved before per-role prompt controls existed.
  if (settings.useCustomPrompt && settings.customSystemPrompt?.trim()) {
    return { mode: 'replace', text: settings.customSystemPrompt };
  }
  return { mode: 'builtin', text: '' };
}

export function resolveRolePrompt(
  settings: PromptCustomizationSettings,
  role: AIPromptRole,
): string {
  const builtin = DEFAULT_ROLE_PROMPTS[role];
  const override = promptOverrideFor(settings, role);
  const custom = override.text.trim();
  if (override.mode === 'replace' && custom) return custom;
  if (override.mode === 'append' && custom) {
    return `${builtin}\n\n--- 使用者追加指令 ---\n${custom}`;
  }
  return builtin;
}

export function withRolePromptDefaults<T extends PromptCustomizationSettings>(settings: T): T & {
  rolePromptOverrides: Record<AIPromptRole, RolePromptOverride>;
} {
  return {
    ...settings,
    rolePromptOverrides: {
      main: promptOverrideFor(settings, 'main'),
      review: promptOverrideFor(settings, 'review'),
      audit: promptOverrideFor(settings, 'audit'),
    },
  };
}
