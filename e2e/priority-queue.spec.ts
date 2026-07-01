import { expect, test, type Locator, type Page } from "@playwright/test";

const runId = `priority-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const urgentBedName = `E2E urgent bindweed ${runId}`;
const soonBedName = `E2E soon annuals ${runId}`;
const okBedName = `E2E ok herbs ${runId}`;
const smokeBedName = `E2E weeded smoke ${runId}`;
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
      has: page.getByRole("heading", { name: /^E2E (urgent bindweed|soon annuals|ok herbs|weeded smoke) priority-/ }),
    });
    while ((await staleTestBed.count()) > 0) {
      const bed = staleTestBed.first();
      const bedName = ((await bed.getByRole("heading", { level: 3 }).textContent()) ?? "").trim();
      await deleteBed(bed, bedName);
      await expect(
        page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: bedName }) }),
      ).toBeHidden();
    }

    try {
      // Setup: create independent beds whose product-oracle outcome is urgent, soon, and OK.
      await createBed(page, {
        name: okBedName,
        weedLevel: "low",
        area: "4",
        lastWeededAt: okLastWeededDate,
        estimatedMinutes: "10",
        mulchDepth: "6",
      });

      await createBed(page, {
        name: soonBedName,
        weedLevel: "medium",
        area: "8",
        lastWeededAt: soonLastWeededDate,
        estimatedMinutes: "25",
        mulchDepth: "3",
      });

      await createBed(page, {
        name: urgentBedName,
        weedLevel: "high",
        area: "25",
        lastWeededAt: urgentLastWeededDate,
        estimatedMinutes: "120",
        mulchDepth: "1",
      });

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
          await deleteBed(bed, bedName);
          await expect(bed).toBeHidden();
        }
      }
    }
  });

  test("risk #1 smoke: mark-weeded modal closes after saving an event", async ({ page }) => {
    await page.goto("/garden");

    await expect(page.getByRole("heading", { name: "Następne rabaty do pielenia" })).toBeVisible();
    await createBed(page, { name: smokeBedName, weedLevel: "medium" });

    const bed = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: smokeBedName }) });

    try {
      await bed.getByRole("tab", { name: "Historia pielenia" }).click();
      await expect(bed.getByText("Historia pielenia rabaty")).toBeVisible();
      await bed.getByRole("button", { name: "Oznacz rabatę jako wypieloną" }).click();

      const dialog = page.getByRole("dialog", {
        name: new RegExp(`Oznacz rabatę jako wypieloną.*${escapeRegExp(smokeBedName)}`),
      });
      await expect(dialog).toBeVisible();
      await dialog.getByRole("textbox", { name: "Data pielenia" }).fill(today);
      await dialog.getByRole("spinbutton", { name: "Czas w minutach" }).fill("15");
      await dialog.getByRole("button", { name: "Oznacz rabatę jako wypieloną" }).click();

      await expect(dialog).toBeHidden();
      await expect(bed.getByText("Pielenie zapisane — kolejka została odświeżona.")).toBeVisible();
      await expect(bed.getByText(`${formatDisplayDate(today)} · 15 min`)).toBeVisible();
    } finally {
      if ((await bed.count()) > 0) {
        await deleteBed(bed, smokeBedName);
        await expect(bed).toBeHidden();
      }
    }
  });
});

async function createBed(
  page: Page,
  {
    name,
    weedLevel,
    area,
    lastWeededAt,
    estimatedMinutes,
    mulchDepth,
  }: {
    name: string;
    weedLevel: "low" | "medium" | "high";
    area?: string;
    lastWeededAt?: string;
    estimatedMinutes?: string;
    mulchDepth?: string;
  },
) {
  await page.getByRole("button", { name: "Dodaj rabatę" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Dodaj rabatę" });
  await expect(dialog).toBeVisible();

  await dialog.getByRole("combobox", { name: /Poziom zachwaszczenia/ }).selectOption(weedLevel);
  await expect(dialog.getByRole("combobox", { name: /Poziom zachwaszczenia/ })).toHaveValue(weedLevel);
  if (area) await dialog.getByRole("spinbutton", { name: "Powierzchnia (m²)" }).fill(area);
  if (lastWeededAt) await dialog.getByRole("textbox", { name: "Ostatnie pielenie" }).fill(lastWeededAt);
  if (estimatedMinutes) await dialog.getByRole("spinbutton", { name: "Szacowany czas (min)" }).fill(estimatedMinutes);
  if (mulchDepth) await dialog.getByRole("spinbutton", { name: "Grubość ściółki (cm)" }).fill(mulchDepth);

  await dialog.getByRole("textbox", { name: /Nazwa rabaty/ }).pressSequentially(name);
  await expect(dialog.getByRole("textbox", { name: /Nazwa rabaty/ })).toHaveValue(name);
  await dialog.getByRole("button", { name: "Dodaj do kolejki priorytetów" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(`${name} dodana do kolejki.`)).toBeVisible();
}

async function deleteBed(bed: Locator, name: string) {
  await bed.getByRole("button", { name: new RegExp(`Usuń rabatę ${escapeRegExp(name)}`) }).click();
  await expect(
    bed.getByRole("dialog", { name: new RegExp(`Potwierdź usunięcie rabaty ${escapeRegExp(name)}`) }),
  ).toBeVisible();
  await expect(bed.getByText(`Usunąć ${name}?`)).toBeVisible();
  await bed.getByRole("button", { name: "Potwierdź" }).click();
}

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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
