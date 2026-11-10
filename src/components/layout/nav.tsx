"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Role } from "@prisma/client";
import {
  House,
  Coins,
  Smartphone,
  Receipt,
  Landmark,
  FileText,
  Users,
  SlidersHorizontal,
  MoreHorizontal,
} from "lucide-react";
import {
  MAIN_NAV_ITEMS,
  SETTINGS_NAV_ITEM,
  getVisibleNavItems,
} from "@/config/navigation";
import { formatRole } from "@/lib/format";

export interface NavUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: Role;
}

export interface NavProps {
  user: NavUser;
  assemblyName: string;
  parentBodyName: string;
  assemblyAbbreviation: string;
  hidePhoneNav?: boolean;
}

export function AppNavigation({
  user,
  assemblyName,
  parentBodyName,
  assemblyAbbreviation,
  hidePhoneNav = false,
}: NavProps) {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const visibleNavItems = getVisibleNavItems(user.role);
  const showSettings = user.role !== Role.REVIEWER;

  // Sign out form component
  const SignOutButton = ({ className }: { className?: string }) => (
    <form action="/api/auth/signout" method="POST" className="inline-block">
      <button
        type="submit"
        className={clsx(
          "text-[12px] text-on-brand-faint hover:text-on-brand transition-colors cursor-pointer bg-transparent border-0 p-0",
          className
        )}
      >
        Sign out
      </button>
    </form>
  );

  return (
    <>
      {/* 5.1 Desktop Sidebar (>= 1024px) */}
      <aside
        data-brand-context="true"
        className="hidden lg:flex flex-col fixed top-0 left-0 bottom-0 w-[232px] bg-brand text-on-brand select-none p-[20px_12px] z-40"
      >
        {/* Header */}
        <div className="px-3 mb-6">
          <div className="text-[14px] font-semibold text-on-brand leading-[20px] line-clamp-2">
            {assemblyName}
          </div>
          <div className="text-[12px] text-on-brand-faint leading-[16px] truncate mt-0.5">
            {parentBodyName}
          </div>
        </div>

        {/* Main Navigation Items */}
        <nav aria-label="Main" className="flex-1 space-y-[2px]">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exactMatch
              ? pathname === item.href
              : pathname === item.href || (item.href !== "/today" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={clsx(
                  "flex items-center h-[40px] px-3 rounded-control text-[14px] leading-[20px] gap-3 transition-colors",
                  isActive
                    ? "bg-brand-active text-on-brand font-medium"
                    : "text-on-brand-soft font-normal hover:bg-[rgba(255,255,255,0.08)] hover:text-on-brand"
                )}
              >
                <Icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.5} aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Group */}
        <div className="mt-auto">
          {showSettings && (
            <Link
              href={SETTINGS_NAV_ITEM.href}
              aria-current={pathname.startsWith("/settings") ? "page" : undefined}
              className={clsx(
                "flex items-center h-[40px] px-3 rounded-control text-[14px] leading-[20px] gap-3 transition-colors",
                pathname.startsWith("/settings")
                  ? "bg-brand-active text-on-brand font-medium"
                  : "text-on-brand-soft font-normal hover:bg-[rgba(255,255,255,0.08)] hover:text-on-brand"
              )}
            >
              <SETTINGS_NAV_ITEM.icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.5} aria-hidden="true" />
              <span className="truncate">{SETTINGS_NAV_ITEM.label}</span>
            </Link>
          )}

          <div className="h-[1px] bg-brand-line my-3" aria-hidden="true" />

          {/* Account Block */}
          <div className="px-3 pt-1">
            <div className="text-[14px] font-medium text-on-brand leading-[20px] truncate">
              {user.name || user.email || "Finance Officer"}
            </div>
            <div className="text-[12px] text-on-brand-faint leading-[16px] truncate mt-0.5">
              {formatRole(user.role)}
            </div>
            <div className="mt-2">
              <SignOutButton />
            </div>
          </div>
        </div>
      </aside>

      {/* 5.2 Tablet Rail (768px to 1023px, or landscape short viewports) */}
      <aside
        data-brand-context="true"
        className="hidden md:flex lg:hidden flex-col fixed top-0 left-0 bottom-0 w-[96px] bg-brand text-on-brand select-none py-5 px-2 z-40"
      >
        {/* Header: assemblyAbbreviation */}
        <div className="text-center px-2 pt-1 pb-4">
          <div className="text-[14px] font-semibold text-on-brand tracking-tight truncate">
            {assemblyAbbreviation}
          </div>
        </div>

        {/* Vertical Items */}
        <nav aria-label="Main" className="flex-1 space-y-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exactMatch
              ? pathname === item.href
              : pathname === item.href || (item.href !== "/today" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={clsx(
                  "flex flex-col items-center justify-center min-h-[64px] p-2 rounded-control text-center transition-colors",
                  isActive
                    ? "bg-brand-active text-on-brand font-medium"
                    : "text-on-brand-soft font-normal hover:bg-[rgba(255,255,255,0.08)] hover:text-on-brand"
                )}
              >
                <Icon className="w-5 h-5 mb-1" strokeWidth={1.5} aria-hidden="true" />
                <span className="text-[12px] leading-[15px]">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Group */}
        <div className="mt-auto pt-2">
          {showSettings && (
            <Link
              href={SETTINGS_NAV_ITEM.href}
              aria-current={pathname.startsWith("/settings") ? "page" : undefined}
              className={clsx(
                "flex flex-col items-center justify-center min-h-[60px] p-2 rounded-control text-center transition-colors",
                pathname.startsWith("/settings")
                  ? "bg-brand-active text-on-brand font-medium"
                  : "text-on-brand-soft font-normal hover:bg-[rgba(255,255,255,0.08)] hover:text-on-brand"
              )}
            >
              <SETTINGS_NAV_ITEM.icon className="w-5 h-5 mb-1" strokeWidth={1.5} aria-hidden="true" />
              <span className="text-[12px] leading-[15px]">{SETTINGS_NAV_ITEM.label}</span>
            </Link>
          )}

          <div className="h-[1px] bg-brand-line my-2" aria-hidden="true" />

          <div className="text-center pt-1">
            <SignOutButton />
          </div>
        </div>
      </aside>

      {/* 5.3 Phone Bottom Tab Bar (< 768px) */}
      {!hidePhoneNav && (
        <nav
          aria-label="Main"
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border flex items-center justify-around h-[64px] pb-safe px-1 select-none"
        >
          {/* Item 1: Home */}
          <Link
            href="/today"
            aria-current={pathname === "/today" ? "page" : undefined}
            className="relative flex flex-col items-center justify-center flex-1 h-full min-w-[48px] touch-target"
          >
            {pathname === "/today" && (
              <span className="absolute top-0 w-6 h-[2px] bg-brand" aria-hidden="true" />
            )}
            <House
              className={clsx("w-5 h-5 mb-1", pathname === "/today" ? "text-brand" : "text-muted")}
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <span
              className={clsx(
                "text-[12px] font-medium leading-none",
                pathname === "/today" ? "text-brand" : "text-muted"
              )}
            >
              Home
            </span>
          </Link>

          {/* Item 2: Collections */}
          <Link
            href="/services"
            aria-current={pathname.startsWith("/services") ? "page" : undefined}
            className="relative flex flex-col items-center justify-center flex-1 h-full min-w-[48px] touch-target"
          >
            {pathname.startsWith("/services") && (
              <span className="absolute top-0 w-6 h-[2px] bg-brand" aria-hidden="true" />
            )}
            <Coins
              className={clsx("w-5 h-5 mb-1", pathname.startsWith("/services") ? "text-brand" : "text-muted")}
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <span
              className={clsx(
                "text-[12px] font-medium leading-none",
                pathname.startsWith("/services") ? "text-brand" : "text-muted"
              )}
            >
              Collections
            </span>
          </Link>

          {/* Item 3: Mobile money */}
          <Link
            href="/money/momo"
            aria-current={pathname.startsWith("/money/momo") ? "page" : undefined}
            className="relative flex flex-col items-center justify-center flex-1 h-full min-w-[48px] touch-target"
          >
            {pathname.startsWith("/money/momo") && (
              <span className="absolute top-0 w-6 h-[2px] bg-brand" aria-hidden="true" />
            )}
            <Smartphone
              className={clsx("w-5 h-5 mb-1", pathname.startsWith("/money/momo") ? "text-brand" : "text-muted")}
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <span
              className={clsx(
                "text-[12px] font-medium leading-tight text-center px-1",
                pathname.startsWith("/money/momo") ? "text-brand" : "text-muted"
              )}
            >
              Mobile money
            </span>
          </Link>

          {/* Item 4: Reports */}
          <Link
            href="/reports"
            aria-current={pathname.startsWith("/reports") || pathname.startsWith("/reconcile") ? "page" : undefined}
            className="relative flex flex-col items-center justify-center flex-1 h-full min-w-[48px] touch-target"
          >
            {(pathname.startsWith("/reports") || pathname.startsWith("/reconcile")) && (
              <span className="absolute top-0 w-6 h-[2px] bg-brand" aria-hidden="true" />
            )}
            <FileText
              className={clsx(
                "w-5 h-5 mb-1",
                pathname.startsWith("/reports") || pathname.startsWith("/reconcile") ? "text-brand" : "text-muted"
              )}
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <span
              className={clsx(
                "text-[12px] font-medium leading-none",
                pathname.startsWith("/reports") || pathname.startsWith("/reconcile") ? "text-brand" : "text-muted"
              )}
            >
              Reports
            </span>
          </Link>

          {/* Item 5: More */}
          <button
            type="button"
            onClick={() => setIsMoreOpen(true)}
            className="relative flex flex-col items-center justify-center flex-1 h-full min-w-[48px] touch-target"
          >
            <MoreHorizontal className="w-5 h-5 mb-1 text-muted" strokeWidth={1.5} aria-hidden="true" />
            <span className="text-[12px] font-medium leading-none text-muted">More</span>
          </button>
        </nav>
      )}

      {/* Phone "More" Bottom Sheet */}
      {isMoreOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="More navigation options"
          className="md:hidden fixed inset-0 z-50 flex items-end justify-center"
        >
          {/* Backdrop Scrim */}
          <div
            className="fixed inset-0 bg-scrim transition-opacity duration-150"
            onClick={() => setIsMoreOpen(false)}
            aria-hidden="true"
          />

          {/* Sheet Body */}
          <div className="relative z-10 w-full max-h-[80dvh] bg-surface rounded-t-[12px] border-t border-border p-4 pb-safe flex flex-col overflow-y-auto">
            {/* Handle: 4px by 36px handle in var(--border-strong) */}
            <div className="w-9 h-1 bg-border-strong rounded-full mx-auto mb-4 flex-shrink-0" aria-hidden="true" />

            <div className="space-y-1">
              <Link
                href="/spending"
                onClick={() => setIsMoreOpen(false)}
                className="flex items-center h-[48px] px-3 rounded-control text-[14px] text-text hover:bg-hover gap-3 transition-colors touch-target"
              >
                <Receipt className="w-5 h-5 text-muted" strokeWidth={1.5} aria-hidden="true" />
                <span>Spending</span>
              </Link>

              <Link
                href="/deposits"
                onClick={() => setIsMoreOpen(false)}
                className="flex items-center h-[48px] px-3 rounded-control text-[14px] text-text hover:bg-hover gap-3 transition-colors touch-target"
              >
                <Landmark className="w-5 h-5 text-muted" strokeWidth={1.5} aria-hidden="true" />
                <span>Deposits</span>
              </Link>

              <Link
                href="/members"
                onClick={() => setIsMoreOpen(false)}
                className="flex items-center h-[48px] px-3 rounded-control text-[14px] text-text hover:bg-hover gap-3 transition-colors touch-target"
              >
                <Users className="w-5 h-5 text-muted" strokeWidth={1.5} aria-hidden="true" />
                <span>Members</span>
              </Link>

              {showSettings && (
                <Link
                  href="/settings"
                  onClick={() => setIsMoreOpen(false)}
                  className="flex items-center h-[48px] px-3 rounded-control text-[14px] text-text hover:bg-hover gap-3 transition-colors touch-target"
                >
                  <SlidersHorizontal className="w-5 h-5 text-muted" strokeWidth={1.5} aria-hidden="true" />
                  <span>Settings</span>
                </Link>
              )}
            </div>

            <div className="h-[1px] bg-border my-3" aria-hidden="true" />

            {/* Account Info and Sign Out */}
            <div className="p-3">
              <div className="text-[14px] font-medium text-text leading-[20px]">
                {user.name || user.email || "Finance Officer"}
              </div>
              <div className="text-[12px] text-muted leading-[16px]">
                {formatRole(user.role)}
              </div>
              <div className="mt-3">
                <form action="/api/auth/signout" method="POST">
                  <button
                    type="submit"
                    className="w-full text-left text-[14px] text-bad-ink hover:underline py-2"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
