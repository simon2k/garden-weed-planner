export interface CreateBedPlantInput {
  name: string;
  planted_year?: number | null;
  quantity?: number | null;
  height_cm?: number | null;
  width_cm?: number | null;
}

export interface BedPlantRow {
  id: string;
  bed_id: string;
  user_id: string;
  name: string;
  planted_year: number | null;
  quantity: number | null;
  height_cm: number | null;
  width_cm: number | null;
  created_at: string;
  updated_at: string;
}

export type BedPlantResponse = Omit<BedPlantRow, "user_id">;

export interface BedPlantInsertPayload extends CreateBedPlantInput {
  bed_id: string;
  user_id: string;
}

export type BedPlantValidationResult = { success: true; data: CreateBedPlantInput } | { success: false; error: string };

const MIN_PLANTED_YEAR = 1900;

export function validateCreateBedPlantInput(value: unknown): BedPlantValidationResult {
  if (!isRecord(value)) {
    return { success: false, error: "Plant payload must be an object." };
  }

  const name = value.name;
  if (typeof name !== "string" || name.trim().length === 0) {
    return { success: false, error: "Plant name is required." };
  }

  const plantedYear = readOptionalNumber(
    value,
    "planted_year",
    `Planted year must be an integer from ${MIN_PLANTED_YEAR} through the current year.`,
    isValidPlantedYear,
  );
  if (!plantedYear.success) return plantedYear;

  const quantity = readOptionalNumber(value, "quantity", "Quantity must be a positive integer.", isPositiveInteger);
  if (!quantity.success) return quantity;

  const height = readOptionalNumber(value, "height_cm", "Current height must be a positive number.", isPositiveNumber);
  if (!height.success) return height;

  const width = readOptionalNumber(value, "width_cm", "Current width must be a positive number.", isPositiveNumber);
  if (!width.success) return width;

  return {
    success: true,
    data: {
      name: name.trim(),
      planted_year: plantedYear.value,
      quantity: quantity.value,
      height_cm: height.value,
      width_cm: width.value,
    },
  };
}

export function toBedPlantInsertPayload(
  input: CreateBedPlantInput,
  bedId: string,
  userId: string,
): BedPlantInsertPayload {
  return {
    bed_id: bedId,
    user_id: userId,
    name: input.name,
    planted_year: input.planted_year ?? null,
    quantity: input.quantity ?? null,
    height_cm: input.height_cm ?? null,
    width_cm: input.width_cm ?? null,
  };
}

export function toBedPlantResponse(row: BedPlantRow): BedPlantResponse {
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

function isValidPlantedYear(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_PLANTED_YEAR && value <= new Date().getFullYear();
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function isPositiveNumber(value: number): boolean {
  return value > 0;
}
