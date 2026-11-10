import { prisma } from "@/server/db";

export interface AssemblySettings {
  assemblyName: string;
  parentBodyName: string;
  assemblyAbbreviation: string;
  districtName: string | null;
  areaName: string | null;
  reportRecipientName: string | null;
  signatoryTitles: string[];
  currency: string;
  timezone: string;
  weekStartsOn: string;
}

export function getDefaultIdentity(): AssemblySettings {
  return {
    assemblyName: process.env.ASSEMBLY_NAME || "PUCA English Assembly",
    parentBodyName: process.env.PARENT_BODY_NAME || "The Church of Pentecost",
    assemblyAbbreviation: process.env.ASSEMBLY_ABBREVIATION || "PUCA",
    districtName: null,
    areaName: null,
    reportRecipientName: null,
    signatoryTitles: [],
    currency: "GHS",
    timezone: "Africa/Accra",
    weekStartsOn: "Sunday",
  };
}

/**
 * Returns full assembly settings from the database, bootstrapping from environment variables if not yet configured.
 */
export async function getAssemblySettings(): Promise<AssemblySettings> {
  try {
    const record = await prisma.churchSettings.findUnique({
      where: { id: "singleton" },
    });

    if (record) {
      let parsedSignatories: string[] = [];
      try {
        parsedSignatories = JSON.parse(record.signatoryTitles || "[]");
      } catch {
        parsedSignatories = [];
      }

      return {
        assemblyName: record.assemblyName || process.env.ASSEMBLY_NAME || "PUCA English Assembly",
        parentBodyName: record.parentBodyName || process.env.PARENT_BODY_NAME || "The Church of Pentecost",
        assemblyAbbreviation: record.assemblyAbbreviation || process.env.ASSEMBLY_ABBREVIATION || "PUCA",
        districtName: record.districtName,
        areaName: record.areaName,
        reportRecipientName: record.reportRecipientName,
        signatoryTitles: parsedSignatories,
        currency: record.currency || "GHS",
        timezone: record.timezone || "Africa/Accra",
        weekStartsOn: record.weekStartsOn || "Sunday",
      };
    }

    // First-run bootstrap from environment variables
    const defaults = getDefaultIdentity();
    const created = await prisma.churchSettings.create({
      data: {
        id: "singleton",
        assemblyName: defaults.assemblyName,
        parentBodyName: defaults.parentBodyName,
        assemblyAbbreviation: defaults.assemblyAbbreviation,
        signatoryTitles: JSON.stringify(defaults.signatoryTitles),
        currency: defaults.currency,
        timezone: defaults.timezone,
        weekStartsOn: defaults.weekStartsOn,
        weekEndsOn: 0,
      },
    });

    return {
      assemblyName: created.assemblyName,
      parentBodyName: created.parentBodyName,
      assemblyAbbreviation: created.assemblyAbbreviation,
      districtName: created.districtName,
      areaName: created.areaName,
      reportRecipientName: created.reportRecipientName,
      signatoryTitles: [],
      currency: created.currency,
      timezone: created.timezone,
      weekStartsOn: created.weekStartsOn,
    };
  } catch (err) {
    return getDefaultIdentity();
  }
}

/**
 * Public identity shown on pre-auth screens (sign-in).
 * Never exposes financial or administrative metadata.
 */
export async function getPublicIdentity(): Promise<{
  assemblyName: string;
  parentBodyName: string;
}> {
  const settings = await getAssemblySettings();
  return {
    assemblyName: settings.assemblyName,
    parentBodyName: settings.parentBodyName,
  };
}

