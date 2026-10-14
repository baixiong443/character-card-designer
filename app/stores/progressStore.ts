import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  CharacterCardEnvelope,
  EditableCharacterCard,
  NormalizedCharacterCard,
} from '@/lib/characterCard';
import {
  type CharacterBook,
  type WorldBookEntry,
  convertFromCharacterBookEntry,
  createDefaultWorldBookEntry,
} from '@/types/worldbook';
import {
  validatePsycheTimelineState,
  type PsycheTimelineProjectState,
} from '@/lib/psycheTimeline';
import {
  validateStorySourceLibraryRef,
  type StorySourceLibraryRef,
} from '@/lib/storySource';

export interface Message {
  role: string;
  content: string;
}

export type CharacterBookMetadata = Omit<CharacterBook, 'entries'>;
export type FinalDescriptionSection = 'identity' | 'background' | 'relationships' | 'appearance' | 'specialty';
export type FinalFieldBlock = 'interaction' | 'world' | 'core';

export interface FinalAuditState {
  candidateFieldBlocks: Partial<Record<FinalFieldBlock, string>>;
  completedBlocks: FinalFieldBlock[];
  jobErrors: Partial<Record<FinalFieldBlock, string>>;
  applied: boolean;
  updatedAt: string | null;
}

export interface FinalDraftState {
  descriptionSections: Partial<Record<FinalDescriptionSection, string>>;
  fieldBlocks: Partial<Record<FinalFieldBlock, string>>;
  review: string;
  completedSteps: number[];
  jobErrors: Record<number, string>;
  manualText: string | null;
  updatedAt: string | null;
  audit: FinalAuditState;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  lastSaved: string;
  stageResults: string[];
  currentStage: number;
  stageMessages: Message[][];
  selectedSpecialty: string | null;
  character: EditableCharacterCard;
  sourceEnvelope: CharacterCardEnvelope | null;
  worldBookEntries: WorldBookEntry[];
  bookMetadata: CharacterBookMetadata | null;
  psycheTimeline: PsycheTimelineProjectState | null;
  storySource: StorySourceLibraryRef | null;
  finalDraft: FinalDraftState;
}

interface ProgressState {
  currentProjectId: string | null;
  projects: Record<string, Project>;
  getCurrentProject: () => Project | null;
  createProject: (name?: string) => string;
  switchProject: (projectId: string) => void;
  deleteProject: (projectId: string) => void;
  renameProject: (projectId: string, name: string) => void;
  clearCurrentProject: () => void;
  touchCurrentProject: () => void;
  updateProgress: (data: {
    stageResults?: string[];
    currentStage?: number;
    stageMessages?: Message[][];
    selectedSpecialty?: string | null;
  }) => void;
  updateCharacterField: <K extends keyof EditableCharacterCard>(field: K, value: EditableCharacterCard[K]) => void;
  applyCharacterPatch: (patch: Partial<EditableCharacterCard>) => void;
  loadImportedCard: (card: NormalizedCharacterCard) => void;
  addWorldBookEntry: (entry?: Partial<WorldBookEntry>) => WorldBookEntry;
  updateWorldBookEntry: (uid: number, updates: Partial<WorldBookEntry>) => void;
  deleteWorldBookEntry: (uid: number) => void;
  clearWorldBook: () => void;
  importCharacterBook: (book: CharacterBook) => void;
  updateBookMetadata: (updates: Partial<CharacterBookMetadata>) => void;
  updatePsycheTimeline: (timeline: PsycheTimelineProjectState | null) => void;
  updateStorySource: (source: StorySourceLibraryRef | null) => void;
  updateFinalDraft: (patch: Partial<FinalDraftState>) => void;
  resetFinalDraft: () => void;
  getProjectList: () => Array<{ id: string; name: string; lastSaved: string }>;
  hasSavedProgress: () => boolean;
}

export const createDefaultCharacter = (): EditableCharacterCard => ({
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
  creator: 'Psyche 角色卡设计器',
  character_version: '1.0',
});

export const createEmptyFinalAudit = (): FinalAuditState => ({
  candidateFieldBlocks: {},
  completedBlocks: [],
  jobErrors: {},
  applied: false,
  updatedAt: null,
});

export const createEmptyFinalDraft = (): FinalDraftState => ({
  descriptionSections: {},
  fieldBlocks: {},
  review: '',
  completedSteps: [],
  jobErrors: {},
  manualText: null,
  updatedAt: null,
  audit: createEmptyFinalAudit(),
});

const makeProjectId = () => `project_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

const createEmptyProject = (id: string, name: string): Project => ({
  id,
  name,
  createdAt: new Date().toISOString(),
  lastSaved: new Date().toISOString(),
  stageResults: [],
  currentStage: 0,
  stageMessages: [[], [], [], [], [], [], [], [], []],
  selectedSpecialty: null,
  character: createDefaultCharacter(),
  sourceEnvelope: null,
  worldBookEntries: [],
  bookMetadata: null,
  psycheTimeline: null,
  storySource: null,
  finalDraft: createEmptyFinalDraft(),
});

function updateCurrentProjectState(
  state: ProgressState,
  updater: (project: Project) => Project,
): Pick<ProgressState, 'currentProjectId' | 'projects'> {
  let currentProjectId = state.currentProjectId;
  let projects = state.projects;

  if (!currentProjectId || !projects[currentProjectId]) {
    currentProjectId = makeProjectId();
    const project = createEmptyProject(currentProjectId, `角色卡 ${new Date().toLocaleDateString('zh-CN')}`);
    projects = { ...projects, [currentProjectId]: project };
  }

  const currentProject = projects[currentProjectId];
  const updatedProject = updater(currentProject);
  return {
    currentProjectId,
    projects: {
      ...projects,
      [currentProjectId]: {
        ...updatedProject,
        lastSaved: new Date().toISOString(),
      },
    },
  };
}

function normalizeProject(project: Partial<Project> & Pick<Project, 'id' | 'name'>): Project {
  const empty = createEmptyProject(project.id, project.name);
  return {
    ...empty,
    ...project,
    character: {
      ...empty.character,
      ...(project.character || {}),
    },
    stageMessages: Array.from({ length: 9 }, (_, index) => project.stageMessages?.[index] || []),
    worldBookEntries: project.worldBookEntries || [],
    bookMetadata: project.bookMetadata || null,
    psycheTimeline: project.psycheTimeline && validatePsycheTimelineState(project.psycheTimeline).valid
      ? project.psycheTimeline
      : null,
    storySource: validateStorySourceLibraryRef(project.storySource) ? project.storySource : null,
    finalDraft: {
      ...empty.finalDraft,
      ...(project.finalDraft || {}),
      descriptionSections: project.finalDraft?.descriptionSections || {},
      fieldBlocks: project.finalDraft?.fieldBlocks || {},
      completedSteps: project.finalDraft?.completedSteps || [],
      jobErrors: project.finalDraft?.jobErrors || {},
      audit: {
        ...empty.finalDraft.audit,
        ...(project.finalDraft?.audit || {}),
        candidateFieldBlocks: project.finalDraft?.audit?.candidateFieldBlocks || {},
        completedBlocks: project.finalDraft?.audit?.completedBlocks || [],
        jobErrors: project.finalDraft?.audit?.jobErrors || {},
      },
    },
  };
}

function getCharacterBookMetadata(book: CharacterBook): CharacterBookMetadata {
  const metadata = JSON.parse(JSON.stringify(book)) as Record<string, unknown>;
  delete metadata.entries;
  return metadata as CharacterBookMetadata;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      currentProjectId: null,
      projects: {},

      getCurrentProject: () => {
        const { currentProjectId, projects } = get();
        return currentProjectId ? projects[currentProjectId] || null : null;
      },

      createProject: (name) => {
        const id = makeProjectId();
        const projectName = name || `角色卡 ${new Date().toLocaleDateString('zh-CN')}`;
        const newProject = createEmptyProject(id, projectName);
        set(state => ({
          projects: { ...state.projects, [id]: newProject },
          currentProjectId: id,
        }));
        return id;
      },

      switchProject: (projectId) => {
        if (get().projects[projectId]) set({ currentProjectId: projectId });
      },

      deleteProject: (projectId) => {
        set(state => {
          const projects = { ...state.projects };
          delete projects[projectId];
          const currentProjectId = state.currentProjectId === projectId
            ? Object.values(projects).sort((a, b) => b.lastSaved.localeCompare(a.lastSaved))[0]?.id || null
            : state.currentProjectId;
          return { projects, currentProjectId };
        });
      },

      renameProject: (projectId, name) => {
        set(state => {
          const project = state.projects[projectId];
          if (!project) return state;
          return {
            projects: {
              ...state.projects,
              [projectId]: { ...project, name, lastSaved: new Date().toISOString() },
            },
          };
        });
      },

      clearCurrentProject: () => {
        set(state => updateCurrentProjectState(state, project => ({
          ...createEmptyProject(project.id, project.name),
          createdAt: project.createdAt,
        })));
      },

      touchCurrentProject: () => {
        set(state => updateCurrentProjectState(state, project => project));
      },

      updateProgress: (data) => {
        set(state => updateCurrentProjectState(state, project => ({ ...project, ...data })));
      },

      updateCharacterField: (field, value) => {
        set(state => updateCurrentProjectState(state, project => ({
          ...project,
          character: { ...project.character, [field]: value },
        })));
      },

      applyCharacterPatch: (patch) => {
        set(state => updateCurrentProjectState(state, project => {
          const character = { ...project.character };
          for (const [key, value] of Object.entries(patch) as Array<[
            keyof EditableCharacterCard,
            EditableCharacterCard[keyof EditableCharacterCard],
          ]>) {
            if (value === undefined) continue;
            if (typeof value === 'string' && !value.trim() && typeof character[key] === 'string' && character[key]) continue;
            if (Array.isArray(value) && value.length === 0 && Array.isArray(character[key]) && character[key]?.length) continue;

            if (
              key === 'creator_notes'
              && typeof value === 'string'
              && typeof character.creator_notes === 'string'
              && character.creator_notes.includes('剧情轨迹指南')
              && !value.includes('剧情轨迹指南')
            ) {
              character.creator_notes = `${character.creator_notes}\n\n---\n\n${value}`;
              continue;
            }
            Object.assign(character, { [key]: value });
          }
          return { ...project, character };
        }));
      },

      loadImportedCard: (card) => {
        set(state => updateCurrentProjectState(state, project => ({
          ...project,
          character: { ...createDefaultCharacter(), ...card.character },
          sourceEnvelope: card.envelope,
          worldBookEntries: card.characterBook?.entries.map((entry, index) => convertFromCharacterBookEntry(entry, index)) || [],
          bookMetadata: card.characterBook ? getCharacterBookMetadata(card.characterBook) : null,
          psycheTimeline: card.psycheTimeline,
          storySource: null,
          finalDraft: createEmptyFinalDraft(),
        })));
      },

      addWorldBookEntry: (partialEntry) => {
        let createdEntry = createDefaultWorldBookEntry(0);
        set(state => updateCurrentProjectState(state, project => {
          const uid = project.worldBookEntries.length > 0
            ? Math.max(...project.worldBookEntries.map(entry => entry.uid)) + 1
            : 0;
          createdEntry = { ...createDefaultWorldBookEntry(uid), ...partialEntry, uid };
          return { ...project, worldBookEntries: [...project.worldBookEntries, createdEntry] };
        }));
        return createdEntry;
      },

      updateWorldBookEntry: (uid, updates) => {
        set(state => updateCurrentProjectState(state, project => ({
          ...project,
          worldBookEntries: project.worldBookEntries.map(entry => entry.uid === uid ? { ...entry, ...updates } : entry),
        })));
      },

      deleteWorldBookEntry: (uid) => {
        set(state => updateCurrentProjectState(state, project => ({
          ...project,
          worldBookEntries: project.worldBookEntries.filter(entry => entry.uid !== uid),
        })));
      },

      clearWorldBook: () => {
        set(state => updateCurrentProjectState(state, project => ({
          ...project,
          worldBookEntries: [],
          bookMetadata: null,
        })));
      },

      importCharacterBook: (book) => {
        const { entries, ...metadata } = book;
        set(state => updateCurrentProjectState(state, project => ({
          ...project,
          worldBookEntries: entries.map((entry, index) => convertFromCharacterBookEntry(entry, index)),
          bookMetadata: JSON.parse(JSON.stringify(metadata)),
        })));
      },

      updateBookMetadata: (updates) => {
        set(state => updateCurrentProjectState(state, project => ({
          ...project,
          bookMetadata: {
            ...(project.bookMetadata || {}),
            ...updates,
          },
        })));
      },

      updatePsycheTimeline: (timeline) => {
        if (timeline) {
          const validation = validatePsycheTimelineState(timeline);
          if (!validation.valid) throw new Error(`时间线状态无效：${validation.errors.join('；')}`);
        }
        set(state => updateCurrentProjectState(state, project => ({
          ...project,
          psycheTimeline: timeline,
        })));
      },

      updateStorySource: (source) => {
        if (source && !validateStorySourceLibraryRef(source)) throw new Error('原文库引用无效');
        set(state => updateCurrentProjectState(state, project => ({
          ...project,
          storySource: source,
        })));
      },

      updateFinalDraft: (patch) => {
        set(state => updateCurrentProjectState(state, project => ({
          ...project,
          finalDraft: {
            ...project.finalDraft,
            ...patch,
            updatedAt: new Date().toISOString(),
          },
        })));
      },

      resetFinalDraft: () => {
        set(state => updateCurrentProjectState(state, project => ({
          ...project,
          finalDraft: createEmptyFinalDraft(),
          stageResults: project.stageResults.map((result, index) => index === 8 ? '' : result),
          stageMessages: project.stageMessages.map((messages, index) => index === 8 ? [] : messages),
        })));
      },

      getProjectList: () => Object.values(get().projects)
        .map(project => ({ id: project.id, name: project.name, lastSaved: project.lastSaved }))
        .sort((a, b) => new Date(b.lastSaved).getTime() - new Date(a.lastSaved).getTime()),

      hasSavedProgress: () => {
        const project = get().getCurrentProject();
        if (!project) return false;
        return project.stageResults.some(Boolean)
          || project.stageMessages.some(messages => messages.length > 0)
          || Boolean(project.character.name || project.character.description)
          || project.worldBookEntries.length > 0
          || Boolean(project.psycheTimeline)
          || Boolean(project.storySource);
      },
    }),
    {
      name: 'psyche-projects-storage',
      version: 6,
      partialize: state => ({
        currentProjectId: state.currentProjectId,
        projects: Object.fromEntries(Object.entries(state.projects).map(([id, project]) => [
          id,
          {
            ...project,
            sourceEnvelope: project.sourceEnvelope
              ? { ...project.sourceEnvelope, sourceImageDataUrl: undefined }
              : null,
          },
        ])),
      }),
      migrate: (persistedState: unknown, version) => {
        const persisted = (persistedState || {}) as Partial<ProgressState> & {
          stageResults?: string[];
          stageMessages?: Message[][];
          currentStage?: number;
          selectedSpecialty?: string | null;
        };

        if (version < 2 && (persisted.stageResults || persisted.stageMessages)) {
          const id = makeProjectId();
          const project = createEmptyProject(id, '迁移的项目');
          project.stageResults = persisted.stageResults || [];
          project.stageMessages = persisted.stageMessages || project.stageMessages;
          project.currentStage = persisted.currentStage || 0;
          project.selectedSpecialty = persisted.selectedSpecialty || null;
          return { currentProjectId: id, projects: { [id]: project } };
        }

        const projects = Object.fromEntries(
          Object.entries(persisted.projects || {}).map(([id, project]) => [id, normalizeProject(project)]),
        );
        const currentProjectId = persisted.currentProjectId && projects[persisted.currentProjectId]
          ? persisted.currentProjectId
          : Object.values(projects).sort((a, b) => b.lastSaved.localeCompare(a.lastSaved))[0]?.id || null;

        if (version < 3 && currentProjectId && projects[currentProjectId].worldBookEntries.length === 0) {
          try {
            const legacyRaw = globalThis.localStorage?.getItem('psyche-worldbook');
            const legacyState = legacyRaw ? JSON.parse(legacyRaw)?.state : null;
            if (Array.isArray(legacyState?.entries)) {
              projects[currentProjectId] = {
                ...projects[currentProjectId],
                worldBookEntries: legacyState.entries,
                bookMetadata: legacyState.bookMetadata || null,
              };
            }
          } catch {
            // Invalid legacy storage should not block project migration.
          }
        }

        return { currentProjectId, projects };
      },
    },
  ),
);
