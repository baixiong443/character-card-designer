import type { EditableCharacterCard } from '@/lib/characterCard';

const TAG_KEYWORDS: Record<string, string[]> = {
  Furry: ['兽人', 'furry', '肉垫', '尾巴', '兽耳'],
  精灵: ['精灵', 'elf', '尖耳'],
  人类: ['人类', 'human'],
  机器人: ['机器人', 'robot', 'android', '义体'],
  吸血鬼: ['吸血鬼', 'vampire'],
  BL: ['BL', '男男', 'yaoi'],
  GL: ['GL', '百合', 'yuri'],
  RPG: ['RPG', '战斗系统', '技能', 'HP', 'MP'],
  Psyche: ['Psyche', '深度感官'],
  BDSM: ['BDSM', 'Dom', 'Sub'],
};

function inferTags(content: string): string[] {
  return Object.entries(TAG_KEYWORDS)
    .filter(([, keywords]) => keywords.some(keyword => content.toLowerCase().includes(keyword.toLowerCase())))
    .map(([tag]) => tag);
}

function extractMarkedField(content: string, labels: string[]): string | undefined {
  const escaped = labels.map(label => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return content.match(new RegExp(`【(?:${escaped})】\\s*([\\s\\S]*?)(?=\\n【|$)`))?.[1]?.trim() || undefined;
}

function normalizeOptionalPrompt(value?: string): string | undefined {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  if (/^[（(]?\s*(?:留空|无|不设置|未设置|未填写|none|n\/?a|null)\s*[）)]?$/i.test(normalized)) {
    return undefined;
  }
  return normalized;
}

function parseAlternateGreetings(value?: string): string[] | undefined {
  if (!value) return undefined;
  const greetings = value
    .split(/(?:\n\s*---+\s*\n|\*\*备用开场\d+[^*]*\*\*|\n\s*\d+[.、]\s*)/)
    .map(item => item.trim())
    .filter(Boolean);
  return greetings.length > 0 ? greetings : undefined;
}

function parseStructuredFinal(stage9: string, allContent: string): EditableCharacterCard {
  const name = extractMarkedField(stage9, ['角色名'])?.split('\n')[0]?.trim() || '未命名角色';
  const descriptionBlocks = stage9
    .split('【角色名】')[0]
    .split('【完整描述】')
    .map(block => block.trim())
    .filter(Boolean);
  const description = descriptionBlocks[descriptionBlocks.length - 1] || '';
  const explicitTags = extractMarkedField(stage9, ['标签'])
    ?.split(/[,，、\n]/)
    .map(tag => tag.trim())
    .filter(Boolean);

  const creatorNotes = extractMarkedField(stage9, ['创作者备注']);
  const systemPrompt = normalizeOptionalPrompt(extractMarkedField(stage9, ['系统提示词']));
  const postHistory = normalizeOptionalPrompt(extractMarkedField(stage9, ['后历史指令', '后续指令']));
  const alternateGreetings = parseAlternateGreetings(extractMarkedField(stage9, ['备用开场白']));

  return {
    name,
    description,
    personality: extractMarkedField(stage9, ['性格']) || '',
    scenario: extractMarkedField(stage9, ['场景设定']) || '',
    first_mes: extractMarkedField(stage9, ['首条消息']) || '',
    mes_example: extractMarkedField(stage9, ['对话示例']) || '',
    tags: explicitTags?.length ? [...new Set(explicitTags)] : inferTags(allContent),
    ...(creatorNotes ? { creator_notes: creatorNotes } : {}),
    ...(systemPrompt ? { system_prompt: systemPrompt } : {}),
    ...(postHistory ? { post_history_instructions: postHistory } : {}),
    ...(alternateGreetings ? { alternate_greetings: alternateGreetings } : {}),
  };
}

function extractFallbackName(stage1: string, allContent: string): string {
  return allContent.match(/(?:角色\d*[：:]|###?\s*\*?\*?角色\d*[：:])\s*([^\s(（\n【]+)[\s\S]{0,80}?(?:AI扮演|主角)/)?.[1]?.trim()
    || stage1.match(/(?:角色\d*[：:]|名称[^：:]*[：:])\s*([^\s(（\n【,，]+)/)?.[1]?.trim()
    || '未命名角色';
}

function extractFallbackPersonality(stage1: string): string {
  for (const keyword of ['核心性格', '性格特征', '性格', 'personality']) {
    const match = stage1.match(new RegExp(`${keyword}[：:]([\\s\\S]*?)(?=\\n\\n|###|\\*\\*|$)`, 'i'));
    const value = match?.[1]?.trim();
    if (value && value.length > 5) return value;
  }
  return '';
}

function extractFallbackFirstMessage(interaction: string): string {
  const patterns = [
    /首条消息[：:]\s*([\s\S]*?)(?=\n\n(?:对话示例|###|---)|$)/i,
    /first[_\s]?mes[：:]?\s*([\s\S]*?)(?=\n\n|$)/i,
    /开场[白对话][：:]?\s*([\s\S]*?)(?=\n\n|$)/i,
  ];
  for (const pattern of patterns) {
    const value = interaction.match(pattern)?.[1]?.trim();
    if (value) return value;
  }
  return '';
}

export function parseCharacterFromStages(stageResults: string[]): EditableCharacterCard {
  const stage1 = stageResults[0] || '';
  const interaction = stageResults[5] || '';
  const stage9 = stageResults[8] || '';
  const allContent = stageResults.join('\n');

  if (stage9.length > 20 && stage9.includes('【角色名】')) {
    return parseStructuredFinal(stage9, allContent);
  }

  const description = stageResults
    .slice(0, 5)
    .filter(content => content?.trim()
      && !content.includes('未能提取')
      && !content.includes('文本未提及')
      && !content.includes('【用户选择跳过专项深化】'))
    .join('\n\n---\n\n');

  const exampleBlocks = interaction.match(/<START>[\s\S]*?(?=<START>|$)/g)
    || interaction.match(/(?:场景|示例)\d+[：:][\s\S]*?(?=(?:场景|示例)\d+[：:]|$)/g)
    || [];

  return {
    name: extractFallbackName(stage1, allContent),
    description,
    first_mes: extractFallbackFirstMessage(interaction),
    personality: extractFallbackPersonality(stage1),
    scenario: stageResults[6] || '',
    mes_example: exampleBlocks.join('\n\n').trim(),
    tags: inferTags(allContent),
  };
}
