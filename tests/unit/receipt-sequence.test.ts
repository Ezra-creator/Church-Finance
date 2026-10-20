import { describe, it, expect } from "vitest";

describe("Receipt Number Sequencing", () => {
  function formatReceiptNumber(year: number, sequence: number): string {
    return `R-${year}-${String(sequence).padStart(4, "0")}`;
  }

  it("formats receipt number with 4-digit zero padding", () => {
    expect(formatReceiptNumber(2026, 1)).toBe("R-2026-0001");
    expect(formatReceiptNumber(2026, 42)).toBe("R-2026-0042");
    expect(formatReceiptNumber(2026, 999)).toBe("R-2026-0999");
    expect(formatReceiptNumber(2026, 1000)).toBe("R-2026-1000");
  });

  it("simulates atomic increment under concurrent receipt requests", async () => {
    // Model the atomic sequence generator using a simulated mutex / lock queue
    let currentLast = 0;
    let isLocked = false;
    const lockQueue: Array<() => void> = [];

    async function acquireLock() {
      if (isLocked) {
        await new Promise<void>((resolve) => lockQueue.push(resolve));
      }
      isLocked = true;
    }

    function releaseLock() {
      isLocked = false;
      const next = lockQueue.shift();
      if (next) next();
    }

    async function getNextReceiptNumber(year: number): Promise<string> {
      await acquireLock();
      try {
        currentLast += 1;
        return formatReceiptNumber(year, currentLast);
      } finally {
        releaseLock();
      }
    }

    // Launch 25 concurrent requests
    const promises = Array.from({ length: 25 }, () =>
      getNextReceiptNumber(2026)
    );

    const results = await Promise.all(promises);

    // Verify all 25 receipt numbers are unique
    const uniqueReceipts = new Set(results);
    expect(uniqueReceipts.size).toBe(25);

    // Verify no sequence skips (from 0001 through 0025)
    for (let i = 1; i <= 25; i++) {
      expect(results).toContain(`R-2026-${String(i).padStart(4, "0")}`);
    }
  });
});
