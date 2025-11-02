'use client';

import { useState } from 'react';
import { Sparkles, Send, Loader, Download, ChevronLeft, ChevronRight, CheckCircle, FileUp, FileJson } from 'lucide-react';
import { useAIService } from '@/services/aiService';
import ExportDialog from '@/components/ExportDialog';
import ImportTextDialog from '@/components/ImportTextDialog';
import ImportCardDialog from '@/components/ImportCardDialog';
import WorldBookEditor from '@/components/WorldBookEditor';

const STAGES = [
  '基础身份',
  '深度背景',
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
你的任务是帮助用户确定角色的基础身份。请询问并确定：
- 角色名称
- 物种/种族（人类、兽人、龙族等）
- 核心性格特征（3-5个关键词）
- 年龄和性别
请保持简洁，只关注基础身份。`,

  `【阶段2：深度背景】
基于用户确定的角色基础，现在深入探索角色背景。请询问并发展：
- 出生地和成长环境
- 重要的人生经历
- 核心动机和目标
- 与其他角色的关系`,

  `【阶段3：物理描写】
基于用户的角色设定，详细描述角色的外貌和身体特征。请包含：
- 身高、体型、体格
- 面部特征、发型、眼睛
- 穿着风格、配饰
- 如果是Furry：毛皮、耳朵尾巴等基础特征
- 独特的身体标记`,

  ``, // 阶段4由用户选择的专项类型决定

  `【阶段5：互动设计】
基于已创建的角色，设计角色的互动方式。请创作：
- 首条消息（第一次见面的场景）
- 对话风格（正式/随意、幽默/严肃）
- 口头禅或特殊用词
- 3-5个不同场景的对话示例`,

  `【阶段6：世界整合与世界书创建】

# 你的任务
帮助用户完善世界观，并引导创建世界书（Lorebook）条目。

## 什么是世界书？
世界书是AI角色扮演的**动态知识注入系统**：
- 当对话中出现特定关键词时，相关背景信息会自动注入到AI的上下文中
- 不占用常驻token，只在需要时激活
- SillyTavern等平台会自动识别和使用

## 世界书条目结构
每个条目包含：
1. **触发关键词**（keys）- 对话提到时注入（如："羊村", "青青草原"）
2. **条目内容**（content）- 要注入的背景信息（50-150字）
3. **类型**：
   - 常驻（constant: true）- 始终激活，用于核心规则/机制
   - 选择性（selective: true）- 按关键词触发，用于地点/人物/物品

## 你的具体工作流程

### 第一步：分析已有设定
回顾阶段1-5的内容，识别：
- ✓ 地点（locations）- 羊村、狼堡、森林
- ✓ 人物（characters）- NPC、对手、朋友
- ✓ 物品（objects）- 武器、道具、标志物
- ✓ 事件（events）- 循环事件、重要历史
- ✓ 规则（rules）- 游戏机制、魔法系统、战斗规则
- ✓ 组织（factions）- 团体、势力、种族
- ✓ 概念（concepts）- Furry特性（信息素、发情期）、特殊能力

### 第二步：与用户讨论
询问：
- "角色主要活动在哪些地点？"
- "有哪些重要的NPC角色？"
- "世界有什么特殊的规则或机制？"
- "有哪些标志性的物品或事件？"

### 第三步：主动建议
基于已有设定，建议创建的条目类型：
- 如果是Furry角色 → 建议：种族特征、发情机制、信息素系统、肉垫/尾巴细节
- 如果是RPG角色 → 建议：战斗系统、技能列表、装备系统、地图
- 如果有对手角色 → 建议：为对手创建条目
- 如果有特殊地点 → 建议：为地点创建条目

### 第四步：解释世界书的价值
向用户说明：
"世界书让AI更聪明。当对话提到'羊村'时，AI会自动知道羊村的详细信息，而不需要你每次都解释。这样可以：
- 节省token
- 让对话更流畅
- 支持复杂的世界观
- 完全兼容SillyTavern"

## 条目生成标准

### 类型A：常驻知识（用于核心规则）
\`\`\`
【关键词】--战斗, --battle, 战斗系统
【类型】常驻激活
【内容】
回合制战斗。攻击判定：d20+攻击修正 vs AC。暴击：自然20，伤害翻倍。技能消耗MP。战斗结束：一方HP归0或逃跑。
\`\`\`

### 类型B：选择性知识（用于地点/人物/物品）
\`\`\`
【关键词】羊村, 青青草原, Sheep Village
【内容】
羊村位于青青草原北岸，被铁栅栏保护。村内有大肥羊学校、实验室、医务室。慢羊羊是村长。村子经常遭灰太狼袭击，但总被喜羊羊化解。
\`\`\`

### 类型C：Furry专项（用于兽人特征）
\`\`\`
【关键词】肉垫, paw pads, 爪子
【内容】
（角色名）的后足底部有黑色肉垫，分为四个趾垫和一个掌垫。质地柔软有弹性，温暖湿润。趾缝和肉垫边缘是敏感区域。爪子锋利，平时收起，战斗时伸出。
\`\`\`

## 质量标准
✅ 好的条目：
- 多个关键词（中英文、别名）
- 内容精炼（50-150字）
- 包含关联信息
- 突出特征细节

❌ 避免：
- 内容过长（>300字）
- 关键词太宽泛（"他"、"的"）
- 重复信息
- 缺少关键词

## 你的回复模板

"让我们完善角色的世界观。根据你前面的设定，我建议创建以下世界书条目：

1. **【XX地点】** - 角色的主要活动区域
2. **【XX人物】** - 重要的NPC角色
3. **【XX物品】** - 标志性道具
4. **【XX规则】** - （如有）游戏机制/魔法系统

要我帮你生成这些条目吗？或者你想先讨论世界观的其他方面？

💡 世界书条目会在对话中自动激活，让AI知道相关背景，而不占用常驻token。"

确保世界设定与角色的物种、背景、专项深化完全一致。`,

  `【阶段7：质量检查】
回顾完整的角色设定。请检查：
- 所有信息是否完整
- 设定前后是否一致
- 描写是否详细生动
- 是否有矛盾或遗漏
提供改进建议。`,

  `【阶段8：导出】
恭喜完成角色创作！总结角色的核心特点，提醒用户导出。`,
];

const SUMMARY_PROMPTS = [
  '请简洁总结用户在本阶段确定的基础身份信息，只列出最终确定的内容（名称、物种、性格、年龄性别），不包括讨论过程。',
  '请简洁总结用户确定的背景信息，只列出最终确定的内容（出生地、经历、动机、关系），不包括讨论过程。',
  '请简洁总结用户确定的物理描写，只列出最终确定的内容（外貌、体型、特征、穿着），不包括讨论过程。',
  '请简洁总结用户在专项深化阶段确定的所有细节内容，只列出最终确定的内容，不包括讨论过程。',
  '请简洁总结用户确定的互动设计，只列出最终确定的内容（首条消息、对话风格、示例），不包括讨论过程。',
  '请简洁总结用户确定的世界整合内容，只列出最终确定的内容（场景、世界观、世界书条目），不包括讨论过程。',
  '请简洁总结质量检查的结果和需要改进的地方。',
  '',
];

export default function StageFlow() {
  const [currentStage, setCurrentStage] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [showSpecialtySelection, setShowSpecialtySelection] = useState(false);
  
  // 每个阶段的对话历史（仅用于当前阶段显示）
  const [stageMessages, setStageMessages] = useState<Array<Array<{ role: string; content: string }>>>([
    [], [], [], [], [], [], [], [] // 8个阶段
  ]);
  
  // 每个阶段的成果总结（传递给后续阶段）
  const [stageResults, setStageResults] = useState<string[]>([]);
  
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showImportCard, setShowImportCard] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const { generateResponse, loading } = useAIService();

  // 处理导入完成（文本分析或角色卡）
  const handleImportComplete = (importedResults: string[]) => {
    setStageResults(importedResults);
    // 导入后跳转到阶段1查看
    setCurrentStage(0);
  };

  const currentMessages = stageMessages[currentStage];

  const handleSend = async () => {
    if (!userInput.trim() || loading) return;

    const newMessage = { role: 'user', content: userInput };
    const updatedMessages = [...currentMessages, newMessage];
    
    // 更新当前阶段的消息
    const newStageMessages = [...stageMessages];
    newStageMessages[currentStage] = updatedMessages;
    setStageMessages(newStageMessages);
    setUserInput('');

    try {
      // 构建上下文：只包含之前阶段的成果 + 当前阶段的对话
      const contextForAI = [
        // 只添加当前阶段之前的成果总结（不包括之后的）
        ...stageResults.slice(0, currentStage).map((result, idx) => ({
          role: 'system' as const,
          content: `【阶段${idx + 1}确定的内容】\n${result}`
        })),
        // 添加当前阶段的对话（包括历史对话，让AI知道之前讨论了什么）
        ...updatedMessages
      ];

      // 如果是阶段4且用户已选择专项类型，使用专项提示词
      const stagePrompt = currentStage === 3 && selectedSpecialty 
        ? SPECIALTY_PROMPTS[selectedSpecialty]
        : STAGE_PROMPTS[currentStage];
      
      const response = await generateResponse(
        contextForAI,
        stagePrompt
      );
      
      newStageMessages[currentStage] = [...updatedMessages, { role: 'assistant', content: response }];
      setStageMessages(newStageMessages);
    } catch (error) {
      console.error('AI 响应失败:', error);
      newStageMessages[currentStage] = [...updatedMessages, { 
        role: 'assistant', 
        content: '抱歉，AI 响应失败。请检查设置中的API配置，或稍后重试。' 
      }];
      setStageMessages(newStageMessages);
    }
  };

  const goToNextStage = async () => {
    if (currentStage >= 7) return; // 更新为7（0-7共8个阶段）
    
    // 如果当前阶段有对话，生成总结
    if (currentMessages.length > 0 && currentStage < 7) {
      setIsGeneratingSummary(true);
      try {
        // 让AI总结当前阶段的成果
        const summary = await generateResponse(
          currentMessages,
          SUMMARY_PROMPTS[currentStage]
        );
        
        // 保存总结
        const newResults = [...stageResults];
        newResults[currentStage] = summary;
        setStageResults(newResults);
        
        // 检查：如果当前阶段的总结与之前保存的不同（说明修改了）
        // 清空后续阶段的对话和成果，因为前面修改了，后面可能不适用了
        if (stageResults[currentStage] && stageResults[currentStage] !== summary) {
          // 清空后续阶段的对话历史
          const newStageMessages = [...stageMessages];
          for (let i = currentStage + 1; i < 8; i++) { // 更新为8
            newStageMessages[i] = [];
          }
          setStageMessages(newStageMessages);
          
          // 清空后续阶段的成果
          const clearedResults = newResults.slice(0, currentStage + 1);
          setStageResults(clearedResults);
        }
      } catch (error) {
        console.error('生成总结失败:', error);
        // 即使失败也继续，使用简单总结
        const newResults = [...stageResults];
        newResults[currentStage] = `阶段${currentStage + 1}的讨论内容`;
        setStageResults(newResults);
      }
      setIsGeneratingSummary(false);
    }
    
    // 特殊处理：从阶段3进入阶段4时，显示专项选择界面
    if (currentStage === 2) {
      setShowSpecialtySelection(true);
    } else {
      setCurrentStage(currentStage + 1);
    }
  };

  const goToPreviousStage = () => {
    if (currentStage > 0) {
      setCurrentStage(currentStage - 1);
    }
  };

  // 处理专项类型选择
  const handleSpecialtySelection = (specialtyId: string) => {
    setSelectedSpecialty(specialtyId);
    setShowSpecialtySelection(false);
    setCurrentStage(3); // 进入阶段4
  };

  // 处理跳过专项深化
  const handleSkipSpecialty = () => {
    setShowSpecialtySelection(false);
    const newResults = [...stageResults];
    newResults[3] = '【用户选择跳过专项深化】';
    setStageResults(newResults);
    setCurrentStage(4); // 跳过阶段4，直接到阶段5
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
      {/* 阶段指示器 */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4">
        <div className="flex items-center justify-between text-white mb-2">
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold">阶段 {currentStage + 1}/8</h3>
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
            </div>
          </div>
          <span className="text-sm">{STAGES[currentStage]}</span>
        </div>
        <div className="w-full bg-white/20 rounded-full h-2">
          <div
            className="bg-white rounded-full h-2 transition-all duration-300"
            style={{ width: `${((currentStage + 1) / 8) * 100}%` }}
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
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
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

        {/* 阶段6：世界整合 - 显示世界书编辑器 */}
        {currentStage === 5 && (
          <div className="mt-6">
            <WorldBookEditor />
          </div>
        )}
      </div>

      {/* 输入区域 */}
      <div className="border-t border-slate-200 dark:border-slate-700 p-4">
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

            {currentStage < 6 && (
              <button
                onClick={goToNextStage}
                disabled={isGeneratingSummary}
                className={`px-3 py-2 rounded-lg text-sm transition-colors flex items-center space-x-1 disabled:opacity-50 ${
                  stageResults[currentStage] && currentMessages.length > 0
                    ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800'
                    : 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800'
                }`}
              >
                {stageResults[currentStage] && currentMessages.length > 0 && (
                  <span className="text-xs">⚠️</span>
                )}
                <span>{currentMessages.length > 0 ? '总结并进入下一阶段' : '下一阶段'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {currentStage === 7 && (
            <button
              onClick={() => setShowExport(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>导出角色卡</span>
            </button>
          )}
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
            {currentMessages.length > 0 && currentStage < 7 && !stageResults[currentStage] && (
              <span>
                点击"总结并进入下一阶段"时，AI会自动提取本阶段确定的内容，
                <strong>只传递精炼的结论</strong>给下一阶段，避免混淆。
              </span>
            )}
            {currentMessages.length === 0 && stageResults.length === 0 && '开始创作吧！您可以随时返回上一阶段修改内容。'}
            {currentMessages.length === 0 && stageResults.length > 0 && currentStage < 7 && (
              <span>
                本阶段尚未开始，您可以基于之前的设定继续创作，或返回上一阶段修改。
              </span>
            )}
            {currentStage === 7 && '检查完成后点击"导出角色卡"保存您的作品'}
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
