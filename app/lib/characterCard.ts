/* eslint-disable @typescript-eslint/no-explicit-any -- Character cards preserve arbitrary JSON extensions. */
import type { CharacterBook } from '@/types/worldbook';
import {
  timelineStateFromCardExtension,
  type CardTimelineExtension,
  type PsycheTimelineProjectState,
} from './psycheTimeline.ts';

export type JsonObject = Record<string, any>;
export type CharacterCardSourceFormat = 'json' | 'png' | 'charx';

export interface EditableCharacterCard {
  name: string;
  description: string;
  first_mes: string;
  personality: string;
  scenario: string;
  mes_example: string;
  tags: string[];
  creator_notes?: string;
  system_prompt?: string;
  post_history_instructions?: string;
  alternate_greetings?: string[];
  creator?: string;
  character_version?: string;
}

export interface CharacterCardEnvelope {
  sourceFormat: CharacterCardSourceFormat;
  sourceSpec: string;
  sourceSpecVersion: string;
  originalCard: JsonObject;
  sourceImageDataUrl?: string;
  pngMetadataKeyword?: 'chara' | 'ccv3';
}

export interface NormalizedCharacterCard {
  character: EditableCharacterCard;
  characterBook?: CharacterBook;
  psycheTimeline: PsycheTimelineProjectState | null;
  envelope: CharacterCardEnvelope;
  warnings: string[];
}

export interface CardValidationResult {
  errors: string[];
  warnings: string[];
}

const STANDARD_FIELDS = [
  'name',
  'description',
  'personality',
  'scenario',
  'first_mes',
  'mes_example',
] as const;

const V2_REQUIRED_DATA_FIELDS = [
  ...STANDARD_FIELDS,
  'creator_notes',
  'system_prompt',
  'post_history_instructions',
  'alternate_greetings',
  'tags',
  'creator',
  'character_version',
  'extensions',
] as const;

const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function optionalPromptValue(value: unknown): string {
  const normalized = stringValue(value).trim();
  if (/^[（(]?\s*(?:留空|无|不设置|未设置|未填写|none|n\/?a|null)\s*[）)]?$/i.test(normalized)) {
    return '';
  }
  return normalized;
}

function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  if (typeof value === 'string' && value.trim()) {
    return [value];
  }
  return [];
}

function tagArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  if (typeof value === 'string') {
    return value.split(',').map(tag => tag.trim()).filter(Boolean);
  }
  return [];
}

function getCardData(card: JsonObject): JsonObject {
  return isObject(card.data) ? card.data : card;
}

function detectSpec(card: JsonObject): { spec: string; version: string } {
  if (typeof card.spec === 'string') {
    return {
      spec: card.spec,
      version: typeof card.spec_version === 'string' ? card.spec_version : '',
    };
  }
  return { spec: 'chara_card_v1', version: '1.0' };
}

export function normalizeCharacterCard(
  input: unknown,
  options: {
    sourceFormat?: CharacterCardSourceFormat;
    sourceImageDataUrl?: string;
    pngMetadataKeyword?: 'chara' | 'ccv3';
  } = {},
): NormalizedCharacterCard {
  if (!isObject(input)) {
    throw new Error('角色卡根节点必须是 JSON 对象');
  }

  const originalCard = cloneJson(input);
  const data = getCardData(originalCard);
  const { spec, version } = detectSpec(originalCard);
  const warnings: string[] = [];

  if (spec !== 'chara_card_v1' && spec !== 'chara_card_v2' && spec !== 'chara_card_v3') {
    warnings.push(`未知角色卡规范 ${spec}，未识别字段将原样保留`);
  }

  const alternateGreetings = stringArray(data.alternate_greetings);
  if (typeof data.alternate_greetings === 'string') {
    warnings.push('alternate_greetings 已从字符串规范化为数组');
  }

  const characterBook = isObject(data.character_book) && Array.isArray(data.character_book.entries)
    ? cloneJson(data.character_book as CharacterBook)
    : undefined;
  const timelineValue = isObject(data.extensions) ? data.extensions.psyche_timeline : undefined;
  const psycheTimeline = timelineStateFromCardExtension(timelineValue);
  if (timelineValue !== undefined && !psycheTimeline) {
    warnings.push('psyche_timeline 扩展不符合 PTE 1.0，原字段会保留但不会进入结构化编辑状态');
  }

  return {
    character: {
      name: stringValue(data.name),
      description: stringValue(data.description),
      personality: stringValue(data.personality),
      scenario: stringValue(data.scenario),
      first_mes: stringValue(data.first_mes),
      mes_example: stringValue(data.mes_example),
      creator_notes: stringValue(data.creator_notes ?? originalCard.creatorcomment),
      system_prompt: stringValue(data.system_prompt),
      post_history_instructions: stringValue(data.post_history_instructions),
      alternate_greetings: alternateGreetings,
      tags: tagArray(data.tags),
      creator: stringValue(data.creator),
      character_version: stringValue(data.character_version),
    },
    characterBook,
    psycheTimeline,
    envelope: {
      sourceFormat: options.sourceFormat ?? 'json',
      sourceSpec: spec,
      sourceSpecVersion: version,
      originalCard,
      sourceImageDataUrl: options.sourceImageDataUrl,
      pngMetadataKeyword: options.pngMetadataKeyword,
    },
    warnings,
  };
}

function getOriginalData(envelope?: CharacterCardEnvelope | null): JsonObject {
  if (!envelope?.originalCard) return {};
  const original = cloneJson(envelope.originalCard);
  return cloneJson(getCardData(original));
}

function buildExtensions(originalData: JsonObject): JsonObject {
  if (isObject(originalData.extensions)) {
    return cloneJson(originalData.extensions);
  }
  return {
    psyche: {
      mode: 'standard',
      t_layers: {
        t0_enabled: true,
        t1_enabled: false,
        t2_enabled: false,
        t3_enabled: false,
      },
    },
    furry: {
      enabled: false,
      species: '',
    },
  };
}

function buildData(
  character: EditableCharacterCard,
  envelope?: CharacterCardEnvelope | null,
  characterBook?: CharacterBook,
  timelineExtension?: CardTimelineExtension,
): JsonObject {
  const data = getOriginalData(envelope);
  data.name = character.name || '未命名角色';
  data.description = character.description || '';
  data.personality = character.personality || '';
  data.scenario = character.scenario || '';
  data.first_mes = character.first_mes || '';
  data.mes_example = character.mes_example || '';
  data.creator_notes = character.creator_notes || '';
  data.system_prompt = optionalPromptValue(character.system_prompt);
  data.post_history_instructions = optionalPromptValue(character.post_history_instructions);
  data.alternate_greetings = character.alternate_greetings || [];
  data.tags = character.tags || [];
  data.creator = character.creator || 'Psyche 角色卡设计器';
  data.character_version = character.character_version || '1.0';
  data.extensions = buildExtensions(data);
  if (timelineExtension) {
    data.extensions.psyche_timeline = cloneJson(timelineExtension);
  }

  if (characterBook) {
    data.character_book = cloneJson(characterBook);
  } else {
    delete data.character_book;
  }

  return data;
}

function buildTopLevel(envelope?: CharacterCardEnvelope | null): JsonObject {
  return envelope?.originalCard ? cloneJson(envelope.originalCard) : {};
}

function syncLegacyFields(card: JsonObject, data: JsonObject): void {
  const hadLegacyFields = STANDARD_FIELDS.some(field => Object.hasOwn(card, field));
  if (!hadLegacyFields) return;

  for (const field of STANDARD_FIELDS) {
    card[field] = data[field];
  }
  if (Object.hasOwn(card, 'creatorcomment')) {
    card.creatorcomment = data.creator_notes;
  }
  if (Object.hasOwn(card, 'tags')) {
    card.tags = data.tags;
  }
}

export function buildCharacterCardV2(
  character: EditableCharacterCard,
  envelope?: CharacterCardEnvelope | null,
  characterBook?: CharacterBook,
  timelineExtension?: CardTimelineExtension,
): JsonObject {
  const card = buildTopLevel(envelope);
  const data = buildData(character, envelope, characterBook, timelineExtension);
  card.spec = 'chara_card_v2';
  card.spec_version = '2.0';
  card.data = data;
  syncLegacyFields(card, data);
  return card;
}

export function buildCharacterCardV3(
  character: EditableCharacterCard,
  envelope?: CharacterCardEnvelope | null,
  characterBook?: CharacterBook,
  timelineExtension?: CardTimelineExtension,
): JsonObject {
  const card = buildTopLevel(envelope);
  const data = buildData(character, envelope, characterBook, timelineExtension);
  card.spec = 'chara_card_v3';
  card.spec_version = '3.0';
  card.data = data;
  syncLegacyFields(card, data);
  return card;
}

export function validateCharacterCard(card: unknown): CardValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isObject(card)) {
    return { errors: ['角色卡根节点不是对象'], warnings };
  }

  if (card.spec === 'chara_card_v3') {
    const version = Number(card.spec_version);
    if (!Number.isFinite(version) || version < 3 || version >= 4) {
      errors.push('V3 spec_version 必须在 3.0（含）到 4.0（不含）之间');
    }
    if (!isObject(card.data)) {
      errors.push('V3 缺少 data 对象');
      return { errors, warnings };
    }
  } else if (card.spec === 'chara_card_v2') {
    if (card.spec_version !== '2.0') errors.push('V2 spec_version 必须为 2.0');
    if (!isObject(card.data)) {
      errors.push('V2 缺少 data 对象');
      return { errors, warnings };
    }
    for (const field of V2_REQUIRED_DATA_FIELDS) {
      if (!Object.hasOwn(card.data, field)) errors.push(`V2 缺少 data.${field}`);
    }
    if (!Array.isArray(card.data.alternate_greetings)) errors.push('data.alternate_greetings 必须是数组');
    if (!Array.isArray(card.data.tags)) errors.push('data.tags 必须是数组');
    if (!isObject(card.data.extensions)) errors.push('data.extensions 必须是对象');
    if (card.data.character_book) {
      if (!isObject(card.data.character_book.extensions)) errors.push('data.character_book.extensions 必须是对象');
      if (!Array.isArray(card.data.character_book.entries)) errors.push('data.character_book.entries 必须是数组');
    }
  } else {
    for (const field of STANDARD_FIELDS) {
      if (!Object.hasOwn(card, field)) errors.push(`V1 缺少 ${field}`);
    }
  }

  const data = getCardData(card);
  if (!stringValue(data.name).trim()) warnings.push('角色名称为空，将使用“未命名角色”');
  if (!stringValue(data.first_mes).trim()) warnings.push('首条消息为空');
  if (!stringValue(data.description).trim()) warnings.push('角色描述为空');
  return { errors, warnings };
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, false);
}

function writeUint32(value: number): Uint8Array {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value >>> 0, false);
  return bytes;
}

function ascii(bytes: Uint8Array): string {
  let value = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    value += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return value;
}

function encodeBase64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

function decodeBase64Utf8(value: string): string {
  const binary = atob(value.trim());
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new TextDecoder().decode(bytes);
}

interface PngChunk {
  type: string;
  start: number;
  end: number;
  data: Uint8Array;
}

function readPngChunks(pngData: Uint8Array): PngChunk[] {
  if (pngData.length < PNG_SIGNATURE.length || !bytesEqual(pngData.subarray(0, 8), PNG_SIGNATURE)) {
    throw new Error('不是有效的 PNG 文件');
  }

  const chunks: PngChunk[] = [];
  let offset = 8;
  while (offset + 12 <= pngData.length) {
    const length = readUint32(pngData, offset);
    const end = offset + 12 + length;
    if (end > pngData.length) throw new Error('PNG chunk 长度无效');
    const type = ascii(pngData.subarray(offset + 4, offset + 8));
    chunks.push({
      type,
      start: offset,
      end,
      data: pngData.subarray(offset + 8, offset + 8 + length),
    });
    offset = end;
    if (type === 'IEND') break;
  }
  return chunks;
}

function decodeTextChunk(data: Uint8Array): { keyword: string; text: string } | null {
  const separator = data.indexOf(0);
  if (separator <= 0) return null;
  return {
    keyword: ascii(data.subarray(0, separator)),
    text: ascii(data.subarray(separator + 1)),
  };
}

export function readCharacterCardFromPng(pngData: Uint8Array): {
  card: JsonObject;
  keyword: 'chara' | 'ccv3';
} {
  const metadata = readPngChunks(pngData)
    .filter(chunk => chunk.type === 'tEXt')
    .map(chunk => decodeTextChunk(chunk.data))
    .filter((item): item is { keyword: string; text: string } => Boolean(item));

  const selected = metadata.find(item => item.keyword.toLowerCase() === 'ccv3')
    ?? metadata.find(item => item.keyword.toLowerCase() === 'chara');

  if (!selected) {
    throw new Error('PNG 中没有 chara 或 ccv3 角色卡元数据');
  }

  try {
    return {
      card: JSON.parse(decodeBase64Utf8(selected.text)),
      keyword: selected.keyword.toLowerCase() as 'chara' | 'ccv3',
    };
  } catch {
    throw new Error(`${selected.keyword} 元数据不是有效的 Base64 角色卡 JSON`);
  }
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeTextChunk(keyword: string, text: string): Uint8Array {
  const keywordBytes = new TextEncoder().encode(keyword);
  const textBytes = new TextEncoder().encode(text);
  const payload = new Uint8Array(keywordBytes.length + 1 + textBytes.length);
  payload.set(keywordBytes);
  payload[keywordBytes.length] = 0;
  payload.set(textBytes, keywordBytes.length + 1);

  const type = new TextEncoder().encode('tEXt');
  const crcInput = new Uint8Array(type.length + payload.length);
  crcInput.set(type);
  crcInput.set(payload, type.length);

  const chunk = new Uint8Array(12 + payload.length);
  chunk.set(writeUint32(payload.length), 0);
  chunk.set(type, 4);
  chunk.set(payload, 8);
  chunk.set(writeUint32(crc32(crcInput)), 8 + payload.length);
  return chunk;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

export function writeCharacterCardPng(
  pngData: Uint8Array,
  v2Card: JsonObject,
  v3Card: JsonObject,
): Uint8Array {
  const chunks = readPngChunks(pngData);
  const output: Uint8Array[] = [pngData.subarray(0, 8)];
  let foundEnd = false;

  for (const chunk of chunks) {
    if (chunk.type === 'tEXt') {
      const textChunk = decodeTextChunk(chunk.data);
      const keyword = textChunk?.keyword.toLowerCase();
      if (keyword === 'chara' || keyword === 'ccv3') continue;
    }

    if (chunk.type === 'IEND') {
      output.push(makeTextChunk('chara', encodeBase64Utf8(JSON.stringify(v2Card))));
      output.push(makeTextChunk('ccv3', encodeBase64Utf8(JSON.stringify(v3Card))));
      foundEnd = true;
    }
    output.push(pngData.subarray(chunk.start, chunk.end));
  }

  if (!foundEnd) throw new Error('PNG 缺少 IEND chunk');
  return concatBytes(output);
}
