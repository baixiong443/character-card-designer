import { create } from 'zustand';

export interface Character {
  name: string;
  description: string;
  first_mes: string;
  personality: string;
  scenario: string;
  mes_example: string;
  tags: string[];
  creator_notes?: string;
  system_prompt?: string;
  post_history_instructions?: string;
  alternate_greetings?: string[];
}

interface CharacterState {
  character: Character;
  updateField: (field: keyof Character, value: any) => void;
  resetCharacter: () => void;
  parseFromStageResults: (stageResults: string[]) => void;
}

const defaultCharacter: Character = {
  name: '',
  description: '',
  first_mes: '',
  personality: '',
  scenario: '',
  mes_example: '',
  tags: [],
  creator_notes: undefined,
  system_prompt: undefined,
  post_history_instructions: undefined,
  alternate_greetings: undefined,
};

/**
 * 从 stageResults 智能解析角色卡
 * 通用版本：适用于任何类型的角色
 */
function parseCharacterFromStages(stageResults: string[]): Character {
  const stage1 = stageResults[0] || '';
  const stage6 = stageResults[5] || '';
  const stage9 = stageResults[8] || ''; // 阶段9的AI结构化输出
  const allContent = stageResults.join('\n');
  
  // ========== 优先解析阶段9的结构化输出 ==========
  if (stage9 && stage9.length > 50 && stage9.includes('【角色名】')) {
    // 1. 提取【角色名】（支持换行后的内容）
    const nameMatch = stage9.match(/【角色名】\s*\n+\s*([^\n【]+)/);
    const name = nameMatch?.[1]?.trim() || '未命名角色';
    
    // 2. 提取【完整描述】：合并所有【完整描述】标记后的内容，直到遇到【角色名】
    // 匹配从开头到【角色名】之间的所有内容
    const beforeRoleName = stage9.split('【角色名】')[0];
    
    // 提取所有【完整描述】块并合并
    // 保留第一个【完整描述】标记，移除后续重复的
    let description = beforeRoleName.trim();
    
    // 如果有多个【完整描述】标记，只保留第一个
    const descriptionParts = description.split('【完整描述】').filter(s => s.trim());
    if (descriptionParts.length > 0) {
      description = '【完整描述】\n\n' + descriptionParts.join('\n\n').trim();
    }
    
    // 3. 提取其他字段（在【角色名】之后）
    const afterRoleName = stage9.split('【角色名】')[1] || '';
    
    const personality = afterRoleName.match(/【性格】\s*\n?\s*([\s\S]*?)(?=\n【|$)/)?.[1]?.trim() || '';
    const scenario = afterRoleName.match(/【场景设定】\s*\n?\s*([\s\S]*?)(?=\n【|$)/)?.[1]?.trim() || '';
    const first_mes = afterRoleName.match(/【首条消息】\s*\n?\s*([\s\S]*?)(?=\n【|$)/)?.[1]?.trim() || '';
    const mes_example = afterRoleName.match(/【对话示例】\s*\n?\s*([\s\S]*?)(?=\n【创作者备注|【系统提示词|【备用开场白|$)/)?.[1]?.trim() || '';
    
    // 可选字段
    const creator_notes = afterRoleName.match(/【创作者备注】\s*\n?\s*([\s\S]*?)(?=\n【|$)/)?.[1]?.trim() || undefined;
    const system_prompt = afterRoleName.match(/【系统提示词】\s*\n?\s*([\s\S]*?)(?=\n【|$)/)?.[1]?.trim() || undefined;
    
    // 备用开场白（支持 **备用开场1** 格式）
    const alternate_greetings_text = afterRoleName.match(/【备用开场白】\s*\n?\s*([\s\S]*?)$/)?.[1]?.trim();
    const alternate_greetings = alternate_greetings_text 
      ? alternate_greetings_text
          .split(/\*\*备用开场\d+[^*]*\*\*/)  // 按 **备用开场1** 分割
          .map(s => s.trim())
          .filter(s => s.length > 20)
      : undefined;
    
    // 智能标签提取
    const tags: string[] = [];
    const tagKeywords: Record<string, string[]> = {
      'Furry': ['兽人', 'furry', '肉垫', '尾巴', '兽耳'],
      '精灵': ['精灵', 'elf', '尖耳'],
      '人类': ['人类', 'human'],
      '机器人': ['机器人', 'robot', 'android', '义体'],
      '吸血鬼': ['吸血鬼', 'vampire'],
      'BL': ['BL', '男男', 'yaoi'],
      'GL': ['GL', '百合', 'yuri'],
      'RPG': ['RPG', '战斗系统', '技能', 'HP', 'MP'],
      'Psyche': ['Psyche', '深度感官'],
      'BDSM': ['BDSM', 'Dom', 'Sub'],
    };
    for (const [tag, keywords] of Object.entries(tagKeywords)) {
      if (keywords.some(keyword => allContent.includes(keyword))) {
        tags.push(tag);
      }
    }
    
    return {
      name,
      description,
      personality,
      scenario,
      first_mes,
      mes_example,
      tags: [...new Set(tags)],
      creator_notes,
      system_prompt,
      alternate_greetings,
    };
  }
  
  // ========== 备用方案：从前8个阶段手动解析 ========== 
  
  // ========== 1. 提取主角名字 ==========
  // 尝试多种模式，优先匹配"AI扮演"的角色
  let name = '未命名角色';
  
  // 模式1: "角色X：名字【...AI扮演】"
  const aiRoleMatch = allContent.match(/(?:角色\d*[：:]|###?\s*\*?\*?角色\d*[：:])\s*([^\s(（\n【]+)[\s\S]{0,50}?(?:AI扮演|主角)/);
  if (aiRoleMatch) {
    name = aiRoleMatch[1].trim();
  } else {
    // 模式2: 任何"角色X：名字"或"名称：名字"
    const generalNameMatch = stage1.match(/(?:角色\d*[：:]|名称[^：:]*[：:]|###?\s*\*?\*?)\s*([^\s(（\n【,，]+)/);
    if (generalNameMatch) {
      name = generalNameMatch[1].trim();
    }
  }
  
  // ========== 2. 综合描述 ==========
  // 智能过滤：只保留有实际内容的阶段
  const validStages = [
    stageResults[0], // 基础身份
    stageResults[1], // 深度背景
    stageResults[2], // 关系网络
    stageResults[3], // 物理描写
    stageResults[4], // 专项深化
  ].filter(s => 
    s && 
    s.length > 10 && 
    !s.includes('未能提取') && 
    !s.includes('跳过') &&
    !s.includes('文本未提及')
  );
  
  const description = validStages.join('\n\n---\n\n');
  
  // ========== 3. 性格提取 ==========
  // 尝试多个关键词
  const personalityKeywords = ['核心性格', '性格特征', '性格', 'personality'];
  let personality = '';
  
  for (const keyword of personalityKeywords) {
    const match = stage1.match(new RegExp(`${keyword}[：:：]([\s\S]*?)(?=\n\n|###|\\*\\*|$)`, 'i'));
    if (match && match[1].length > 5) {
      personality = match[1].trim();
      break;
    }
  }
  
  // ========== 4. 场景设定 ==========
  const scenario = stageResults[6] || '';
  
  // ========== 5. 首条消息 ==========
  // 尝试多种提取方式
  let first_mes = '';
  
  // 方式1: 匹配"首条消息"标题后的内容
  const firstMesPatterns = [
    /首条消息[：:][\s\S]*?(?:场景|内容|示例)[：:]\s*([\s\S]*?)(?=\*\*|###|---|\n\n状态|$)/i,
    /first[_\s]?mes[：:]?\s*([\s\S]*?)(?=\*\*|###|---|\n\n|$)/i,
    /开场[白对话][：:]?\s*([\s\S]*?)(?=\*\*|###|---|\n\n|$)/i,
  ];
  
  for (const pattern of firstMesPatterns) {
    const match = stage6.match(pattern);
    if (match && match[1].length > 10) {
      first_mes = match[1].trim();
      break;
    }
  }
  
  // ========== 6. 对话示例 ==========
  const examplePatterns = [
    /场景\d+[：:]([\s\S]*?)(?=场景\d+|###|$)/g,
    /示例\d+[：:]([\s\S]*?)(?=示例\d+|###|$)/g,
  ];
  
  let mes_example = '';
  for (const pattern of examplePatterns) {
    const matches = stage6.match(pattern);
    if (matches && matches.length > 0) {
      mes_example = matches.join('\n\n');
      break;
    }
  }
  
  // ========== 7. 智能标签提取 ==========
  const tags: string[] = [];
  
  // 动态关键词映射
  const tagKeywords: Record<string, string[]> = {
    'Furry': ['兽人', 'furry', '肉垫', '尾巴', '兽耳'],
    '精灵': ['精灵', 'elf', '尖耳'],
    '人类': ['人类', 'human'],
    '机器人': ['机器人', 'robot', 'android', '义体'],
    '吸血鬼': ['吸血鬼', 'vampire'],
    'BL': ['BL', '男男', 'yaoi'],
    'GL': ['GL', '百合', 'yuri'],
    'RPG': ['RPG', '战斗系统', '技能', 'HP', 'MP'],
    'Psyche': ['Psyche', '深度感官'],
    'BDSM': ['BDSM', 'Dom', 'Sub'],
  };
  
  // 检测所有关键词
  for (const [tag, keywords] of Object.entries(tagKeywords)) {
    if (keywords.some(keyword => allContent.includes(keyword))) {
      tags.push(tag);
    }
  }
  
  // 去重
  const uniqueTags = [...new Set(tags)];
  
  return {
    name,
    description,
    first_mes,
    personality,
    scenario,
    mes_example,
    tags: uniqueTags,
  };
}

export const useCharacterStore = create<CharacterState>((set) => ({
  character: defaultCharacter,
  updateField: (field, value) =>
    set((state) => ({
      character: { ...state.character, [field]: value },
    })),
  resetCharacter: () => set({ character: defaultCharacter }),
  parseFromStageResults: (stageResults) => {
    const parsedCharacter = parseCharacterFromStages(stageResults);
    set({ character: parsedCharacter });
  },
}));