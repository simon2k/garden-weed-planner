import { expect, test, type Locator, type Page } from "@playwright/test";

const runId = `seed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const bedName = `E2E seed rabata ${runId}`;

test.describe("E2E seed conventions", () => {
  test("risk #5: garden UI stays in sync when a bed is added and deleted", async ({ page }) => {
    await page.goto("/garden");

    await expect(page.getByRole("heading", { name: "Następne rabaty do pielenia" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Odśwież" })).toBeEnabled();

    await createBed(page, { name: bedName, weedLevel: "medium" });

    const createdBed = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: bedName }) });
    await expect(createdBed).toBeVisible();
    await expect(createdBed.getByText("Średnie")).toBeVisible();

    await deleteBed(createdBed, bedName);

    await expect(page.getByText(`${bedName} usunięta z kolejki.`)).toBeVisible();
    await expect(createdBed).toBeHidden();
  });
});

async function createBed(page: Page, { name, weedLevel }: { name: string; weedLevel: "low" | "medium" | "high" }) {
  await page.getByRole("button", { name: "Dodaj rabatę" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Dodaj rabatę" });
  await expect(dialog).toBeVisible();

  const bedNameField = dialog.getByRole("textbox", { name: /Nazwa rabaty/ });
  const weedLevelField = dialog.getByRole("combobox", { name: /Poziom zachwaszczenia/ });

  await weedLevelField.selectOption(weedLevel);
  await expect(weedLevelField).toHaveValue(weedLevel);

  await bedNameField.pressSequentially(name);
  await expect(bedNameField).toHaveValue(name);

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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
