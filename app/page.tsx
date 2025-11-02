'use client';

import { useState } from 'react';
import { Settings, FileText, Sparkles, Menu, X } from 'lucide-react';
import SettingsPanel from '@/components/SettingsPanel';
import CharacterEditor from '@/components/CharacterEditor';
import StageFlow from '@/components/StageFlow';

export default function Home() {
  const [showSettings, setShowSettings] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [currentView, setCurrentView] = useState<'editor' | 'stages'>('editor');

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* 顶部导航栏 */}
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  Psyche 角色卡设计器
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  专业创意写作系统
                </p>
              </div>
              <div className="sm:hidden">
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                  Psyche
                </h1>
              </div>
            </div>

            {/* 桌面端按钮 */}
            <div className="hidden md:flex items-center space-x-4">
              <button
                onClick={() => setCurrentView('editor')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentView === 'editor'
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                }`}
              >
                <FileText className="w-5 h-5 inline mr-2" />
                角色编辑
              </button>
              <button
                onClick={() => setCurrentView('stages')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentView === 'stages'
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                }`}
              >
                <Sparkles className="w-5 h-5 inline mr-2" />
                AI 工作流
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>

            {/* 移动端菜单按钮 */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              {showMobileMenu ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* 移动端下拉菜单 */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div className="px-4 py-3 space-y-2">
              <button
                onClick={() => {
                  setCurrentView('editor');
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                  currentView === 'editor'
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                }`}
              >
                <FileText className="w-5 h-5 mr-3" />
                角色编辑器
              </button>
              <button
                onClick={() => {
                  setCurrentView('stages');
                  setShowMobileMenu(false);
                }}
                className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                  currentView === 'stages'
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                }`}
              >
                <Sparkles className="w-5 h-5 mr-3" />
                AI 工作流
              </button>
              <button
                onClick={() => {
                  setShowSettings(true);
                  setShowMobileMenu(false);
                }}
                className="w-full flex items-center px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
              >
                <Settings className="w-5 h-5 mr-3" />
                设置
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 主内容区 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentView === 'editor' ? <CharacterEditor /> : <StageFlow />}
      </div>

      {/* 设置面板 */}
      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}
    </main>
  );
}
