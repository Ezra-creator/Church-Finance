import React from "react";
import Link from "next/link";
import { requireUser } from "@/server/guards";
import { PageHeader } from "@/components/ui/page-header";
import { Role } from "@prisma/client";
import { formatRole } from "@/lib/format";

export const metadata = {
  title: "More · PUCA Finance",
};

export default async function MorePage() {
  const user = await requireUser();
  const isSecretary = user.role === Role.FINANCE_SECRETARY;

  const items = [
    {
      href: "/members",
      label: "Members",
      description: "Member directory and giving records",
    },
    {
      href: "/district",
      label: "District",
      description: "District remittance allocations and assessments",
    },
    {
      href: "/reports/annual",
      label: "Annual summary",
      description: "Annual financial reports and tax year summaries",
    },
    ...(isSecretary
      ? [
          {
            href: "/settings/users",
            label: "Users",
            description: "Manage church officer accounts and permissions",
          },
        ]
      : []),
    {
      href: "/settings/audit",
      label: "Audit log",
      description: "Permanent audit trail of all financial actions",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="More"
        description={`${user.name || user.email} • ${formatRole(user.role)}`}
      />

      <div className="border border-border rounded-panel bg-surface divide-y divide-border">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="p-4 flex items-center justify-between gap-3 hover:bg-hover transition-colors"
          >
            <div className="min-w-0">
              <span className="text-body font-medium text-text block truncate">
                {item.label}
              </span>
              <span className="text-caption text-muted block truncate">
                {item.description}
              </span>
            </div>
          </Link>
        ))}

        {/* Sign Out row */}
        <div className="p-4">
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="w-full flex items-center justify-between text-left text-body font-medium text-bad-ink hover:underline min-h-[44px]"
            >
              <span>Sign out</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
