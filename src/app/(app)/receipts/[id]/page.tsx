import React from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/guards";
import { getReceiptById } from "@/features/giving/queries";
import { ReceiptView } from "@/features/giving/components/receipt-view";
import { amountInWords } from "@/lib/words";
import { formatAccraDate, formatAccraDateTime } from "@/lib/dates";
import { formatRole } from "@/lib/format";

export const metadata = {
  title: "Tithe Receipt — PUCA Finance",
};

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const data = await getReceiptById(id);
  if (!data || !data.givingEntry) {
    notFound();
  }

  const payerName =
    data.givingEntry.member?.fullName ||
    data.givingEntry.payerName ||
    "Church Member";

  const churchName = data.churchSettings?.churchName || "PUCA Parish";
  const presbyteryName =
    data.churchSettings?.presbyteryName || "Presbyterian Church of Ghana";

  const words = amountInWords(data.amount);

  return (
    <ReceiptView
      receipt={{
        id: data.id,
        number: data.number,
        amount: data.amount.toFixed(2),
        amountWords: words,
        issuedAt: formatAccraDateTime(data.issuedAt),
        serviceDate: formatAccraDate(
          data.givingEntry.serviceRecord.serviceDate,
          {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          }
        ),
        serviceType: data.givingEntry.serviceRecord.serviceType,
        churchName,
        presbyteryName,
        payerName,
        memberNumber: data.givingEntry.member?.memberNumber || null,
        phone: data.givingEntry.member?.phone || null,
        issuerName: data.issuedBy.name || data.issuedBy.email,
        issuerRole: formatRole(data.issuedBy.role),
        serviceRecordId: data.givingEntry.serviceRecordId,
      }}
    />
  );
}
