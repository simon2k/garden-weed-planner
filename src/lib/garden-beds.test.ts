import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getGardenBedPriority,
  getSuggestedWeedAt,
  summarizeGardenBedObservationPressure,
  toSortedGardenBedQueue,
  type GardenBedResponse,
  type WeedObservationPriorityInput,
} from "@/lib/garden-beds";

const TODAY = new Date("2026-06-11T12:00:00.000Z");

function bed(overrides: Partial<GardenBedResponse> = {}): GardenBedResponse {
  return {
    id: "bed-1",
    name: "Tomatoes",
    area_m2: 4,
    last_weeded_at: "2026-06-01",
    weed_level: "medium",
    estimated_minutes: 30,
    mulch_depth_cm: 5,
    created_at: "2026-05-01T09:00:00.000Z",
    updated_at: "2026-06-01T09:00:00.000Z",
    ...overrides,
  };
}

function observation(overrides: Partial<WeedObservationPriorityInput> = {}): WeedObservationPriorityInput {
  return {
    observed_at: "2026-06-10",
    growth_stage: "vegetative",
    coverage: "medium",
    severity: 3,
    spreads_by_rhizomes: false,
    spreads_by_stolons: false,
    spreads_by_tubers: false,
    regrows_from_root_fragments: false,
    prolific_seed_producer: false,
    fast_regrowth: false,
    ...overrides,
  };
}

describe("garden bed priority and suggested date oracle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(TODAY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("suggests the next weeding date from the bed's weed level interval", () => {
    expect(getSuggestedWeedAt("2026-06-01", "low")).toBe("2026-06-22");
    expect(getSuggestedWeedAt("2026-06-01", "medium")).toBe("2026-06-15");
    expect(getSuggestedWeedAt("2026-06-01", "high")).toBe("2026-06-08");
  });

  it("moves the suggested date earlier when recent observations show heavy weed pressure", () => {
    const pressure = summarizeGardenBedObservationPressure([
      observation({
        coverage: "high",
        growth_stage: "seeding",
        severity: 5,
        spreads_by_rhizomes: true,
        regrows_from_root_fragments: true,
        prolific_seed_producer: true,
        fast_regrowth: true,
      }),
    ]);

    expect(getSuggestedWeedAt("2026-06-01", "low")).toBe("2026-06-22");
    expect(getSuggestedWeedAt("2026-06-01", "low", pressure)).toBe("2026-06-08");
  });

  it("classifies representative beds as OK, soon, and urgent for the user queue", () => {
    expect(getGardenBedPriority(bed({ weed_level: "low", last_weeded_at: "2026-06-09" })).priority).toBe("ok");
    expect(getGardenBedPriority(bed({ weed_level: "medium", last_weeded_at: "2026-05-28" })).priority).toBe("soon");
    expect(
      getGardenBedPriority(
        bed({ weed_level: "high", last_weeded_at: "2026-05-20", area_m2: 25, estimated_minutes: 120 }),
      ).priority,
    ).toBe("urgent");
  });

  it("sorts urgent beds before soon and OK beds, then uses suggested date and recency as tie-breakers", () => {
    const sorted = toSortedGardenBedQueue([
      bed({ id: "ok", name: "Freshly weeded", weed_level: "low", last_weeded_at: "2026-06-10" }),
      bed({ id: "urgent", name: "Overgrown", weed_level: "high", last_weeded_at: "2026-05-20" }),
      bed({
        id: "soon-newer",
        name: "Newer soon bed",
        weed_level: "medium",
        last_weeded_at: "2026-05-28",
        created_at: "2026-05-03T09:00:00.000Z",
      }),
      bed({
        id: "soon-older",
        name: "Older soon bed",
        weed_level: "medium",
        last_weeded_at: "2026-05-28",
        created_at: "2026-05-02T09:00:00.000Z",
      }),
    ]);

    expect(sorted.map((item) => item.id)).toEqual(["urgent", "soon-newer", "soon-older", "ok"]);
  });

  it("summarizes observation pressure from recency, severity, coverage, growth, and risky traits", () => {
    const summary = summarizeGardenBedObservationPressure([
      observation({
        observed_at: "2026-06-10",
        severity: 5,
        coverage: "high",
        growth_stage: "seeding",
        prolific_seed_producer: true,
      }),
      observation({
        observed_at: "2026-06-08",
        severity: 4,
        coverage: "medium",
        growth_stage: "flowering",
        spreads_by_stolons: true,
      }),
      observation({ observed_at: "2026-02-01", severity: 5, coverage: "high", growth_stage: "seeding" }),
    ]);

    expect(summary.observation_count).toBe(2);
    expect(summary.latest_observed_at).toBe("2026-06-10");
    expect(summary.observation_pressure_label).toBe("bardzo wysoka presja z obserwacji");
    expect(summary.observation_reasons).toEqual(expect.arrayContaining(["wysokie pokrycie", "rozsiewanie nasion"]));
  });

  it("surfaces repeat observations when repeated low-signal sightings are the main pressure", () => {
    const summary = summarizeGardenBedObservationPressure([
      observation({ observed_at: "2026-06-10", severity: 2, coverage: "low", growth_stage: "seedling" }),
      observation({ observed_at: "2026-06-09", severity: 2, coverage: "low", growth_stage: "seedling" }),
    ]);

    expect(summary.observation_count).toBe(2);
    expect(summary.observation_reasons).toContain("powtarzające się obserwacje");
  });

  it("marks priority confidence as partial when core planning inputs are missing", () => {
    const priority = getGardenBedPriority(
      bed({ area_m2: null, last_weeded_at: null, estimated_minutes: null, mulch_depth_cm: null }),
    );

    expect(priority.priority_confidence).toBe("partial");
    expect(priority.suggested_weed_at).toBeNull();
  });
});
