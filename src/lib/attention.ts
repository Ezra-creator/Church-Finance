import { plural } from "./plural";

export interface AttentionItem {
  id: string;
  title: string;
  detail?: string;
  href: string;
}

export interface AttentionInput {
  unreviewedMomoCount: number;
  cashHeldAmount: string | number;
  oldestUndepositedDays?: number;
  districtOutstandingAmount: string | number;
  needsBackupReminder: boolean;
  unreconciledWeeksCount?: number;
}

/**
 * Derives the active Needs Attention items for Home.
 * Pure logic returning items that require officer action.
 */
export function getNeedsAttentionItems(input: AttentionInput): AttentionItem[] {
  const items: AttentionItem[] = [];

  if (input.unreviewedMomoCount > 0) {
    items.push({
      id: "momo-review",
      title: `${plural(input.unreviewedMomoCount, "mobile money payment")} awaiting category review`,
      detail: "Review and assign giving categories to imported statements.",
      href: "/money/momo/review",
    });
  }

  const cashVal = typeof input.cashHeldAmount === "string" ? parseFloat(input.cashHeldAmount) || 0 : input.cashHeldAmount;
  if (cashVal > 0 && input.oldestUndepositedDays && input.oldestUndepositedDays >= 3) {
    items.push({
      id: "unbanked-cash",
      title: `Counted cash held unbanked for ${plural(input.oldestUndepositedDays, "day")}`,
      detail: "Record a physical bank deposit with slip reference.",
      href: "/money?tab=deposits",
    });
  }

  const districtVal = typeof input.districtOutstandingAmount === "string" ? parseFloat(input.districtOutstandingAmount) || 0 : input.districtOutstandingAmount;
  if (districtVal > 0) {
    items.push({
      id: "district-remittance",
      title: "District remittance payment due",
      detail: "Submit or record remittance payment to the district office.",
      href: "/district",
    });
  }

  if (input.unreconciledWeeksCount && input.unreconciledWeeksCount > 0) {
    items.push({
      id: "unreconciled-weeks",
      title: `${plural(input.unreconciledWeeksCount, "weekly reconciliation")} awaiting completion`,
      detail: "Match counted cash, mobile money and bank deposits.",
      href: "/reconcile",
    });
  }

  if (input.needsBackupReminder) {
    items.push({
      id: "backup-reminder",
      title: "Weekly database backup due",
      detail: "Run the backup script to keep an encrypted off-site copy.",
      href: "/settings/audit",
    });
  }

  return items;
}
