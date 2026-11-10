"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { requireRole } from "@/server/guards";
import { Role } from "@prisma/client";

export async function updateAssemblySettingsAction(data: {
  assemblyName: string;
  parentBodyName: string;
  assemblyAbbreviation: string;
  districtName?: string | null;
  areaName?: string | null;
  reportRecipientName?: string | null;
  signatoryTitles: string[];
  currency?: string;
  timezone?: string;
  weekStartsOn?: string;
}) {
  await requireRole(Role.FINANCE_SECRETARY, Role.TREASURER);

  await prisma.churchSettings.upsert({
    where: { id: "singleton" },
    update: {
      assemblyName: data.assemblyName.trim(),
      parentBodyName: data.parentBodyName.trim(),
      assemblyAbbreviation: data.assemblyAbbreviation.trim(),
      districtName: data.districtName?.trim() || null,
      areaName: data.areaName?.trim() || null,
      reportRecipientName: data.reportRecipientName?.trim() || null,
      signatoryTitles: JSON.stringify(data.signatoryTitles),
      currency: data.currency?.trim() || "GHS",
      timezone: data.timezone?.trim() || "Africa/Accra",
      weekStartsOn: data.weekStartsOn?.trim() || "Sunday",
    },
    create: {
      id: "singleton",
      assemblyName: data.assemblyName.trim(),
      parentBodyName: data.parentBodyName.trim(),
      assemblyAbbreviation: data.assemblyAbbreviation.trim(),
      districtName: data.districtName?.trim() || null,
      areaName: data.areaName?.trim() || null,
      reportRecipientName: data.reportRecipientName?.trim() || null,
      signatoryTitles: JSON.stringify(data.signatoryTitles),
      currency: data.currency?.trim() || "GHS",
      timezone: data.timezone?.trim() || "Africa/Accra",
      weekStartsOn: data.weekStartsOn?.trim() || "Sunday",
      weekEndsOn: 0,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/reports");
  revalidatePath("/today");
  return { success: true };
}

