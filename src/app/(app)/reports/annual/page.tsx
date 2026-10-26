import React from "react";
import { requireUser } from "@/server/guards";
import { getAnnualReportData } from "@/features/annual/service";
import { AnnualReportView } from "@/features/annual/components/annual-report-view";

export const metadata = {
  title: "Annual Financial Summary — PUCA Finance",
};

export default async function AnnualReportPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  await requireUser();
  const { year: yearParam } = await searchParams;

  const currentYear = new Date().getUTCFullYear();
  const year = yearParam ? parseInt(yearParam, 10) : currentYear;

  const validYear = isNaN(year) ? currentYear : year;
  const reportData = await getAnnualReportData(validYear);

  const availableYears = [currentYear, currentYear - 1, currentYear - 2];

  return (
    <AnnualReportView
      initialData={JSON.parse(JSON.stringify(reportData))}
      availableYears={availableYears}
    />
  );
}
