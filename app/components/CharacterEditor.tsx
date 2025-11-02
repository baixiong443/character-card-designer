'use client';

import { useState } from 'react';
import { Save, Download, FileText } from 'lucide-react';
import { useCharacterStore } from '@/stores/characterStore';
import ExportDialog from '@/components/ExportDialog';

export default function CharacterEditor() {
  const { character, updateField } = useCharacterStore();
  const [showExport, setShowExport] = useState(false);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          角色编辑器
        </h2>
        <div className="flex space-x-2">
          <button 
            onClick={() => setShowExport(true)}
            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            <Download className="w-4 h-4 inline mr-1" />
            导出
          </button>
          <button className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm">
            <Save className="w-4 h-4 inline mr-1" />
            保存
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* 基础信息 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            角色名称
          </label>
          <input
            type="text"
            value={character.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="输入角色名称"
            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            简短描述
          </label>
          <textarea
            value={character.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="角色的简短描述..."
            rows={4}
            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            首条消息
          </label>
          <textarea
            value={character.first_mes}
            onChange={(e) => updateField('first_mes', e.target.value)}
            placeholder="角色的首条消息..."
            rows={6}
            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          />
        </div>

        {/* 提示 */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4">
          <p className="text-sm text-indigo-700 dark:text-indigo-300">
            💡 提示：使用 AI 工作流标签页可以让 AI 帮您生成和优化这些内容
          </p>
        </div>
      </div>

      {/* 导出对话框 */}
      {showExport && <ExportDialog onClose={() => setShowExport(false)} />}
    </div>
  );
}