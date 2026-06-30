import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { validateMarkBedWeededInput } from "@/lib/weeding-events";

const TODAY = new Date("2026-06-11T12:00:00.000Z");

function validEvent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    weeded_at: "2026-06-10",
    duration_minutes: 30,
    note: " cleared seedlings ",
    ...overrides,
  };
}

describe("mark bed weeded validation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(TODAY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts today and past weeding dates", () => {
    expect(validateMarkBedWeededInput(validEvent({ weeded_at: "2026-06-11" })).success).toBe(true);
    expect(validateMarkBedWeededInput(validEvent({ weeded_at: "2026-06-01" })).success).toBe(true);
  });

  it("rejects future weeding dates", () => {
    expect(validateMarkBedWeededInput(validEvent({ weeded_at: "2026-06-12" }))).toEqual({
      success: false,
      error: "Data pielenia musi być poprawną datą RRRR-MM-DD, dzisiejszą albo z przeszłości.",
    });
  });

  it.each(["2026-02-30", "06/10/2026", "yesterday"])("rejects invalid date format %s", (weededAt) => {
    expect(validateMarkBedWeededInput(validEvent({ weeded_at: weededAt }))).toEqual({
      success: false,
      error: "Data pielenia musi być poprawną datą RRRR-MM-DD, dzisiejszą albo z przeszłości.",
    });
  });

  it.each([0, -5, 1.5, "30"])("rejects non-positive or non-integer duration %s", (durationMinutes) => {
    expect(validateMarkBedWeededInput(validEvent({ duration_minutes: durationMinutes }))).toEqual({
      success: false,
      error: "Czas pielenia musi być dodatnią liczbą całkowitą.",
    });
  });

  it("trims an optional note before storing it", () => {
    const result = validateMarkBedWeededInput(validEvent());

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.note).toBe("cleared seedlings");
  });

  it("rejects blank notes so the event history is not padded with empty text", () => {
    expect(validateMarkBedWeededInput(validEvent({ note: "   " }))).toEqual({
      success: false,
      error: "Notatka z pielenia nie może być pusta.",
    });
  });
});
