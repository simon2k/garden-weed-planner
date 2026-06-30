import { expect, test } from "@playwright/test";

const runId = `seed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const bedName = `E2E seed rabata ${runId}`;

test.describe("E2E seed conventions", () => {
  test("risk #5: garden UI stays in sync when a bed is added and deleted", async ({ page }) => {
    await page.goto("/garden");

    await expect(page.getByRole("heading", { name: "Następne rabaty do pielenia" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Odśwież" })).toBeEnabled();

    const bedNameField = page.getByRole("textbox", { name: /Nazwa rabaty/ });
    const weedLevelField = page.getByRole("combobox", { name: /Poziom zachwaszczenia/ });

    await weedLevelField.selectOption("medium");
    await expect(weedLevelField).toHaveValue("medium");

    await bedNameField.pressSequentially(bedName);
    await expect(bedNameField).toHaveValue(bedName);

    await page.getByRole("button", { name: "Dodaj do kolejki priorytetów" }).click();
    await expect(page.getByText(`${bedName} dodana do kolejki.`)).toBeVisible();

    const createdBed = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: bedName }) });
    await expect(createdBed).toBeVisible();
    await expect(createdBed.getByText("Średnie")).toBeVisible();

    await createdBed.getByRole("button", { name: "Usuń rabatę" }).click();
    await expect(createdBed.getByText(`Usunąć ${bedName}?`)).toBeVisible();
    await createdBed.getByRole("button", { name: "Potwierdź usunięcie" }).click();

    await expect(page.getByText(`${bedName} usunięta z kolejki.`)).toBeVisible();
    await expect(createdBed).toBeHidden();
  });
});
