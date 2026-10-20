"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  Calendar,
  Scale,
  Coins,
  MoreHorizontal,
  Users,
  History,
  LogOut,
  ShieldAlert,
} from "lucide-react";
import { Role } from "@prisma/client";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { formatRole } from "@/lib/format";

export interface NavUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: Role;
}

export interface NavProps {
  user: NavUser;
  churchName?: string;
}

export function DesktopNav({ user, churchName = "PUCA Finance" }: NavProps) {
  const pathname = usePathname();

  const isSecretary = user.role === Role.FINANCE_SECRETARY;
  const isTreasurer = user.role === Role.TREASURER;
  const isViewer = user.role === Role.PRESBYTERY_VIEWER;

  const links = [
    {
      href: "/today",
      label: "Today",
      icon: Calendar,
      visible: true,
    },
    {
      href: "/reconcile",
      label: "Reconcile",
      icon: Scale,
      visible: !isViewer, // Viewers see read-only screens only
      badge: "Phase 3",
    },
    {
      href: "/money",
      label: "Money & Accounts",
      icon: Coins,
      visible: true,
      badge: "Phase 2",
    },
    {
      href: "/settings/users",
      label: "Users & Access",
      icon: Users,
      visible: isSecretary, // Only Finance Secretary can manage users
    },
    {
      href: "/settings/audit",
      label: "Audit Log",
      icon: History,
      visible: true, // Secretary, Treasurer, and Presbytery Viewer can inspect audit trail
    },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-rail flex-shrink-0 border-r border-rule min-h-screen bg-paper select-none p-5">
      {/* Brand & Church Identity */}
      <div className="pb-6 border-b border-rule">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-ink-soft">
          Parish Ledger
        </p>
        <h2 className="text-xl font-serif font-normal text-ink mt-0.5 truncate">
          {churchName}
        </h2>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-6 space-y-1">
        {links
          .filter((l) => l.visible)
          .map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/today" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center justify-between px-3 py-2 rounded-[2px] text-sm transition-colors",
                  isActive
                    ? "bg-ink text-paper font-medium"
                    : "text-ink hover:text-ink hover:bg-ink/[0.04]"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={clsx(
                      "text-[10px] px-1.5 py-0.5 rounded-[1px] font-mono",
                      isActive
                        ? "bg-paper/20 text-paper"
                        : "bg-ink/5 text-ink-soft"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
      </nav>

      {/* User Session Footer */}
      <div className="pt-4 border-t border-rule space-y-3">
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-ink truncate">{user.name || user.email}</p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-[1px] bg-ink-soft" />
            <p className="text-xs text-ink-soft uppercase tracking-wider font-mono">
              {formatRole(user.role)}
            </p>
          </div>
        </div>

        <form action="/api/auth/signout" method="POST">
          <Button
            type="submit"
            variant="quiet"
            size="sm"
            className="w-full justify-start text-ink-soft hover:text-variance hover:bg-variance/10 px-2"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}

export function MobileNav({ user }: NavProps) {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const isSecretary = user.role === Role.FINANCE_SECRETARY;

  const tabs = [
    {
      href: "/today",
      label: "Today",
      icon: Calendar,
    },
    {
      href: "/reconcile",
      label: "Reconcile",
      icon: Scale,
    },
    {
      href: "/money",
      label: "Money",
      icon: Coins,
    },
  ];

  return (
    <>
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-paper border-t border-rule flex items-center justify-around h-16 px-2 select-none"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={clsx(
                "flex flex-col items-center justify-center flex-1 h-full min-h-[44px] gap-1 text-xs transition-colors",
                isActive
                  ? "text-ink font-semibold"
                  : "text-ink-soft hover:text-ink"
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setIsMoreOpen(true)}
          className={clsx(
            "flex flex-col items-center justify-center flex-1 h-full min-h-[44px] gap-1 text-xs transition-colors",
            isMoreOpen || pathname.startsWith("/settings")
              ? "text-ink font-semibold"
              : "text-ink-soft hover:text-ink"
          )}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span>More</span>
        </button>
      </nav>

      {/* More Drawer Sheet */}
      <Sheet
        isOpen={isMoreOpen}
        onClose={() => setIsMoreOpen(false)}
        title="Settings & Overview"
        description={`${user.name || user.email} (${formatRole(user.role)})`}
      >
        <div className="space-y-1 py-2">
          {isSecretary && (
            <Link
              href="/settings/users"
              onClick={() => setIsMoreOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-[2px] text-sm text-ink hover:bg-ink/[0.04] border-b border-rule"
            >
              <Users className="w-4 h-4 text-ink-soft" />
              <div>
                <p className="font-medium">Users & Access</p>
                <p className="text-xs text-ink-soft">
                  Manage secretary, treasurer and viewer roles
                </p>
              </div>
            </Link>
          )}

          <Link
            href="/settings/audit"
            onClick={() => setIsMoreOpen(false)}
            className="flex items-center gap-3 px-3 py-3 rounded-[2px] text-sm text-ink hover:bg-ink/[0.04] border-b border-rule"
          >
            <History className="w-4 h-4 text-ink-soft" />
            <div>
              <p className="font-medium">Audit Log</p>
              <p className="text-xs text-ink-soft">
                Inspect immutable system actions and event diffs
              </p>
            </div>
          </Link>

          <form
            action="/api/auth/signout"
            method="POST"
            className="pt-6"
          >
            <Button
              type="submit"
              variant="secondary"
              className="w-full text-variance hover:bg-variance/10 border-variance"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </Button>
          </form>
        </div>
      </Sheet>
    </>
  );
}
