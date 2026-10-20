import { Role } from "@prisma/client";

export function formatRole(role: Role | string): string {
  switch (role) {
    case "FINANCE_SECRETARY":
      return "Finance Secretary";
    case "TREASURER":
      return "Treasurer";
    case "PRESBYTERY_VIEWER":
      return "Presbytery Viewer";
    default:
      return role;
  }
}

export function formatRoleDescription(role: Role | string): string {
  switch (role) {
    case "FINANCE_SECRETARY":
      return "Enters offerings, manages users, and prepares counts.";
    case "TREASURER":
      return "Verifies counts, reconciles banking, and signs off.";
    case "PRESBYTERY_VIEWER":
      return "Read-only access to records and financial reports.";
    default:
      return "";
  }
}

export function formatStatus(active: boolean): string {
  return active ? "Active" : "Inactive";
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.substring(0, maxLength - 1)}…`;
}
