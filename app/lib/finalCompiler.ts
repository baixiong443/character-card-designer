import type {
  FinalDescriptionSection,
  FinalDraftState,
} from '@/stores/progressStore';

export const FINAL_DESCRIPTION_STEPS: Array<{
  section: FinalDescriptionSection;
  title: string;
}> = [
  { section: 'identity', title: '基本信息' },
  { section: 'background', title: '深度背景与动机' },
  { section: 'relationships', title: '关系网络' },
  { section: 'appearance', title: '外貌与物理特征' },
  { section: 'specialty', title: '专项深化' },
];

export function assembleFinalDraft(draft: FinalDraftState): string {
  if (draft.manualText !== null) return draft.manualText;

  const description = FINAL_DESCRIPTION_STEPS
    .map(({ section, title }) => {
      const content = draft.descriptionSections[section]?.trim();
      return content ? `#### **${title}**\n${content}` : '';
    })
    .filter(Boolean)
    .join('\n\n');

  return [
    description ? `【完整描述】\n${description}` : '',
    draft.fieldBlocks.core?.trim() || '',
    draft.fieldBlocks.interaction?.trim() || '',
    draft.fieldBlocks.world?.trim() || '',
  ].filter(Boolean).join('\n\n');
}

export function getNextRequiredFinalStep(completedSteps: number[]): number {
  return Array.from({ length: 9 }, (_, index) => index)
    .find(index => !completedSteps.includes(index)) ?? 9;
}
