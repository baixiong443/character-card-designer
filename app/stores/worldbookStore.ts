import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WorldBookEntry, createDefaultWorldBookEntry } from '@/types/worldbook';

interface WorldBookState {
  entries: WorldBookEntry[];
  addEntry: (entry?: Partial<WorldBookEntry>) => WorldBookEntry;
  updateEntry: (uid: number, updates: Partial<WorldBookEntry>) => void;
  deleteEntry: (uid: number) => void;
  getEntry: (uid: number) => WorldBookEntry | undefined;
  clearAllEntries: () => void;
  importEntries: (entries: WorldBookEntry[]) => void;
}

/**
 * 世界书状态管理
 */
export const useWorldBookStore = create<WorldBookState>()(
  persist(
    (set, get) => ({
      entries: [],

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
        set({ entries: [] });
      },

      /**
       * 导入条目（替换现有）
       */
      importEntries: (entries) => {
        set({ entries });
      },
    }),
    {
      name: 'psyche-worldbook',
    }
  )
);

