import { prisma } from "@/server/db";
import { Prisma, DistrictRemittanceStatus } from "@prisma/client";
import { withAudit } from "@/features/audit/service";
import { AppError } from "@/lib/errors";
import { parseCedi } from "@/lib/money";
import { RecordRemittancePaymentInput } from "./schemas";

export interface DistrictRemittanceSummary {
  totalDue: Prisma.Decimal;
  totalPaid: Prisma.Decimal;
  totalOutstanding: Prisma.Decimal;
  countOutstanding: number;
}

/**
 * Fetches all district remittances ordered by week ending descending.
 */
export async function getDistrictRemittances() {
  return prisma.districtRemittance.findMany({
    include: {
      period: true,
      payments: {
        include: {
          recordedBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { paidOn: "desc" },
      },
    },
    orderBy: {
      period: { weekEnding: "desc" },
    },
  });
}

/**
 * Computes high-level totals of district obligations.
 */
export async function getDistrictOutstandingSummary(): Promise<DistrictRemittanceSummary> {
  const remittances = await prisma.districtRemittance.findMany({
    select: {
      amountDue: true,
      amountPaid: true,
      status: true,
    },
  });

  let totalDue = new Prisma.Decimal(0);
  let totalPaid = new Prisma.Decimal(0);
  let totalOutstanding = new Prisma.Decimal(0);
  let countOutstanding = 0;

  for (const rem of remittances) {
    totalDue = totalDue.add(rem.amountDue);
    totalPaid = totalPaid.add(rem.amountPaid);
    const balance = rem.amountDue.sub(rem.amountPaid);
    if (balance.greaterThan(0)) {
      totalOutstanding = totalOutstanding.add(balance);
      countOutstanding++;
    }
  }

  return {
    totalDue,
    totalPaid,
    totalOutstanding,
    countOutstanding,
  };
}

/**
 * Records a payment against a district remittance.
 * Supports partial payments. Rejects overpayment.
 * Derives status (DUE, PART_PAID, PAID).
 */
export async function recordRemittancePayment(
  input: RecordRemittancePaymentInput,
  actorId: string
) {
  const remittance = await prisma.districtRemittance.findUnique({
    where: { id: input.remittanceId },
    include: { period: true },
  });

  if (!remittance) {
    throw new AppError("NOT_FOUND", "District remittance not found.");
  }

  const paymentDecimal = parseCedi(input.amount);
  const remainingBalance = remittance.amountDue.sub(remittance.amountPaid);

  if (paymentDecimal.greaterThan(remainingBalance)) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Payment amount (GH₵ ${paymentDecimal}) exceeds remaining balance due (GH₵ ${remainingBalance}).`
    );
  }

  const newAmountPaid = remittance.amountPaid.add(paymentDecimal);
  const newStatus = newAmountPaid.equals(remittance.amountDue)
    ? DistrictRemittanceStatus.PAID
    : newAmountPaid.greaterThan(0)
    ? DistrictRemittanceStatus.PART_PAID
    : DistrictRemittanceStatus.DUE;

  const paidOnDate = new Date(input.paidOn + "T00:00:00.000Z");
  const reference = input.reference?.trim() || null;

  return withAudit(async (tx) => {
    // 1. Create payment entry
    const payment = await tx.districtRemittancePayment.create({
      data: {
        remittanceId: remittance.id,
        amount: paymentDecimal,
        paidOn: paidOnDate,
        reference,
        recordedById: actorId,
      },
    });

    // 2. Update remittance record
    const updatedRemittance = await tx.districtRemittance.update({
      where: { id: remittance.id },
      data: {
        amountPaid: newAmountPaid,
        paidOn: paidOnDate,
        reference,
        status: newStatus,
      },
      include: {
        period: true,
        payments: true,
      },
    });

    return {
      result: {
        remittance: updatedRemittance,
        payment,
      },
      audit: {
        actorId,
        action: "DISTRICT_REMITTANCE_PAYMENT_RECORDED",
        entityType: "DistrictRemittance",
        entityId: remittance.id,
        before: {
          amountPaid: remittance.amountPaid.toString(),
          status: remittance.status,
        },
        after: {
          amountPaid: newAmountPaid.toString(),
          status: newStatus,
          paymentAmount: paymentDecimal.toString(),
          paidOn: input.paidOn,
          reference,
        },
      },
    };
  });
}
