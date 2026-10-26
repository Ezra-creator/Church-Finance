import { test, expect } from "@playwright/test";

test.describe("PUCA Finance — End-to-End Smoke Test", () => {
  test("5-step secretary workflow: Login -> Count -> MoMo Review -> Reconciliation -> Report Export", async ({
    page,
  }) => {
    page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
    page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));

    // 1. Log in as secretary
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText("PUCA Finance");

    await page.fill('input[type="email"]', "secretary@puca.local");
    await page.fill('input[type="password"]', "SeedPassword2026#");
    await page.click('button[type="submit"]');

    // Should redirect to /today
    await page.waitForURL("**/today", { timeout: 15000 });
    await expect(page.locator("h1")).toContainText("Parish Count Ledger");

    // 2. Open or create a count record
    await page.goto("/today");
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

    // Increment denomination count
    const incrementButtons = page.locator('button[aria-label="Increase quantity"]');
    if ((await incrementButtons.count()) > 0) {
      await incrementButtons.first().click();
      const saveBtn = page.locator('button:has-text("Save count")');
      if (await saveBtn.isEnabled()) {
        await saveBtn.click();
        await expect(page.locator("text=saved")).toBeVisible({ timeout: 10000 });
      }
    }

    // 3. Review unclassified MoMo transactions
    await page.goto("/money/momo");
    await expect(page.locator("h1")).toContainText("MoMo Statements & Register");

    // 4. Weekly reconciliation dashboard
    await page.goto("/reconcile");
    await expect(page.locator("h1")).toContainText("Presbytery Reconciliation Register");

    // 5. Presbytery Report Export (PDF and Word)
    await page.goto("/reports/annual");
    await expect(page.locator("h1")).toContainText("Annual Financial Summary");

    const currentYear = new Date().getUTCFullYear();
    const pdfRes = await page.request.get(`/api/reports/annual/${currentYear}/pdf`);
    expect(pdfRes.status()).toBe(200);

    const docxRes = await page.request.get(`/api/reports/annual/${currentYear}/docx`);
    expect(docxRes.status()).toBe(200);

    // Health monitoring route check
    const healthRes = await page.request.get("/api/health");
    expect(healthRes.status()).toBe(200);
    const healthJson = await healthRes.json();
    expect(healthJson.status).toBe("ok");
    expect(healthJson.database).toBe("connected");
  });
});
