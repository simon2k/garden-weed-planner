import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { validateCreateWeedObservationInput } from "@/lib/weed-observations";

const TODAY = new Date("2026-06-11T12:00:00.000Z");

function validObservation(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    observed_at: "2026-06-10",
    weed_category: "creeping_perennial",
    growth_stage: "vegetative",
    coverage: "medium",
    severity: 3,
    weed_catalog_slug: " perz-wlasciwy ",
    weed_name: " perz właściwy ",
    note: " near the fence ",
    spreads_by_rhizomes: true,
    spreads_by_stolons: false,
    spreads_by_tubers: false,
    regrows_from_root_fragments: true,
    prolific_seed_producer: false,
    fast_regrowth: true,
    ...overrides,
  };
}

describe("weed observation validation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(TODAY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts valid past and today observation dates", () => {
    expect(validateCreateWeedObservationInput(validObservation({ observed_at: "2026-06-10" })).success).toBe(true);
    expect(validateCreateWeedObservationInput(validObservation({ observed_at: "2026-06-11" })).success).toBe(true);
  });

  it("rejects a future observation date", () => {
    const result = validateCreateWeedObservationInput(validObservation({ observed_at: "2026-06-12" }));

    expect(result).toEqual({
      success: false,
      error: "Data obserwacji musi być poprawną datą RRRR-MM-DD, dzisiejszą albo z przeszłości.",
    });
  });

  it.each([
    ["weed_category", "unsupported", "Wybierz obsługiwaną kategorię chwastu."],
    ["growth_stage", "sprouting", "Wybierz obsługiwaną fazę wzrostu."],
    ["coverage", "dense", "Pokrycie musi mieć wartość: małe, średnie albo duże."],
  ])("rejects invalid %s values", (field, value, error) => {
    expect(validateCreateWeedObservationInput(validObservation({ [field]: value }))).toEqual({ success: false, error });
  });

  it.each([0, 6, 2.5, "5"])("rejects invalid severity %s", (severity) => {
    expect(validateCreateWeedObservationInput(validObservation({ severity }))).toEqual({
      success: false,
      error: "Nasilenie musi być liczbą całkowitą od 1 do 5.",
    });
  });

  it("trims optional text fields when present", () => {
    const result = validateCreateWeedObservationInput(validObservation());

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.weed_catalog_slug).toBe("perz-wlasciwy");
    expect(result.data.weed_name).toBe("perz właściwy");
    expect(result.data.note).toBe("near the fence");
  });

  it("rejects blank optional text because blank notes would mislead the observation history", () => {
    expect(validateCreateWeedObservationInput(validObservation({ note: "   " }))).toEqual({
      success: false,
      error: "Notatka obserwacji nie może być pusta.",
    });
  });
});
