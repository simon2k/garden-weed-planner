import { expect, test } from "@playwright/test";

const runId = `priority-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const urgentBedName = `E2E urgent bindweed ${runId}`;
const soonBedName = `E2E soon annuals ${runId}`;
const okBedName = `E2E ok herbs ${runId}`;
const today = startOfUtcToday(new Date());
const urgentLastWeededDate = addUtcDays(today, -22);
const urgentSuggestedDate = formatDisplayDate(addUtcDays(today, -15));
const soonLastWeededDate = addUtcDays(today, -13);
const okLastWeededDate = addUtcDays(today, -2);

// Provenance: context/foundation/test-plan.md risk #1
// Seed pattern: e2e/seed.spec.ts — role locators, state waits, unique data, UI cleanup.
test.describe("risk #1: priority queue points the user to the right bed", () => {
  test("risk #1: highest-priority bed appears first with its own suggested next-weeding date", async ({ page }) => {
    await page.goto("/garden");

    await expect(page.getByRole("heading", { name: "Następne rabaty do pielenia" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Odśwież" })).toBeEnabled();

    // Teardown-before-setup: remove stale data from interrupted runs of this spec only.
    const staleTestBed = page.getByRole("listitem").filter({
      has: page.getByRole("heading", { name: /^E2E (urgent bindweed|soon annuals|ok herbs) priority-/ }),
    });
    while ((await staleTestBed.count()) > 0) {
      const bed = staleTestBed.first();
      const bedName = (await bed.getByRole("heading", { level: 3 }).textContent()) ?? "";
      await bed.getByRole("button", { name: "Usuń rabatę" }).click();
      await expect(bed.getByText(`Usunąć ${bedName}?`)).toBeVisible();
      await bed.getByRole("button", { name: "Potwierdź usunięcie" }).click();
      await expect(
        page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: bedName }) }),
      ).toBeHidden();
    }

    try {
      // Setup: create independent beds whose product-oracle outcome is urgent, soon, and OK.
      await page.getByRole("combobox", { name: /Poziom zachwaszczenia/ }).selectOption("low");
      await expect(page.getByRole("combobox", { name: /Poziom zachwaszczenia/ })).toHaveValue("low");
      await page.getByRole("spinbutton", { name: "Powierzchnia (m²)" }).fill("4");
      await page.getByRole("textbox", { name: "Ostatnie pielenie" }).fill(okLastWeededDate);
      await page.getByRole("spinbutton", { name: "Szacowany czas (min)" }).fill("10");
      await page.getByRole("spinbutton", { name: "Grubość ściółki (cm)" }).fill("6");
      await page.getByRole("textbox", { name: /Nazwa rabaty/ }).pressSequentially(okBedName);
      await expect(page.getByRole("textbox", { name: /Nazwa rabaty/ })).toHaveValue(okBedName);
      await page.getByRole("button", { name: "Dodaj do kolejki priorytetów" }).click();
      await expect(page.getByText(`${okBedName} dodana do kolejki.`)).toBeVisible();

      await page.getByRole("combobox", { name: /Poziom zachwaszczenia/ }).selectOption("medium");
      await expect(page.getByRole("combobox", { name: /Poziom zachwaszczenia/ })).toHaveValue("medium");
      await page.getByRole("spinbutton", { name: "Powierzchnia (m²)" }).fill("8");
      await page.getByRole("textbox", { name: "Ostatnie pielenie" }).fill(soonLastWeededDate);
      await page.getByRole("spinbutton", { name: "Szacowany czas (min)" }).fill("25");
      await page.getByRole("spinbutton", { name: "Grubość ściółki (cm)" }).fill("3");
      await page.getByRole("textbox", { name: /Nazwa rabaty/ }).pressSequentially(soonBedName);
      await expect(page.getByRole("textbox", { name: /Nazwa rabaty/ })).toHaveValue(soonBedName);
      await page.getByRole("button", { name: "Dodaj do kolejki priorytetów" }).click();
      await expect(page.getByText(`${soonBedName} dodana do kolejki.`)).toBeVisible();

      await page.getByRole("combobox", { name: /Poziom zachwaszczenia/ }).selectOption("high");
      await expect(page.getByRole("combobox", { name: /Poziom zachwaszczenia/ })).toHaveValue("high");
      await page.getByRole("spinbutton", { name: "Powierzchnia (m²)" }).fill("25");
      await page.getByRole("textbox", { name: "Ostatnie pielenie" }).fill(urgentLastWeededDate);
      await page.getByRole("spinbutton", { name: "Szacowany czas (min)" }).fill("120");
      await page.getByRole("spinbutton", { name: "Grubość ściółki (cm)" }).fill("1");
      await page.getByRole("textbox", { name: /Nazwa rabaty/ }).pressSequentially(urgentBedName);
      await expect(page.getByRole("textbox", { name: /Nazwa rabaty/ })).toHaveValue(urgentBedName);
      await page.getByRole("button", { name: "Dodaj do kolejki priorytetów" }).click();
      await expect(page.getByText(`${urgentBedName} dodana do kolejki.`)).toBeVisible();

      // Assert the business outcome: the queue points the user to the urgent bed first.
      const firstQueueItem = page.getByRole("listitem").first();
      await expect(firstQueueItem.getByRole("heading", { name: urgentBedName })).toBeVisible();
      await expect(firstQueueItem.getByText(`Sugerowane następne pielenie: ${urgentSuggestedDate}`)).toBeVisible();
      await expect(firstQueueItem.getByText("pilne", { exact: true })).toBeVisible();
      await expect(firstQueueItem.getByText("Wynik priorytetu:")).toBeVisible();
    } finally {
      // Cleanup: remove only this test's unique beds through the interface.
      for (const bedName of [urgentBedName, soonBedName, okBedName]) {
        const bed = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: bedName }) });
        if ((await bed.count()) > 0) {
          await bed.getByRole("button", { name: "Usuń rabatę" }).click();
          await expect(bed.getByText(`Usunąć ${bedName}?`)).toBeVisible();
          await bed.getByRole("button", { name: "Potwierdź usunięcie" }).click();
          await expect(bed).toBeHidden();
        }
      }
    }
  });
});

function startOfUtcToday(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDisplayDate(isoDate: string): string {
  return new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${isoDate}T00:00:00Z`),
  );
}
