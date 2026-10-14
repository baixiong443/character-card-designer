import { deleteDB, openDB, type DBSchema, type IDBPDatabase, type IDBPTransaction } from 'idb';
import {
  validateStorySourceCorpus,
  type StoryEvidenceClaim,
  type StorySourceAnalysisUnit,
  type StorySourceCompilationRecord,
  type StorySourceCorpus,
  type StorySourceEmbeddingConfig,
  type StorySourceEmbeddingRecord,
  type StorySourceIndex,
  type StorySourceRetrievalChunk,
  type StorySourceTask,
} from './storySource.ts';

export const STORY_SOURCE_DB_NAME = 'psyche-story-source';
export const STORY_SOURCE_DB_VERSION = 1;

type StoredRetrievalChunk = StorySourceRetrievalChunk & { corpusId: string };
type StoredAnalysisUnit = StorySourceAnalysisUnit & { corpusId: string };
type StoredEmbedding = Omit<StorySourceEmbeddingRecord, 'vector'> & {
  corpusId: string;
  vector: Float32Array;
};
type StoredClaim = StoryEvidenceClaim & { corpusId: string };
type StoredCompilation = StorySourceCompilationRecord & { corpusId: string };

interface StorySourceDatabase extends DBSchema {
  corpora: {
    key: string;
    value: StorySourceIndex;
    indexes: { 'by-story': string; 'by-fingerprint': string };
  };
  retrievalChunks: {
    key: [string, number];
    value: StoredRetrievalChunk;
    indexes: { 'by-corpus': string; 'by-id': [string, string] };
  };
  analysisUnits: {
    key: [string, number];
    value: StoredAnalysisUnit;
    indexes: { 'by-corpus': string; 'by-id': [string, string] };
  };
  embeddings: {
    key: [string, string, string];
    value: StoredEmbedding;
    indexes: { 'by-corpus': string; 'by-corpus-model': [string, string] };
  };
  claims: {
    key: [string, string];
    value: StoredClaim;
    indexes: { 'by-corpus': string; 'by-subject': string };
  };
  compilation: {
    key: [string, string];
    value: StoredCompilation;
    indexes: { 'by-corpus': string; 'by-level': [string, number] };
  };
  tasks: {
    key: [string, string];
    value: StorySourceTask;
    indexes: { 'by-corpus': string; 'by-status': [string, string] };
  };
}

let databasePromise: Promise<IDBPDatabase<StorySourceDatabase>> | null = null;

function storySourceDb(): Promise<IDBPDatabase<StorySourceDatabase>> {
  databasePromise ??= openDB<StorySourceDatabase>(STORY_SOURCE_DB_NAME, STORY_SOURCE_DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('corpora')) {
        const store = db.createObjectStore('corpora', { keyPath: 'corpusId' });
        store.createIndex('by-story', 'storyId');
        store.createIndex('by-fingerprint', 'sourceFingerprint');
      }
      if (!db.objectStoreNames.contains('retrievalChunks')) {
        const store = db.createObjectStore('retrievalChunks', { keyPath: ['corpusId', 'chunkOrder'] });
        store.createIndex('by-corpus', 'corpusId');
        store.createIndex('by-id', ['corpusId', 'id'], { unique: true });
      }
      if (!db.objectStoreNames.contains('analysisUnits')) {
        const store = db.createObjectStore('analysisUnits', { keyPath: ['corpusId', 'unitOrder'] });
        store.createIndex('by-corpus', 'corpusId');
        store.createIndex('by-id', ['corpusId', 'id'], { unique: true });
      }
      if (!db.objectStoreNames.contains('embeddings')) {
        const store = db.createObjectStore('embeddings', { keyPath: ['corpusId', 'modelKey', 'chunkId'] });
        store.createIndex('by-corpus', 'corpusId');
        store.createIndex('by-corpus-model', ['corpusId', 'modelKey']);
      }
      if (!db.objectStoreNames.contains('claims')) {
        const store = db.createObjectStore('claims', { keyPath: ['corpusId', 'id'] });
        store.createIndex('by-corpus', 'corpusId');
        store.createIndex('by-subject', 'subjectIds', { multiEntry: true });
      }
      if (!db.objectStoreNames.contains('compilation')) {
        const store = db.createObjectStore('compilation', { keyPath: ['corpusId', 'sourceUnitId'] });
        store.createIndex('by-corpus', 'corpusId');
        store.createIndex('by-level', ['corpusId', 'level']);
      }
      if (!db.objectStoreNames.contains('tasks')) {
        const store = db.createObjectStore('tasks', { keyPath: ['corpusId', 'id'] });
        store.createIndex('by-corpus', 'corpusId');
        store.createIndex('by-status', ['corpusId', 'status']);
      }
    }
  });
  return databasePromise;
}

type StoreName = 'retrievalChunks' | 'analysisUnits' | 'embeddings' | 'claims' | 'compilation' | 'tasks';

async function clearCorpusStore(
  transaction: IDBPTransaction<StorySourceDatabase, StoreName[], 'readwrite'>,
  storeName: StoreName,
  corpusId: string
): Promise<void> {
  let cursor = await transaction.objectStore(storeName).index('by-corpus').openKeyCursor(IDBKeyRange.only(corpusId));
  while (cursor) {
    await transaction.objectStore(storeName).delete(cursor.primaryKey as never);
    cursor = await cursor.continue();
  }
}

export async function putStorySourceCorpus(corpus: StorySourceCorpus): Promise<void> {
  const errors = validateStorySourceCorpus(corpus);
  if (errors.length > 0) throw new Error(`故事语料库无效：${errors.join('；')}`);
  const db = await storySourceDb();
  const stores: StoreName[] = ['retrievalChunks', 'analysisUnits', 'embeddings', 'claims', 'compilation', 'tasks'];
  const transaction = db.transaction(['corpora', ...stores], 'readwrite');
  const corpusId = corpus.index.corpusId;
  for (const storeName of stores) await clearCorpusStore(transaction as never, storeName, corpusId);
  await transaction.objectStore('corpora').put(structuredClone(corpus.index));
  for (const chunk of corpus.retrievalChunks) {
    await transaction.objectStore('retrievalChunks').put({ ...structuredClone(chunk), corpusId });
  }
  for (const unit of corpus.analysisUnits) {
    await transaction.objectStore('analysisUnits').put({ ...structuredClone(unit), corpusId });
  }
  for (const embedding of corpus.embeddings) {
    await transaction.objectStore('embeddings').put({
      ...structuredClone(embedding),
      corpusId,
      vector: Float32Array.from(embedding.vector)
    });
  }
  for (const claim of corpus.claims) {
    await transaction.objectStore('claims').put({ ...structuredClone(claim), corpusId });
  }
  for (const record of corpus.compilation) {
    await transaction.objectStore('compilation').put({ ...structuredClone(record), corpusId });
  }
  await transaction.done;
}

export async function getStorySourceIndex(corpusId: string): Promise<StorySourceIndex | null> {
  return (await (await storySourceDb()).get('corpora', corpusId)) ?? null;
}

export async function findStorySourceByFingerprint(sourceFingerprint: string): Promise<StorySourceIndex | null> {
  return (await (await storySourceDb()).getFromIndex('corpora', 'by-fingerprint', sourceFingerprint)) ?? null;
}

export async function listStorySourceIndexes(storyId?: string): Promise<StorySourceIndex[]> {
  const db = await storySourceDb();
  const values = storyId
    ? await db.getAllFromIndex('corpora', 'by-story', storyId)
    : await db.getAll('corpora');
  return values.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function getStorySourceCorpus(corpusId: string): Promise<StorySourceCorpus | null> {
  const db = await storySourceDb();
  const index = await db.get('corpora', corpusId);
  if (!index) return null;
  const [retrieval, analysis, embeddings, claims, compilation] = await Promise.all([
    db.getAllFromIndex('retrievalChunks', 'by-corpus', corpusId),
    db.getAllFromIndex('analysisUnits', 'by-corpus', corpusId),
    db.getAllFromIndex('embeddings', 'by-corpus', corpusId),
    db.getAllFromIndex('claims', 'by-corpus', corpusId),
    db.getAllFromIndex('compilation', 'by-corpus', corpusId)
  ]);
  return {
    index,
    retrievalChunks: retrieval.sort((a, b) => a.chunkOrder - b.chunkOrder).map(({ corpusId: _, ...value }) => value),
    analysisUnits: analysis.sort((a, b) => a.unitOrder - b.unitOrder).map(({ corpusId: _, ...value }) => value),
    embeddings: embeddings.map(({ corpusId: _, vector, ...value }) => ({ ...value, vector: Array.from(vector) })),
    claims: claims.map(({ corpusId: _, ...value }) => value),
    compilation: compilation.map(({ corpusId: _, ...value }) => value)
  };
}

export async function putStorySourceEmbeddings(
  corpusId: string,
  config: StorySourceEmbeddingConfig,
  records: StorySourceEmbeddingRecord[]
): Promise<void> {
  const db = await storySourceDb();
  const index = await db.get('corpora', corpusId);
  if (!index) throw new Error('找不到要写入向量的故事语料库。');
  const knownIds = new Set((await db.getAllFromIndex('retrievalChunks', 'by-corpus', corpusId)).map(chunk => chunk.id));
  for (const record of records) {
    if (!knownIds.has(record.chunkId)) throw new Error(`向量引用了未知片段 ${record.chunkId}`);
    if (record.vector.length !== config.dimensions || record.vector.some(value => !Number.isFinite(value))) {
      throw new Error(`片段 ${record.chunkId} 的向量维度或数值无效`);
    }
  }
  const transaction = db.transaction(['corpora', 'embeddings'], 'readwrite');
  let cursor = await transaction.objectStore('embeddings').index('by-corpus-model')
    .openKeyCursor(IDBKeyRange.only([corpusId, records[0]?.modelKey ?? `${config.provider}:${config.model}`]));
  while (cursor) {
    await transaction.objectStore('embeddings').delete(cursor.primaryKey);
    cursor = await cursor.continue();
  }
  for (const record of records) {
    await transaction.objectStore('embeddings').put({
      ...structuredClone(record),
      corpusId,
      vector: Float32Array.from(record.vector)
    });
  }
  await transaction.objectStore('corpora').put({ ...index, embedding: structuredClone(config) });
  await transaction.done;
}

export async function updateStorySourceCompilation(
  corpusId: string,
  record: StorySourceCompilationRecord
): Promise<void> {
  const db = await storySourceDb();
  if (!(await db.get('corpora', corpusId))) throw new Error('找不到故事语料库。');
  await db.put('compilation', { ...structuredClone(record), corpusId });
}

export async function putStoryEvidenceClaims(corpusId: string, claims: StoryEvidenceClaim[]): Promise<void> {
  const db = await storySourceDb();
  if (!(await db.get('corpora', corpusId))) throw new Error('找不到故事语料库。');
  const transaction = db.transaction('claims', 'readwrite');
  for (const claim of claims) await transaction.store.put({ ...structuredClone(claim), corpusId });
  await transaction.done;
}

export async function replaceStoryEvidenceClaimsForUnit(
  corpusId: string,
  sourceUnitId: string,
  claims: StoryEvidenceClaim[],
): Promise<void> {
  const db = await storySourceDb();
  if (!(await db.get('corpora', corpusId))) throw new Error('找不到故事语料库。');
  const transaction = db.transaction('claims', 'readwrite');
  const prefix = `claim:${sourceUnitId}:`;
  let cursor = await transaction.store.index('by-corpus').openCursor(IDBKeyRange.only(corpusId));
  while (cursor) {
    if (cursor.value.id.startsWith(prefix)) await cursor.delete();
    cursor = await cursor.continue();
  }
  for (const claim of claims) await transaction.store.put({ ...structuredClone(claim), corpusId });
  await transaction.done;
}

export async function putStorySourceTask(task: StorySourceTask): Promise<void> {
  const db = await storySourceDb();
  if (!(await db.get('corpora', task.corpusId))) throw new Error('找不到故事语料库。');
  await db.put('tasks', structuredClone(task));
}

export async function listStorySourceTasks(corpusId: string, status?: StorySourceTask['status']): Promise<StorySourceTask[]> {
  const db = await storySourceDb();
  const values = status
    ? await db.getAllFromIndex('tasks', 'by-status', IDBKeyRange.only([corpusId, status]))
    : await db.getAllFromIndex('tasks', 'by-corpus', corpusId);
  return values.sort((left, right) => right.priority - left.priority || left.createdAt - right.createdAt);
}

export async function deleteStorySourceCorpus(corpusId: string): Promise<void> {
  const db = await storySourceDb();
  const stores: StoreName[] = ['retrievalChunks', 'analysisUnits', 'embeddings', 'claims', 'compilation', 'tasks'];
  const transaction = db.transaction(['corpora', ...stores], 'readwrite');
  for (const storeName of stores) await clearCorpusStore(transaction as never, storeName, corpusId);
  await transaction.objectStore('corpora').delete(corpusId);
  await transaction.done;
}

export async function resetStorySourceDatabaseForTests(): Promise<void> {
  const db = await databasePromise;
  db?.close();
  databasePromise = null;
  await deleteDB(STORY_SOURCE_DB_NAME);
}
