'use client';

import { useState } from 'react';
import { Sparkles, Send, Loader, Download, ChevronLeft, ChevronRight, CheckCircle, FileUp, FileJson, RefreshCw, AlertCircle, X, Plus, Save, Trash2 } from 'lucide-react';
import { useAIService } from '@/services/aiService';
import ExportDialog from '@/components/ExportDialog';
import ImportTextDialog from '@/components/ImportTextDialog';
import ImportCardDialog from '@/components/ImportCardDialog';
import WorldBookEditor from '@/components/WorldBookEditor';
import ProjectSelector from '@/components/ProjectSelector';
import { useProgressStore } from '@/stores/progressStore';
import { useCharacterStore } from '@/stores/characterStore';

const STAGES = [
  '基础身份',
  '深度背景',
  '关系网络',
  '物理描写',
  '专项深化',
  '互动设计',
  '世界整合',
  '质量检查',
  '导出',
];

// 专项深化类型（12个，3x4布局对称）
const SPECIALTY_TYPES = [
  {
    id: 'psyche',
    name: 'Psyche深度',
    icon: '🔥',
    description: 'Furry/BL/Fetish感官细节',
    tags: ['Furry', 'BL', '感官', 'Fetish'],
  },
  {
    id: 'combat',
    name: '战斗冒险',
    icon: '⚔️',
    description: 'RPG/跑团/战斗系统',
    tags: ['RPG', '跑团', '战斗', '冒险'],
  },
  {
    id: 'romance',
    name: '恋爱互动',
    icon: '💕',
    description: '恋爱游戏/甜文互动',
    tags: ['恋爱', '互动', '甜文', '情感'],
  },
  {
    id: 'horror',
    name: '恐怖诡异',
    icon: '👻',
    description: '恐怖游戏/克苏鲁',
    tags: ['恐怖', '克苏鲁', '惊悚', '诡异'],
  },
  {
    id: 'slice_of_life',
    name: '日常治愈',
    icon: '☀️',
    description: '温馨日常/治愈系',
    tags: ['日常', '治愈', '温馨', '生活'],
  },
  {
    id: 'serious',
    name: '严肃剧情',
    icon: '📖',
    description: '深度剧情/文学向',
    tags: ['文学', '深度', '剧情', '成长'],
  },
  {
    id: 'comedy',
    name: '喜剧搞笑',
    icon: '😄',
    description: '幽默搞笑/轻松向',
    tags: ['喜剧', '搞笑', '幽默', '吐槽'],
  },
  {
    id: 'scifi',
    name: '科幻硬核',
    icon: '🤖',
    description: '赛博朋克/机甲科幻',
    tags: ['科幻', '赛博朋克', '机甲', 'AI'],
  },
  {
    id: 'fantasy',
    name: '奇幻魔法',
    icon: '✨',
    description: '魔法系统/奇幻世界',
    tags: ['魔法', '奇幻', '法术', '种族'],
  },
  {
    id: 'school',
    name: '学园校园',
    icon: '🎓',
    description: '校园生活/青春故事',
    tags: ['校园', '学园', '社团', '青春'],
  },
  {
    id: 'wuxia',
    name: '武侠历史',
    icon: '🗡️',
    description: '武功招式/古风江湖',
    tags: ['武侠', '古风', '江湖', '武功'],
  },
  {
    id: 'idol',
    name: '偶像娱乐',
    icon: '🎭',
    description: '偶像养成/演艺圈',
    tags: ['偶像', '娱乐', '舞台', '粉丝'],
  },
];

// 专项深化的提示词（根据类型选择）
const SPECIALTY_PROMPTS: Record<string, string> = {
  psyche: `【阶段4：Psyche深度感官】
基于已有的角色设定，现在进行极致的感官细节深化。请详细创作：

🔥 Furry特征（如果是兽人角色）：
- 毛皮质感（柔软度、密度、触摸手感、季节变化）
- 肉垫描写（柔软温暖的粉色肉球、弹性、触感）
- 尾巴动态（摇摆、夹紧、蓬松时的状态、情绪表达）
- 兽耳特征（形状、活动方式、敏感度）
- 发情特征（信息素气味、体温变化、生理反应）

👨 男性特征（如果是男性角色）：
- 足部细节（脚型、脚趾形状、足弓、脚底质感）
- 袜子描写（白袜/黑袜、纹理、磨损、汗湿后的气味）
- 内裤特征（款式、颜色、凸起轮廓、面料质感）
- 体毛分布（腿毛、腋毛、胸毛、体味源）
- 男性气味（汗味、雄性麝香、运动后的体香）

👃 嗅觉特写：
- 体香（皮肤的自然气味、种族特有香味）
- 汗味（运动后、紧张时、发情时）
- 信息素（雄性/雌性信息素、吸引力）
- 衣物气味（袜子、鞋子、内衣的独特气味）

🦶 Fetish元素（如适用）：
- 运动鞋（款式、磨损程度、鞋垫气味、脱鞋瞬间）
- 肉垫崇拜（软糯触感、温热、按压时的弹性）
- 袜子fetish（棉袜纹理、丝袜质感、运动袜）
- 足部崇拜（脚趾、足弓、足底的视觉与触觉）

使用Psyche系统的T1（微观触觉）和T2（全感官饱和）标准进行描写。`,

  combat: `【阶段4：战斗冒险专项】
基于已有的角色设定，现在深化战斗和冒险相关的细节。请详细设计：

⚔️ 战斗风格：
- 主要武器（类型、外观、使用方式、特殊能力）
- 战斗姿态（攻击型/防御型、灵活/强力）
- 招牌技能（2-3个核心技能、释放方式、效果）
- 战斗习惯（先手/后发、近战/远程、单挑/团队）

🎯 职业能力：
- 职业定位（战士/法师/刺客/牧师等）
- 核心能力（法术/特技/天赋树）
- 技能列表（主动技能、被动技能、终极技）
- 资源系统（魔力/体力/怒气/能量）

🛡️ 装备与道具：
- 主武器详细描写（外观、材质、附魔、来历）
- 护甲装备（防御力、材质、特殊效果）
- 随身道具（药水、卷轴、特殊物品）
- 装备特效（发光、粒子效果、音效）

📊 数值与特性：
- 属性数值（力量、敏捷、智力、体质、魅力、幸运）
- 优势与弱点（擅长什么、害怕什么）
- 成长路线（初期→中期→后期的发展）

适合跑团（DND/COC）、RPG游戏、战斗向小说。`,

  romance: `【阶段4：恋爱互动专项】
基于已有的角色设定，现在深化恋爱和情感互动的细节。请详细创作：

💕 恋爱人格：
- 恋爱类型（傲娇/温柔/病娇/天然呆/毒舌/冰山）
- 感情表达（主动/被动、直接/含蓄）
- 吃醋反应（如何表现嫉妒）
- 撒娇方式（如何示弱、索要关注）

💖 亲密互动：
- 牵手反应（第一次、习惯后、在公共场合）
- 拥抱时刻（何时想拥抱、拥抱的方式、持续时间）
- 接吻描写（初吻、日常、深吻的不同反应）
- 肢体接触（头部、肩膀、腰、手的触碰反应）

😊 情感细节：
- 害羞表现（脸红、结巴、回避眼神、小动作）
- 开心时刻（笑容、兴奋、撒欢）
- 生气吵架（冷战/爆发、和好方式）
- 关心方式（如何表达在乎、照顾对方）

📈 好感度阶段：
- 陌生期（初次见面、第一印象）
- 熟悉期（建立友谊、了解彼此）
- 暧昧期（心动瞬间、试探、暗恋）
- 恋人期（确认关系后的相处）

🌹 浪漫场景：
- 约会活动（喜欢的约会类型、理想约会地点）
- 纪念日（如何庆祝、送礼物的风格）
- 告白场景（理想的告白方式、回应）
- 甜蜜日常（早安晚安、日常小互动）

适合恋爱游戏、互动小说、甜文创作。`,

  horror: `【阶段4：恐怖诡异专项】
基于已有的角色设定，现在深化恐怖和诡异元素。请详细创作：

👻 诡异特征：
- 不自然之处（身体某部分的异常、违和感）
- 诡异习惯（重复行为、古怪癖好、禁忌动作）
- 视觉恐怖（扭曲、腐烂、异形、缺失）
- 听觉恐怖（诡异笑声、呓语、无声）

😨 恐怖氛围：
- 压迫感（存在本身带来的不适）
- 不安源（让人本能恐惧的要素）
- 环境影响（周围环境的异变）
- 温度变化（冰冷、炙热、忽冷忽热）

🔮 超自然能力：
- 诅咒能力（施加恐惧、厄运、疾病）
- 预知死亡（预见灾难、死亡预兆）
- 精神侵蚀（影响他人理智、植入恐惧）
- 扭曲现实（改变感知、制造幻觉）

💀 恐怖描写：
- 生理恐怖（血肉、内脏、骨骼的暴露）
- 心理恐怖（疯狂、偏执、妄想、崩溃）
- 宇宙恐怖（不可名状、超越理解、渺小感）
- 日常恐怖（熟悉事物的扭曲）

📉 SAN值影响：
- 目击效果（看到角色时的理智下降）
- 互动后果（接触后的精神创伤）
- 疯狂症状（长期接触导致的异常）
- 恐惧阈值（不同人群的耐受度）

适合恐怖游戏、克苏鲁跑团、惊悚小说。`,

  slice_of_life: `【阶段4：日常治愈专项】
基于已有的角色设定，现在深化日常生活和治愈元素。请详细创作：

☀️ 日常习惯：
- 起床routine（几点起床、起床气、早晨习惯）
- 三餐喜好（最喜欢的食物、讨厌的食物、做饭技能）
- 睡前习惯（洗澡时间、睡前活动、睡眠姿势）
- 周末日常（如何度过休息日）

🎨 兴趣爱好：
- 主要爱好（绘画/阅读/运动/音乐等）
- 收藏癖好（收集什么、珍藏品）
- 放松方式（如何解压、喜欢的消遣）
- 特殊技能（会做什么特别的事）

🏠 生活细节：
- 房间布置（整洁/凌乱、装饰风格、私人空间）
- 私人物品（随身携带的东西、有特殊意义的物品）
- 衣着偏好（日常穿着、休闲服、睡衣）
- 季节反应（不同季节的变化）

😊 温馨互动：
- 做饭场景（会做什么菜、厨房里的样子）
- 聊天氛围（喜欢聊什么、话题偏好）
- 陪伴方式（如何陪伴他人、相处模式）
- 安慰手法（如何安慰难过的人）

💫 治愈要素：
- 笑容特写（笑起来的样子、治愈感）
- 温暖瞬间（让人感到温暖的小动作）
- 安心感（为什么让人觉得安心）
- 可爱举止（无意识的可爱行为、小习惯）

🌸 生活气息：
- 气味（家里的味道、身上的香味）
- 声音（脚步声、呼吸声、日常音效）
- 触感（皮肤温度、拥抱的感觉）

适合日常向、治愈系、温馨故事创作。`,

  serious: `【阶段4：严肃剧情专项】
基于已有的角色设定，现在深化深度剧情和角色成长。请详细创作：

🧠 内心世界：
- 内心冲突（道德困境、价值观冲突、抉择）
- 隐藏伤痛（不愿提起的过去、创伤根源）
- 矛盾人格（表面 vs 内心、理想 vs 现实）
- 自我认知（如何看待自己、自我评价）

📈 成长轨迹：
- 初期状态（故事开始时的心态、能力）
- 转折点（改变的契机、关键事件）
- 成长过程（如何一步步变化）
- 终点目标（最终想成为什么样的人）

💭 心理层次：
- 显性人格（外人看到的样子）
- 隐藏性格（只有亲近的人知道）
- 潜意识（连自己都没意识到的部分）
- 心理防御（如何保护自己）

🤔 哲学思考：
- 人生观（对生命意义的理解）
- 世界观（如何看待这个世界）
- 价值观（什么对TA最重要）
- 道德观（善恶标准、底线）

💔 创伤与治愈：
- 心理阴影（过去的伤痛、PTSD）
- 触发点（什么会引发痛苦回忆）
- 克服过程（如何面对、如何治愈）
- 支撑力量（什么让TA坚持下去）

🔗 复杂关系：
- 爱恨交织（复杂的情感纠葛）
- 背叛与原谅（信任的破碎与重建）
- 依赖与独立（关系中的平衡）
- 牺牲与补偿（为关系付出的代价）

📖 深度主题：
- 身份认同（我是谁、归属感）
- 自由与束缚（选择的代价）
- 孤独与连接（人际关系的本质）
- 生存与意义（活着的理由）

适合严肃文学、深度剧情、角色成长向创作。`,

  comedy: `【阶段4：喜剧搞笑专项】
基于已有的角色设定，现在深化喜剧和搞笑元素。请详细创作：

😄 幽默感：
- 笑点类型（冷笑话/双关语/肢体喜剧/黑色幽默）
- 搞笑方式（自嘲/吐槽/装傻/反差萌）
- 幽默时机（什么情况下会搞笑）
- 笑话品味（高级幽默/低俗笑话/文字游戏）

🎭 喜剧性格：
- 逗比行为（日常的搞笑举动、无厘头行为）
- 吐槽技能（如何吐槽他人、吐槽风格）
- 反应夸张度（对事物的夸张反应）
- 自黑能力（如何自嘲、自嘲底线）

🤪 搞笑设定：
- 反差萌（外表 vs 内在的反差）
- 倒霉体质（容易遇到搞笑倒霉事）
- 天然呆（不自觉的可爱举动）
- 吐槽役/搞笑役（在团队中的定位）

💬 喜剧对话：
- 口头禅（搞笑的口头禅、语癖）
- 梗王属性（经常说网络梗、流行梗）
- 抖包袱技巧（如何制造笑点）
- 接梗能力（如何回应他人的笑话）

🎪 搞笑场景：
- 日常搞笑（日常生活中的搞笑瞬间）
- 尴尬时刻（如何化解尴尬、制造笑料）
- 吐槽对象（最喜欢吐槽什么/谁）
- 被捉弄（如何应对他人的恶作剧）

🎨 幽默风格：
- 幽默程度（轻松/中度/重度搞笑）
- 笑点密度（多久来一个笑点）
- 喜剧类型（sitcom/闹剧/讽刺/荒诞）

适合搞笑漫画、轻松向小说、喜剧游戏。`,

  scifi: `【阶段4：科幻硬核专项】
基于已有的角色设定，现在深化科幻和科技元素。请详细创作：

🤖 科技改造：
- 改造部位（机械义肢、义眼、脑机接口、内脏）
- 改造功能（增强力量、数据处理、武器系统）
- 改造外观（金属质感、发光线路、可见机械）
- 改造副作用（过热、维护需求、兼容性问题）

🧠 智能系统：
- AI芯片（植入的AI助手、功能、个性）
- 数据界面（如何显示信息、HUD、全息投影）
- 网络连接（如何接入网络、黑客能力）
- 系统漏洞（可能被黑客入侵的弱点）

⚡ 科技装备：
- 主要装备（动力装甲、能量武器、护盾）
- 特殊道具（隐形装置、传送器、时间装置）
- 能源系统（能量来源、续航时间）
- 装备特效（能量流光、粒子效果、音效）

🌃 赛博朋克元素：
- 改造痕迹（霓虹灯纹身、发光眼睛、电路纹路）
- 街头风格（朋克装扮、科技配饰）
- 黑市交易（如何获得非法改造、黑市人脉）
- 公司背景（为哪个公司工作/曾工作）

🚀 科技原理：
- 技术解释（改造的科学原理、不要太玄）
- 局限性（技术的限制、代价、副作用）
- 维护需求（如何保养装备、故障风险）
- 升级路径（未来可能的强化方向）

🏙️ 未来设定：
- 时代背景（近未来/远未来、几几年）
- 科技水平（AI发展程度、太空殖民等）
- 社会结构（公司统治/AI管理/反乌托邦）
- 日常科技（交通工具、通讯方式、货币）

💉 生化元素（如适用）：
- 基因改造（基因增强、突变特征）
- 生化武器（病毒、寄生体、纳米机器人）
- 生理变化（不再需要睡眠、特殊食物）

适合赛博朋克、硬科幻、机甲、科幻游戏。`,

  fantasy: `【阶段4：奇幻魔法专项】
基于已有的角色设定，现在深化奇幻和魔法元素。请详细创作：

✨ 魔法系统：
- 魔法类型（元素/奥术/神圣/黑暗/自然）
- 魔力来源（内在魔力/外部借用/契约/血脉）
- 施法方式（咏唱/手势/魔法阵/意念）
- 魔法限制（消耗、冷却、材料、代价）

📖 法术列表：
- 招牌法术（3-5个最常用的法术）
- 法术效果（详细描述施法过程和效果）
- 法术威力（破坏力、范围、持续时间）
- 法术特效（视觉效果、音效、元素表现）

🔮 魔法道具：
- 法杖/魔导器（外观、材质、特殊能力）
- 魔法饰品（戒指、项链、护符功能）
- 魔法书（记录的法术、稀有度）
- 炼金物品（药水、卷轴、魔法物品）

🧙 职业定位：
- 法师类型（元素法师/召唤师/附魔师/死灵法师）
- 魔法等级（学徒/法师/大法师/传奇）
- 专精方向（攻击/防御/辅助/控制）
- 禁术掌握（禁忌魔法、黑魔法、代价）

🌟 种族天赋：
- 种族特性（精灵的魔法亲和/矮人的抗性）
- 血脉能力（龙裔喷火/恶魔变身）
- 种族魔法（种族独有的特殊法术）
- 寿命影响（长寿种族的魔法积累）

🏰 魔法世界观：
- 魔法普及度（魔法稀有/普遍/禁止）
- 魔法组织（魔法学院/法师工会/秘密结社）
- 魔法规则（世界的魔法法则、禁忌）
- 魔法生物（契约的魔宠、召唤兽）

⚔️ 战斗风格：
- 施法距离（远程炮台/中距游走/近战法师）
- 战术风格（爆发/持续/控制/辅助）
- 组合技（法术连携、元素反应）
- 弱点（魔法弱点、破解方式）

🎭 魔法代价：
- 使用代价（寿命/理智/肉体/灵魂）
- 失控风险（魔力暴走、被腐化）
- 魔法依赖（对魔法的依赖程度）

适合奇幻小说、魔法世界、DND、奇幻RPG。`,

  school: `【阶段4：学园校园专项】
基于已有的角色设定，现在深化校园生活元素。请详细创作：

🎓 学校身份：
- 学校类型（高中/大学/魔法学院/武校）
- 年级班级（几年几班、班级氛围）
- 学生地位（学霸/普通/问题学生/风云人物）
- 入学原因（为什么来这所学校）

📚 学业表现：
- 成绩水平（擅长科目、弱势科目）
- 学习态度（认真/摸鱼/考前突击）
- 特长技能（学习外的特长、才艺）
- 升学目标（理想大学/职业目标）

🏫 校园日常：
- 上学方式（走路/骑车/坐车、路上习惯）
- 午餐习惯（食堂/便当/外卖、和谁吃）
- 下课活动（社团/图书馆/闲逛/回家）
- 考试表现（考前/考中/考后的样子）

👥 人际关系：
- 朋友圈（最好的朋友、普通朋友）
- 班级定位（人缘/孤独/中心人物）
- 老师关系（和老师的相处方式）
- 暗恋对象（如有，暗恋谁、如何表现）

🎯 社团活动：
- 社团选择（什么社团、为什么加入）
- 社团职位（部长/成员/新人、职责）
- 社团日常（平时活动、训练、比赛）
- 社团成就（获得的荣誉、难忘经历）

💼 校园事件：
- 青春故事（初恋/友情/成长的转折点）
- 校园祭典（文化祭/运动会/修学旅行）
- 麻烦事件（被卷入的校园事件）
- 毕业展望（对未来的憧憬）

🎨 校园风格：
- 制服穿着（标准/改装、个性化穿法）
- 书包样式（背包/手提、装饰）
- 教室座位（靠窗/后排/前排）
- 个人物品（笔记本、文具、小装饰）

😊 校园氛围：
- 性格在校园（在学校时的性格表现）
- 课堂表现（上课听讲/睡觉/传纸条）
- 课间行为（和朋友聊天/看书/发呆）
- 放学后（回家/打工/玩耍）

🌸 青春元素：
- 青春烦恼（学业压力/恋爱烦恼/友情纠纷）
- 成长时刻（改变自己的契机）
- 校园记忆（最难忘的校园记忆）
- 毕业感言（对学校生活的总结）

适合校园恋爱、青春故事、学园游戏、校园日常。`,

  wuxia: `【阶段4：武侠历史专项】
基于已有的角色设定，现在深化武侠和古风元素。请详细创作：

🗡️ 武功修为：
- 武功境界（后天/先天/宗师/大宗师/天人）
- 主修武学（内功心法、外功招式）
- 绝学武技（成名绝技、杀手锏）
- 武学特点（刚猛/阴柔/诡异/飘逸）

⚔️ 招式详解：
- 招式名称（有意境的武功名称）
- 招式描述（详细的出招过程、效果）
- 招式威力（破坏力、速度、范围）
- 招式特效（残影/剑气/掌风/内力外放）

💪 内力修为：
- 内力深厚度（几十年功力）
- 内功心法（修炼的心法、特殊之处）
- 内力特性（至刚/至柔/阴寒/炙热）
- 真气颜色（金色/紫色/血红等）

🏛️ 江湖地位：
- 门派归属（名门正派/魔教/散人）
- 江湖称号（绰号、外号、为何得名）
- 武林排名（天下十大高手之类）
- 江湖声望（名震江湖/默默无名）

🎭 师承背景：
- 师父师门（师父是谁、有何渊源）
- 学艺经历（如何学武、奇遇）
- 同门师兄弟（关系如何）
- 武学传承（武功的来历、秘籍）

⚖️ 江湖恩怨：
- 仇家敌人（与谁有仇、为何结仇）
- 江湖朋友（生死之交、酒肉朋友）
- 情感纠葛（江湖儿女情长）
- 门派争斗（卷入的武林纷争）

🎨 古风气质：
- 穿着打扮（长衫/劲装/道袍、颜色风格）
- 随身兵器（剑/刀/掌/奇门兵器）
- 行走江湖（独来独往/仗剑天涯）
- 饮酒豪情（酒量、喝酒风格）

🏞️ 江湖生活：
- 居住地（山林隐居/客栈/随遇而安）
- 谋生方式（接镖/杀手/游侠/隐世）
- 江湖规矩（懂的江湖规矩、道义）
- 快意恩仇（如何对待恩怨）

📜 历史设定：
- 时代背景（宋/明/清/架空朝代）
- 历史事件（卷入的历史大事）
- 朝廷关系（朝廷鹰犬/反贼/无关）

适合武侠小说、古风RPG、江湖游戏、历史架空。`,

  idol: `【阶段4：偶像娱乐专项】
基于已有的角色设定，现在深化偶像和演艺元素。请详细创作：

🎤 偶像定位：
- 偶像类型（歌手/舞者/演员/综艺咖/全能）
- 人设形象（乖巧/叛逆/高冷/元气/温柔）
- 出道时间（新人/出道几年/前辈）
- 所属团体（solo/组合成员、定位）

🎵 才艺特长：
- 主打才艺（唱歌/跳舞/演技/主持）
- 音乐风格（流行/摇滚/嘻哈/抒情）
- 舞蹈类型（街舞/现代舞/民族舞）
- 特殊技能（乐器/作词作曲/编舞）

🎭 舞台表现：
- 舞台风格（热情/高冷/可爱/帅气）
- 舞台魅力（如何吸引观众、杀手锏）
- 服装风格（舞台装扮、个人特色）
- 舞台事故（如何应对失误）

📺 演艺经历：
- 出道经历（选秀/练习生/直接出道）
- 代表作品（成名曲/代表角色/综艺）
- 获奖记录（音乐奖/演技奖/人气奖）
- 低谷时期（遭遇的挫折、如何克服）

💖 粉丝互动：
- 粉丝称呼（粉丝群体名称）
- 互动方式（社交媒体/握手会/粉丝见面会）
- 对粉丝态度（宠粉/保持距离/家人般）
- 应援文化（官方应援色、应援口号）

🎬 工作日常：
- 日程安排（录音/拍摄/综艺/演唱会）
- 工作压力（如何应对高强度工作）
- 练习习惯（如何保持状态、训练量）
- 休息方式（难得休息时做什么）

🌟 公众形象：
- 媒体形象（在采访中的表现）
- 黑粉应对（如何面对黑粉、网络暴力）
- 绯闻处理（恋爱传闻、丑闻应对）
- 公益活动（慈善、公益参与）

💼 公司关系：
- 经纪公司（大公司/小公司/独立）
- 经纪人关系（相处模式、信任度）
- 公司资源（推广力度、支持程度）
- 合约状况（新人合约/自由度）

🎪 娱乐圈生态：
- 圈内人脉（好友/竞争对手/前辈）
- 综艺感（综艺表现、笑点）
- 营业能力（如何"营业"、圈粉）
- 真实vs人设（私下性格vs公众形象）

📈 发展规划：
- 职业目标（想成为什么样的艺人）
- 转型计划（歌手转演员/综艺咖转实力派）
- 瓶颈挑战（遇到的职业瓶颈）
- 梦想舞台（想站上的舞台、目标）

适合偶像养成、娱乐圈题材、音乐游戏、演艺向故事。`,
};

const STAGE_PROMPTS = [
  `【阶段1：基础身份】
你的任务是帮助用户确定所有主要角色的基础身份。

## 第一步：识别角色

如果用户导入了文本，识别所有主要角色。如果没有导入，询问：
- 这是单角色卡还是多角色场景？
- 有哪些主要角色？

## 第二步：确定扮演方式

对每个角色询问：
"【角色名】的扮演方式：
A. 主要由AI扮演（用户观察/上帝视角）
B. 主要由用户扮演（但用户也可以用旁白/上帝视角推动剧情）
C. 灵活切换（用户可以扮演这个角色，也可以旁观）"

⚠️ 注意：即使选择B，用户也不是100%限定为该角色，可以灵活使用旁白和上帝视角。

## 第三步：确定每个角色的基础信息

对每个主要角色，询问并确定：
- 名称（正式名、昵称）
- 物种/种族（人类、兽人、龙族等）
- 核心性格特征（3-5个关键词）
- 年龄和性别
- 外在印象（体型、气质）

请为每个角色单独列出信息。`,

  `【阶段2：深度背景】
基于用户确定的角色基础，现在深入探索角色背景。请询问并发展：
- 出生地和成长环境
- 重要的人生经历
- 核心动机和目标
- 行为原因和深层动机`,

  `【阶段3：关系网络】
这个阶段用于多角色场景。如果只有单个角色可跳过。

请帮助用户梳理角色关系网络：

1. **列出所有重要角色**：
   - 主角（AI扮演）
   - 互动对象（用户扮演/重要NPC）
   - 其他重要角色

2. **为每个重要角色询问**：
   - 这个角色是谁？（基本信息）
   - 与主角什么关系？（朋友/敌人/暗恋对象等）
   - 角色类型？（AI扮演/用户扮演/NPC）
   - 已知的性格特征？
   - 互动模式？（主角对TA的态度、TA对主角的态度）

3. **使用场景**：
   - 如果用户会扮演特定角色，AI主要扮演其他角色
   - 如果用户使用上帝视角，AI可同时呈现多个角色
   - 灵活适应用户的游玩方式

**输出格式示例**：
\`\`\`
角色名：[角色名]
类型：用户扮演角色 / AI扮演 / NPC
关系：与主角的关系（朋友/敌人/暗恋对象等）
已知特征：性格特征、外貌印象
互动：主角对该角色的态度、该角色对主角的态度
【标注】如果是用户扮演，注明"用户扮演，以上为参考特征"
\`\`\``,

  `【阶段4：物理描写】
基于用户的角色设定，详细描述角色的外貌和身体特征。请包含：
- 身高、体型、体格
- 面部特征、发型、眼睛
- 穿着风格、配饰
- 如果是Furry：毛皮、耳朵尾巴等基础特征
- 独特的身体标记`,

  ``, // 阶段5由用户选择的专项类型决定

  `【阶段6：互动设计】
基于已创建的角色，设计角色的互动方式。

## 首先，询问用户格式偏好

**问题**：您希望角色的回复使用什么格式？

A. **标准格式**：直接对话和动作描写
   示例："我...我不是故意的！"他/她的表情显得有些紧张。
   
B. **状态栏格式**（推荐用于详细RP、身体特征丰富的角色）：
   情绪：[角色当前情绪]
   身体状态：[身体反应、特殊特征的状态]
   环境：[场景、天气、氛围]
   
   然后是角色的对话和动作...
   
   ⚠️ 优势：AI会从首条消息学习这个格式，并通过正向循环自然延续，无需额外设置

请用户选择后，再创作：
- 首条消息（第一次见面的场景）
- 对话风格（正式/随意、幽默/严肃）
- 口头禅或特殊用词
- 3-5个不同场景的对话示例`,

  `【阶段7：世界整合】

# 你的任务
帮助用户完善角色的世界观，并引导他们思考需要创建哪些世界书（Lorebook）条目。

## 什么是世界书？
世界书是AI角色扮演的**动态知识注入系统**：
- 当对话中出现特定关键词时，相关背景信息会自动注入到AI的上下文中
- 不占用常驻token，只在需要时激活
- SillyTavern等平台会自动识别和使用

## 你的工作流程

### 第一步：分析前6个阶段的内容

识别可以创建世界书条目的元素：

**人物相关**：
- ⭐ 特别关注阶段3（关系网络）！
- 主角的详细信息（核心角色条目）
- 配角/NPC（如暗恋对象、朋友、导师）
- 互动对象的性格、外貌、关系

**环境相关**：
- 地点（孤儿院、学校、城市、特殊场所）
- 组织/团体（学生会、帮派、家族）
- 历史事件（重要的过去事件）

**设定相关**：
- 物品（标志性道具、武器、装备）
- 规则/机制（战斗系统、魔法、RPG机制）
- 特殊概念（如Furry设定：信息素、发情期、兽人特征）

### 第二步：与用户讨论

询问用户：
- "角色主要活动在哪些地点？需要详细介绍吗？"
- "阶段3提到的配角（如XXX），需要为他们创建条目吗？"
- "有哪些标志性的物品或重要事件？"
- "如果是Furry角色：需要详细设定信息素、发情期、肉垫等细节吗？"
- "如果是RPG角色：有战斗系统、技能列表需要记录吗？"

### 第三步：主动建议

基于已有设定，建议创建的条目：

**示例**（根据实际情况调整）：
"根据你的设定，我建议创建以下世界书条目：

1. **核心角色：铁** - 主角的完整信息（外貌、性格、背景）
2. **配角：白熊** - 暗恋对象的信息（从阶段3提取）
3. **地点：阳光之家孤儿院** - 主要活动场所
4. **事件：海边之夜** - 重要的过去事件
5. **兽人特征：信息素系统** - Furry设定的规则

你可以在下方点击"✨ AI生成世界书"按钮，让专用AI根据前6个阶段的内容自动生成这些条目。
生成后你可以预览、选择和编辑。"

### 第四步：解释价值

简要说明世界书的好处：
- 节省token（不需要把所有信息都写进角色描述）
- 动态激活（只在提到关键词时注入）
- 避免AI遗忘（长对话中AI会忘记细节，世界书会自动提醒）
- 支持复杂世界观（多角色、多地点、多设定）

## 注意事项

✅ **要做的**：
- 分析前6个阶段的内容，特别是阶段3的关系网络
- 建议具体的条目类型和名称
- 引导用户思考世界观的各个方面
- 提醒用户使用下方的"AI生成世界书"按钮

❌ **不要做的**：
- 不要在对话中直接输出世界书格式（那是WorldBookEditor的AI的工作）
- 不要生成过于宽泛的建议（要具体到角色名、地点名）
- 不要遗漏阶段3的配角/NPC

## 你的回复示例

"让我分析一下前面的设定，看看需要创建哪些世界书条目...

根据你的角色，我建议创建以下条目：

📍 **地点**：
- 阳光之家孤儿院（主要活动场所）

👥 **人物**：
- 铁（主角，核心角色）
- 白熊（配角，暗恋对象，从阶段3提取）

🎭 **事件**：
- 海边之夜（重要背景事件）

🐾 **Furry设定**（如适用）：
- 信息素系统（兽人的气味机制）
- 兽人特征（耳朵、尾巴的情绪表达）

你可以点击下方的"✨ AI生成世界书"按钮，让AI根据前6个阶段的内容自动生成这些条目。生成后你可以预览并选择需要的条目。

或者你想先讨论其他方面的世界观？"`,

  `【阶段7：质量检查】
回顾完整的角色设定。请检查：
- 所有信息是否完整
- 设定前后是否一致
- 描写是否详细生动
- 是否有矛盾或遗漏
提供改进建议。`,

  `【阶段9：角色卡数据生成 - 第1步：完整描述】

你的任务是将阶段1-5的所有内容，**逐字复制并分类整理**成【完整描述】字段。

⚠️ **本步骤只生成【完整描述】，其他字段（性格、场景、首条消息等）稍后生成！**

⚠️ **核心原则**：
1. **你的职责是"分类员 + 复印机"，不是"编辑"或"摘要生成器"**：
   - ✅ 识别原文哪些内容属于"基本信息"、"背景"、"关系"、"外貌"、"专项"
   - ✅ 为不同类别添加清晰的大标题（#### **基本信息**、#### **深度背景** 等）
   - ✅ 把原文内容**逐字逐句复制**到对应大标题下
   - ❌ 不要改写或重新表述内容
   - ❌ 不要总结或压缩细节
   - ❌ 不要筛选"重要的"内容，要转移"所有的"内容

2. **保持原文的所有格式**：小标题、列表、段落、缩进等

3. **完整转移所有内容**：
   - 如果原文有100句话，你的输出也要有100句话
   - 如果原文有50个列表项，你的输出也要有50个列表项
   - 如果原文有10000字，你的输出也要有10000字

⚠️ **字数要求**：
- 【完整描述】应包含至少10000-15000字（整合阶段1-5的所有内容）
- 如果你发现自己在"总结"或"简化"，立即停止，改为**原样转移**

## 你的任务

**只生成【完整描述】字段，不要生成其他内容！**

### 【完整描述】字段要求：

⚠️ **这不是"摘要"或"精选"，而是"搬家"！**
- 阶段1-5的所有文字、所有条目、所有段落都要搬过来
- 不要挑"重要的"写，要把"所有的"都写
- 目标字数：10000-15000字（这是合理的，因为你在搬运5个阶段的内容）
   
   **⚠️ 你的任务：识别内容 → 分类到对应标题下 → 原样转移**
   
   **从阶段1提取并分类**（必须包含）：
   * 识别主角的所有详细信息 → 原样转移到【基本信息（主角）】
   * ⭐ 识别角色2（用户扮演角色）的完整档案 → 原样转移到【关系网络】
   * 识别次要角色的信息 → 原样转移到【关系网络】
   * 如果有主角团的信息 → 原样转移到【关系网络】
   * 💬 对话补充部分（如果有）→ 原样转移到对应位置
   
   **从阶段2提取并分类**（必须包含）：
   * 识别主角背景的内容 → 原样转移到【深度背景与动机】
   * 识别**人际关系网络**的内容 → 原样转移到【关系网络】
   * 💬 对话补充部分（如果有）→ 原样转移到对应位置
   
   **从阶段3提取并分类**（必须包含）：
   * 识别所有角色的关系网络 → 原样转移到【关系网络】
   * 识别每个重要角色的档案 → 原样转移到【关系网络】对应角色下
   * 💬 对话补充部分（如果有）→ 原样转移到对应位置
   
   **从阶段4提取并分类**（必须包含）：
   * 识别主角的所有物理描写 → 原样转移到【外貌与物理特征】
   * 识别配角的物理描写（如果有）→ 原样转移到【关系网络】对应角色下
   * 💬 对话补充部分（如果有）→ 原样转移到对应位置
   
   **从阶段5提取并分类**（必须包含，这是关键！）：
   * ⭐ 识别阶段5的所有内容 → 原样转移到【专项深化】
   * ⭐ 保持原文的所有格式、结构、层级、段落、缩进
   * ⭐ 如果阶段5包含主角的专项深化 → 原样转移
   * ⭐ 如果阶段5包含配角的专项深化 → 原样转移到【关系网络】对应角色下或【专项深化】独立段落
   
   **组织方式**：
   - 使用清晰的大标题分隔不同阶段（如 #### **基本信息**、#### **深度背景**、#### **关系网络**、#### **外貌特征**、#### **专项深化**）
   - **保持原文的所有格式**：标题、子标题、列表（- 或 *）、段落、缩进等
   - **不要改变原文的内容和用词**
   - **如果原文有标题，保留标题；如果没有标题，按原有段落/结构完整复制**

## 输出格式（严格遵循）

⚠️ **本步骤只输出【完整描述】，不要输出其他内容！**

请按照以下格式输出：

【完整描述】
#### **基本信息**（主角）
（⚠️ 逐条复制阶段1主角部分的所有内容，保持原文的所有字段和详细程度）
（⚠️ 如果有💬对话补充，也要完整复制）

#### **深度背景与动机**
（⚠️ 完整复制阶段2的所有内容，保持原有格式：）
（⚠️ 如果有小标题，保留小标题；如果是段落式描写，保留段落；如果是列表，保留列表）
（⚠️ 示例：如果原文是"- **出生与成长**：...内容..."，就完整复制；如果原文是自由段落"他自幼被遗弃..."，也完整复制）
（⚠️ 如果有💬对话补充，也要完整复制）

#### **关系网络**
⚠️ **必须包含所有重要角色的完整档案！逐条复制阶段2和阶段3的所有内容！**

**主角与XXX的关系**：
（⚠️ 完整复制阶段2和阶段3中关系部分的所有内容）

**角色：XXX（用户扮演）**
（⚠️ 逐条复制阶段1中该角色的所有信息，保持原文的所有字段）
- **[阶段1中该角色的第一个字段]**：...（完整复制）
- **[阶段1中该角色的第二个字段]**：...（完整复制）
...（继续复制所有字段）
（⚠️ 如果阶段2、3、4、5有该角色的更多信息，也要完整复制）

**次要角色**：
（列出所有次要角色）

#### **外貌与物理特征**（主角）
（⚠️ 逐条复制阶段4的所有内容：）
- **[阶段4的第一个小标题]**：...（完整复制原文）
- **[阶段4的第二个小标题]**：...（完整复制原文）
- **[阶段4的第三个小标题]**：...（完整复制原文）
...（继续复制阶段4的所有内容，保持原有结构）
（⚠️ 如果有💬对话补充，也要完整复制）

#### **专项深化**（Psyche & Furry / 其他专项）
（⚠️ 这是关键部分！逐条复制阶段5的所有内容，不要遗漏任何细节！）
（⚠️ 完整复制阶段5中所有小标题和详细描写，包括但不限于：）
- **[阶段5的第一个小标题]**：...（完整复制原文的所有描写）
- **[阶段5的第二个小标题]**：...（完整复制原文的所有描写）
- **[阶段5的第三个小标题]**：...（完整复制原文的所有描写）
...（继续复制阶段5的所有内容，保持原有结构和层级）

（⚠️ 如果阶段5有配角的专项深化，也要完整复制！）

---

**完成后，请直接输出以上内容，不要添加任何寒暄或解释！**

## 数据来源（仅阶段1-5）

- **阶段1（基础身份）**: 主角和所有角色的基础信息
- **阶段2（深度背景）**: 主角背景、经历、动机、人际关系
- **阶段3（关系网络）**: 所有角色的关系、互动方式
- **阶段4（物理描写）**: 主角和配角的外貌、体型、特征
- **阶段5（专项深化）**: 主角和配角的专项内容

## 核心原则

**你的任务是"分类员 + 搬运工"，不是"编辑"或"作家"！**

✅ **你的工作流程**：
1. **第一步：识别内容**
   - 阅读阶段1-5的所有内容
   - 识别哪些内容属于"基本信息"、"背景"、"关系"、"外貌"、"专项"
   
2. **第二步：添加分类标题**
   - 为【完整描述】添加大标题：#### **基本信息**、#### **深度背景**、#### **关系网络**、#### **外貌特征**、#### **专项深化**
   
3. **第三步：逐句复制内容（最重要！）**
   - 把识别出的内容**逐句、逐条、逐字复制**到对应大标题下
   - ⚠️ **不要筛选**：如果原文有10条细节，你必须写10条，不能只写3-5条！
   - ⚠️ **不要省略**：如果原文有3段描写，你必须写3段，不能合并成1段！
   - ⚠️ **不要精简**：如果原文一句话有50字，你必须写50字，不能缩减成20字！
   - 保持原文的所有格式：小标题、列表（- 或 *）、段落、缩进
   - 保持原文的所有用词：不要改写或重新表述
   - 保持原文的所有细节：不要总结或压缩

✅ **特别注意**：
- ⭐ 阶段5的**专项深化**是重点！必须原样转移所有详细描写（无论是什么类型的专项）
- ⭐ **配角的完整档案**必须包含：从阶段1-5提取该配角的所有信息，原样转移到【关系网络】对应角色下
- 【完整描述】的目标字数：**10000-15000字**（不要少于10000字）

❌ **严禁的行为**：
- ❌ **严禁筛选或精简**
  - 错误示例1：原文有10条外貌特征（身高、体型、毛发、眼睛、耳朵...），你只写了5条 → 这是筛选！
  - 错误示例2：原文"毛皮质感：双层结构。外层护毛结实顺滑，有阻力感；内层底绒柔软绵密..."（50字），你写成"毛皮质感：双层，柔软"（8字）→ 这是精简！
  - 正确做法：原文有多少条就写多少条，原文有多少字就写多少字
- ❌ **严禁总结或压缩**
  - 错误示例："角色有详细的XX特征描写"（这是总结！）
  - 正确做法：把"详细的XX特征描写"的每一句话都完整复制出来
- ❌ **严禁改写或重新表述**
  - 错误示例：把"他自幼被遗弃"改写成"角色童年缺乏关爱"（这是改写！）
  - 正确做法：保持原文"他自幼被遗弃"
- ❌ **严禁省略任何段落、列表项、描写细节**
- ❌ **严禁遗漏阶段5的专项深化细节**（无论是什么类型的专项）
- ❌ **严禁遗漏配角的详细信息**
- ❌ **严禁遗漏💬对话补充部分**
- ❌ 不要写"恭喜"、"完成"等寒暄

**记住**：
1. 你的价值在于**识别 + 分类 + 组织**，而不是改写内容！
2. 【完整描述】10000-15000字是正常的！不要觉得"太长了"而精简！
3. 如果你的输出少于10000字，说明你在筛选和精简，这是错误的！

立即开始输出：`,
];

// 阶段9-第2步的提示词
const STAGE9_STEP2_PROMPT = `【阶段9：角色卡数据生成 - 第2步：其他字段】

你的任务是根据前8个阶段的内容，生成角色卡的其他必填和可选字段。

⚠️ **【完整描述】已在第1步生成，本步骤不要重复生成！**

## 需要生成的字段：

### 必填字段

1. **【角色名】**: 主角的名字（从阶段1提取）

2. **【性格】**: 详细性格描述（从阶段1直接提取，保持原有详细程度）

3. **【场景设定】**: 世界观和情境（从阶段7直接提取，保持原有详细程度）

4. **【首条消息】**: 第三人称开场场景（从阶段6提取或创作，100-300字）

5. **【对话示例】**: 3-5组对话（从阶段6提取或创作，使用{{char}}和{{user}}，用<START>分隔）

### 可选字段（如适用）

6. **【创作者备注】**: 角色玩法提示（50-100字，可选）

7. **【系统提示词】**: AI行为指导（简短指令，可选）

8. **【备用开场白】**: 1-2个不同情境的开场（可选）

## 输出格式（严格遵循）

【角色名】
（主角的名字）

【性格】
（详细性格描述，从阶段1提取）

【场景设定】
（世界观和情境，从阶段7提取）

【首条消息】
（第三人称场景描写，从阶段6提取或创作）

【对话示例】
（3-5组对话，使用{{char}}和{{user}}）

【创作者备注】
（可选）

【系统提示词】
（可选）

【备用开场白】
（可选）

---

⚠️ **注意**：
- 【性格】和【场景设定】直接从原阶段提取，不要压缩
- 【首条消息】和【对话示例】优先使用阶段6的原文
- 使用{{char}}代替角色真实姓名，使用{{user}}代替用户
- 不要寒暄，立即开始输出：`;

const SUMMARY_PROMPTS = [
  '请完整总结本阶段确定的所有主要角色的基础身份信息。⚠️ 必须包含每个角色的：角色名、扮演方式、物种、年龄、性别、核心性格、外在印象、体型、气质等。如果有用户扮演角色或NPC，也要详细列出他们的信息！保留所有关键细节，只列出最终确定的内容，不包括讨论过程和寒暄用语。',
  '请完整总结本阶段确定的背景信息（如出生地、重要经历、核心动机、成长环境等），保留所有关键细节，只列出最终确定的内容，不包括讨论过程和寒暄用语。',
  '请完整总结本阶段确定的关系网络信息。⚠️ 必须包含每个重要角色的：角色名、角色类型（AI扮演/用户扮演/NPC）、物种、性格特征、外貌印象、与主角的关系、互动模式等。保留所有关键细节，只列出最终确定的内容，不包括讨论过程和寒暄用语。',
  '请完整总结本阶段确定的物理描写（如外貌、体型、毛色、特征、穿着、配饰等），保留所有关键细节，只列出最终确定的内容，不包括讨论过程和寒暄用语。',
  '请完整总结本阶段确定的专项深化内容，保留所有关键细节，只列出最终确定的内容，不包括讨论过程和寒暄用语。',
  '请完整总结本阶段确定的互动设计（如格式偏好、首条消息、对话风格、口头禅、对话示例等），保留所有关键细节，只列出最终确定的内容，不包括讨论过程和寒暄用语。',
  '请完整总结本阶段确定的世界整合内容（如场景、世界观、世界书条目等），保留所有关键细节，只列出最终确定的内容，不包括讨论过程和寒暄用语。',
  '请完整总结质量检查的结果和需要改进的地方，保留所有关键细节。',
  '请严格按照【阶段9-第1步】的格式输出。只输出【完整描述】字段，不要输出其他内容！【完整描述】必须逐字复制阶段1-5的所有内容，分类到对应大标题下（基本信息、深度背景、关系网络、外貌特征、专项深化）。⚠️ 保持原文的所有细节、所有列表项、所有段落！不要筛选和精简！不要寒暄，立即开始输出：',
];

// 阶段9分步生成提示词（9步，连续对话，AI自主分类）
const STAGE9_STEP_PROMPTS = [
  // 第1步：处理阶段1
  `📋 **任务说明**：
我们正在生成角色卡的【完整描述】字段。这个字段包含5个大标题：
- #### **基本信息**
- #### **深度背景与动机**
- #### **关系网络**
- #### **外貌与物理特征**
- #### **专项深化**

你的任务是**逐步处理每个阶段的内容**，将内容分类到合适的大标题下。

---

🎯 **本步骤任务**：处理【阶段1：基础身份】的所有内容

⚠️ **核心原则**：

1. **识别内容的两个来源**：
   - **导入内容**：小说AI的分析（通常在前面部分）
   - **💬 对话补充**：用户后续讨论补充的信息（通常标记为"💬 **对话补充：**"）
   
2. **对同一角色的信息进行"完整融合"**（最重要！）：
   - ✅ **融合策略**：
     * 如果导入内容和对话补充都有该角色，识别为同一角色
     * 创建一个**完整的角色档案**，包含两个来源的**所有字段**
     * 保持导入内容的所有字段（名称、生物特征、外在印象、社会身份、性格等）
     * 把对话补充中的新增信息添加进去
     * 如果对话补充明确修正/否定了某个信息，使用对话补充的版本
   - ❌ **严禁分别复制**：
     * 不要把导入内容复制一遍，再把对话补充复制一遍
     * 不要让同一角色出现两次
   - ❌ **严禁遗漏字段**：
     * 如果导入内容有"外在印象"字段，必须保留
     * 如果导入内容有"社会身份"字段，必须保留
     * 所有字段都要检查，不能遗漏

3. **严禁精简**：
   - ✅ 原文有10条就写10条
   - ✅ 原文有1000字就写1000字
   - ❌ 不要筛选"重要的"，要转移"所有的"
   - ❌ 不要改写、总结、压缩

📝 **输出格式**：

**第一行必须是【完整描述】标记！**

【完整描述】

（然后才是内容）

#### **基本信息**
（融合后的所有角色档案，每个角色一个完整档案，包含所有字段）

**示例**（如果有铁这个角色）：
#### **基本信息**

**角色：铁**
- **名称相关**：...（完整复制）
- **生物特征**：...（完整复制）
- **外在印象**：...（⚠️ 不要遗漏！）
- **社会身份**：...（完整复制）
- **核心性格**：...（融合两个来源的所有性格描述）
- **性格特质**：...（完整复制）
- **扮演标注**：...

（如果阶段1还有配角信息，放到关系网络）
#### **关系网络**
（配角的完整档案）

---
⚠️ 记住：融合而非复制两遍！不要遗漏任何字段！立即开始输出：`,

  // 第2步：处理阶段2
  `🎯 **继续任务**：处理【阶段2：深度背景】的所有内容

你已经处理了阶段1，现在继续处理阶段2。

⚠️ **核心原则**（同第1步）：
1. **识别两个来源**：导入内容 + 💬 对话补充
2. **完整融合**（不是分别复制）：
   - 如果同一内容在两个来源都有，融合成一份
   - 保留所有字段，不要遗漏
   - 对话补充的新增信息要添加进去
   - 如果对话补充修正了信息，用新版本
3. **严禁精简**：所有细节都要保留

📝 **输出格式**：

**⚠️ 第一行必须是【完整描述】标记！**

【完整描述】

（然后输出相应大标题和内容，通常是深度背景或关系网络）

#### **深度背景与动机**
（融合后的完整背景信息）

或/和

#### **关系网络**
（如果阶段2有关系信息，融合后的完整档案）

---
⚠️ 融合而非复制两遍！不要遗漏字段！第一行必须是【完整描述】！立即开始输出：`,

  // 第3步：处理阶段3
  `🎯 **继续任务**：处理【阶段3：关系网络】的所有内容

⚠️ **核心原则**（同前）：
- 识别导入内容 + 💬 对话补充
- 完整融合（不是分别复制）
- 保留所有字段，不要遗漏
- 严禁精简

📝 **输出格式**：

**⚠️ 第一行必须是【完整描述】！**

【完整描述】

（然后输出相应大标题和内容）

---
⚠️ 第一行必须是【完整描述】！融合而非复制两遍！立即开始输出：`,

  // 第4步：处理阶段4
  `🎯 **继续任务**：处理【阶段4：物理描写】的所有内容

⚠️ **核心原则**（同前）：
- 识别导入内容 + 💬 对话补充
- 完整融合（不是分别复制）
- 保留所有字段，不要遗漏
- 严禁精简

📝 **输出格式**：

**⚠️ 第一行必须是【完整描述】！**

【完整描述】

（然后输出相应大标题和内容）

---
⚠️ 第一行必须是【完整描述】！融合而非复制两遍！立即开始输出：`,

  // 第5步：处理阶段5
  `🎯 **继续任务**：处理【阶段5：专项深化】的所有内容

⚠️ **核心原则**（同前）：
- 识别导入内容 + 💬 对话补充
- 完整融合（不是分别复制）
- 保留所有字段，不要遗漏
- **这是关键内容，必须完整保留所有细节！**
- 严禁精简

📝 **输出格式**：

**⚠️ 第一行必须是【完整描述】！**

【完整描述】

（然后输出相应大标题和内容）

---
⚠️ 第一行必须是【完整描述】！融合而非复制两遍！立即开始输出：`,

  // 第6步：处理阶段6
  `🎯 **继续任务**：处理【阶段6：互动设计】的所有内容

⚠️ **核心原则**（同前）：
- 识别导入内容 + 💬 对话补充
- 完整融合（不是分别复制）
- 保留所有字段，不要遗漏
- 严禁精简

📝 **输出格式**：

**⚠️ 第一行必须是【完整描述】！**

【完整描述】

（然后输出相应大标题和内容）

---
⚠️ 第一行必须是【完整描述】！融合而非复制两遍！立即开始输出：`,

  // 第7步：处理阶段7
  `🎯 **继续任务**：处理【阶段7：世界整合】的所有内容

⚠️ **核心原则**（同前）：
- 识别导入内容 + 💬 对话补充
- 完整融合（不是分别复制）
- 保留所有字段，不要遗漏
- 严禁精简

📝 **输出格式**：

**⚠️ 第一行必须是【完整描述】！**

【完整描述】

（然后输出相应大标题和内容）

---
⚠️ 第一行必须是【完整描述】！融合而非复制两遍！立即开始输出：`,

  // 第8步：处理阶段8
  `🎯 **继续任务**：处理【阶段8：质量检查】的所有内容

⚠️ **核心原则**（同前）：
- 识别导入内容 + 💬 对话补充
- 完整融合（不是分别复制）
- 保留所有字段，不要遗漏
- 严禁精简

📝 **输出格式**：

**⚠️ 第一行必须是【完整描述】！**

【完整描述】

（然后输出相应大标题和内容）

---
⚠️ 第一行必须是【完整描述】！融合而非复制两遍！立即开始输出：`,

  // 第9步：生成其他字段
  `🎯 **最后一步**：生成角色卡的其他必填字段

【完整描述】已经完成，现在生成其他字段。

⚠️ **核心原则**（同前）：
- 识别阶段1、6、7的导入内容 + 💬 对话补充
- 完整融合两个来源的信息
- 保持原有详细程度，不要精简
- 如果对话补充修正了信息，使用新版本

📝 **输出格式**（严格按此格式）：

【角色名】
（从阶段1提取主角的名字，如果有多个名称/昵称，都要列出）

【性格】
（融合阶段1的导入内容和对话补充中的性格描述，保持原有详细程度，不要精简）

【场景设定】
（融合阶段7的导入内容和对话补充中的世界观、情境，保持原有详细程度，不要精简）

【首条消息】
（从阶段6提取或创作第三人称开场场景，100-300字，尽量使用已有内容）

【对话示例】
<START>
{{user}}：...
{{char}}：...

<START>
{{user}}：...
{{char}}：...

<START>
{{user}}：...
{{char}}：...

（从阶段6提取或创作3-5组对话，使用{{char}}和{{user}}，展现角色性格特点）

【创作者备注】
（可选，角色玩法提示，50-100字）

【系统提示词】
（可选，AI行为指导）

【备用开场白】
（可选，1-2个不同情境的开场，每个100-300字）

---
⚠️ 融合而非复制两遍！保持详细程度！严格按标记格式输出！立即开始：`,
];

export default function StageFlow() {
  // 使用progressStore保存创作进度（自动持久化）
  const {
    getCurrentProject,
    updateProgress,
    clearCurrentProject,
    createProject,
    hasSavedProgress,
  } = useProgressStore();
  
  const currentProject = getCurrentProject();
  const stageResults = currentProject?.stageResults || [];
  const currentStage = currentProject?.currentStage || 0;
  const stageMessages = currentProject?.stageMessages || [[], [], [], [], [], [], [], [], []];
  const selectedSpecialty = currentProject?.selectedSpecialty || null;
  const lastSaved = currentProject?.lastSaved || null;
  
  const [userInput, setUserInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showSpecialtySelection, setShowSpecialtySelection] = useState(false);
  
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showImportCard, setShowImportCard] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  
  // 阶段9：累积式填充内容
  const [stage9AccumulatedContent, setStage9AccumulatedContent] = useState('【完整描述】\n\n');
  const [stage9Step, setStage9Step] = useState(0); // 当前进行到第几步（0-6）
  const [showStage9Editor, setShowStage9Editor] = useState(false); // 是否显示文本编辑器
  
  const { generateResponse, loading } = useAIService();
  const { parseFromStageResults } = useCharacterStore();
  
  // 处理导出按钮点击：自动解析stageResults到character
  const handleExportClick = () => {
    // ⚠️ 特殊处理阶段9：如果阶段9有AI对话但没有总结，将最后一条AI回复作为stageResults[8]
    const finalStageResults = [...stageResults];
    if (currentStage === 8 && stageMessages[8] && stageMessages[8].length > 0 && !stageResults[8]) {
      // 找到最后一条AI回复
      const lastAIMessage = [...stageMessages[8]].reverse().find(msg => msg.role === 'assistant');
      if (lastAIMessage && lastAIMessage.content.includes('【角色名】')) {
        // 如果AI回复包含结构化数据标记，使用它
        finalStageResults[8] = lastAIMessage.content;
        // 保存到store（可选，因为导出时已经用了）
        updateProgress({ stageResults: finalStageResults });
      }
    }
    
    parseFromStageResults(finalStageResults);
    setShowExport(true);
  };

  // 处理导入完成（文本分析或角色卡）
  const handleImportComplete = (importedResults: string[]) => {
    updateProgress({
      stageResults: importedResults,
      currentStage: 0,
    });
  };

  const currentMessages = stageMessages[currentStage];

  const handleSend = async () => {
    if (!userInput.trim() || loading) return;

    const newMessage = { role: 'user', content: userInput };
    const updatedMessages = [...currentMessages, newMessage];
    
    // 更新当前阶段的消息
    const newStageMessages = [...stageMessages];
    newStageMessages[currentStage] = updatedMessages;
    updateProgress({ stageMessages: newStageMessages });
    setUserInput('');
    setErrorMessage(''); // 清除之前的错误

    try{
      // 构建上下文：包含之前阶段的成果 + 当前阶段已有的总结（如果有导入的）+ 当前阶段的对话
      const contextForAI = [
        // 添加当前阶段之前的成果总结
        ...stageResults.slice(0, currentStage).map((result, idx) => ({
          role: 'system' as const,
          content: `【阶段${idx + 1}确定的内容】\n${result}`
        })),
        // 🔧 修复：如果当前阶段已有总结（导入的内容），也要让AI知道
        ...(stageResults[currentStage] ? [{
          role: 'system' as const,
          content: `【阶段${currentStage + 1}已有的内容（可在此基础上继续完善）】\n${stageResults[currentStage]}`
        }] : []),
        // 添加当前阶段的对话（包括历史对话，让AI知道之前讨论了什么）
        ...updatedMessages
      ];

      // 选择合适的提示词
      let stagePrompt;
      if (currentStage === 4 && selectedSpecialty) {
        // 阶段5（专项深化）：使用专项提示词
        stagePrompt = SPECIALTY_PROMPTS[selectedSpecialty];
      } else if (currentStage === 8 && userInput.includes('【执行第2步】')) {
        // 阶段9-第2步：生成其他字段
        stagePrompt = STAGE9_STEP2_PROMPT;
      } else {
        // 其他情况：使用标准阶段提示词
        stagePrompt = STAGE_PROMPTS[currentStage];
      }
      
      const response = await generateResponse(
        contextForAI,
        stagePrompt
      );
      
      newStageMessages[currentStage] = [...updatedMessages, { role: 'assistant', content: response }];
      
      // ⚠️ 特殊处理：如果是阶段9，并且AI回复包含结构化数据标记，自动保存到stageResults
      if (currentStage === 8 && (response.includes('【角色名】') || response.includes('【完整描述】'))) {
        const newResults = [...stageResults];
        // 如果是第1步（包含【完整描述】）或完整输出，替换整个结果
        // 如果是第2步（包含【角色名】但不含【完整描述】），追加到现有结果
        if (response.includes('【完整描述】')) {
          // 第1步：只有【完整描述】
          newResults[8] = response;
        } else if (response.includes('【角色名】')) {
          // 第2步：追加其他字段
          if (stageResults[8]) {
            newResults[8] = stageResults[8] + '\n\n' + response;
          } else {
            newResults[8] = response;
          }
        }
        updateProgress({ 
          stageMessages: newStageMessages,
          stageResults: newResults 
        });
      } else {
        updateProgress({ stageMessages: newStageMessages });
      }
    } catch (error: any) {
      console.error('AI 响应失败:', error);
      
      // 提取详细错误信息
      let errorDetail = 'AI 响应失败';
      if (error?.response?.data?.error) {
        errorDetail = `API错误: ${error.response.data.error.message || error.response.data.error}`;
      } else if (error?.message) {
        errorDetail = `错误: ${error.message}`;
      } else if (typeof error === 'string') {
        errorDetail = error;
      }
      
      setErrorMessage(errorDetail);
      
      newStageMessages[currentStage] = [...updatedMessages, { 
        role: 'assistant', 
        content: `❌ ${errorDetail}\n\n请检查：\n- API密钥是否正确\n- 网络连接是否正常\n- API服务是否可用\n- 请求是否超出配额限制` 
      }];
      updateProgress({ stageMessages: newStageMessages });
    }
  };

  // 重新生成最后一条AI回复
  const handleRegenerate = async (messageIndex: number) => {
    if (loading || messageIndex < 1) return;
    
    setErrorMessage('');
    
    // 获取到该消息之前的所有消息（不包括要重新生成的AI消息）
    const messagesUpToUser = currentMessages.slice(0, messageIndex);
    
    // 更新消息历史，移除要重新生成的AI消息
    const newStageMessages = [...stageMessages];
    newStageMessages[currentStage] = messagesUpToUser;
    updateProgress({ stageMessages: newStageMessages });
    
    try {
      // 构建上下文
      const contextForAI = [
        ...stageResults.slice(0, currentStage).map((result, idx) => ({
          role: 'system' as const,
          content: `【阶段${idx + 1}确定的内容】\n${result}`
        })),
        ...(stageResults[currentStage] ? [{
          role: 'system' as const,
          content: `【阶段${currentStage + 1}已有的内容（可在此基础上继续完善）】\n${stageResults[currentStage]}`
        }] : []),
        ...messagesUpToUser
      ];
      
      // 选择合适的提示词
      let stagePrompt;
      // 检查最后一条用户消息是否为第2步指令
      const lastUserMessage = messagesUpToUser.length > 0 ? messagesUpToUser[messagesUpToUser.length - 1] : null;
      if (currentStage === 4 && selectedSpecialty) {
        stagePrompt = SPECIALTY_PROMPTS[selectedSpecialty];
      } else if (currentStage === 8 && lastUserMessage && lastUserMessage.content.includes('【执行第2步】')) {
        stagePrompt = STAGE9_STEP2_PROMPT;
      } else {
        stagePrompt = STAGE_PROMPTS[currentStage];
      }
      
      const response = await generateResponse(contextForAI, stagePrompt);
      
      // 添加新的AI回复
      newStageMessages[currentStage] = [
        ...messagesUpToUser,
        { role: 'assistant', content: response }
      ];
      
      // ⚠️ 特殊处理：如果是阶段9，并且AI回复包含结构化数据标记，自动保存到stageResults
      if (currentStage === 8 && (response.includes('【角色名】') || response.includes('【完整描述】'))) {
        const newResults = [...stageResults];
        if (response.includes('【完整描述】')) {
          // 第1步：只有【完整描述】
          newResults[8] = response;
        } else if (response.includes('【角色名】')) {
          // 第2步：追加其他字段
          if (stageResults[8]) {
            newResults[8] = stageResults[8] + '\n\n' + response;
          } else {
            newResults[8] = response;
          }
        }
        updateProgress({ 
          stageMessages: newStageMessages,
          stageResults: newResults 
        });
      } else {
        updateProgress({ stageMessages: newStageMessages });
      }
      
    } catch (error: any) {
      console.error('重新生成失败:', error);
      
      let errorDetail = '重新生成失败';
      if (error?.response?.data?.error) {
        errorDetail = `API错误: ${error.response.data.error.message || error.response.data.error}`;
      } else if (error?.message) {
        errorDetail = `错误: ${error.message}`;
      }
      
      setErrorMessage(errorDetail);
      
      // 显示错误消息
      newStageMessages[currentStage] = [
        ...messagesUpToUser,
        { role: 'assistant', content: `❌ ${errorDetail}` }
      ];
      updateProgress({ stageMessages: newStageMessages });
    }
  };

  const goToNextStage = async (shouldSummarize: boolean = false) => {
    if (currentStage >= 8) return; // 9个阶段（0-8），阶段9是导出
    
    // 如果用户选择生成总结
    if (shouldSummarize && currentMessages.length > 0 && currentStage < 8) {
      setIsGeneratingSummary(true);
      try {
        // 让AI总结当前阶段的成果
        // ⚠️ 临时方案：继续使用DEFAULT_PSYCHE_PROMPT，避免System Prompt切换导致的API错误
        // 在对话末尾添加一个总结请求
        const summaryRequest = [
          ...currentMessages,
          {
            role: 'user',
            content: `请总结一下我们刚才确定的内容。${SUMMARY_PROMPTS[currentStage]}`
          }
        ];
        
        const summary = await generateResponse(
          summaryRequest,
          undefined // 不传summarySystemPrompt，使用默认的DEFAULT_PSYCHE_PROMPT
        );
        
        // 保存总结
        const newResults = [...stageResults];
        const hadPreviousContent = !!stageResults[currentStage]; // 记录是否有旧内容
        
        // 如果当前阶段已有内容（导入的），将对话补充追加到后面，而不是覆盖
        if (stageResults[currentStage]) {
          newResults[currentStage] = stageResults[currentStage] + '\n\n---\n\n💬 **对话补充：**\n' + summary;
        } else {
        newResults[currentStage] = summary;
        }
        
        // 检查：如果是首次创建内容（之前没有），不清空后续阶段
        // 如果是修改已有内容，清空后续有对话历史的阶段
        if (hadPreviousContent) {
          // 清空后续有对话历史的阶段
          const newStageMessages = [...stageMessages];
          for (let i = currentStage + 1; i < 9; i++) {
            // 如果这个阶段有对话历史，说明是用户创建的，需要清空
            if (newStageMessages[i].length > 0) {
            newStageMessages[i] = [];
              newResults[i] = ''; // 清空对应的总结
            }
            // 如果没有对话历史，说明是导入的，保留它
          }
          
          updateProgress({ 
            stageResults: newResults,
            stageMessages: newStageMessages,
          });
        } else {
          updateProgress({ stageResults: newResults });
        }
      } catch (error) {
        console.error('生成总结失败:', error);
        // 即使失败也继续，使用简单总结
        const newResults = [...stageResults];
        newResults[currentStage] = `阶段${currentStage + 1}的讨论内容`;
        updateProgress({ stageResults: newResults });
      }
      setIsGeneratingSummary(false);
    }
    
    // 特殊处理：从阶段4（物理描写）进入阶段5（专项深化）时，显示专项选择界面
    if (currentStage === 3) {
      setShowSpecialtySelection(true);
    } else {
      updateProgress({ currentStage: currentStage + 1 });
    }
  };

  const goToPreviousStage = () => {
    if (currentStage > 0) {
      updateProgress({ currentStage: currentStage - 1 });
    }
  };

  // 处理专项类型选择
  const handleSpecialtySelection = (specialtyId: string) => {
    setShowSpecialtySelection(false);
    updateProgress({ 
      selectedSpecialty: specialtyId,
      currentStage: 4, // 进入阶段5（专项深化）
    });
  };

  // 处理跳过专项深化
  const handleSkipSpecialty = () => {
    setShowSpecialtySelection(false);
    const newResults = [...stageResults];
    newResults[4] = '【用户选择跳过专项深化】';
    updateProgress({ 
      stageResults: newResults,
      currentStage: 5, // 跳过阶段5（专项深化），直接到阶段6（互动设计）
    });
  };

  // 阶段9：分步生成（连续对话模式）
  const handleStage9StepGenerate = async (step: number) => {
    if (currentStage !== 8 || loading) return;
    
    setErrorMessage('');
    
    try {
      const newStageMessages = [...stageMessages];
      const currentStage9Messages = stageMessages[8] || [];
      
      // 1. 添加用户消息（当前步骤的指令）
      const userMessage = { role: 'user' as const, content: STAGE9_STEP_PROMPTS[step] };
      const updatedMessages = [...currentStage9Messages, userMessage];
      
      // 2. 构建上下文：只给当前步骤需要的阶段内容 + 对话历史
      let contextForAI: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
      
      if (step < 8) {
        // 第1-8步：只给对应阶段的内容
        if (stageResults[step]) {
          contextForAI.push({
            role: 'system' as const,
            content: `【阶段${step + 1}确定的内容】\n${stageResults[step]}`
          });
        }
      } else {
        // 第9步（生成其他字段）：需要阶段1、6、7的内容
        if (stageResults[0]) {
          contextForAI.push({
            role: 'system' as const,
            content: `【阶段1确定的内容】\n${stageResults[0]}`
          });
        }
        if (stageResults[5]) {
          contextForAI.push({
            role: 'system' as const,
            content: `【阶段6确定的内容】\n${stageResults[5]}`
          });
        }
        if (stageResults[6]) {
          contextForAI.push({
            role: 'system' as const,
            content: `【阶段7确定的内容】\n${stageResults[6]}`
          });
        }
      }
      
      // 添加阶段9的对话历史（包含刚添加的用户消息）
      contextForAI.push(...updatedMessages as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>);
      
      // 3. 调用AI（AI通过对话历史记住之前步骤的处理结果）
      const response = await generateResponse(contextForAI, STAGE9_STEP_PROMPTS[step]);
      
      // 4. 保存AI回复到对话历史
      newStageMessages[8] = [...updatedMessages, { role: 'assistant', content: response }];
      updateProgress({ stageMessages: newStageMessages });
      
      // 5. 追加到累积内容（简单追加，后面再优化格式）
      const newContent = stage9AccumulatedContent + response + '\n\n';
      setStage9AccumulatedContent(newContent);
      setStage9Step(step + 1);
      
    } catch (error: any) {
      console.error('阶段9分步生成失败:', error);
      let errorDetail = 'AI 响应失败';
      if (error?.response?.data?.error) {
        errorDetail = `API错误: ${error.response.data.error.message || error.response.data.error}`;
      } else if (error?.message) {
        errorDetail = `错误: ${error.message}`;
      } else if (typeof error === 'string') {
        errorDetail = error;
      }
      setErrorMessage(errorDetail);
    }
  };

  // 阶段9：保存到角色卡
  const handleSaveToCard = () => {
    if (currentStage !== 8) return;
    
    const newResults = [...stageResults];
    newResults[8] = stage9AccumulatedContent;
    updateProgress({ stageResults: newResults });
    
    alert('✅ 已保存到角色卡！\n\n现在可以点击"导出角色卡"按钮导出JSON文件。');
  };

  // 删除消息
  const handleDeleteMessage = (messageIndex: number) => {
    if (loading || isGeneratingSummary) return;
    
    const currentMessages = stageMessages[currentStage] || [];
    const newMessages = currentMessages.filter((_, idx) => idx !== messageIndex);
    
    const newStageMessages = [...stageMessages];
    newStageMessages[currentStage] = newMessages;
    
    updateProgress({ stageMessages: newStageMessages });
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
      {/* 阶段指示器 */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4">
        <div className="flex items-center justify-between text-white mb-2">
          <div className="flex items-center space-x-2">
            <ProjectSelector />
            <h3 className="font-semibold">阶段 {currentStage + 1}/9</h3>
            {lastSaved && (
              <span className="text-xs opacity-75">
                💾 {new Date(lastSaved).toLocaleTimeString('zh-CN')}
              </span>
            )}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setShowImport(true)}
                className="px-2 py-1 bg-white/20 hover:bg-white/30 rounded text-xs flex items-center space-x-1 transition-colors"
                title="导入文本自动分析"
              >
                <FileUp className="w-3 h-3" />
                <span className="hidden sm:inline">文本</span>
              </button>
              <button
                onClick={() => setShowImportCard(true)}
                className="px-2 py-1 bg-white/20 hover:bg-white/30 rounded text-xs flex items-center space-x-1 transition-colors"
                title="导入角色卡编辑"
              >
                <FileJson className="w-3 h-3" />
                <span className="hidden sm:inline">角色卡</span>
              </button>
              {hasSavedProgress() && (
                <>
                  <button
                    onClick={() => {
                      if (confirm('确定要清空当前项目内容吗？\n\n项目会保留，但所有创作内容将被清除。')) {
                        clearCurrentProject();
                      }
                    }}
                    className="px-2 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 rounded text-xs flex items-center space-x-1 transition-colors"
                    title="清空当前项目内容"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span className="hidden sm:inline">清空</span>
                  </button>
                  <button
                    onClick={() => createProject()}
                    className="px-2 py-1 bg-green-500/20 hover:bg-green-500/30 rounded text-xs flex items-center space-x-1 transition-colors"
                    title="新建项目"
                  >
                    <Plus className="w-3 h-3" />
                    <span className="hidden sm:inline">新建</span>
                  </button>
                </>
              )}
            </div>
          </div>
          <span className="text-sm">{STAGES[currentStage]}</span>
        </div>
        <div className="w-full bg-white/20 rounded-full h-2">
          <div
            className="bg-white rounded-full h-2 transition-all duration-300"
            style={{ width: `${((currentStage + 1) / 9) * 100}%` }}
          />
        </div>
        {/* 已完成阶段提示 */}
        {stageResults.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {stageResults.map((_, idx) => (
              <span key={idx} className="text-xs bg-white/20 px-2 py-1 rounded flex items-center space-x-1">
                <CheckCircle className="w-3 h-3" />
                <span>阶段{idx + 1}✓</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 显示之前阶段的成果 */}
        {stageResults.slice(0, currentStage).length > 0 && (
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 mb-4">
            <div className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-2">
              📋 之前阶段确定的内容：
            </div>
            <div className="space-y-2 text-sm text-indigo-600 dark:text-indigo-400">
              {stageResults.slice(0, currentStage).map((result, idx) => (
                <div key={idx} className="bg-white/50 dark:bg-slate-800/50 rounded p-2">
                  <div className="font-semibold mb-1">阶段{idx + 1}：{STAGES[idx]}</div>
                  <div className="text-xs whitespace-pre-wrap">{result}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 🔧 显示当前阶段已有的总结（导入的内容） - 阶段9除外 */}
        {currentStage !== 8 && stageResults[currentStage] && (() => {
          const content = stageResults[currentStage];
          const parts = content.split('\n\n---\n\n💬 **对话补充：**\n');
          const importedContent = parts[0];
          const dialogSupplement = parts[1];
          
          return (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border-2 border-green-200 dark:border-green-800">
              <div className="flex items-center space-x-2 text-green-700 dark:text-green-300 mb-2">
                <CheckCircle className="w-5 h-5" />
                <div className="text-sm font-semibold">
                  ✅ 当前阶段已有内容
                </div>
              </div>
              
              {/* 导入的内容 - 蓝色 */}
              {importedContent && (
                <div className="text-sm text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-900/20 rounded p-3 whitespace-pre-wrap mb-3 border-l-4 border-blue-400">
                  <div className="font-semibold mb-2 text-xs text-blue-600 dark:text-blue-400">📘 导入内容</div>
                  {importedContent}
                </div>
              )}
              
              {/* 对话补充 - 绿色 */}
              {dialogSupplement && (
                <div className="text-sm text-green-700 dark:text-green-300 bg-green-50/50 dark:bg-green-900/20 rounded p-3 whitespace-pre-wrap border-l-4 border-green-400">
                  <div className="font-semibold mb-2 text-xs text-green-600 dark:text-green-400">💬 对话补充</div>
                  {dialogSupplement}
                </div>
              )}
              
              <div className="mt-2 text-xs text-green-600 dark:text-green-400">
                💡 AI 已知道这些信息，您可以在此基础上继续完善和提问
              </div>
            </div>
          );
        })()}

        {currentMessages.length === 0 && (
          <div className="text-center text-slate-400 dark:text-slate-500 py-12">
            <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="mb-2 font-semibold">阶段 {currentStage + 1}：{STAGES[currentStage]}</p>
            <p className="text-sm">在下方输入您的想法开始创作</p>
          </div>
        )}
        
        {currentMessages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}
          >
            <div className="flex items-start space-x-2 max-w-[85%]">
            <div
                className={`flex-1 px-4 py-2 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
              
              {/* 操作按钮 */}
              <div className="flex items-start space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* 重新生成按钮 - 只对最后一条AI消息显示 */}
                {msg.role === 'assistant' && idx === currentMessages.length - 1 && !loading && !isGeneratingSummary && (
                  <button
                    onClick={() => handleRegenerate(idx)}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg"
                    title="重新生成"
                  >
                    <RefreshCw className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  </button>
                )}
                
                {/* 删除按钮 - 对所有消息显示 */}
                {!loading && !isGeneratingSummary && (
                  <button
                    onClick={() => {
                      if (confirm('确定要删除这条消息吗？')) {
                        handleDeleteMessage(idx);
                      }
                    }}
                    className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                    title="删除消息"
                  >
                    <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {(loading || isGeneratingSummary) && (
          <div className="flex justify-start">
            <div className="bg-slate-100 dark:bg-slate-700 px-4 py-2 rounded-lg flex items-center space-x-2">
              <Loader className="w-5 h-5 animate-spin text-indigo-500" />
              <span className="text-slate-600 dark:text-slate-400 text-sm">
                {isGeneratingSummary ? '正在总结本阶段成果...' : 'AI 思考中...'}
              </span>
            </div>
          </div>
        )}

        {/* 阶段7：世界整合 - 显示世界书编辑器 */}
        {currentStage === 6 && (
          <div className="mt-6">
            <WorldBookEditor 
              stageResults={stageResults} 
              currentStageMessages={currentMessages}
            />
          </div>
        )}
        
        {/* 阶段9：可折叠的文本编辑器 */}
        {currentStage === 8 && showStage9Editor && (
          <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-2 border-purple-300 dark:border-purple-700">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-purple-900 dark:text-purple-200">
                📝 累积内容编辑器（已完成 {stage9Step}/9 步）
              </label>
              <button
                onClick={() => setShowStage9Editor(false)}
                className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200"
                title="关闭编辑器"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              value={stage9AccumulatedContent}
              onChange={(e) => setStage9AccumulatedContent(e.target.value)}
              className="w-full h-96 px-3 py-2 border border-purple-300 dark:border-purple-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono resize-y focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="点击下方步骤按钮，AI将逐步填充内容到这里..."
            />
            <div className="mt-2 text-xs text-purple-700 dark:text-purple-300">
              💡 您可以随时编辑这里的内容。完成后点击下方"保存"按钮保存到角色卡。
            </div>
          </div>
        )}
      </div>

      {/* 输入区域 */}
      <div className="border-t border-slate-200 dark:border-slate-700 p-4">
        {/* 错误提示 */}
        {errorMessage && (
          <div className="mb-3 flex items-start space-x-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">
                API调用失败
              </div>
              <div className="text-xs text-red-700 dark:text-red-400">
                {errorMessage}
              </div>
            </div>
            <button
              onClick={() => setErrorMessage('')}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        
        <div className="flex space-x-2 mb-2">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={`阶段${currentStage + 1}：${STAGES[currentStage]} - 输入您的想法...`}
            className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            disabled={loading || isGeneratingSummary}
          />
          <button
            onClick={handleSend}
            disabled={loading || isGeneratingSummary || !userInput.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        {/* 导航按钮 */}
        <div className="space-y-2">
          {/* 阶段9：分步生成按钮（紧凑布局） */}
          {currentStage === 8 && (
            <div className="flex flex-col gap-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
              <div className="text-xs font-semibold text-purple-900 dark:text-purple-200">
                🎯 分步生成（共9步，连续对话，AI自主分类）：
              </div>
              <div className="flex flex-wrap gap-1">
                {[
                  { label: '1.阶段1', step: 0 },
                  { label: '2.阶段2', step: 1 },
                  { label: '3.阶段3', step: 2 },
                  { label: '4.阶段4', step: 3 },
                  { label: '5.阶段5', step: 4 },
                  { label: '6.阶段6', step: 5 },
                  { label: '7.阶段7', step: 6 },
                  { label: '8.阶段8', step: 7 },
                  { label: '9.其他字段', step: 8 },
                ].map(({ label, step }) => (
                  <button
                    key={step}
                    onClick={() => handleStage9StepGenerate(step)}
                    disabled={loading || isGeneratingSummary}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
                      stage9Step > step
                        ? 'bg-green-600 text-white'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                    title={stage9Step > step ? '已完成' : '点击生成'}
                  >
                    {stage9Step > step && '✓ '}
                    {label}
                  </button>
                ))}
                
                <button
                  onClick={() => setShowStage9Editor(!showStage9Editor)}
                  className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors"
                  title="查看/编辑累积内容"
                >
                  {showStage9Editor ? '隐藏编辑器' : '查看内容'}
                </button>
                
                <button
                  onClick={handleSaveToCard}
                  disabled={stage9Step === 0}
                  className="px-2 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center space-x-1"
                  title="保存到角色卡"
                >
                  <Save className="w-3 h-3" />
                  <span>保存</span>
                </button>
                
                <button
                  onClick={() => {
                    if (confirm('确定要重置吗？')) {
                      setStage9AccumulatedContent('【完整描述】\n\n');
                      setStage9Step(0);
                    }
                  }}
                  className="px-2 py-1 bg-slate-500 text-white rounded text-xs font-medium hover:bg-slate-600 transition-colors"
                  title="重置所有内容"
                >
                  重置
                </button>
              </div>
              <div className="text-xs text-purple-700 dark:text-purple-300">
                💡 按顺序点击1-8步，AI逐步处理阶段1-8内容并自动分类（连续对话，AI能记住之前步骤）。第9步生成其他字段。完成后点"保存"→"导出角色卡"。
              </div>
            </div>
          )}
          
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            {currentStage > 0 && (
              <button
                onClick={goToPreviousStage}
                disabled={isGeneratingSummary}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center space-x-1 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>上一阶段</span>
              </button>
            )}

              {currentStage < 8 && (
                <>
                  {/* 如果有对话，显示两个按钮 */}
                  {currentMessages.length > 0 ? (
                    <>
              <button
                        onClick={() => goToNextStage(true)}
                disabled={isGeneratingSummary}
                        className="px-3 py-2 bg-indigo-500 text-white rounded-lg text-sm transition-colors flex items-center space-x-1 disabled:opacity-50 hover:bg-indigo-600"
                      >
                        <span>总结并进入下一阶段</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => goToNextStage(false)}
                        disabled={isGeneratingSummary}
                        className="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm transition-colors flex items-center space-x-1 disabled:opacity-50 hover:bg-slate-200 dark:hover:bg-slate-600"
                      >
                        <span>直接进入下一阶段</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => goToNextStage(false)}
                      disabled={isGeneratingSummary}
                      className="px-3 py-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm transition-colors flex items-center space-x-1 disabled:opacity-50 hover:bg-indigo-200 dark:hover:bg-indigo-800"
                    >
                      <span>下一阶段</span>
                <ChevronRight className="w-4 h-4" />
              </button>
                  )}
                </>
            )}
          </div>

            {currentStage === 8 && (
            <button
                onClick={handleExportClick}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>导出角色卡</span>
            </button>
          )}
          </div>
        </div>

        {/* 提示信息 */}
        <div className="mt-2 flex items-start space-x-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex-shrink-0">💡</div>
          <div>
            {currentMessages.length > 0 && currentStage < 7 && stageResults[currentStage] && (
              <span className="text-amber-600 dark:text-amber-400">
                <strong>⚠️ 注意</strong>：您修改了本阶段内容，
                点击下一阶段时会<strong>清空后续阶段的对话</strong>（因为前面修改可能让后续内容不再适用）
              </span>
            )}
            {currentMessages.length > 0 && currentStage < 8 && !stageResults[currentStage] && (
              <span>
                点击"总结并进入下一阶段"时，AI会自动提取本阶段确定的内容，
                <strong>只传递精炼的结论</strong>给下一阶段，避免混淆。
              </span>
            )}
            {currentMessages.length === 0 && stageResults.length === 0 && '开始创作吧！您可以随时返回上一阶段修改内容。'}
            {currentMessages.length === 0 && stageResults.length > 0 && currentStage < 8 && (
              <span>
                本阶段尚未开始，您可以基于之前的设定继续创作，或返回上一阶段修改。
              </span>
            )}
            {currentStage === 7 && '质量检查阶段：检查所有内容是否完善'}
            {currentStage === 8 && '检查完成后点击"导出角色卡"保存您的作品'}
          </div>
        </div>
      </div>

      {/* 导出对话框 */}
      {showExport && <ExportDialog onClose={() => setShowExport(false)} />}
      
      {/* 导入文本对话框 */}
      {showImport && (
        <ImportTextDialog
          onClose={() => setShowImport(false)}
          onImportComplete={handleImportComplete}
        />
      )}
      
      {/* 导入角色卡对话框 */}
      {showImportCard && (
        <ImportCardDialog
          onClose={() => setShowImportCard(false)}
          onImportComplete={handleImportComplete}
        />
      )}

      {/* 专项深化类型选择对话框 */}
      {showSpecialtySelection && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* 标题栏 */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">
                  🎨 选择专项深化类型
                </h2>
                <p className="text-sm text-indigo-100 mt-1">
                  根据您的创作需求，选择一个专项方向进行深化
                </p>
              </div>
              <button
                onClick={handleSkipSpecialty}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white font-medium transition-colors flex items-center space-x-2"
              >
                <span>⏭️</span>
                <span>跳过此阶段</span>
              </button>
            </div>

            {/* 内容 */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {SPECIALTY_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleSpecialtySelection(type.id)}
                    className="group relative p-6 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 transition-all hover:shadow-lg text-left bg-white dark:bg-slate-700/50"
                  >
                    <div className="flex items-start space-x-4">
                      <div className="text-4xl">{type.icon}</div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                          {type.name}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          {type.description}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {type.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-1 text-xs rounded-full bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* 说明 */}
              <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  <strong>💡 提示：</strong> 
                  选择后，将进入对应的专项深化阶段。如果不需要特殊深化，可以点击右上角的"跳过此阶段"按钮直接进入互动设计。
                  您可以随时返回上一阶段重新选择。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
