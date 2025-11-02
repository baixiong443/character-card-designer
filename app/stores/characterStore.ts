import { create } from 'zustand';

export interface Character {
  name: string;
  description: string;
  first_mes: string;
  personality: string;
  scenario: string;
  mes_example: string;
  tags: string[];
}

interface CharacterState {
  character: Character;
  updateField: (field: keyof Character, value: any) => void;
  resetCharacter: () => void;
}

const defaultCharacter: Character = {
  name: '',
  description: '',
  first_mes: '',
  personality: '',
  scenario: '',
  mes_example: '',
  tags: [],
};

export const useCharacterStore = create<CharacterState>((set) => ({
  character: defaultCharacter,
  updateField: (field, value) =>
    set((state) => ({
      character: { ...state.character, [field]: value },
    })),
  resetCharacter: () => set({ character: defaultCharacter }),
}));