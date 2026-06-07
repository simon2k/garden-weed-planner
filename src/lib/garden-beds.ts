import type { GrowthStage, ObservationCoverage } from "@/lib/weed-observations";

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
  observation_pressure_score: number;
  observation_pressure_label: string;
  observation_count: number;
  observation_reasons: string[];
}

export interface GardenBedPriorityResult {
  priority: BedQueuePriority;
  priority_label: string;
  priority_score: number;
  suggested_weed_at: string | null;
  priority_confidence: PriorityConfidence;
  observation_pressure_score: number;
  observation_pressure_label: string;
  observation_count: number;
  observation_reasons: string[];
}

export interface WeedObservationPriorityInput {
  observed_at: string;
  growth_stage: GrowthStage;
  coverage: ObservationCoverage;
  severity: number;
  spreads_by_rhizomes: boolean;
  spreads_by_stolons: boolean;
  spreads_by_tubers: boolean;
  regrows_from_root_fragments: boolean;
  prolific_seed_producer: boolean;
  fast_regrowth: boolean;
}

export interface GardenBedObservationSummary {
  observation_pressure_score: number;
  observation_pressure_label: string;
  latest_observed_at: string | null;
  observation_count: number;
  observation_reasons: string[];
}

export type GardenBedObservationSummaryMap = ReadonlyMap<string, GardenBedObservationSummary>;

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
const OBSERVATION_DECAY_DAYS = 60;
const MAX_OBSERVATION_PRESSURE_SCORE = 80;
const NO_OBSERVATION_SUMMARY: GardenBedObservationSummary = {
  observation_pressure_score: 0,
  observation_pressure_label: "brak presji z obserwacji",
  latest_observed_at: null,
  observation_count: 0,
  observation_reasons: [],
} as const;

const COVERAGE_SCORE: Record<ObservationCoverage, number> = {
  low: 0,
  medium: 12,
  high: 25,
} as const;

const GROWTH_STAGE_SCORE: Record<GrowthStage, number> = {
  seedling: 0,
  vegetative: 5,
  flowering: 15,
  seeding: 25,
} as const;

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
    if (typeof lastWeededAt !== "string" || !isValidPastOrTodayIsoDate(lastWeededAt)) {
      return { success: false, error: "Last weeded date must be a valid YYYY-MM-DD date that is not in the future." };
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

export function getSuggestedWeedAt(
  lastWeededAt: string | null,
  weedLevel: WeedLevel,
  observationSummary: GardenBedObservationSummary = NO_OBSERVATION_SUMMARY,
): string | null {
  const pressure = observationSummary.observation_pressure_score;
  const adjustedIntervalDays = adjustSuggestedIntervalDays(SUGGESTED_WEED_INTERVAL_DAYS[weedLevel], pressure);

  const candidates: string[] = [];
  if (lastWeededAt) {
    const lastWeededDate = parseIsoDate(lastWeededAt);
    if (lastWeededDate) {
      candidates.push(addDays(lastWeededDate, adjustedIntervalDays));
    }
  }

  const responseWindow = getObservationResponseWindowDays(pressure);
  if (responseWindow !== null && observationSummary.latest_observed_at) {
    const latestObservedDate = parseIsoDate(observationSummary.latest_observed_at);
    if (latestObservedDate) {
      candidates.push(addDays(latestObservedDate, responseWindow));
    }
  }

  if (candidates.length === 0) return null;
  return candidates.sort()[0] ?? null;
}

export function getGardenBedPriority(
  bed: GardenBedResponse | GardenBedRow,
  observationSummary: GardenBedObservationSummary = NO_OBSERVATION_SUMMARY,
): GardenBedPriorityResult {
  const score = calculatePriorityScore(bed, observationSummary);
  const priority = getPriorityFromScore(score);

  return {
    priority,
    priority_label: BED_QUEUE_PRIORITY_LABELS[priority],
    priority_score: score,
    suggested_weed_at: getSuggestedWeedAt(bed.last_weeded_at, bed.weed_level, observationSummary),
    priority_confidence: hasCompletePriorityInputs(bed) ? "complete" : "partial",
    observation_pressure_score: observationSummary.observation_pressure_score,
    observation_pressure_label: observationSummary.observation_pressure_label,
    observation_count: observationSummary.observation_count,
    observation_reasons: observationSummary.observation_reasons,
  };
}

export function toGardenBedQueueItem(
  bed: GardenBedResponse | GardenBedRow,
  observationSummary: GardenBedObservationSummary = NO_OBSERVATION_SUMMARY,
): GardenBedQueueItem {
  return {
    ...toGardenBedResponseLike(bed),
    ...getGardenBedPriority(bed, observationSummary),
  };
}

export function toSortedGardenBedQueue(
  beds: readonly (GardenBedResponse | GardenBedRow)[],
  observationSummaries?: GardenBedObservationSummaryMap,
): GardenBedQueueItem[] {
  return beds
    .map((bed) => toGardenBedQueueItem(bed, observationSummaries?.get(bed.id) ?? NO_OBSERVATION_SUMMARY))
    .sort(compareGardenBedQueueItems);
}

export function summarizeGardenBedObservationPressure(
  observations: readonly WeedObservationPriorityInput[],
): GardenBedObservationSummary {
  const today = startOfUtcToday();
  const recentObservations = observations
    .map((observation) => ({ observation, ageDays: getObservationAgeDays(observation.observed_at, today) }))
    .filter(({ ageDays }) => ageDays !== null && ageDays >= 0 && ageDays <= OBSERVATION_DECAY_DAYS);

  if (recentObservations.length === 0) return NO_OBSERVATION_SUMMARY;

  let maxWeightedScore = 0;
  let latestObservedAt: string | null = null;
  const reasonScores = new Map<string, number>();

  for (const { observation, ageDays } of recentObservations) {
    const rawScore = getRawObservationScore(observation, reasonScores);
    const recencyFactor = Math.max(0, 1 - ageDays / OBSERVATION_DECAY_DAYS);
    maxWeightedScore = Math.max(maxWeightedScore, rawScore * recencyFactor);

    if (latestObservedAt === null || observation.observed_at > latestObservedAt) {
      latestObservedAt = observation.observed_at;
    }
  }

  const repeatPressureBonus = Math.min(15, Math.max(0, recentObservations.length - 1) * 5);
  const pressureScore = Math.min(MAX_OBSERVATION_PRESSURE_SCORE, Math.round(maxWeightedScore + repeatPressureBonus));

  return {
    observation_pressure_score: pressureScore,
    observation_pressure_label: getObservationPressureLabel(pressureScore),
    latest_observed_at: latestObservedAt,
    observation_count: recentObservations.length,
    observation_reasons: getTopObservationReasons(reasonScores, recentObservations.length),
  };
}

function calculatePriorityScore(
  bed: GardenBedResponse | GardenBedRow,
  observationSummary: GardenBedObservationSummary = NO_OBSERVATION_SUMMARY,
): number {
  let score = WEED_LEVEL_SCORE[bed.weed_level];

  score += getElapsedDaysScore(bed.last_weeded_at, bed.weed_level);
  score += getAreaScore(bed.area_m2);
  score += getEstimatedMinutesScore(bed.estimated_minutes);
  score += getMulchDepthScore(bed.mulch_depth_cm);
  score += observationSummary.observation_pressure_score;

  return score;
}

function getRawObservationScore(observation: WeedObservationPriorityInput, reasonScores: Map<string, number>): number {
  let score = observation.severity * 6;

  score += addReasonScore(reasonScores, getCoverageReason(observation.coverage), COVERAGE_SCORE[observation.coverage]);
  score += addReasonScore(
    reasonScores,
    getGrowthStageReason(observation.growth_stage),
    GROWTH_STAGE_SCORE[observation.growth_stage],
  );

  if (observation.spreads_by_rhizomes) {
    score += addReasonScore(reasonScores, "rozłogi lub kłącza", 20);
  }
  if (observation.spreads_by_stolons) {
    score += addReasonScore(reasonScores, "płożące pędy", 20);
  }
  if (observation.spreads_by_tubers) {
    score += addReasonScore(reasonScores, "bulwy lub rozmnóżki", 25);
  }
  if (observation.regrows_from_root_fragments) {
    score += addReasonScore(reasonScores, "odrastanie z korzeni", 20);
  }
  if (observation.prolific_seed_producer) {
    score += addReasonScore(reasonScores, "dużo nasion", 15);
  }
  if (observation.fast_regrowth) {
    score += addReasonScore(reasonScores, "szybki odrost", 15);
  }

  score += addReasonScore(reasonScores, getSeverityReason(observation.severity), observation.severity * 6);

  return score;
}

function addReasonScore(reasonScores: Map<string, number>, reason: string | null, score: number): number {
  if (reason && score > 0) {
    reasonScores.set(reason, (reasonScores.get(reason) ?? 0) + score);
  }
  return score;
}

function getSeverityReason(severity: number): string | null {
  if (severity >= 5) return "bardzo wysokie nasilenie";
  if (severity >= 4) return "wysokie nasilenie";
  return null;
}

function getCoverageReason(coverage: ObservationCoverage): string | null {
  if (coverage === "high") return "wysokie pokrycie";
  if (coverage === "medium") return "średnie pokrycie";
  return null;
}

function getGrowthStageReason(growthStage: GrowthStage): string | null {
  if (growthStage === "seeding") return "rozsiewanie nasion";
  if (growthStage === "flowering") return "kwitnienie";
  if (growthStage === "vegetative") return "aktywny wzrost";
  return null;
}

function getTopObservationReasons(reasonScores: Map<string, number>, observationCount: number): string[] {
  const reasons = [...reasonScores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pl"))
    .slice(0, 4)
    .map(([reason]) => reason);

  if (observationCount > 1) {
    reasons.push("powtarzające się obserwacje");
  }

  return [...new Set(reasons)].slice(0, 4);
}

function getObservationPressureLabel(score: number): string {
  if (score >= 70) return "bardzo wysoka presja z obserwacji";
  if (score >= 50) return "wysoka presja z obserwacji";
  if (score >= 30) return "średnia presja z obserwacji";
  if (score >= 15) return "niska presja z obserwacji";
  return "brak istotnej presji z obserwacji";
}

function adjustSuggestedIntervalDays(baseDays: number, pressure: number): number {
  if (pressure >= 70) return Math.max(1, Math.round(baseDays * 0.35));
  if (pressure >= 50) return Math.max(2, Math.round(baseDays * 0.5));
  if (pressure >= 30) return Math.max(3, Math.round(baseDays * 0.65));
  if (pressure >= 15) return Math.max(5, Math.round(baseDays * 0.8));
  return baseDays;
}

function getObservationResponseWindowDays(pressure: number): number | null {
  if (pressure >= 70) return 1;
  if (pressure >= 50) return 3;
  if (pressure >= 30) return 7;
  if (pressure >= 15) return 14;
  return null;
}

function getObservationAgeDays(observedAt: string, today: Date): number | null {
  const observedDate = parseIsoDate(observedAt);
  if (!observedDate) return null;
  return Math.floor((today.getTime() - observedDate.getTime()) / DAY_MS);
}

function addDays(date: Date, days: number): string {
  const nextDate = new Date(date.getTime());
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return formatIsoDate(nextDate);
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

function isValidPastOrTodayIsoDate(value: string): boolean {
  const date = parseIsoDate(value);
  if (!date) return false;
  return date.getTime() <= startOfUtcToday().getTime();
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
