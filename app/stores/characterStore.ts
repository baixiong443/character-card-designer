import { create } from 'zustand';
import type {
  CharacterCardEnvelope,
  EditableCharacterCard,
  NormalizedCharacterCard,
} from '@/lib/characterCard';
import { parseCharacterFromStages } from '@/lib/stageParser';

export type Character = EditableCharacterCard;

interface CharacterState {
  character: Character;
  sourceEnvelope: CharacterCardEnvelope | null;
  updateField: (field: keyof Character, value: Character[keyof Character]) => void;
  resetCharacter: () => void;
  loadImportedCard: (card: NormalizedCharacterCard) => void;
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
  creator: 'Psyche 角色卡设计器',
  character_version: '1.0',
};

// 兼容旧组件和旧存储入口；新工作流使用 progressStore 中的项目级角色状态。
export const useCharacterStore = create<CharacterState>((set) => ({
  character: defaultCharacter,
  sourceEnvelope: null,
  updateField: (field, value) => set(state => ({
    character: { ...state.character, [field]: value },
  })),
  resetCharacter: () => set({ character: defaultCharacter, sourceEnvelope: null }),
  loadImportedCard: (card) => set({
    character: { ...defaultCharacter, ...card.character },
    sourceEnvelope: card.envelope,
  }),
  parseFromStageResults: (stageResults) => set(state => ({
    character: { ...state.character, ...parseCharacterFromStages(stageResults) },
  })),
}));

export { parseCharacterFromStages };
