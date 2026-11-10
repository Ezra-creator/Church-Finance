import React from "react";
import { Role } from "@prisma/client";
import {
  Home,
  Receipt,
  Smartphone,
  CreditCard,
  Landmark,
  FileText,
  Users,
  Settings,
} from "lucide-react";

export interface NavItemConfig {
  key: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
}

/**
 * The single typed nav config for the application.
 * All navigation components (sidebar and bottom bar) must derive from this configuration.
 */
export const NAV_ITEMS: NavItemConfig[] = [
  {
    key: "home",
    label: "Home",
    href: "/today",
    icon: Home,
    roles: [Role.FINANCE_SECRETARY, Role.TREASURER],
  },
  {
    key: "collections",
    label: "Collections",
    href: "/today",
    icon: Receipt,
    roles: [Role.FINANCE_SECRETARY, Role.TREASURER],
  },
  {
    key: "momo",
    label: "Mobile money",
    href: "/money/momo",
    icon: Smartphone,
    roles: [Role.FINANCE_SECRETARY, Role.TREASURER],
  },
  {
    key: "spending",
    label: "Spending",
    href: "/money?tab=expenses",
    icon: CreditCard,
    roles: [Role.FINANCE_SECRETARY, Role.TREASURER],
  },
  {
    key: "deposits",
    label: "Deposits",
    href: "/money?tab=deposits",
    icon: Landmark,
    roles: [Role.FINANCE_SECRETARY, Role.TREASURER],
  },
  {
    key: "reports",
    label: "Reports",
    href: "/reconcile",
    icon: FileText,
    roles: [Role.FINANCE_SECRETARY, Role.TREASURER, Role.PRESBYTERY_VIEWER],
  },
  {
    key: "members",
    label: "Members",
    href: "/members",
    icon: Users,
    roles: [Role.FINANCE_SECRETARY, Role.TREASURER],
  },
  {
    key: "settings",
    label: "Settings",
    href: "/settings/users",
    icon: Settings,
    roles: [Role.FINANCE_SECRETARY],
  },
];

/**
 * Filters the canonical navigation items according to user role.
 * Applied both server-side in loaders/middleware and client-side in components.
 * Reviewer (PRESBYTERY_VIEWER) sees ONLY Reports.
 */
export function getNavItemsForRole(role: Role): NavItemConfig[] {
  if (role === Role.PRESBYTERY_VIEWER) {
    return NAV_ITEMS.filter((item) => item.key === "reports");
  }
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}

/**
 * Checks whether the current route represents a focused flow
 * (e.g., count entry or import mapping) where the bottom bar must be hidden.
 */
export function isFocusedFlowRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/services/") ||
    pathname.startsWith("/money/momo/import")
  );
}
