'use client';

import { useState } from 'react';
import { useProgressStore } from '@/stores/progressStore';
import { FolderOpen, Plus, Trash2, Edit2, Check, X } from 'lucide-react';

export default function ProjectSelector() {
  const {
    getCurrentProject,
    getProjectList,
    createProject,
    switchProject,
    deleteProject,
    renameProject,
  } = useProgressStore();

  const [showDropdown, setShowDropdown] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const currentProject = getCurrentProject();
  const projects = getProjectList();

  const handleCreate = () => {
    const name = prompt('请输入项目名称：', `角色卡 ${new Date().toLocaleDateString('zh-CN')}`);
    if (name) {
      createProject(name.trim());
      setShowDropdown(false);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定要删除这个项目吗？\n\n删除后无法恢复。')) {
      deleteProject(id);
    }
  };

  const startEdit = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditingName(name);
  };

  const saveEdit = (id: string) => {
    if (editingName.trim()) {
      renameProject(id, editingName.trim());
    }
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm"
      >
        <FolderOpen className="w-4 h-4" />
        <span>{currentProject?.name || '选择项目'}</span>
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-700 z-20 max-h-96 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 dark:text-white">我的项目</h3>
              <button
                onClick={handleCreate}
                className="flex items-center space-x-1 px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>新建</span>
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {projects.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                  <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>还没有项目</p>
                  <p className="text-xs mt-1">点击"新建"创建第一个项目</p>
                </div>
              ) : (
                projects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => {
                      if (editingId !== project.id) {
                        switchProject(project.id);
                        setShowDropdown(false);
                      }
                    }}
                    className={`p-3 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors ${
                      currentProject?.id === project.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                    }`}
                  >
                    {editingId === project.id ? (
                      <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') saveEdit(project.id);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          className="flex-1 px-2 py-1 border border-indigo-300 dark:border-indigo-600 rounded text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                          autoFocus
                        />
                        <button
                          onClick={() => saveEdit(project.id)}
                          className="p-1 text-green-600 hover:text-green-700"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1 text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-900 dark:text-white truncate">
                            {project.name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(project.lastSaved).toLocaleString('zh-CN')}
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 ml-2">
                          <button
                            onClick={(e) => startEdit(project.id, project.name, e)}
                            className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                            title="重命名"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(project.id, e)}
                            className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                            title="删除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

