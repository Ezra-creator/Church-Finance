import React from "react";
import { Role } from "@prisma/client";
import { requireRole } from "@/server/guards";
import { listParserProfiles } from "@/features/momo/queries";
import { ImportWizard, SavedProfileOption } from "@/features/momo/components/import-wizard";
import { ColumnMapConfig, AmountSignConvention } from "@/features/momo/parsers/types";

export const metadata = {
  title: "Import MoMo Statement — PUCA Finance",
};

export default async function ImportMomoStatementPage() {
  await requireRole(Role.FINANCE_SECRETARY, Role.TREASURER);

  const profiles = await listParserProfiles();

  const formattedProfiles: SavedProfileOption[] = profiles.map((p) => ({
    id: p.id,
    name: p.name,
    fileType: p.fileType,
    headerRow: p.headerRow,
    columnMap: p.columnMap as unknown as ColumnMapConfig,
    dateFormat: p.dateFormat,
    amountSign: p.amountSign as AmountSignConvention,
  }));

  return <ImportWizard savedProfiles={formattedProfiles} />;
}
