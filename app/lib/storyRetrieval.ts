import type {
  StorySourceEmbeddingRecord,
  StorySourceRetrievalChunk,
} from './storySource.ts';

export interface StoryRetrievalFilter {
  minChunkOrder?: number;
  maxChunkOrder?: number;
  minChapterOrder?: number;
  maxChapterOrder?: number;
  allowedChapterIds?: string[];
  excludedChunkIds?: string[];
}

export interface HybridRetrievalOptions {
  query: string;
  queryVector?: number[] | null;
  chunks: readonly StorySourceRetrievalChunk[];
  embeddings?: readonly StorySourceEmbeddingRecord[];
  filter?: StoryRetrievalFilter;
  limit?: number;
  keywordWeight?: number;
  semanticWeight?: number;
  proximityCursor?: number;
  proximityWeight?: number;
}

export interface StoryRetrievalResult {
  chunk: StorySourceRetrievalChunk;
  score: number;
  keywordScore: number;
  semanticScore: number;
  keywordRank: number | null;
  semanticRank: number | null;
  reasons: string[];
}

export interface StoryRetrievalBundle {
  sequential: StorySourceRetrievalChunk[];
  related: StoryRetrievalResult[];
  chunkIds: string[];
  totalChars: number;
}

function searchTokens(text: string): string[] {
  const normalized = text.toLocaleLowerCase('zh-CN');
  const latin = normalized.match(/[a-z0-9_]{2,}/g) ?? [];
  const chineseRuns = normalized.match(/[\p{Script=Han}]{2,}/gu) ?? [];
  const grams: string[] = [];
  for (const run of chineseRuns) {
    for (let index = 0; index < run.length - 1; index += 1) grams.push(run.slice(index, index + 2));
  }
  return [...new Set([...latin, ...grams])];
}

function keywordSimilarity(query: string, queryTokens: string[], chunk: StorySourceRetrievalChunk): number {
  if (!query.trim()) return 0;
  const normalizedQuery = query.trim().toLocaleLowerCase('zh-CN');
  const normalizedText = chunk.text.toLocaleLowerCase('zh-CN');
  const phraseBonus = normalizedText.includes(normalizedQuery) ? 2 : 0;
  if (queryTokens.length === 0) return phraseBonus;
  const documentTokens = new Set(chunk.keywordTokens.length > 0 ? chunk.keywordTokens : searchTokens(chunk.text));
  const overlap = queryTokens.reduce((count, token) => count + (documentTokens.has(token) ? 1 : 0), 0);
  return phraseBonus + overlap / Math.sqrt(queryTokens.length * Math.max(1, documentTokens.size));
}

export function cosineSimilarity(left: ArrayLike<number>, right: ArrayLike<number>): number {
  if (left.length === 0 || left.length !== right.length) return 0;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    const a = Number(left[index]);
    const b = Number(right[index]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
    dot += a * b;
    leftNorm += a * a;
    rightNorm += b * b;
  }
  if (leftNorm === 0 || rightNorm === 0) return 0;
  return dot / Math.sqrt(leftNorm * rightNorm);
}

function matchesFilter(chunk: StorySourceRetrievalChunk, filter: StoryRetrievalFilter): boolean {
  if (filter.minChunkOrder !== undefined && chunk.chunkOrder < filter.minChunkOrder) return false;
  if (filter.maxChunkOrder !== undefined && chunk.chunkOrder > filter.maxChunkOrder) return false;
  if (filter.minChapterOrder !== undefined && chunk.chapterOrder < filter.minChapterOrder) return false;
  if (filter.maxChapterOrder !== undefined && chunk.chapterOrder > filter.maxChapterOrder) return false;
  if (filter.allowedChapterIds?.length && !filter.allowedChapterIds.includes(chunk.chapterId)) return false;
  if (filter.excludedChunkIds?.includes(chunk.id)) return false;
  return true;
}

function ranks(values: Array<{ id: string; score: number }>): Map<string, number> {
  return new Map(
    values
      .filter(item => item.score > 0)
      .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
      .map((item, index) => [item.id, index + 1])
  );
}

export function hybridRetrieveStorySource(options: HybridRetrievalOptions): StoryRetrievalResult[] {
  const filter = options.filter ?? {};
  const candidates = options.chunks.filter(chunk => matchesFilter(chunk, filter));
  const queryTokens = searchTokens(options.query);
  const embeddingByChunk = new Map((options.embeddings ?? []).map(item => [item.chunkId, item.vector]));
  const keywordValues = candidates.map(chunk => ({
    id: chunk.id,
    score: keywordSimilarity(options.query, queryTokens, chunk)
  }));
  const semanticValues = candidates.map(chunk => ({
    id: chunk.id,
    score: options.queryVector
      ? cosineSimilarity(options.queryVector, embeddingByChunk.get(chunk.id) ?? [])
      : 0
  }));
  const keywordRanks = ranks(keywordValues);
  const semanticRanks = ranks(semanticValues);
  const keywordById = new Map(keywordValues.map(item => [item.id, item.score]));
  const semanticById = new Map(semanticValues.map(item => [item.id, item.score]));
  const keywordWeight = options.keywordWeight ?? 1;
  const semanticWeight = options.semanticWeight ?? 1;
  const proximityWeight = options.proximityWeight ?? 0.15;
  const rrfK = 60;

  return candidates.map(chunk => {
    const keywordRank = keywordRanks.get(chunk.id) ?? null;
    const semanticRank = semanticRanks.get(chunk.id) ?? null;
    const proximity = options.proximityCursor === undefined
      ? 0
      : 1 / (1 + Math.abs(chunk.chunkOrder - options.proximityCursor));
    const score = (keywordRank ? keywordWeight / (rrfK + keywordRank) : 0)
      + (semanticRank ? semanticWeight / (rrfK + semanticRank) : 0)
      + proximity * proximityWeight / rrfK;
    const reasons: string[] = [];
    if (keywordRank) reasons.push(`关键词排名 ${keywordRank}`);
    if (semanticRank) reasons.push(`向量排名 ${semanticRank}`);
    if (proximity > 0) reasons.push(`距原作游标 ${Math.abs(chunk.chunkOrder - options.proximityCursor!)}`);
    return {
      chunk,
      score,
      keywordScore: keywordById.get(chunk.id) ?? 0,
      semanticScore: semanticById.get(chunk.id) ?? 0,
      keywordRank,
      semanticRank,
      reasons
    };
  }).filter(result => result.keywordRank !== null || result.semanticRank !== null)
    .sort((left, right) => right.score - left.score || left.chunk.chunkOrder - right.chunk.chunkOrder)
    .slice(0, Math.max(0, options.limit ?? 8));
}

export function sequentialStoryWindow(
  chunks: readonly StorySourceRetrievalChunk[],
  cursorOrder: number,
  before = 1,
  after = 2,
  filter: StoryRetrievalFilter = {}
): StorySourceRetrievalChunk[] {
  const min = Math.max(0, cursorOrder - Math.max(0, before));
  const max = cursorOrder + Math.max(0, after);
  return chunks
    .filter(chunk => chunk.chunkOrder >= min && chunk.chunkOrder <= max && matchesFilter(chunk, filter))
    .sort((left, right) => left.chunkOrder - right.chunkOrder);
}

export function buildStoryRetrievalBundle(
  options: HybridRetrievalOptions & {
    cursorOrder: number;
    sequentialBefore?: number;
    sequentialAfter?: number;
    maxContextChars?: number;
  }
): StoryRetrievalBundle {
  const sequential = sequentialStoryWindow(
    options.chunks,
    options.cursorOrder,
    options.sequentialBefore,
    options.sequentialAfter,
    options.filter
  );
  const sequentialIds = new Set(sequential.map(chunk => chunk.id));
  const related = hybridRetrieveStorySource({
    ...options,
    filter: {
      ...(options.filter ?? {}),
      excludedChunkIds: [...new Set([...(options.filter?.excludedChunkIds ?? []), ...sequentialIds])]
    }
  });
  const maxChars = Math.max(1_000, options.maxContextChars ?? 16_000);
  // The sequential window is the canon spine. Related retrieval may use only
  // the remaining budget, but it must never evict or truncate that spine.
  const selectedSequential = sequential;
  const selectedRelated: StoryRetrievalResult[] = [];
  let totalChars = selectedSequential.reduce((sum, chunk) => sum + chunk.text.length, 0);
  for (const result of related) {
    if (totalChars + result.chunk.text.length > maxChars) continue;
    selectedRelated.push(result);
    totalChars += result.chunk.text.length;
  }
  return {
    sequential: selectedSequential,
    related: selectedRelated,
    chunkIds: [...selectedSequential.map(chunk => chunk.id), ...selectedRelated.map(result => result.chunk.id)],
    totalChars
  };
}
