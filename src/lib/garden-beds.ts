export const WEED_LEVELS = ["low", "medium", "high"] as const;

export type WeedLevel = (typeof WEED_LEVELS)[number];

export const BED_QUEUE_PRIORITIES = ["ok", "soon", "urgent"] as const;

export type BedQueuePriority = (typeof BED_QUEUE_PRIORITIES)[number];

export const BED_QUEUE_PRIORITY_LABELS: Record<BedQueuePriority, string> = {
  ok: "OK",
  soon: "wkrótce",
  urgent: "pilne",
} as const;

export const PRIORITY_CONFIDENCE_LEVELS = ["complete", "partial"] as const;

export type PriorityConfidence = (typeof PRIORITY_CONFIDENCE_LEVELS)[number];

export interface CreateGardenBedInput {
  name: string;
  weed_level: WeedLevel;
  area_m2?: number | null;
  last_weeded_at?: string | null;
  estimated_minutes?: number | null;
  mulch_depth_cm?: number | null;
}

export interface GardenBedRow {
  id: string;
  user_id: string;
  name: string;
  area_m2: number | null;
  last_weeded_at: string | null;
  weed_level: WeedLevel;
  estimated_minutes: number | null;
  mulch_depth_cm: number | null;
  created_at: string;
  updated_at: string;
}

export type GardenBedResponse = Omit<GardenBedRow, "user_id">;

export interface GardenBedQueueItem extends GardenBedResponse {
  priority: BedQueuePriority;
  priority_label: string;
  priority_score: number;
  suggested_weed_at: string | null;
  priority_confidence: PriorityConfidence;
}

export interface GardenBedPriorityResult {
  priority: BedQueuePriority;
  priority_label: string;
  priority_score: number;
  suggested_weed_at: string | null;
  priority_confidence: PriorityConfidence;
}

export interface GardenBedInsertPayload extends CreateGardenBedInput {
  user_id: string;
}

export type GardenBedValidationResult =
  | { success: true; data: CreateGardenBedInput }
  | { success: false; error: string };

// Fixed MVP date intervals for S-01. These are intentionally simple and
// documented here so later slices can tune them without changing persistence:
// low weeds -> 21 days, medium weeds -> 14 days, high weeds -> 7 days.
export const SUGGESTED_WEED_INTERVAL_DAYS: Record<WeedLevel, number> = {
  low: 21,
  medium: 14,
  high: 7,
} as const;

// Rule-based priority scoring for S-01. Thresholds are deliberately transparent:
// 0-39 = OK, 40-79 = wkrótce, 80+ = pilne. Weed level is the baseline, elapsed
// time adds urgency only when last_weeded_at is known, large/time-consuming beds
// add smaller boosts, and shallow/no mulch increases urgency.
export const PRIORITY_SCORE_THRESHOLDS = {
  soon: 40,
  urgent: 80,
} as const;

const weedLevelSet = new Set<string>(WEED_LEVELS);

const WEED_LEVEL_SCORE: Record<WeedLevel, number> = {
  low: 0,
  medium: 30,
  high: 60,
} as const;

const WEED_LEVEL_SEVERITY: Record<WeedLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
} as const;

const PRIORITY_SEVERITY: Record<BedQueuePriority, number> = {
  ok: 1,
  soon: 2,
  urgent: 3,
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;

export function validateCreateGardenBedInput(value: unknown): GardenBedValidationResult {
  if (!isRecord(value)) {
    return { success: false, error: "Garden bed payload must be an object." };
  }

  const name = value.name;
  if (typeof name !== "string" || name.trim().length === 0) {
    return { success: false, error: "Garden bed name is required." };
  }

  const weedLevel = value.weed_level;
  if (!isWeedLevel(weedLevel)) {
    return { success: false, error: "Weed level must be low, medium, or high." };
  }

  const area = readOptionalNumber(value, "area_m2", "Area must be a positive number.", isPositiveNumber);
  if (!area.success) return area;

  const estimatedMinutes = readOptionalNumber(
    value,
    "estimated_minutes",
    "Estimated minutes must be a positive integer.",
    isPositiveInteger,
  );
  if (!estimatedMinutes.success) return estimatedMinutes;

  const mulchDepth = readOptionalNumber(
    value,
    "mulch_depth_cm",
    "Mulch depth must be a non-negative number.",
    isNonNegativeNumber,
  );
  if (!mulchDepth.success) return mulchDepth;

  const lastWeededAt = value.last_weeded_at;
  if (lastWeededAt !== undefined && lastWeededAt !== null) {
    if (typeof lastWeededAt !== "string" || !isValidIsoDate(lastWeededAt)) {
      return { success: false, error: "Last weeded date must be a valid YYYY-MM-DD date." };
    }
  }

  return {
    success: true,
    data: {
      name: name.trim(),
      weed_level: weedLevel,
      area_m2: area.value,
      last_weeded_at: lastWeededAt ?? null,
      estimated_minutes: estimatedMinutes.value,
      mulch_depth_cm: mulchDepth.value,
    },
  };
}

export function toGardenBedInsertPayload(input: CreateGardenBedInput, userId: string): GardenBedInsertPayload {
  return {
    user_id: userId,
    name: input.name,
    weed_level: input.weed_level,
    area_m2: input.area_m2 ?? null,
    last_weeded_at: input.last_weeded_at ?? null,
    estimated_minutes: input.estimated_minutes ?? null,
    mulch_depth_cm: input.mulch_depth_cm ?? null,
  };
}

export function toGardenBedResponse(row: GardenBedRow): GardenBedResponse {
  const { user_id: _userId, ...response } = row;
  return response;
}

export function getSuggestedWeedAt(lastWeededAt: string | null, weedLevel: WeedLevel): string | null {
  if (!lastWeededAt) return null;

  const lastWeededDate = parseIsoDate(lastWeededAt);
  if (!lastWeededDate) return null;

  const suggestedDate = new Date(lastWeededDate.getTime());
  suggestedDate.setUTCDate(suggestedDate.getUTCDate() + SUGGESTED_WEED_INTERVAL_DAYS[weedLevel]);

  return formatIsoDate(suggestedDate);
}

export function getGardenBedPriority(bed: GardenBedResponse | GardenBedRow): GardenBedPriorityResult {
  const score = calculatePriorityScore(bed);
  const priority = getPriorityFromScore(score);

  return {
    priority,
    priority_label: BED_QUEUE_PRIORITY_LABELS[priority],
    priority_score: score,
    suggested_weed_at: getSuggestedWeedAt(bed.last_weeded_at, bed.weed_level),
    priority_confidence: hasCompletePriorityInputs(bed) ? "complete" : "partial",
  };
}

export function toGardenBedQueueItem(bed: GardenBedResponse | GardenBedRow): GardenBedQueueItem {
  return {
    ...toGardenBedResponseLike(bed),
    ...getGardenBedPriority(bed),
  };
}

export function toSortedGardenBedQueue(beds: readonly (GardenBedResponse | GardenBedRow)[]): GardenBedQueueItem[] {
  return beds.map(toGardenBedQueueItem).sort(compareGardenBedQueueItems);
}

function calculatePriorityScore(bed: GardenBedResponse | GardenBedRow): number {
  let score = WEED_LEVEL_SCORE[bed.weed_level];

  score += getElapsedDaysScore(bed.last_weeded_at, bed.weed_level);
  score += getAreaScore(bed.area_m2);
  score += getEstimatedMinutesScore(bed.estimated_minutes);
  score += getMulchDepthScore(bed.mulch_depth_cm);

  return score;
}

function getPriorityFromScore(score: number): BedQueuePriority {
  if (score >= PRIORITY_SCORE_THRESHOLDS.urgent) return "urgent";
  if (score >= PRIORITY_SCORE_THRESHOLDS.soon) return "soon";
  return "ok";
}

function getElapsedDaysScore(lastWeededAt: string | null, weedLevel: WeedLevel): number {
  if (!lastWeededAt) return 0;

  const lastWeededDate = parseIsoDate(lastWeededAt);
  if (!lastWeededDate) return 0;

  const daysSinceLastWeeding = Math.max(
    0,
    Math.floor((startOfUtcToday().getTime() - lastWeededDate.getTime()) / DAY_MS),
  );
  const expectedInterval = SUGGESTED_WEED_INTERVAL_DAYS[weedLevel];

  if (daysSinceLastWeeding >= expectedInterval * 2) return 35;
  if (daysSinceLastWeeding >= expectedInterval) return 25;
  if (daysSinceLastWeeding >= expectedInterval * 0.75) return 15;

  return 0;
}

function getAreaScore(areaM2: number | null): number {
  if (areaM2 === null) return 0;
  if (areaM2 >= 20) return 10;
  if (areaM2 >= 10) return 5;
  return 0;
}

function getEstimatedMinutesScore(estimatedMinutes: number | null): number {
  if (estimatedMinutes === null) return 0;
  if (estimatedMinutes >= 90) return 10;
  if (estimatedMinutes >= 45) return 5;
  return 0;
}

function getMulchDepthScore(mulchDepthCm: number | null): number {
  if (mulchDepthCm === null) return 0;
  if (mulchDepthCm === 0) return 15;
  if (mulchDepthCm < 3) return 10;
  if (mulchDepthCm < 5) return 5;
  return 0;
}

function hasCompletePriorityInputs(bed: GardenBedResponse | GardenBedRow): boolean {
  return (
    bed.area_m2 !== null && bed.last_weeded_at !== null && bed.estimated_minutes !== null && bed.mulch_depth_cm !== null
  );
}

function compareGardenBedQueueItems(a: GardenBedQueueItem, b: GardenBedQueueItem): number {
  return (
    PRIORITY_SEVERITY[b.priority] - PRIORITY_SEVERITY[a.priority] ||
    compareNullableIsoDates(a.suggested_weed_at, b.suggested_weed_at) ||
    WEED_LEVEL_SEVERITY[b.weed_level] - WEED_LEVEL_SEVERITY[a.weed_level] ||
    compareIsoDateTimes(a.created_at, b.created_at)
  );
}

function compareNullableIsoDates(a: string | null, b: string | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a.localeCompare(b);
}

function compareIsoDateTimes(a: string, b: string): number {
  const aTime = Date.parse(a);
  const bTime = Date.parse(b);

  if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
    return a.localeCompare(b);
  }

  return bTime - aTime;
}

function toGardenBedResponseLike(bed: GardenBedResponse | GardenBedRow): GardenBedResponse {
  if ("user_id" in bed) return toGardenBedResponse(bed);
  return bed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isWeedLevel(value: unknown): value is WeedLevel {
  return typeof value === "string" && weedLevelSet.has(value);
}

type NumberCheck = (value: number) => boolean;

type OptionalNumberResult = { success: true; value: number | null } | { success: false; error: string };

function readOptionalNumber(
  source: Record<string, unknown>,
  key: string,
  error: string,
  check: NumberCheck,
): OptionalNumberResult {
  const value = source[key];

  if (value === undefined || value === null) {
    return { success: true, value: null };
  }

  if (typeof value !== "number" || !Number.isFinite(value) || !check(value)) {
    return { success: false, error };
  }

  return { success: true, value };
}

function isPositiveNumber(value: number): boolean {
  return value > 0;
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function isNonNegativeNumber(value: number): boolean {
  return value >= 0;
}

function isValidIsoDate(value: string): boolean {
  return parseIsoDate(value) !== null;
}

function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(Date.UTC(year, month - 1, day));

  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }

  return date;
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfUtcToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
