export const WEED_CATEGORIES = [
  "annual_seed",
  "creeping_perennial",
  "tuber_or_bulb",
  "deep_root_perennial",
  "unknown",
] as const;

export type WeedCategory = (typeof WEED_CATEGORIES)[number];

export const GROWTH_STAGES = ["seedling", "vegetative", "flowering", "seeding"] as const;

export type GrowthStage = (typeof GROWTH_STAGES)[number];

export const OBSERVATION_COVERAGES = ["low", "medium", "high"] as const;

export type ObservationCoverage = (typeof OBSERVATION_COVERAGES)[number];

export const WEED_RISK_TRAITS = [
  "spreads_by_rhizomes",
  "spreads_by_stolons",
  "spreads_by_tubers",
  "regrows_from_root_fragments",
  "prolific_seed_producer",
  "fast_regrowth",
] as const;

export type WeedRiskTrait = (typeof WEED_RISK_TRAITS)[number];

export const WEED_CATEGORY_LABELS: Record<WeedCategory, string> = {
  annual_seed: "jednoroczny, dużo nasion",
  creeping_perennial: "wieloletni płożący / kłączowy",
  tuber_or_bulb: "bulwy, cebule lub rozmnóżki",
  deep_root_perennial: "wieloletni z głębokim korzeniem",
  unknown: "nie wiem / inny",
} as const;

export const GROWTH_STAGE_LABELS: Record<GrowthStage, string> = {
  seedling: "siewka / bardzo młody",
  vegetative: "liście i rozrost",
  flowering: "kwitnie",
  seeding: "zawiązuje lub rozsiewa nasiona",
} as const;

export const OBSERVATION_COVERAGE_LABELS: Record<ObservationCoverage, string> = {
  low: "mało — pojedyncze sztuki",
  medium: "średnio — widoczne skupiska",
  high: "dużo — mocno zajmuje rabatę",
} as const;

export const WEED_RISK_TRAIT_LABELS: Record<WeedRiskTrait, string> = {
  spreads_by_rhizomes: "rozłogi lub kłącza",
  spreads_by_stolons: "pędy płożące szybko się ukorzeniają",
  spreads_by_tubers: "bulwy, cebulki lub rozmnóżki",
  regrows_from_root_fragments: "odrasta z fragmentów korzeni",
  prolific_seed_producer: "wytwarza bardzo dużo nasion",
  fast_regrowth: "szybko odrasta po wyrwaniu lub koszeniu",
} as const;

export interface CreateWeedObservationInput {
  observed_at: string;
  weed_category: WeedCategory;
  growth_stage: GrowthStage;
  coverage: ObservationCoverage;
  severity: number;
  weed_catalog_slug?: string | null;
  weed_name?: string | null;
  spreads_by_rhizomes?: boolean;
  spreads_by_stolons?: boolean;
  spreads_by_tubers?: boolean;
  regrows_from_root_fragments?: boolean;
  prolific_seed_producer?: boolean;
  fast_regrowth?: boolean;
  note?: string | null;
}

export interface WeedObservationRow {
  id: string;
  bed_id: string;
  user_id: string;
  observed_at: string;
  weed_catalog_slug: string | null;
  weed_name: string | null;
  weed_category: WeedCategory;
  growth_stage: GrowthStage;
  coverage: ObservationCoverage;
  severity: number;
  spreads_by_rhizomes: boolean;
  spreads_by_stolons: boolean;
  spreads_by_tubers: boolean;
  regrows_from_root_fragments: boolean;
  prolific_seed_producer: boolean;
  fast_regrowth: boolean;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export type WeedObservationResponse = Omit<WeedObservationRow, "user_id">;

export interface WeedObservationInsertPayload extends CreateWeedObservationInput {
  bed_id: string;
  user_id: string;
  weed_catalog_slug: string | null;
  weed_name: string | null;
  note: string | null;
  spreads_by_rhizomes: boolean;
  spreads_by_stolons: boolean;
  spreads_by_tubers: boolean;
  regrows_from_root_fragments: boolean;
  prolific_seed_producer: boolean;
  fast_regrowth: boolean;
}

export interface PolishWeedCatalogEntry {
  slug: string;
  name: string;
  category: WeedCategory;
  default_risk_traits: readonly WeedRiskTrait[];
  helper_text: string;
}

export const POLISH_WEED_CATALOG = [
  {
    slug: "perz-wlasciwy",
    name: "perz właściwy",
    category: "creeping_perennial",
    default_risk_traits: ["spreads_by_rhizomes", "regrows_from_root_fragments", "fast_regrowth"],
    helper_text: "Kłączowy chwast, który łatwo odrasta z pozostawionych fragmentów.",
  },
  {
    slug: "powoj-polny",
    name: "powój polny",
    category: "creeping_perennial",
    default_risk_traits: ["spreads_by_rhizomes", "regrows_from_root_fragments", "fast_regrowth"],
    helper_text: "Silnie płożący chwast z głębokimi korzeniami, szybko wraca po przerwaniu.",
  },
  {
    slug: "podagrycznik-pospolity",
    name: "podagrycznik pospolity",
    category: "creeping_perennial",
    default_risk_traits: ["spreads_by_rhizomes", "regrows_from_root_fragments", "fast_regrowth"],
    helper_text: "Tworzy podziemne rozłogi i szybko zagęszcza zaniedbane miejsca.",
  },
  {
    slug: "mniszek-lekarski",
    name: "mniszek lekarski",
    category: "deep_root_perennial",
    default_risk_traits: ["regrows_from_root_fragments", "prolific_seed_producer"],
    helper_text: "Głęboki korzeń i lekkie nasiona sprawiają, że warto reagować przed rozsiewem.",
  },
  {
    slug: "pokrzywa-zwyczajna",
    name: "pokrzywa zwyczajna",
    category: "creeping_perennial",
    default_risk_traits: ["spreads_by_rhizomes", "fast_regrowth"],
    helper_text: "Wieloletnia, rozrasta się kłączami i szybko odzyskuje masę liści.",
  },
  {
    slug: "komosa-biala",
    name: "komosa biała",
    category: "annual_seed",
    default_risk_traits: ["prolific_seed_producer", "fast_regrowth"],
    helper_text: "Jednoroczna, bardzo nasienna; najważniejsze jest usunięcie przed rozsiewem.",
  },
  {
    slug: "gwiazdnica-pospolita",
    name: "gwiazdnica pospolita",
    category: "annual_seed",
    default_risk_traits: ["spreads_by_stolons", "prolific_seed_producer", "fast_regrowth"],
    helper_text: "Niska i szybka, potrafi kwitnąć wcześnie oraz ukorzeniać płożące pędy.",
  },
  {
    slug: "skrzyp-polny",
    name: "skrzyp polny",
    category: "deep_root_perennial",
    default_risk_traits: ["spreads_by_rhizomes", "regrows_from_root_fragments", "fast_regrowth"],
    helper_text: "Trwały chwast z głębokimi kłączami; sygnalizuje długą presję w rabacie.",
  },
  {
    slug: "ostrozen-polny",
    name: "ostrożeń polny",
    category: "creeping_perennial",
    default_risk_traits: ["spreads_by_rhizomes", "regrows_from_root_fragments", "prolific_seed_producer"],
    helper_text: "Rozrasta się korzeniami i nasionami, więc kwitnienie mocno podnosi pilność.",
  },
  {
    slug: "rdest",
    name: "rdest",
    category: "annual_seed",
    default_risk_traits: ["prolific_seed_producer", "fast_regrowth"],
    helper_text: "Szybki chwast jednoroczny; wysoka presja szczególnie przy kwitnieniu i nasionach.",
  },
  {
    slug: "babka",
    name: "babka",
    category: "deep_root_perennial",
    default_risk_traits: ["regrows_from_root_fragments", "prolific_seed_producer"],
    helper_text: "Rozeta z mocnym korzeniem; warto usuwać zanim wypuści pędy nasienne.",
  },
  {
    slug: "tasznik-pospolity",
    name: "tasznik pospolity",
    category: "annual_seed",
    default_risk_traits: ["prolific_seed_producer"],
    helper_text: "Jednoroczny i nasienny, często szybko kończy cykl od siewki do nasion.",
  },
  {
    slug: "zoltllica-drobnokwiatowa",
    name: "żółtlica drobnokwiatowa",
    category: "annual_seed",
    default_risk_traits: ["prolific_seed_producer", "fast_regrowth"],
    helper_text: "Szybko rośnie i rozsiewa się w sezonie, szczególnie w luźnej glebie.",
  },
  {
    slug: "chwastnica-jednostronna",
    name: "chwastnica jednostronna",
    category: "annual_seed",
    default_risk_traits: ["prolific_seed_producer", "fast_regrowth"],
    helper_text: "Trawiasty chwast jednoroczny; duże kępy szybko konkurują z uprawami.",
  },
  {
    slug: "jasnota",
    name: "jasnota",
    category: "annual_seed",
    default_risk_traits: ["prolific_seed_producer"],
    helper_text: "Częsty chwast nasienny; obserwuj fazę kwitnienia i zagęszczenie.",
  },
  {
    slug: "przytulia-czepna",
    name: "przytulia czepna",
    category: "annual_seed",
    default_risk_traits: ["prolific_seed_producer", "fast_regrowth"],
    helper_text: "Czepia się roślin i szybko zagęszcza, dlatego wysoka pokrywa zwiększa pilność.",
  },
  {
    slug: "krwawnik-pospolity",
    name: "krwawnik pospolity",
    category: "creeping_perennial",
    default_risk_traits: ["spreads_by_rhizomes", "fast_regrowth"],
    helper_text: "Wieloletni i rozłogowy; w rabacie może tworzyć trwałe place.",
  },
  {
    slug: "koniczyna",
    name: "koniczyna",
    category: "creeping_perennial",
    default_risk_traits: ["spreads_by_stolons", "fast_regrowth"],
    helper_text: "Płożące pędy łatwo zajmują wolne miejsca między roślinami.",
  },
  {
    slug: "podbial-pospolity",
    name: "podbiał pospolity",
    category: "deep_root_perennial",
    default_risk_traits: ["spreads_by_rhizomes", "regrows_from_root_fragments", "fast_regrowth"],
    helper_text: "Trwały chwast z podziemnymi rozłogami, trudny przy płytkim pieleniu.",
  },
  {
    slug: "turzyca-nutsedge",
    name: "turzyca / chwast bulwkowy podobny do nutsedge",
    category: "tuber_or_bulb",
    default_risk_traits: ["spreads_by_tubers", "spreads_by_rhizomes", "fast_regrowth"],
    helper_text: "Fallback dla chwastów tworzących bulwki lub rozmnóżki — traktuj jako wysokie ryzyko.",
  },
  {
    slug: "bluszczyk-kurdybanek",
    name: "bluszczyk kurdybanek",
    category: "creeping_perennial",
    default_risk_traits: ["spreads_by_stolons", "fast_regrowth"],
    helper_text: "Płożący chwast, który szybko ukorzenia pędy i zarasta brzegi rabaty.",
  },
  {
    slug: "inny-nie-wiem",
    name: "inny / nie wiem",
    category: "unknown",
    default_risk_traits: [],
    helper_text: "Wybierz, gdy nie rozpoznajesz chwastu; nasilenie i pokrycie nadal wpłyną na priorytet.",
  },
] as const satisfies readonly PolishWeedCatalogEntry[];

export type WeedObservationValidationResult =
  | { success: true; data: CreateWeedObservationInput }
  | { success: false; error: string };

const weedCategorySet = new Set<string>(WEED_CATEGORIES);
const growthStageSet = new Set<string>(GROWTH_STAGES);
const coverageSet = new Set<string>(OBSERVATION_COVERAGES);

export function validateCreateWeedObservationInput(value: unknown): WeedObservationValidationResult {
  if (!isRecord(value)) {
    return { success: false, error: "Dane obserwacji chwastu muszą być obiektem." };
  }

  const observedAt = value.observed_at;
  if (typeof observedAt !== "string" || !isValidPastOrTodayIsoDate(observedAt)) {
    return {
      success: false,
      error: "Data obserwacji musi być poprawną datą RRRR-MM-DD, dzisiejszą albo z przeszłości.",
    };
  }

  const weedCategory = value.weed_category;
  if (!isWeedCategory(weedCategory)) {
    return { success: false, error: "Wybierz obsługiwaną kategorię chwastu." };
  }

  const growthStage = value.growth_stage;
  if (!isGrowthStage(growthStage)) {
    return { success: false, error: "Wybierz obsługiwaną fazę wzrostu." };
  }

  const coverage = value.coverage;
  if (!isObservationCoverage(coverage)) {
    return { success: false, error: "Pokrycie musi mieć wartość: małe, średnie albo duże." };
  }

  const severity = value.severity;
  if (typeof severity !== "number" || !Number.isInteger(severity) || severity < 1 || severity > 5) {
    return { success: false, error: "Nasilenie musi być liczbą całkowitą od 1 do 5." };
  }

  const weedCatalogSlug = readOptionalTrimmedString(
    value,
    "weed_catalog_slug",
    "Identyfikator chwastu z katalogu nie może być pusty.",
  );
  if (!weedCatalogSlug.success) return weedCatalogSlug;

  const weedName = readOptionalTrimmedString(value, "weed_name", "Nazwa chwastu nie może być pusta.");
  if (!weedName.success) return weedName;

  const note = readOptionalTrimmedString(value, "note", "Notatka obserwacji nie może być pusta.");
  if (!note.success) return note;

  const traits = readRiskTraits(value);
  if (!traits.success) return traits;

  return {
    success: true,
    data: {
      observed_at: observedAt,
      weed_category: weedCategory,
      growth_stage: growthStage,
      coverage,
      severity,
      weed_catalog_slug: weedCatalogSlug.value,
      weed_name: weedName.value,
      note: note.value,
      ...traits.value,
    },
  };
}

export function toWeedObservationInsertPayload(
  input: CreateWeedObservationInput,
  bedId: string,
  userId: string,
): WeedObservationInsertPayload {
  return {
    bed_id: bedId,
    user_id: userId,
    observed_at: input.observed_at,
    weed_catalog_slug: input.weed_catalog_slug ?? null,
    weed_name: input.weed_name ?? null,
    weed_category: input.weed_category,
    growth_stage: input.growth_stage,
    coverage: input.coverage,
    severity: input.severity,
    spreads_by_rhizomes: input.spreads_by_rhizomes ?? false,
    spreads_by_stolons: input.spreads_by_stolons ?? false,
    spreads_by_tubers: input.spreads_by_tubers ?? false,
    regrows_from_root_fragments: input.regrows_from_root_fragments ?? false,
    prolific_seed_producer: input.prolific_seed_producer ?? false,
    fast_regrowth: input.fast_regrowth ?? false,
    note: input.note ?? null,
  };
}

export function toWeedObservationResponse(row: WeedObservationRow): WeedObservationResponse {
  const { user_id: _userId, ...response } = row;
  return response;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isWeedCategory(value: unknown): value is WeedCategory {
  return typeof value === "string" && weedCategorySet.has(value);
}

function isGrowthStage(value: unknown): value is GrowthStage {
  return typeof value === "string" && growthStageSet.has(value);
}

function isObservationCoverage(value: unknown): value is ObservationCoverage {
  return typeof value === "string" && coverageSet.has(value);
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

type RiskTraitReadResult = { success: true; value: Record<WeedRiskTrait, boolean> } | { success: false; error: string };

function readRiskTraits(source: Record<string, unknown>): RiskTraitReadResult {
  const value = Object.fromEntries(WEED_RISK_TRAITS.map((trait) => [trait, false])) as Record<WeedRiskTrait, boolean>;

  for (const trait of WEED_RISK_TRAITS) {
    const raw = source[trait];
    if (raw === undefined || raw === null) continue;
    if (typeof raw !== "boolean") {
      return { success: false, error: `${WEED_RISK_TRAIT_LABELS[trait]} musi mieć wartość prawda albo fałsz.` };
    }
    value[trait] = raw;
  }

  return { success: true, value };
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
