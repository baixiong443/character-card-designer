import { strToU8, zipSync } from 'fflate';
import {
  validateStorySourceCorpus,
  validateStorySourceLibraryRef,
  type StorySourceCorpus,
  type StorySourceLibraryRef,
} from './storySource.ts';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonLogicRule = JsonValue;

export type ParticipationMode = 'follow' | 'adaptive' | 'parallel' | 'free';
export type AuditMode = 'off' | 'standard' | 'strict';
export type CanonEventStatus =
  | 'locked'
  | 'eligible'
  | 'active'
  | 'completed_canonical'
  | 'completed_adapted'
  | 'delayed'
  | 'skipped'
  | 'invalidated';
export type KnowledgeState = 'knows' | 'suspects' | 'believes_false' | 'unaware' | 'hiding';
export type EventKind = 'hard_anchor' | 'soft_anchor' | 'character_beat' | 'transition' | 'atmosphere' | 'chance';
export type EventRigidity = 'hard' | 'soft' | 'flexible';

export interface StoryLocation {
  area: string;
  place: string;
  position: string;
}

export interface StoryProjection {
  schemaVersion: 1;
  storyId: string;
  turn: number;
  canonCursor: { chapterId: string; sceneId: string; eventOrder: number };
  time: { absolute: string | null; relativeMinutes: number };
  location: StoryLocation;
  characters: Record<string, {
    present: boolean;
    location?: StoryLocation;
    mood?: string[];
    activity?: string | null;
    physical?: string[];
    outfit?: Record<string, string | null>;
    custom?: Record<string, JsonValue>;
  }>;
  relationships: Record<string, {
    pairId: string;
    stage: string;
    directions: Record<string, {
      toward: string;
      stance: string[];
      wants: string[];
      secrets: string[];
    }>;
    axes: Record<string, number>;
  }>;
  inventory: Record<string, { count: number; description?: string; ownerId?: string }>;
  facts: Record<string, { truth: string; status: 'true' | 'false' | 'unknown'; evidenceRefs: string[] }>;
  knowledge: Record<string, Record<string, {
    state: KnowledgeState;
    sourceRecordId?: string;
    perceivedTruth?: string;
  }>>;
  flags: Record<string, JsonValue>;
  canonEvents: Record<string, CanonEventStatus>;
  narrativePurposes: Record<string, 'pending' | 'fulfilled' | 'abandoned'>;
  openThreads: Record<string, {
    title: string;
    status: 'open' | 'resolved' | 'abandoned';
    evidenceRefs: string[];
  }>;
  custom: Record<string, JsonValue>;
  lockedPaths: string[];
  divergence: { structuralLevel: number; summary: string };
}

interface OperationBase {
  id: string;
  confidence: number;
  evidenceIds: string[];
}

export type DomainOperation =
  | (OperationBase & { type: 'advance_time'; minutes: number })
  | (OperationBase & { type: 'set_time'; absolute: string | null })
  | (OperationBase & { type: 'move_location'; location: StoryLocation })
  | (OperationBase & { type: 'set_character_presence'; characterId: string; present: boolean })
  | (OperationBase & { type: 'set_character_state'; characterId: string; field: 'mood' | 'activity' | 'physical' | 'outfit' | 'custom'; value: JsonValue })
  | (OperationBase & { type: 'add_fact'; factId: string; fact: StoryProjection['facts'][string] })
  | (OperationBase & { type: 'set_knowledge'; characterId: string; factId: string; state: KnowledgeState; perceivedTruth?: string })
  | (OperationBase & { type: 'set_relationship_stage'; pairId: string; stage: string })
  | (OperationBase & { type: 'set_relationship_attitude'; pairId: string; fromCharacterId: string; towardCharacterId: string; stance: string[]; wants?: string[]; secrets?: string[] })
  | (OperationBase & { type: 'change_relationship_axis'; pairId: string; axis: string; delta: number })
  | (OperationBase & { type: 'change_inventory'; itemId: string; delta: number; description?: string; ownerId?: string })
  | (OperationBase & { type: 'set_divergence'; structuralLevel: number; summary: string })
  | (OperationBase & { type: 'set_flag'; flag: string; value: JsonValue })
  | (OperationBase & { type: 'open_thread'; threadId: string; title: string })
  | (OperationBase & { type: 'resolve_thread'; threadId: string; status: 'resolved' | 'abandoned' })
  | (OperationBase & { type: 'transition_canon_event'; eventId: string; status: CanonEventStatus })
  | (OperationBase & { type: 'set_narrative_purpose'; purposeId: string; status: 'pending' | 'fulfilled' | 'abandoned' });

export interface StoryEvent {
  id: string;
  chapterId: string;
  sceneId: string;
  canonicalOrder: number;
  kind: EventKind;
  rigidity: EventRigidity;
  /**
   * `world` marks a world-scale process (disaster, war, plague, regime change)
   * that PTE keeps alive even after the branch diverges from canon.
   * Omitted means `interpersonal`.
   */
  scope?: 'world' | 'interpersonal';
  summary: string;
  participants: string[];
  preconditions?: JsonLogicRule;
  forbiddenWhen?: JsonLogicRule;
  effects: DomainOperation[];
  narrativePurposes: string[];
  evidenceRefs: string[];
  revealPolicy: 'eligible_only' | 'active_only' | 'never';
  adaptation: {
    allowDelay: boolean;
    allowRelocation: boolean;
    allowSubstitution: boolean;
  };
}

export interface StoryPlan {
  schemaVersion: 1;
  storyId: string;
  title: string;
  initialState: StoryProjection;
  events: StoryEvent[];
}

export interface CardTimelineExtension {
  schema_version: '1.0';
  story_id: string;
  package_digest?: string;
  entry_point: { chapter_id: string; scene_id: string; event_id?: string };
  bindings: { character_id: string; user_role_id?: string };
  mode_defaults?: {
    participation?: ParticipationMode;
    audit?: AuditMode;
    auto_apply?: boolean;
  };
  initial_state?: StoryProjection;
  inline_plan?: StoryPlan;
}

export interface PsycheTimelineProjectState {
  schemaVersion: 1;
  card: CardTimelineExtension;
  plan: StoryPlan | null;
  trajectoryNotes: string;
  sourceFingerprint: string | null;
  sourceLibrary?: StorySourceLibraryRef | null;
  createdAt: string;
}

export interface PsycheTimelineCompilationInput {
  identity: string;
  background: string;
  relationships: string;
  world: string;
  trajectory: string;
  discussion: string;
  evidence: string;
}

export interface TimelineValidationResult {
  valid: boolean;
  errors: string[];
}

type UnknownRecord = Record<string, unknown>;

const ID_PATTERN = /(^|\.)(__proto__|prototype|constructor)(\.|$)/;
const CANON_EVENT_STATUSES = new Set<CanonEventStatus>([
  'locked', 'eligible', 'active', 'completed_canonical', 'completed_adapted',
  'delayed', 'skipped', 'invalidated',
]);
const KNOWLEDGE_STATES = new Set<KnowledgeState>([
  'knows', 'suspects', 'believes_false', 'unaware', 'hiding',
]);

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function requireObject(value: unknown, path: string, errors: string[]): UnknownRecord | null {
  if (!isRecord(value)) {
    errors.push(`${path} 必须是对象`);
    return null;
  }
  return value;
}

function checkKeys(
  value: UnknownRecord,
  path: string,
  required: string[],
  optional: string[],
  errors: string[],
): void {
  for (const key of required) {
    if (!Object.hasOwn(value, key)) errors.push(`${path}.${key} 缺失`);
  }
  const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) errors.push(`${path}.${key} 不是 PTE 1.0 字段`);
  }
}

function checkId(value: unknown, path: string, errors: string[]): value is string {
  if (typeof value !== 'string' || value.length < 1 || value.length > 160 || ID_PATTERN.test(value)) {
    errors.push(`${path} 必须是 1-160 字符的安全 ID`);
    return false;
  }
  return true;
}

function checkString(value: unknown, path: string, errors: string[], allowEmpty = true): value is string {
  if (typeof value !== 'string' || (!allowEmpty && value.length === 0)) {
    errors.push(`${path} 必须是${allowEmpty ? '' : '非空'}字符串`);
    return false;
  }
  return true;
}

function checkNumber(value: unknown, path: string, errors: string[], options: {
  integer?: boolean;
  min?: number;
  max?: number;
} = {}): value is number {
  if (
    typeof value !== 'number'
    || !Number.isFinite(value)
    || (options.integer && !Number.isInteger(value))
    || (options.min !== undefined && value < options.min)
    || (options.max !== undefined && value > options.max)
  ) {
    errors.push(`${path} 数值无效`);
    return false;
  }
  return true;
}

function checkStringArray(value: unknown, path: string, errors: string[], ids = false): value is string[] {
  if (!Array.isArray(value)) {
    errors.push(`${path} 必须是字符串数组`);
    return false;
  }
  value.forEach((item, index) => {
    if (ids) checkId(item, `${path}[${index}]`, errors);
    else checkString(item, `${path}[${index}]`, errors);
  });
  if (new Set(value).size !== value.length) errors.push(`${path} 不得包含重复项`);
  return true;
}

function checkStringMap(value: unknown, path: string, errors: string[]): UnknownRecord | null {
  return requireObject(value, path, errors);
}

function validateLocation(value: unknown, path: string, errors: string[]): void {
  const location = requireObject(value, path, errors);
  if (!location) return;
  checkKeys(location, path, ['area', 'place', 'position'], [], errors);
  checkString(location.area, `${path}.area`, errors);
  checkString(location.place, `${path}.place`, errors);
  checkString(location.position, `${path}.position`, errors);
}

function validateFact(value: unknown, path: string, errors: string[]): void {
  const fact = requireObject(value, path, errors);
  if (!fact) return;
  checkKeys(fact, path, ['truth', 'status', 'evidenceRefs'], [], errors);
  checkString(fact.truth, `${path}.truth`, errors);
  if (!['true', 'false', 'unknown'].includes(String(fact.status))) errors.push(`${path}.status 无效`);
  checkStringArray(fact.evidenceRefs, `${path}.evidenceRefs`, errors);
}

function validateProjection(value: unknown, path: string, errors: string[]): void {
  const projection = requireObject(value, path, errors);
  if (!projection) return;
  checkKeys(projection, path, [
    'schemaVersion', 'storyId', 'turn', 'canonCursor', 'time', 'location', 'characters',
    'relationships', 'inventory', 'facts', 'knowledge', 'flags', 'canonEvents',
    'narrativePurposes', 'openThreads', 'custom', 'lockedPaths', 'divergence',
  ], [], errors);
  if (projection.schemaVersion !== 1) errors.push(`${path}.schemaVersion 必须为 1`);
  checkId(projection.storyId, `${path}.storyId`, errors);
  checkNumber(projection.turn, `${path}.turn`, errors, { integer: true, min: 0 });

  const cursor = requireObject(projection.canonCursor, `${path}.canonCursor`, errors);
  if (cursor) {
    checkKeys(cursor, `${path}.canonCursor`, ['chapterId', 'sceneId', 'eventOrder'], [], errors);
    checkString(cursor.chapterId, `${path}.canonCursor.chapterId`, errors);
    checkString(cursor.sceneId, `${path}.canonCursor.sceneId`, errors);
    checkNumber(cursor.eventOrder, `${path}.canonCursor.eventOrder`, errors, { integer: true, min: 0 });
  }
  const time = requireObject(projection.time, `${path}.time`, errors);
  if (time) {
    checkKeys(time, `${path}.time`, ['absolute', 'relativeMinutes'], [], errors);
    if (time.absolute !== null) checkString(time.absolute, `${path}.time.absolute`, errors);
    checkNumber(time.relativeMinutes, `${path}.time.relativeMinutes`, errors);
  }
  validateLocation(projection.location, `${path}.location`, errors);

  const characters = checkStringMap(projection.characters, `${path}.characters`, errors);
  if (characters) Object.entries(characters).forEach(([id, raw]) => {
    checkId(id, `${path}.characters key`, errors);
    const character = requireObject(raw, `${path}.characters.${id}`, errors);
    if (!character) return;
    checkKeys(character, `${path}.characters.${id}`, ['present'], ['location', 'mood', 'activity', 'physical', 'outfit', 'custom'], errors);
    if (typeof character.present !== 'boolean') errors.push(`${path}.characters.${id}.present 必须是布尔值`);
    if (character.location !== undefined) validateLocation(character.location, `${path}.characters.${id}.location`, errors);
    if (character.mood !== undefined) checkStringArray(character.mood, `${path}.characters.${id}.mood`, errors);
    if (character.activity !== undefined && character.activity !== null) checkString(character.activity, `${path}.characters.${id}.activity`, errors);
    if (character.physical !== undefined) checkStringArray(character.physical, `${path}.characters.${id}.physical`, errors);
    for (const key of ['outfit', 'custom'] as const) {
      if (character[key] !== undefined) requireObject(character[key], `${path}.characters.${id}.${key}`, errors);
    }
  });

  const relationships = checkStringMap(projection.relationships, `${path}.relationships`, errors);
  if (relationships) Object.entries(relationships).forEach(([id, raw]) => {
    checkId(id, `${path}.relationships key`, errors);
    const relationship = requireObject(raw, `${path}.relationships.${id}`, errors);
    if (!relationship) return;
    checkKeys(relationship, `${path}.relationships.${id}`, ['pairId', 'stage', 'directions', 'axes'], [], errors);
    checkId(relationship.pairId, `${path}.relationships.${id}.pairId`, errors);
    checkString(relationship.stage, `${path}.relationships.${id}.stage`, errors);
    const directions = requireObject(relationship.directions, `${path}.relationships.${id}.directions`, errors);
    if (directions) Object.entries(directions).forEach(([fromId, directionRaw]) => {
      checkId(fromId, `${path}.relationships.${id}.directions key`, errors);
      const direction = requireObject(directionRaw, `${path}.relationships.${id}.directions.${fromId}`, errors);
      if (!direction) return;
      checkKeys(direction, `${path}.relationships.${id}.directions.${fromId}`, ['toward', 'stance', 'wants', 'secrets'], [], errors);
      checkId(direction.toward, `${path}.relationships.${id}.directions.${fromId}.toward`, errors);
      checkStringArray(direction.stance, `${path}.relationships.${id}.directions.${fromId}.stance`, errors);
      checkStringArray(direction.wants, `${path}.relationships.${id}.directions.${fromId}.wants`, errors);
      checkStringArray(direction.secrets, `${path}.relationships.${id}.directions.${fromId}.secrets`, errors);
    });
    const axes = requireObject(relationship.axes, `${path}.relationships.${id}.axes`, errors);
    if (axes) Object.entries(axes).forEach(([axis, score]) => checkNumber(score, `${path}.relationships.${id}.axes.${axis}`, errors));
  });

  const inventory = checkStringMap(projection.inventory, `${path}.inventory`, errors);
  if (inventory) Object.entries(inventory).forEach(([id, raw]) => {
    checkId(id, `${path}.inventory key`, errors);
    const item = requireObject(raw, `${path}.inventory.${id}`, errors);
    if (!item) return;
    checkKeys(item, `${path}.inventory.${id}`, ['count'], ['description', 'ownerId'], errors);
    checkNumber(item.count, `${path}.inventory.${id}.count`, errors, { integer: true, min: 0 });
    if (item.description !== undefined) checkString(item.description, `${path}.inventory.${id}.description`, errors);
    if (item.ownerId !== undefined) checkId(item.ownerId, `${path}.inventory.${id}.ownerId`, errors);
  });

  const facts = checkStringMap(projection.facts, `${path}.facts`, errors);
  if (facts) Object.entries(facts).forEach(([id, fact]) => {
    checkId(id, `${path}.facts key`, errors);
    validateFact(fact, `${path}.facts.${id}`, errors);
  });

  const knowledge = checkStringMap(projection.knowledge, `${path}.knowledge`, errors);
  if (knowledge) Object.entries(knowledge).forEach(([characterId, factMapRaw]) => {
    checkId(characterId, `${path}.knowledge key`, errors);
    const factMap = requireObject(factMapRaw, `${path}.knowledge.${characterId}`, errors);
    if (!factMap) return;
    Object.entries(factMap).forEach(([factId, entryRaw]) => {
      checkId(factId, `${path}.knowledge.${characterId} key`, errors);
      const entry = requireObject(entryRaw, `${path}.knowledge.${characterId}.${factId}`, errors);
      if (!entry) return;
      checkKeys(entry, `${path}.knowledge.${characterId}.${factId}`, ['state'], ['sourceRecordId', 'perceivedTruth'], errors);
      if (!KNOWLEDGE_STATES.has(entry.state as KnowledgeState)) errors.push(`${path}.knowledge.${characterId}.${factId}.state 无效`);
      if (entry.sourceRecordId !== undefined) checkString(entry.sourceRecordId, `${path}.knowledge.${characterId}.${factId}.sourceRecordId`, errors);
      if (entry.perceivedTruth !== undefined) checkString(entry.perceivedTruth, `${path}.knowledge.${characterId}.${factId}.perceivedTruth`, errors);
    });
  });

  requireObject(projection.flags, `${path}.flags`, errors);
  const canonEvents = checkStringMap(projection.canonEvents, `${path}.canonEvents`, errors);
  if (canonEvents) Object.entries(canonEvents).forEach(([id, status]) => {
    checkId(id, `${path}.canonEvents key`, errors);
    if (!CANON_EVENT_STATUSES.has(status as CanonEventStatus)) errors.push(`${path}.canonEvents.${id} 状态无效`);
  });
  const purposes = checkStringMap(projection.narrativePurposes, `${path}.narrativePurposes`, errors);
  if (purposes) Object.entries(purposes).forEach(([id, status]) => {
    checkId(id, `${path}.narrativePurposes key`, errors);
    if (!['pending', 'fulfilled', 'abandoned'].includes(String(status))) errors.push(`${path}.narrativePurposes.${id} 状态无效`);
  });
  const threads = checkStringMap(projection.openThreads, `${path}.openThreads`, errors);
  if (threads) Object.entries(threads).forEach(([id, raw]) => {
    checkId(id, `${path}.openThreads key`, errors);
    const thread = requireObject(raw, `${path}.openThreads.${id}`, errors);
    if (!thread) return;
    checkKeys(thread, `${path}.openThreads.${id}`, ['title', 'status', 'evidenceRefs'], [], errors);
    checkString(thread.title, `${path}.openThreads.${id}.title`, errors);
    if (!['open', 'resolved', 'abandoned'].includes(String(thread.status))) errors.push(`${path}.openThreads.${id}.status 无效`);
    checkStringArray(thread.evidenceRefs, `${path}.openThreads.${id}.evidenceRefs`, errors);
  });
  requireObject(projection.custom, `${path}.custom`, errors);
  checkStringArray(projection.lockedPaths, `${path}.lockedPaths`, errors);
  const divergence = requireObject(projection.divergence, `${path}.divergence`, errors);
  if (divergence) {
    checkKeys(divergence, `${path}.divergence`, ['structuralLevel', 'summary'], [], errors);
    checkNumber(divergence.structuralLevel, `${path}.divergence.structuralLevel`, errors, { min: 0, max: 1 });
    checkString(divergence.summary, `${path}.divergence.summary`, errors);
  }
}

const OPERATION_FIELDS: Record<string, { required: string[]; optional: string[] }> = {
  advance_time: { required: ['minutes'], optional: [] },
  set_time: { required: ['absolute'], optional: [] },
  move_location: { required: ['location'], optional: [] },
  set_character_presence: { required: ['characterId', 'present'], optional: [] },
  set_character_state: { required: ['characterId', 'field', 'value'], optional: [] },
  add_fact: { required: ['factId', 'fact'], optional: [] },
  set_knowledge: { required: ['characterId', 'factId', 'state'], optional: ['perceivedTruth'] },
  set_relationship_stage: { required: ['pairId', 'stage'], optional: [] },
  set_relationship_attitude: { required: ['pairId', 'fromCharacterId', 'towardCharacterId', 'stance'], optional: ['wants', 'secrets'] },
  change_relationship_axis: { required: ['pairId', 'axis', 'delta'], optional: [] },
  change_inventory: { required: ['itemId', 'delta'], optional: ['description', 'ownerId'] },
  set_divergence: { required: ['structuralLevel', 'summary'], optional: [] },
  set_flag: { required: ['flag', 'value'], optional: [] },
  open_thread: { required: ['threadId', 'title'], optional: [] },
  resolve_thread: { required: ['threadId', 'status'], optional: [] },
  transition_canon_event: { required: ['eventId', 'status'], optional: [] },
  set_narrative_purpose: { required: ['purposeId', 'status'], optional: [] },
};

function validateOperation(value: unknown, path: string, errors: string[]): void {
  const operation = requireObject(value, path, errors);
  if (!operation) return;
  const type = typeof operation.type === 'string' ? operation.type : '';
  const fields = OPERATION_FIELDS[type];
  if (!fields) {
    errors.push(`${path}.type 不受 PTE 1.0 支持`);
    return;
  }
  checkKeys(operation, path, ['id', 'type', 'confidence', 'evidenceIds', ...fields.required], fields.optional, errors);
  checkId(operation.id, `${path}.id`, errors);
  checkNumber(operation.confidence, `${path}.confidence`, errors, { min: 0, max: 1 });
  checkStringArray(operation.evidenceIds, `${path}.evidenceIds`, errors, true);

  const idFields = ['characterId', 'factId', 'pairId', 'fromCharacterId', 'towardCharacterId', 'itemId', 'ownerId', 'axis', 'flag', 'threadId', 'eventId', 'purposeId'];
  idFields.forEach(field => {
    if (operation[field] !== undefined) checkId(operation[field], `${path}.${field}`, errors);
  });
  if (operation.location !== undefined) validateLocation(operation.location, `${path}.location`, errors);
  if (operation.fact !== undefined) validateFact(operation.fact, `${path}.fact`, errors);
  if (operation.minutes !== undefined) checkNumber(operation.minutes, `${path}.minutes`, errors, { min: -525600, max: 525600 });
  if (operation.delta !== undefined) checkNumber(operation.delta, `${path}.delta`, errors, {
    integer: type === 'change_inventory', min: -1000000, max: 1000000,
  });
  if (operation.structuralLevel !== undefined) {
    checkNumber(operation.structuralLevel, `${path}.structuralLevel`, errors, { min: 0, max: 1 });
  }
  if (operation.present !== undefined && typeof operation.present !== 'boolean') errors.push(`${path}.present 必须是布尔值`);
  if (operation.absolute !== undefined && operation.absolute !== null) checkString(operation.absolute, `${path}.absolute`, errors);
  if (operation.field !== undefined && !['mood', 'activity', 'physical', 'outfit', 'custom'].includes(String(operation.field))) errors.push(`${path}.field 无效`);
  if (operation.state !== undefined && !KNOWLEDGE_STATES.has(operation.state as KnowledgeState)) errors.push(`${path}.state 无效`);
  if (operation.status !== undefined) {
    const allowed = type === 'transition_canon_event'
      ? CANON_EVENT_STATUSES.has(operation.status as CanonEventStatus)
      : type === 'resolve_thread'
        ? ['resolved', 'abandoned'].includes(String(operation.status))
        : ['pending', 'fulfilled', 'abandoned'].includes(String(operation.status));
    if (!allowed) errors.push(`${path}.status 无效`);
  }
  for (const field of ['stage', 'title', 'description', 'perceivedTruth', 'summary'] as const) {
    if (operation[field] !== undefined) checkString(operation[field], `${path}.${field}`, errors);
  }
  for (const field of ['stance', 'wants', 'secrets'] as const) {
    if (operation[field] !== undefined) checkStringArray(operation[field], `${path}.${field}`, errors);
  }
}

function validateEvent(value: unknown, path: string, errors: string[]): void {
  const event = requireObject(value, path, errors);
  if (!event) return;
  checkKeys(event, path, [
    'id', 'chapterId', 'sceneId', 'canonicalOrder', 'kind', 'rigidity', 'summary',
    'participants', 'effects', 'narrativePurposes', 'evidenceRefs', 'revealPolicy', 'adaptation',
  ], ['preconditions', 'forbiddenWhen', 'scope'], errors);
  checkId(event.id, `${path}.id`, errors);
  checkString(event.chapterId, `${path}.chapterId`, errors);
  checkString(event.sceneId, `${path}.sceneId`, errors);
  checkNumber(event.canonicalOrder, `${path}.canonicalOrder`, errors, { integer: true, min: 0 });
  if (!['hard_anchor', 'soft_anchor', 'character_beat', 'transition', 'atmosphere', 'chance'].includes(String(event.kind))) errors.push(`${path}.kind 无效`);
  if (!['hard', 'soft', 'flexible'].includes(String(event.rigidity))) errors.push(`${path}.rigidity 无效`);
  if (event.scope !== undefined && !['world', 'interpersonal'].includes(String(event.scope))) errors.push(`${path}.scope 无效`);
  checkString(event.summary, `${path}.summary`, errors);
  checkStringArray(event.participants, `${path}.participants`, errors, true);
  if (!Array.isArray(event.effects)) errors.push(`${path}.effects 必须是数组`);
  else event.effects.forEach((operation, index) => {
    validateOperation(operation, `${path}.effects[${index}]`, errors);
    if (isRecord(operation) && operation.type === 'transition_canon_event') {
      errors.push(`${path}.effects[${index}] 不得直接改变原作事件状态`);
    }
  });
  checkStringArray(event.narrativePurposes, `${path}.narrativePurposes`, errors, true);
  checkStringArray(event.evidenceRefs, `${path}.evidenceRefs`, errors);
  if (!['eligible_only', 'active_only', 'never'].includes(String(event.revealPolicy))) errors.push(`${path}.revealPolicy 无效`);
  const adaptation = requireObject(event.adaptation, `${path}.adaptation`, errors);
  if (adaptation) {
    checkKeys(adaptation, `${path}.adaptation`, ['allowDelay', 'allowRelocation', 'allowSubstitution'], [], errors);
    for (const field of ['allowDelay', 'allowRelocation', 'allowSubstitution']) {
      if (typeof adaptation[field] !== 'boolean') errors.push(`${path}.adaptation.${field} 必须是布尔值`);
    }
  }
}

function validateCard(value: unknown, path: string, errors: string[]): void {
  const card = requireObject(value, path, errors);
  if (!card) return;
  checkKeys(card, path, ['schema_version', 'story_id', 'entry_point', 'bindings'], [
    'package_digest', 'mode_defaults', 'initial_state', 'inline_plan',
  ], errors);
  if (card.schema_version !== '1.0') errors.push(`${path}.schema_version 必须为 1.0`);
  checkId(card.story_id, `${path}.story_id`, errors);
  if (card.package_digest !== undefined && !/^sha256:[0-9a-f]{64}$/.test(String(card.package_digest))) {
    errors.push(`${path}.package_digest 格式无效`);
  }
  const entry = requireObject(card.entry_point, `${path}.entry_point`, errors);
  if (entry) {
    checkKeys(entry, `${path}.entry_point`, ['chapter_id', 'scene_id'], ['event_id'], errors);
    checkString(entry.chapter_id, `${path}.entry_point.chapter_id`, errors, false);
    checkString(entry.scene_id, `${path}.entry_point.scene_id`, errors, false);
    if (entry.event_id !== undefined) checkId(entry.event_id, `${path}.entry_point.event_id`, errors);
  }
  const bindings = requireObject(card.bindings, `${path}.bindings`, errors);
  if (bindings) {
    checkKeys(bindings, `${path}.bindings`, ['character_id'], ['user_role_id'], errors);
    checkId(bindings.character_id, `${path}.bindings.character_id`, errors);
    if (bindings.user_role_id !== undefined) checkId(bindings.user_role_id, `${path}.bindings.user_role_id`, errors);
  }
  const defaults = card.mode_defaults === undefined ? null : requireObject(card.mode_defaults, `${path}.mode_defaults`, errors);
  if (defaults) {
    checkKeys(defaults, `${path}.mode_defaults`, [], ['participation', 'audit', 'auto_apply'], errors);
    if (defaults.participation !== undefined && !['follow', 'adaptive', 'parallel', 'free'].includes(String(defaults.participation))) errors.push(`${path}.mode_defaults.participation 无效`);
    if (defaults.audit !== undefined && !['off', 'standard', 'strict'].includes(String(defaults.audit))) errors.push(`${path}.mode_defaults.audit 无效`);
    if (defaults.auto_apply !== undefined && typeof defaults.auto_apply !== 'boolean') errors.push(`${path}.mode_defaults.auto_apply 必须是布尔值`);
  }
  if (card.initial_state !== undefined) validateProjection(card.initial_state, `${path}.initial_state`, errors);
}

export function validatePsycheTimelineState(value: unknown): TimelineValidationResult {
  const errors: string[] = [];
  const state = requireObject(value, 'timeline', errors);
  if (!state) return { valid: false, errors };
  checkKeys(state, 'timeline', ['schemaVersion', 'card', 'plan', 'trajectoryNotes', 'sourceFingerprint', 'createdAt'], ['sourceLibrary'], errors);
  if (state.schemaVersion !== 1) errors.push('timeline.schemaVersion 必须为 1');
  checkString(state.trajectoryNotes, 'timeline.trajectoryNotes', errors);
  if (state.sourceFingerprint !== null) checkString(state.sourceFingerprint, 'timeline.sourceFingerprint', errors);
  if (state.sourceLibrary !== undefined && state.sourceLibrary !== null
    && !validateStorySourceLibraryRef(state.sourceLibrary)) errors.push('timeline.sourceLibrary 无效');
  checkString(state.createdAt, 'timeline.createdAt', errors, false);
  validateCard(state.card, 'timeline.card', errors);

  if (state.plan !== null) {
    const plan = requireObject(state.plan, 'timeline.plan', errors);
    if (plan) {
      checkKeys(plan, 'timeline.plan', ['schemaVersion', 'storyId', 'title', 'initialState', 'events'], [], errors);
      if (plan.schemaVersion !== 1) errors.push('timeline.plan.schemaVersion 必须为 1');
      checkId(plan.storyId, 'timeline.plan.storyId', errors);
      checkString(plan.title, 'timeline.plan.title', errors, false);
      validateProjection(plan.initialState, 'timeline.plan.initialState', errors);
      if (!Array.isArray(plan.events)) errors.push('timeline.plan.events 必须是数组');
      else plan.events.forEach((event, index) => validateEvent(event, `timeline.plan.events[${index}]`, errors));

      const card = isRecord(state.card) ? state.card : null;
      const initialState = isRecord(plan.initialState) ? plan.initialState : null;
      if (card && plan.storyId !== card.story_id) errors.push('card.story_id 与 plan.storyId 不一致');
      if (initialState && plan.storyId !== initialState.storyId) errors.push('plan.initialState.storyId 与 plan.storyId 不一致');

      const events = Array.isArray(plan.events) ? plan.events.filter(isRecord) : [];
      const eventIds = events.map(event => event.id).filter((id): id is string => typeof id === 'string');
      if (new Set(eventIds).size !== eventIds.length) errors.push('plan.events 的事件 ID 不得重复');
      const eventOrders = events.map(event => event.canonicalOrder).filter((order): order is number => typeof order === 'number');
      if (new Set(eventOrders).size !== eventOrders.length) errors.push('plan.events 的 canonicalOrder 不得重复');
      const projectionCharacters = initialState && isRecord(initialState.characters) ? initialState.characters : {};
      const projectionEvents = initialState && isRecord(initialState.canonEvents) ? initialState.canonEvents : {};
      const projectionPurposes = initialState && isRecord(initialState.narrativePurposes) ? initialState.narrativePurposes : {};
      eventIds.forEach(id => {
        if (!Object.hasOwn(projectionEvents, id)) errors.push(`initialState.canonEvents 缺少事件 ${id}`);
      });
      events.forEach((event, index) => {
        if (Array.isArray(event.participants)) event.participants.forEach(participant => {
          if (typeof participant === 'string' && !Object.hasOwn(projectionCharacters, participant)) {
            errors.push(`events[${index}] 的参与者 ${participant} 未出现在 initialState.characters`);
          }
        });
        if (Array.isArray(event.narrativePurposes)) event.narrativePurposes.forEach(purpose => {
          if (typeof purpose === 'string' && !Object.hasOwn(projectionPurposes, purpose)) {
            errors.push(`events[${index}] 的叙事目的 ${purpose} 未出现在 initialState.narrativePurposes`);
          }
        });
      });
      if (card && isRecord(card.bindings) && typeof card.bindings.character_id === 'string'
        && !Object.hasOwn(projectionCharacters, card.bindings.character_id)) {
        errors.push('card.bindings.character_id 未出现在 initialState.characters');
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

function extractMarkedJson(response: string): string | null {
  const marked = response.match(/<<<PSYCHE_TIMELINE_JSON>>>\s*([\s\S]*?)\s*<<<END_PSYCHE_TIMELINE_JSON>>>/i)?.[1]?.trim();
  if (!marked) return null;
  return marked.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}

export function parsePsycheTimelineResponse(
  response: string,
  trajectoryNotes: string,
  sourceFingerprint: string | null,
  createdAt = new Date().toISOString(),
): PsycheTimelineProjectState {
  const json = extractMarkedJson(response);
  if (!json) throw new Error('时间线输出缺少完整的 PSYCHE_TIMELINE_JSON 边界标记');
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    throw new Error(`时间线 JSON 无法解析：${error instanceof Error ? error.message : String(error)}`);
  }
  if (!isRecord(parsed)) throw new Error('时间线 JSON 根节点必须是对象');
  const rawCard = cloneJson(parsed.card);
  if (!isRecord(rawCard)) throw new Error('时间线 JSON 缺少 card 对象');
  delete rawCard.inline_plan;
  delete rawCard.package_digest;
  const state: PsycheTimelineProjectState = {
    schemaVersion: 1,
    card: rawCard as unknown as CardTimelineExtension,
    plan: cloneJson(parsed.plan) as StoryPlan,
    trajectoryNotes,
    sourceFingerprint,
    createdAt,
  };
  const validation = validatePsycheTimelineState(state);
  if (!validation.valid) throw new Error(`时间线不符合 PTE 1.0：${validation.errors.slice(0, 12).join('；')}`);
  return state;
}

export function timelineStateFromCardExtension(value: unknown): PsycheTimelineProjectState | null {
  if (!isRecord(value)) return null;
  const plan = isRecord(value.inline_plan) ? cloneJson(value.inline_plan) as unknown as StoryPlan : null;
  const card = cloneJson(value);
  delete card.inline_plan;
  const state: PsycheTimelineProjectState = {
    schemaVersion: 1,
    card: card as unknown as CardTimelineExtension,
    plan,
    trajectoryNotes: '',
    sourceFingerprint: null,
    sourceLibrary: null,
    createdAt: new Date().toISOString(),
  };
  return validatePsycheTimelineState(state).valid ? state : null;
}

export function buildCardTimelineExtension(
  state: PsycheTimelineProjectState | null | undefined,
  includeInlinePlan = true,
): CardTimelineExtension | undefined {
  if (!state) return undefined;
  const validation = validatePsycheTimelineState(state);
  if (!validation.valid) throw new Error(`项目时间线无效：${validation.errors.join('；')}`);
  const card = cloneJson(state.card);
  if (includeInlinePlan && state.plan) {
    delete card.package_digest;
    card.inline_plan = cloneJson(state.plan);
    card.initial_state = cloneJson(state.plan.initialState);
  } else {
    delete card.inline_plan;
    delete card.initial_state;
    delete card.package_digest;
  }
  return card;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value).sort().map(key => [key, stableValue(value[key])]),
  );
}

export function stableJson(value: unknown): string {
  return `${JSON.stringify(stableValue(value), null, 2)}\n`;
}

export function buildPsycheBookBytes(
  state: PsycheTimelineProjectState,
  version = '1.0.0',
  source?: StorySourceCorpus,
  includeEmbeddings = false,
): Uint8Array {
  const validation = validatePsycheTimelineState(state);
  if (!validation.valid || !state.plan) {
    throw new Error(`无法导出 .psychebook：${validation.errors.join('；') || '项目没有结构化 StoryPlan'}`);
  }
  const card = buildCardTimelineExtension(state, false)!;
  if (source) {
    const sourceErrors = validateStorySourceCorpus(source);
    if (sourceErrors.length > 0) throw new Error(`无法导出原文库：${sourceErrors.join('；')}`);
    if (source.index.storyId !== state.plan.storyId) throw new Error('原文库 storyId 与时间线 storyId 不一致');
  }
  const includeAnalysis = Boolean(source?.analysisUnits.length);
  const includeVectors = Boolean(source && includeEmbeddings && source.embeddings.length);
  const includeClaims = Boolean(source?.claims.length);
  const includeCompilation = Boolean(source?.compilation.length);
  const sourceDescriptor = source ? {
    schema_version: 1,
    index: 'source/index.json',
    chunks: 'source/chunks.jsonl',
    ...(includeAnalysis ? { analysis: 'source/analysis.jsonl' } : {}),
    ...(includeVectors ? { embeddings: 'source/embeddings.jsonl' } : {}),
    ...(includeClaims ? { claims: 'source/claims.jsonl' } : {}),
    ...(includeCompilation ? { compilation: 'source/compilation.jsonl' } : {}),
  } : undefined;
  const manifest = {
    schema_version: '1.0',
    format: 'psychebook',
    story_id: state.plan.storyId,
    title: state.plan.title,
    version,
    entry_point: cloneJson(card.entry_point),
    bindings: cloneJson(card.bindings),
    ...(sourceDescriptor ? { source: sourceDescriptor } : {}),
  };
  const fixedTime = new Date('1980-01-01T00:00:00.000Z');
  const files: Record<string, [Uint8Array, { mtime: Date }]> = {
    'manifest.json': [strToU8(stableJson(manifest)), { mtime: fixedTime }],
    'story.json': [strToU8(stableJson(state.plan)), { mtime: fixedTime }],
    'card.json': [strToU8(stableJson(card)), { mtime: fixedTime }],
  };
  const jsonLines = (values: unknown[]) => `${values.map(value => JSON.stringify(stableValue(value))).join('\n')}\n`;
  if (source) {
    files['source/index.json'] = [strToU8(stableJson(source.index)), { mtime: fixedTime }];
    files['source/chunks.jsonl'] = [strToU8(jsonLines(source.retrievalChunks)), { mtime: fixedTime }];
    if (includeAnalysis) files['source/analysis.jsonl'] = [strToU8(jsonLines(source.analysisUnits)), { mtime: fixedTime }];
    if (includeVectors) files['source/embeddings.jsonl'] = [strToU8(jsonLines(source.embeddings)), { mtime: fixedTime }];
    if (includeClaims) files['source/claims.jsonl'] = [strToU8(jsonLines(source.claims)), { mtime: fixedTime }];
    if (includeCompilation) files['source/compilation.jsonl'] = [strToU8(jsonLines(source.compilation)), { mtime: fixedTime }];
  }
  return zipSync(files, { level: 9, mtime: fixedTime });
}

export function buildPsycheTimelineCompilationPrompt(
  input: PsycheTimelineCompilationInput,
  validationFeedback = '',
  compact = false,
): string {
  return `你是 Psyche Timeline Engine 1.0 的结构化编译器。把已经通过原作审计的角色资料和剧情轨迹编译成可执行 JSON。\n\n` +
    `只输出 <<<PSYCHE_TIMELINE_JSON>>> 与 <<<END_PSYCHE_TIMELINE_JSON>>> 之间的 JSON，不要 Markdown 解释。\n` +
    `根对象只能包含 card 与 plan。card 必须符合 PTE CardTimelineExtension 1.0；plan 必须符合 StoryPlan 1.0。\n\n` +
    `硬规则：\n` +
    `- card.story_id、plan.storyId、plan.initialState.storyId 必须完全相同。\n` +
    `- card 不要输出 package_digest、inline_plan 或 initial_state；设计器会在导出时写入。\n` +
    `- initialState 只能表示用户确认的故事起点。未来事件只进入 events，不能倒灌到角色记忆、关系、物品、事实或当前状态。\n` +
    `- initialState 必须完整包含 schemaVersion, storyId, turn, canonCursor, time, location, characters, relationships, inventory, facts, knowledge, flags, canonEvents, narrativePurposes, openThreads, custom, lockedPaths, divergence。没有证据的集合使用空对象或空数组，不得补写。\n` +
    `- 每个事件必须包含 id, chapterId, sceneId, canonicalOrder, kind, rigidity, summary, participants, effects, narrativePurposes, evidenceRefs, revealPolicy, adaptation。\n` +
    `- 每个事件可选包含 scope：世界级进程（天灾、战争、瘟疫、政权更迭）标为 "world"；由角色行为与关系驱动的事件标为 "interpersonal" 或省略。\n` +
    `- scope="world" 的事件在剧情分歧后仍会被 PTE 保留，所以它是否被阻止必须由真正的前因决定：把「堤坝已修复」「敌军已被歼灭」这类可验证条件写进 forbiddenWhen，不要依赖分歧度。\n` +
    `- 所有事件 ID 都要预先出现在 initialState.canonEvents；故事起点以后尚未到达的事件用 locked，起点处可发生的首个事件才可用 eligible。\n` +
    `- 所有 narrativePurposes 引用都要预先出现在 initialState.narrativePurposes，初始通常为 pending。\n` +
    `- participants 中的每个角色都要出现在 initialState.characters，即使当前不在场也以 present:false 登记。\n` +
    `- effects 只能使用 PTE 操作：advance_time, set_time, move_location, set_character_presence, set_character_state, add_fact, set_knowledge, set_relationship_stage, set_relationship_attitude, change_relationship_axis, change_inventory, set_divergence, set_flag, open_thread, resolve_thread, set_narrative_purpose；不得在 StoryEvent.effects 内使用 transition_canon_event。\n` +
    `- set_divergence.structuralLevel 取 0 到 1：0=仍兼容原作，0.25=局部变化，0.5=故事弧明显分叉，0.75=主要结构改变，1=无法与原作主线统一；summary 必须说明已经发生的因果差异。\n` +
    `- 每个 effect 必须有唯一 id、0 到 1 的 confidence、evidenceIds 数组及该类型的必需字段。没有可安全执行的效果时使用空数组。\n` +
    `- 不要输出协议外字段；不确定事实保持 unknown、unaware 或干脆省略，不能猜。\n` +
    `- 默认 mode_defaults 使用 participation=adaptive, audit=strict, auto_apply=false。\n` +
    `${compact ? '- 本次修复只保留证据充分的事件，宁可减少事件也不能产生无效结构。\n' : ''}` +
    `${validationFeedback ? `\n上一版确定性校验错误，必须逐项修复：\n${validationFeedback}\n` : ''}` +
    `\n【基础身份】\n${input.identity}\n\n` +
    `【故事起点前背景】\n${input.background}\n\n` +
    `【起点关系】\n${input.relationships}\n\n` +
    `【世界与起点】\n${input.world}\n\n` +
    `【已审计剧情轨迹】\n${input.trajectory}\n\n` +
    `【用户讨论与选择】\n${input.discussion}\n\n` +
    `【原作证据索引】\n${input.evidence}\n\n` +
    `<<<PSYCHE_TIMELINE_JSON>>>\n{"card":{"schema_version":"1.0","story_id":"...","entry_point":{"chapter_id":"...","scene_id":"..."},"bindings":{"character_id":"..."},"mode_defaults":{"participation":"adaptive","audit":"strict","auto_apply":false}},"plan":{"schemaVersion":1,"storyId":"...","title":"...","initialState":{"schemaVersion":1,"storyId":"...","turn":0,"canonCursor":{"chapterId":"...","sceneId":"...","eventOrder":0},"time":{"absolute":null,"relativeMinutes":0},"location":{"area":"","place":"","position":""},"characters":{},"relationships":{},"inventory":{},"facts":{},"knowledge":{},"flags":{},"canonEvents":{},"narrativePurposes":{},"openThreads":{},"custom":{},"lockedPaths":[],"divergence":{"structuralLevel":0,"summary":""}},"events":[]}}\n<<<END_PSYCHE_TIMELINE_JSON>>>`;
}

export function buildPsycheTimelineAuditPrompt(
  input: PsycheTimelineCompilationInput,
  candidate: PsycheTimelineProjectState,
): string {
  const portableCandidate = { card: candidate.card, plan: candidate.plan };
  return `你是独立的 PTE 时间线审计 AI。重新核对候选 JSON 与原作证据、用户选择和故事起点。\n` +
    `修复未来事实倒灌、角色知识越界、关系状态提前、事件顺序错误、无证据效果、协议字段缺失和 ID 引用错误。\n` +
    `不得为了填满字段而发明内容。输出仍必须是根节点只有 card 与 plan 的完整 JSON，并严格包在指定标记中。\n\n` +
    `【用户讨论与选择】\n${input.discussion}\n\n` +
    `【原作证据索引】\n${input.evidence}\n\n` +
    `【已审计剧情轨迹】\n${input.trajectory}\n\n` +
    `【待审计 JSON】\n${stableJson(portableCandidate)}\n` +
    `<<<PSYCHE_TIMELINE_JSON>>>\n（输出修订后的完整 JSON）\n<<<END_PSYCHE_TIMELINE_JSON>>>`;
}
