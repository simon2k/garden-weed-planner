export interface MarkBedWeededInput {
  weeded_at: string;
  duration_minutes: number;
  note?: string | null;
}

export interface WeedingEventRow {
  id: string;
  bed_id: string;
  user_id: string;
  weeded_at: string;
  duration_minutes: number;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export type WeedingEventResponse = Omit<WeedingEventRow, "user_id">;

export interface WeedingEventInsertPayload extends MarkBedWeededInput {
  bed_id: string;
  user_id: string;
  note: string | null;
}

export type WeedingEventValidationResult =
  | { success: true; data: MarkBedWeededInput }
  | { success: false; error: string };

export function validateMarkBedWeededInput(value: unknown): WeedingEventValidationResult {
  if (!isRecord(value)) {
    return { success: false, error: "Mark-weeding payload must be an object." };
  }

  const weededAt = value.weeded_at;
  if (typeof weededAt !== "string" || !isValidPastOrTodayIsoDate(weededAt)) {
    return { success: false, error: "Weeding date must be a valid YYYY-MM-DD date that is not in the future." };
  }

  const durationMinutes = value.duration_minutes;
  if (typeof durationMinutes !== "number" || !Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    return { success: false, error: "Duration minutes must be a positive integer." };
  }

  const note = readOptionalTrimmedString(value, "note", "Weeding note cannot be empty.");
  if (!note.success) return note;

  return {
    success: true,
    data: {
      weeded_at: weededAt,
      duration_minutes: durationMinutes,
      note: note.value,
    },
  };
}

export function toWeedingEventInsertPayload(
  input: MarkBedWeededInput,
  bedId: string,
  userId: string,
): WeedingEventInsertPayload {
  return {
    bed_id: bedId,
    user_id: userId,
    weeded_at: input.weeded_at,
    duration_minutes: input.duration_minutes,
    note: input.note ?? null,
  };
}

export function toWeedingEventResponse(row: WeedingEventRow): WeedingEventResponse {
  const { user_id: _userId, ...response } = row;
  return response;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type OptionalStringResult = { success: true; value: string | null } | { success: false; error: string };

function readOptionalTrimmedString(source: Record<string, unknown>, key: string, error: string): OptionalStringResult {
  const value = source[key];

  if (value === undefined || value === null) {
    return { success: true, value: null };
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    return { success: false, error };
  }

  return { success: true, value: value.trim() };
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

function startOfUtcToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
