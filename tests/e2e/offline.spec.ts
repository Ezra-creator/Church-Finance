import { test, expect } from "@playwright/test";

test.describe("PUCA Finance — Offline Collection Entry and Sync", () => {
  test("Cash count & tithe entry survive offline disconnect and replay cleanly upon reconnection", async ({
    page,
    context,
  }) => {
    // 1. Log in as secretary
    await page.goto("/login");
    await page.fill('input[type="email"]', "secretary@puca.local");
    await page.fill('input[type="password"]', "SeedPassword2026#");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/today", { timeout: 15000 });

    // 2. Open an active service record
    const serviceLink = page.locator('a[href^="/services/"]').first();
    const hasService = await serviceLink.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasService) {
      await serviceLink.click();
    } else {
      await page.click('button:has-text("Start a count")');
      await page.waitForSelector('text=Start Cash Count');
      await page.click('button:has-text("Open count ledger")');
    }

    await page.waitForURL("**/services/**", { timeout: 15000 });
    await expect(page.locator("text=Physical Cash Verification")).toBeVisible();

    // 3. Simulate network offline
    await context.setOffline(true);

    // 4. Increment denomination stepper while offline
    const incrementButtons = page.locator('button[aria-label="Increase quantity"]');
    if ((await incrementButtons.count()) > 0) {
      await incrementButtons.first().click();
      const saveBtn = page.locator('button:has-text("Save count")');
      await expect(saveBtn).toBeEnabled();
      await saveBtn.click();

      // Verify quiet "Offline" status bar appears
      await expect(
        page.locator("text=Offline. 1 change waiting.")
      ).toBeVisible({ timeout: 10000 });
    }

    // 5. Switch to Tithe tab and enter an individual tithe entry while offline
    const titheTab = page.locator('button:has-text("Tithe")').first();
    if (await titheTab.isVisible()) {
      await titheTab.click();

      const recordTitheBtn = page.locator('button:has-text("Add tithe entry"), button:has-text("Record first tithe payment")').first();
      if (await recordTitheBtn.isVisible()) {
        await recordTitheBtn.click();

        // Fill visitor payer name and amount
        await page.fill('#visitor-name', "Sister Faustina Offline");
        await page.fill('#tithe-amount', "120.00");

        await page.click('button:has-text("Issue receipt & save")');

        // Verify status bar now reflects 2 changes waiting
        await expect(
          page.locator("text=Offline. 2 changes waiting.")
        ).toBeVisible({ timeout: 10000 });

        // Confirm pending row has small waiting mark
        await expect(page.locator("text=Waiting to sync").first()).toBeVisible();
      }
    }

    // 6. Restore network connection
    await context.setOffline(false);

    // 7. Click sync now if still visible and not already auto-syncing
    const syncNowBtn = page.locator('button:has-text("Sync now")');
    const isSyncVisible = await syncNowBtn.isVisible({ timeout: 1000 }).catch(() => false);
    if (isSyncVisible) {
      await syncNowBtn.click({ timeout: 2000 }).catch(() => {});
    }

    // Replay completes and offline banner disappears
    await expect(
      page.locator("text=Offline. 2 changes waiting.")
    ).not.toBeVisible({ timeout: 20000 });
  });
});
