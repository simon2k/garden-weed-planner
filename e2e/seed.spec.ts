import { expect, test } from "@playwright/test";

const runId = `seed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const bedName = `E2E seed rabata ${runId}`;

test.describe("E2E seed conventions", () => {
  test("risk #5: garden UI stays in sync when a bed is added and deleted", async ({ page }) => {
    await page.goto("/garden");

    await expect(page.getByRole("heading", { name: "Priority bed queue" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Next beds to weed" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Refresh" })).toBeEnabled();

    const bedNameField = page.getByRole("textbox", { name: /Bed name/ });
    const weedLevelField = page.getByRole("combobox", { name: /Weed level/ });

    await weedLevelField.selectOption("medium");
    await expect(weedLevelField).toHaveValue("medium");

    await bedNameField.pressSequentially(bedName);
    await expect(bedNameField).toHaveValue(bedName);

    await page.getByRole("button", { name: "Add to priority queue" }).click();
    await expect(page.getByText(`${bedName} added to the queue.`)).toBeVisible();

    const createdBed = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: bedName }) });
    await expect(createdBed).toBeVisible();
    await expect(createdBed.getByText("Medium")).toBeVisible();

    await createdBed.getByRole("button", { name: "Delete bed" }).click();
    await expect(createdBed.getByText(`Delete ${bedName}?`)).toBeVisible();
    await createdBed.getByRole("button", { name: "Confirm delete" }).click();

    await expect(page.getByText(`${bedName} deleted from the queue.`)).toBeVisible();
    await expect(createdBed).toBeHidden();
  });
});
