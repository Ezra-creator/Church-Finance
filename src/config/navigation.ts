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
  LucideIcon,
} from "lucide-react";

export interface NavItemConfig {
  label: string;
  href: string;
  icon: LucideIcon;
  allowedRoles: Role[];
  exactMatch?: boolean;
}

export const MAIN_NAV_ITEMS: NavItemConfig[] = [
  {
    label: "Home",
    href: "/today",
    icon: House,
    allowedRoles: [Role.FINANCE_SECRETARY, Role.TREASURER],
    exactMatch: true,
  },
  {
    label: "Collections",
    href: "/services",
    icon: Coins,
    allowedRoles: [Role.FINANCE_SECRETARY, Role.TREASURER],
  },
  {
    label: "Mobile money",
    href: "/money/momo",
    icon: Smartphone,
    allowedRoles: [Role.FINANCE_SECRETARY, Role.TREASURER],
  },
  {
    label: "Spending",
    href: "/spending",
    icon: Receipt,
    allowedRoles: [Role.FINANCE_SECRETARY, Role.TREASURER],
  },
  {
    label: "Deposits",
    href: "/deposits",
    icon: Landmark,
    allowedRoles: [Role.FINANCE_SECRETARY, Role.TREASURER],
  },
  {
    label: "Reports",
    href: "/reports",
    icon: FileText,
    allowedRoles: [Role.FINANCE_SECRETARY, Role.TREASURER, Role.REVIEWER],
  },
  {
    label: "Members",
    href: "/members",
    icon: Users,
    allowedRoles: [Role.FINANCE_SECRETARY, Role.TREASURER],
  },
];

export const SETTINGS_NAV_ITEM: NavItemConfig = {
  label: "Settings",
  href: "/settings",
  icon: SlidersHorizontal,
  allowedRoles: [Role.FINANCE_SECRETARY, Role.TREASURER],
};

export function getVisibleNavItems(userRole: Role): NavItemConfig[] {
  return MAIN_NAV_ITEMS.filter((item) => item.allowedRoles.includes(userRole));
}

