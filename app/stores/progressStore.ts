import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Message {
  role: string;
  content: string;
}

interface Project {
  id: string;
  name: string;
  createdAt: string;
  lastSaved: string;
  stageResults: string[];
  currentStage: number;
  stageMessages: Message[][];
  selectedSpecialty: string | null;
}

interface ProgressState {
  // 当前项目ID
  currentProjectId: string | null;
  
  // 所有项目
  projects: Record<string, Project>;
  
  // 获取当前项目
  getCurrentProject: () => Project | null;
  
  // 创建新项目
  createProject: (name?: string) => string;
  
  // 切换项目
  switchProject: (projectId: string) => void;
  
  // 删除项目
  deleteProject: (projectId: string) => void;
  
  // 重命名项目
  renameProject: (projectId: string, name: string) => void;
  
  // 清空当前项目内容（保留项目，清空进度）
  clearCurrentProject: () => void;
  
  // 更新当前项目进度
  updateProgress: (data: {
    stageResults?: string[];
    currentStage?: number;
    stageMessages?: Message[][];
    selectedSpecialty?: string | null;
  }) => void;
  
  // 获取项目列表
  getProjectList: () => Array<{ id: string; name: string; lastSaved: string }>;
  
  // 获取是否有保存的进度
  hasSavedProgress: () => boolean;
}

const createEmptyProject = (id: string, name: string): Project => ({
  id,
  name,
  createdAt: new Date().toISOString(),
  lastSaved: new Date().toISOString(),
  stageResults: [],
  currentStage: 0,
  stageMessages: [[], [], [], [], [], [], [], [], []],
  selectedSpecialty: null,
});

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      currentProjectId: null,
      projects: {},
      
      getCurrentProject: () => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return null;
        return projects[currentProjectId] || null;
      },
      
      createProject: (name?: string) => {
        const id = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const projectName = name || `角色卡 ${new Date().toLocaleDateString('zh-CN')}`;
        
        const newProject = createEmptyProject(id, projectName);
        
        set((state) => ({
          projects: {
            ...state.projects,
            [id]: newProject,
          },
          currentProjectId: id,
        }));
        
        return id;
      },
      
      switchProject: (projectId: string) => {
        const { projects } = get();
        if (projects[projectId]) {
          set({ currentProjectId: projectId });
        }
      },
      
      deleteProject: (projectId: string) => {
        set((state) => {
          const newProjects = { ...state.projects };
          delete newProjects[projectId];
          
          // 如果删除的是当前项目，切换到其他项目或null
          let newCurrentId = state.currentProjectId;
          if (state.currentProjectId === projectId) {
            const projectIds = Object.keys(newProjects);
            newCurrentId = projectIds.length > 0 ? projectIds[0] : null;
          }
          
          return {
            projects: newProjects,
            currentProjectId: newCurrentId,
          };
        });
      },
      
      renameProject: (projectId: string, name: string) => {
        set((state) => {
          const project = state.projects[projectId];
          if (!project) return state;
          
          return {
            projects: {
              ...state.projects,
              [projectId]: {
                ...project,
                name,
              },
            },
          };
        });
      },
      
      clearCurrentProject: () => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;
        
        const currentProject = projects[currentProjectId];
        if (!currentProject) return;
        
        // 清空内容，但保留项目名称和ID
        set({
          projects: {
            ...projects,
            [currentProjectId]: {
              ...currentProject,
              stageResults: [],
              currentStage: 0,
              stageMessages: [[], [], [], [], [], [], [], [], []],
              selectedSpecialty: null,
              lastSaved: new Date().toISOString(),
            },
          },
        });
      },
      
      updateProgress: (data) => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) {
          // 如果没有当前项目，自动创建一个
          const newId = get().createProject();
          const project = get().projects[newId];
          set({
            projects: {
              ...get().projects,
              [newId]: {
                ...project,
                ...data,
                lastSaved: new Date().toISOString(),
              },
            },
          });
          return;
        }
        
        const currentProject = projects[currentProjectId];
        if (!currentProject) return;
        
        set({
          projects: {
            ...projects,
            [currentProjectId]: {
              ...currentProject,
              ...data,
              lastSaved: new Date().toISOString(),
            },
          },
        });
      },
      
      getProjectList: () => {
        const { projects } = get();
        return Object.values(projects)
          .map(p => ({ id: p.id, name: p.name, lastSaved: p.lastSaved }))
          .sort((a, b) => new Date(b.lastSaved).getTime() - new Date(a.lastSaved).getTime());
      },
      
      hasSavedProgress: () => {
        const project = get().getCurrentProject();
        if (!project) return false;
        return project.stageResults.length > 0 || project.stageMessages.some(msgs => msgs.length > 0);
      },
    }),
    {
      name: 'psyche-projects-storage',
      version: 2,
      // 自动清理超过30天的项目，防止缓存膨胀
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          // 从旧版本迁移
          const oldData = persistedState as any;
          if (oldData.stageResults || oldData.stageMessages) {
            // 将旧的单项目数据转换为新格式
            const id = `project_${Date.now()}`;
            const project = createEmptyProject(id, '迁移的项目');
            project.stageResults = oldData.stageResults || [];
            project.stageMessages = oldData.stageMessages || [[], [], [], [], [], [], [], [], []];
            project.currentStage = oldData.currentStage || 0;
            project.selectedSpecialty = oldData.selectedSpecialty || null;
            
            return {
              currentProjectId: id,
              projects: { [id]: project },
            };
          }
        }
        
        // 清理超过30天的项目
        const state = persistedState as ProgressState;
        const now = Date.now();
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
        
        const cleanedProjects: Record<string, Project> = {};
        Object.entries(state.projects || {}).forEach(([id, project]) => {
          const lastSavedTime = new Date(project.lastSaved).getTime();
          if (lastSavedTime > thirtyDaysAgo) {
            cleanedProjects[id] = project;
          }
        });
        
        return {
          ...state,
          projects: cleanedProjects,
        };
      },
    }
  )
);

