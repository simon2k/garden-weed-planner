export const WEED_LEVELS = ["low", "medium", "high"] as const;

export type WeedLevel = (typeof WEED_LEVELS)[number];

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

export interface GardenBedInsertPayload extends CreateGardenBedInput {
  user_id: string;
}

export type GardenBedValidationResult =
  | { success: true; data: CreateGardenBedInput }
  | { success: false; error: string };

const weedLevelSet = new Set<string>(WEED_LEVELS);

export function validateCreateGardenBedInput(value: unknown): GardenBedValidationResult {
  if (!isRecord(value)) {
    return { success: false, error: "Garden bed payload must be an object." };
  }

  const name = value.name;
  if (typeof name !== "string" || name.trim().length === 0) {
    return { success: false, error: "Garden bed name is required." };
  }

  const weedLevel = value.weed_level;
  if (typeof weedLevel !== "string" || !weedLevelSet.has(weedLevel)) {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
