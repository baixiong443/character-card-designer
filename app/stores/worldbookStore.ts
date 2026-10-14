import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  CharacterBook,
  WorldBookEntry,
  convertFromCharacterBookEntry,
  createDefaultWorldBookEntry,
} from '@/types/worldbook';

type CharacterBookMetadata = Omit<CharacterBook, 'entries'>;

interface WorldBookState {
  entries: WorldBookEntry[];
  bookMetadata: CharacterBookMetadata | null;
  addEntry: (entry?: Partial<WorldBookEntry>) => WorldBookEntry;
  updateEntry: (uid: number, updates: Partial<WorldBookEntry>) => void;
  deleteEntry: (uid: number) => void;
  getEntry: (uid: number) => WorldBookEntry | undefined;
  clearAllEntries: () => void;
  importEntries: (entries: WorldBookEntry[]) => void;
  importCharacterBook: (book: CharacterBook) => void;
}

/**
 * 世界书状态管理
 */
export const useWorldBookStore = create<WorldBookState>()(
  persist(
    (set, get) => ({
      entries: [],
      bookMetadata: null,

      /**
       * 添加新条目
       */
      addEntry: (partialEntry) => {
        const entries = get().entries;
        const newUid = entries.length > 0 
          ? Math.max(...entries.map(e => e.uid)) + 1 
          : 0;
        
        const newEntry = {
          ...createDefaultWorldBookEntry(newUid),
          ...partialEntry,
          uid: newUid, // 确保 uid 不被覆盖
        };

        set({ entries: [...entries, newEntry] });
        return newEntry;
      },

      /**
       * 更新条目
       */
      updateEntry: (uid, updates) => {
        set(state => ({
          entries: state.entries.map(entry =>
            entry.uid === uid ? { ...entry, ...updates } : entry
          ),
        }));
      },

      /**
       * 删除条目
       */
      deleteEntry: (uid) => {
        set(state => ({
          entries: state.entries.filter(entry => entry.uid !== uid),
        }));
      },

      /**
       * 获取单个条目
       */
      getEntry: (uid) => {
        return get().entries.find(entry => entry.uid === uid);
      },

      /**
       * 清空所有条目
       */
      clearAllEntries: () => {
        set({ entries: [], bookMetadata: null });
      },

      /**
       * 导入条目（替换现有）
       */
      importEntries: (entries) => {
        set({ entries });
      },

      importCharacterBook: (book) => {
        const { entries, ...metadata } = book;
        set({
          entries: entries.map((entry, index) => convertFromCharacterBookEntry(entry, index)),
          bookMetadata: JSON.parse(JSON.stringify(metadata)),
        });
      },
    }),
    {
      name: 'psyche-worldbook',
    }
  )
);

