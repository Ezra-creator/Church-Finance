"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Role } from "@prisma/client";
import { MoreHorizontal, LogOut, X } from "lucide-react";
import { getNavItemsForRole, isFocusedFlowRoute, NavItemConfig } from "@/lib/nav-config";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export interface NavUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: Role;
}

export interface NavProps {
  user: NavUser;
  churchName?: string;
  isFocusedFlow?: boolean;
}

export function Sidebar({ user, churchName }: NavProps) {
  const pathname = usePathname();
  const navItems = getNavItemsForRole(user.role);

  return (
    <aside
      aria-label="Main"
      className="hidden lg:flex flex-col w-[232px] fixed inset-y-0 left-0 border-r border-border h-screen bg-surface select-none z-30"
    >
      {/* Top brand block (64px desktop) */}
      <div className="h-16 flex items-center px-6 border-b border-border">
        <div>
          <div className="text-lead font-semibold text-text">
            PUCA Finance
          </div>
          {churchName && (
            <p className="text-caption text-muted truncate" title={churchName}>
              {churchName}
            </p>
          )}
        </div>
      </div>

      {/* Nav items */}
      <nav aria-label="Main" className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const currentPath = pathname || "";
          const isActive = currentPath
            ? currentPath === item.href ||
              (item.href !== "/today" && currentPath.startsWith(item.href))
            : false;

          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={clsx(
                "flex items-center gap-3 px-3 py-2 rounded-control text-label transition-colors duration-120",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                isActive
                  ? "bg-accent-tint text-accent-ink font-medium"
                  : "text-muted hover:text-text hover:bg-hover font-normal"
              )}
            >
              <Icon
                className={clsx(
                  "w-4 h-4 flex-shrink-0 stroke-[1.75]",
                  isActive ? "text-accent" : "text-muted"
                )}
                aria-hidden="true"
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Session Footer */}
      <div className="p-4 border-t border-border space-y-3 flex-shrink-0">
        <div className="space-y-0.5">
          <p className="text-label font-medium text-text truncate" title={user.name || user.email || ""}>
            {user.name || user.email}
          </p>
          <p className="text-caption text-muted">
            {user.role === Role.FINANCE_SECRETARY
              ? "Finance Secretary"
              : user.role === Role.TREASURER
              ? "Treasurer"
              : "Reviewer"}
          </p>
        </div>

        <form action="/api/auth/signout" method="POST">
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted hover:text-bad px-0 h-9"
          >
            <LogOut className="w-4 h-4 mr-2 stroke-[1.75]" />
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}

export function BottomBar({ user, isFocusedFlow }: NavProps) {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // Check focused-flow layout flag or route
  const currentPath = pathname || "";
  const hideBottomBar = isFocusedFlow || (currentPath ? isFocusedFlowRoute(currentPath) : false);
  if (hideBottomBar) {
    return null;
  }

  const allNavItems = getNavItemsForRole(user.role);

  // 5 items on bottom bar: Home, Collections, Mobile money, Reports, More
  // If user is Reviewer, they only have Reports
  const isReviewer = user.role === Role.PRESBYTERY_VIEWER;

  const primaryKeys = ["home", "collections", "momo", "reports"];
  const barItems = isReviewer
    ? allNavItems
    : allNavItems.filter((item) => primaryKeys.includes(item.key));
  const moreItems = isReviewer
    ? []
    : allNavItems.filter((item) => !primaryKeys.includes(item.key));

  return (
    <>
      <nav
        aria-label="Main"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border flex items-center justify-around h-16 px-1 select-none pb-[env(safe-area-inset-bottom,0px)]"
      >
        {barItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath
            ? currentPath === item.href ||
              (item.href !== "/today" && currentPath.startsWith(item.href))
            : false;

          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={clsx(
                "flex flex-col items-center justify-center flex-1 h-full min-h-[44px] gap-1 transition-colors duration-120",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                isActive
                  ? "text-accent-ink font-medium"
                  : "text-muted hover:text-text font-normal"
              )}
            >
              <Icon
                className={clsx(
                  "w-5 h-5 flex-shrink-0 stroke-[1.75]",
                  isActive ? "text-accent" : "text-muted"
                )}
                aria-hidden="true"
              />
              <span className="text-caption leading-tight text-center">{item.label}</span>
            </Link>
          );
        })}

        {!isReviewer && (
          <button
            type="button"
            onClick={() => setIsMoreOpen(true)}
            aria-expanded={isMoreOpen}
            className="flex flex-col items-center justify-center flex-1 h-full min-h-[44px] gap-1 text-muted hover:text-text font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <MoreHorizontal className="w-5 h-5 flex-shrink-0 stroke-[1.75]" aria-hidden="true" />
            <span className="text-caption leading-tight text-center">More</span>
          </button>
        )}
      </nav>

      {/* More Bottom Sheet */}
      <Sheet
        isOpen={isMoreOpen}
        onClose={() => setIsMoreOpen(false)}
        title="More"
      >
        <div className="space-y-4 py-2">
          <div className="divide-y divide-border border border-border rounded-panel bg-surface">
            {moreItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => setIsMoreOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-body font-medium text-text hover:bg-hover transition-colors duration-120"
                >
                  <Icon className="w-5 h-5 text-muted stroke-[1.75]" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="p-4 border border-border rounded-panel bg-surface space-y-3">
            <div className="space-y-0.5">
              <p className="text-label font-medium text-text">
                {user.name || user.email}
              </p>
              <p className="text-caption text-muted">
                {user.role === Role.FINANCE_SECRETARY ? "Finance Secretary" : "Treasurer"}
              </p>
            </div>
            <form action="/api/auth/signout" method="POST">
              <Button
                type="submit"
                variant="danger"
                size="sm"
                className="w-full"
              >
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </Sheet>
    </>
  );
}

export const DesktopNav = Sidebar;
export const BottomNav = BottomBar;
export const MobileNav = BottomBar;
