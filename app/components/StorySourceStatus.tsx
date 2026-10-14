'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Database, Pause, Play, RefreshCw } from 'lucide-react';
import { useAIService } from '@/services/aiService';
import { getStorySourceCorpus, listStorySourceTasks } from '@/lib/storySourceDb';
import {
  planStorySourceTasks,
  runPendingStoryAnalysis,
  runPendingStoryEmbeddings,
  seedStorySourceTasks,
} from '@/lib/storySourceProgress';
import type { StorySourceCorpus, StorySourceTask } from '@/lib/storySource';
import { useProgressStore } from '@/stores/progressStore';
import { useSettingsStore, withEmbeddingDefaults } from '@/stores/settingsStore';

interface Snapshot {
  corpus: StorySourceCorpus;
  tasks: StorySourceTask[];
}

export default function StorySourceStatus() {
  const reference = useProgressStore(state => state.getCurrentProject()?.storySource || null);
  const settings = useSettingsStore(state => state.settings);
  const { generateResponse, generateReviewResponse } = useAIService();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (!reference) {
      setSnapshot(null);
      return;
    }
    const corpus = await getStorySourceCorpus(reference.corpusId);
    if (!corpus) {
      setSnapshot(null);
      setMessage('原文库记录缺失，请重新导入原文。');
      return;
    }
    setSnapshot({ corpus, tasks: await listStorySourceTasks(reference.corpusId) });
  }, [reference]);

  useEffect(() => {
    void refresh();
    return () => abortRef.current?.abort();
  }, [refresh]);

  if (!reference) return null;
  const tasks = snapshot?.tasks || [];
  const embeddingTasks = tasks.filter(task => task.type === 'embed_chunk');
  const embedded = embeddingTasks.filter(task => task.status === 'completed').length;
  const failed = tasks.filter(task => task.status === 'failed').length;
  const analysisTasks = tasks.filter(task => task.type === 'extract_skeleton' || task.type === 'audit_skeleton');
  const pendingAnalysis = analysisTasks.filter(task => task.status !== 'completed' && task.status !== 'stale').length;
  const l3 = snapshot?.corpus.compilation.filter(record => record.level >= 3).length || 0;
  const l4 = snapshot?.corpus.compilation.filter(record => record.level >= 4).length || 0;
  const units = snapshot?.corpus.analysisUnits.length || 0;

  const resumeWork = async () => {
    if (!snapshot || running) return;
    const embedding = withEmbeddingDefaults(settings).embedding;
    setRunning(true);
    setMessage('');
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await seedStorySourceTasks(planStorySourceTasks(snapshot.corpus, embedding.enabled));
      await runPendingStoryAnalysis(reference.corpusId, {
        extract: (prompt, systemPrompt) => generateResponse(
          [{ role: 'user', content: prompt }],
          systemPrompt,
          { promptRole: 'main' },
        ),
        audit: (prompt, systemPrompt) => generateReviewResponse(
          [{ role: 'user', content: prompt }],
          systemPrompt,
        ),
      }, progress => {
        setMessage(`${progress.phase === 'extract' ? 'L2 提取' : 'L3 审计'} ${progress.completed + 1}/${progress.total} · ${progress.title}`);
      }, controller.signal);
      if (embedding.enabled) {
        await runPendingStoryEmbeddings(reference.corpusId, embedding, progress => {
          setMessage(`向量索引 ${progress.completed}/${progress.total}`);
        }, controller.signal);
        setMessage('原文分析与向量索引已完成。');
      } else {
        setMessage('L2/L3 原文分析已完成；向量索引未启用。');
      }
    } catch (error) {
      if (controller.signal.aborted) setMessage('任务已暂停，可继续。');
      else setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      abortRef.current = null;
      setRunning(false);
      await refresh();
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-300">
      <span className="inline-flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-100">
        <Database className="w-4 h-4" />
        原文库 {reference.preparationMode === 'quick' ? '快速' : reference.preparationMode === 'balanced' ? '均衡' : '完整'}
      </span>
      <span>L3 {l3}/{units}</span>
      <span title="L4 将由 PTE 按当前分支在运行时懒编译">L4 {l4}/{units}（运行时）</span>
      <span>向量 {embedded}/{embeddingTasks.length || snapshot?.corpus.retrievalChunks.length || 0}</span>
      <span>待分析 {pendingAnalysis}</span>
      {failed > 0 && <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400"><AlertCircle className="w-3.5 h-3.5" />失败 {failed}</span>}
      {message && <span className={message.includes('失败') || message.includes('缺失') ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}>{message}</span>}
      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={() => void refresh()}
          className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white"
          title="刷新原文库状态"
          aria-label="刷新原文库状态"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        {running ? (
          <button
            type="button"
            onClick={() => abortRef.current?.abort()}
            className="p-1.5 text-amber-600 hover:text-amber-800"
            title="暂停向量任务"
            aria-label="暂停向量任务"
          >
            <Pause className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
          onClick={() => void resumeWork()}
            className="p-1.5 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-200"
          title="继续或重试原文分析与向量任务"
          aria-label="继续或重试原文分析与向量任务"
          >
            <Play className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
