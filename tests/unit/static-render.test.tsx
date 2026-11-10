import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Role } from "@prisma/client";
import { getNavItemsForRole } from "@/lib/nav-config";
import { Sidebar, BottomNav } from "@/components/layout/nav";
import { Badge } from "@/components/ui/badge";
import { formatMoney, toDecimal, Decimal } from "@/lib/money";
import { plural } from "@/lib/plural";
import { DataTable } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { Sheet } from "@/components/ui/sheet";

describe("Section 7: Static-render tests (react-dom/server)", () => {
  describe("1. Navigation per role", () => {
    it("Admin / Finance Secretary gets all core operational items", () => {
      const items = getNavItemsForRole(Role.FINANCE_SECRETARY);
      const labels = items.map((i) => i.label);
      expect(labels).toContain("Home");
      expect(labels).toContain("Collections");
      expect(labels).toContain("Mobile money");
      expect(labels).toContain("Reports");
      expect(labels).toContain("Members");
      expect(labels).toContain("Settings");
    });

    it("Reviewer (PRESBYTERY_VIEWER) receives Reports only", () => {
      const items = getNavItemsForRole(Role.PRESBYTERY_VIEWER);
      expect(items.length).toBe(1);
      expect(items[0].label).toBe("Reports");
      expect(items[0].href).toBe("/reconcile");
    });

    it("Sidebar markup for Reviewer excludes operational links", () => {
      const reviewerUser = {
        id: "usr_rev",
        name: "Presbytery Auditor",
        email: "auditor@presbytery.org",
        role: Role.PRESBYTERY_VIEWER,
      };

      const html = renderToStaticMarkup(
        <Sidebar user={reviewerUser} churchName="Test Congregation" />
      );

      expect(html).toContain("Reports");
      expect(html).not.toContain("Collections");
      expect(html).not.toContain("Mobile money");
      expect(html).not.toContain("Settings");
      expect(html).toContain("w-[232px]");
    });
  });

  describe("2. Shell layout and responsiveness", () => {
    it("Renders desktop sidebar (w-[232px]) and mobile bottom bar (lg:hidden)", () => {
      const user = {
        id: "usr_sec",
        name: "Secretary",
        email: "sec@church.org",
        role: Role.FINANCE_SECRETARY,
      };

      const sidebarHtml = renderToStaticMarkup(
        <Sidebar user={user} churchName="Test Congregation" />
      );
      expect(sidebarHtml).toContain("hidden lg:flex");
      expect(sidebarHtml).toContain("w-[232px]");

      const bottomHtml = renderToStaticMarkup(
        <BottomNav user={user} isFocusedFlow={false} />
      );
      expect(bottomHtml).toContain("lg:hidden");
      expect(bottomHtml).toContain("Home");
      expect(bottomHtml).toContain("Collections");
      expect(bottomHtml).toContain("Mobile money");
      expect(bottomHtml).toContain("Reports");
      expect(bottomHtml).toContain("More");
    });

    it("BottomNav is completely hidden during focused flows", () => {
      const user = {
        id: "usr_sec",
        name: "Secretary",
        email: "sec@church.org",
        role: Role.FINANCE_SECRETARY,
      };

      const html = renderToStaticMarkup(
        <BottomNav user={user} isFocusedFlow={true} />
      );
      expect(html).toBe("");
    });
  });

  describe("3. Badge variants and copy", () => {
    it("renders Balanced badge with check icon", () => {
      const html = renderToStaticMarkup(<Badge variant="Balanced" />);
      expect(html).toContain("Balanced");
      expect(html).toContain("bg-ok-tint");
      expect(html).toContain("text-ok-ink");
      expect(html).toContain("svg");
    });

    it("renders Mismatch short by formatted money with triangle icon", () => {
      const html = renderToStaticMarkup(
        <Badge variant="Mismatch" difference="-50" />
      );
      expect(html).toContain("Short by GH₵ 50.00");
      expect(html).toContain("bg-bad-tint");
      expect(html).toContain("text-bad-ink");
      expect(html).toContain("svg");
    });

    it("renders Mismatch over by formatted money with triangle icon", () => {
      const html = renderToStaticMarkup(
        <Badge variant="Mismatch" difference="125.50" />
      );
      expect(html).toContain("Over by GH₵ 125.50");
      expect(html).toContain("bg-bad-tint");
      expect(html).toContain("text-bad-ink");
    });

    it("renders Needs attention with clock icon", () => {
      const html = renderToStaticMarkup(<Badge variant="Needs attention" />);
      expect(html).toContain("Needs attention");
      expect(html).toContain("bg-warn-tint");
      expect(html).toContain("text-warn-ink");
      expect(html).toContain("svg");
    });

    it("renders Neutral badge", () => {
      const html = renderToStaticMarkup(<Badge variant="Neutral" />);
      expect(html).toContain("Neutral");
      expect(html).toContain("bg-hover");
      expect(html).toContain("text-muted");
    });
  });

  describe("4. Formatting utilities", () => {
    it("formatMoney formats 0, fractions, large numbers, and negative numbers strictly", () => {
      expect(formatMoney(0)).toBe("GH₵ 0.00");
      expect(formatMoney("0")).toBe("GH₵ 0.00");
      expect(formatMoney("0.05")).toBe("GH₵ 0.05");
      expect(formatMoney("1234567.5")).toBe("GH₵ 1,234,567.50");
      expect(formatMoney("-50")).toBe("-GH₵ 50.00");
      expect(formatMoney("-1250.75")).toBe("-GH₵ 1,250.75");
    });

    it("plural helper handles 0, 1, and many without string templates", () => {
      expect(plural(0, "service", "services")).toBe("0 services");
      expect(plural(1, "service", "services")).toBe("1 service");
      expect(plural(2, "service", "services")).toBe("2 services");
      expect(plural(50, "entry", "entries")).toBe("50 entries");
    });
  });

  describe("5. DataTable layout", () => {
    interface TestRow {
      id: string;
      label: string;
      amount: string;
    }

    const data: TestRow[] = [
      { id: "1", label: "Sunday First Service", amount: "1500.00" },
      { id: "2", label: "Midweek Teaching", amount: "350.50" },
    ];

    const columns = [
      {
        header: "Service",
        accessorKey: "label" as const,
        cell: (item: TestRow) => <span>{item.label}</span>,
      },
      {
        header: "Amount",
        accessorKey: "amount" as const,
        isNumeric: true,
        cell: (item: TestRow) => <span>{formatMoney(item.amount)}</span>,
      },
    ];

    it("Renders tabular numbers in numeric cells and provides mobile stacked layout", () => {
      const html = renderToStaticMarkup(
        <DataTable
          data={data}
          columns={columns}
          keyExtractor={(item) => item.id}
        />
      );

      // Desktop table
      expect(html).toContain("<table");
      expect(html).toContain("text-right");
      expect(html).toContain("tnum");
      expect(html).toContain("GH₵ 1,500.00");

      // Mobile stacked layout alongside desktop
      expect(html).toContain("sm:hidden");
      expect(html).toContain("Sunday First Service");
    });
  });

  describe("6. Dialog and Sheet overlays", () => {
    it("Dialog renders opaque bg-surface and backdrop bg-scrim without blur", () => {
      const html = renderToStaticMarkup(
        <Dialog isOpen={true} onClose={() => {}} title="Test Confirmation">
          <p>Dialog body content</p>
        </Dialog>
      );

      expect(html).toContain("bg-scrim");
      expect(html).not.toContain("backdrop-blur");
      expect(html).toContain("bg-surface");
      expect(html).toContain("shadow-overlay");
    });

    it("Sheet renders opaque bg-surface and backdrop bg-scrim without blur", () => {
      const html = renderToStaticMarkup(
        <Sheet isOpen={true} onClose={() => {}} title="Test Sheet">
          <p>Sheet body content</p>
        </Sheet>
      );

      expect(html).toContain("bg-scrim");
      expect(html).not.toContain("backdrop-blur");
      expect(html).toContain("bg-surface");
    });
  });

  describe("7. Decimal arithmetic in denomination counting", () => {
    it("preserves exact decimal calculations without floating-point drift", () => {
      // 0.20 + 0.10 in binary float is 0.30000000000000004
      const d1 = toDecimal("0.20");
      const d2 = toDecimal("0.10");
      const sum = d1.add(d2);
      expect(sum.toString()).toBe("0.3");
      expect(formatMoney(sum)).toBe("GH₵ 0.30");

      // 200 x 5 = 1000
      const count = toDecimal(5);
      const note = toDecimal(200);
      const total = count.mul(note);
      expect(total.toString()).toBe("1000");
      expect(formatMoney(total)).toBe("GH₵ 1,000.00");

      // Increment / decrement sequence
      let current = new Decimal("0.50");
      current = current.add(new Decimal("0.50"));
      expect(current.toString()).toBe("1");
      expect(formatMoney(current)).toBe("GH₵ 1.00");

      current = current.sub(new Decimal("0.25"));
      expect(current.toString()).toBe("0.75");
      expect(formatMoney(current)).toBe("GH₵ 0.75");
    });
  });
});
