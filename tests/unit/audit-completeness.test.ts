import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/server/db";
import { Role, ServiceStatus, ServiceType, ExpensePaymentMethod, DepositKind } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { createServiceRecord, markCounted } from "@/features/services/service";
import { saveCount } from "@/features/counting/service";
import { addGivingEntry, deleteGivingEntry } from "@/features/giving/service";
import { createExpense, approveExpense } from "@/features/expenses/service";
import { recordDeposit, confirmDeposit } from "@/features/deposits/service";
import { createAllocationRule } from "@/features/allocation/service";
import { recordRemittancePayment } from "@/features/remittance/service";

describe("Audit Completeness Check - Every Mutation Records an Audit Row", () => {
  let secretaryUser: { id: string };
  let treasurerUser: { id: string };
  let categoryOffering: { id: string };
  let categoryExpense: { id: string };
  let denomination: { id: string };

  beforeEach(async () => {
    secretaryUser = await prisma.user.create({
      data: {
        email: `audit-sec-${Date.now()}@puca.local`,
        name: "Audit Sec",
        passwordHash: "hash",
        role: Role.FINANCE_SECRETARY,
      },
    });

    treasurerUser = await prisma.user.create({
      data: {
        email: `audit-tres-${Date.now()}@puca.local`,
        name: "Audit Treasurer",
        passwordHash: "hash",
        role: Role.TREASURER,
      },
    });

    categoryOffering = await prisma.givingCategory.create({
      data: {
        code: `OFFERING_AUDIT_${Date.now()}`,
        name: "Offering Audit",
        sortOrder: 1,
      },
    });

    categoryExpense = await prisma.expenseCategory.create({
      data: {
        name: `Operations Audit ${Date.now()}`,
      },
    });

    denomination =
      (await prisma.denomination.findFirst({
        where: { value: new Prisma.Decimal("20.00") },
      })) ??
      (await prisma.denomination.create({
        data: {
          value: new Prisma.Decimal("20.00"),
          kind: "NOTE",
          sortOrder: 1,
        },
      }));
  });

  let createdServiceId: string | null = null;

  afterEach(async () => {
    if (createdServiceId) {
      await prisma.givingEntry.deleteMany({
        where: { serviceRecordId: createdServiceId },
      });
      await prisma.countLine.deleteMany({
        where: { countSheet: { serviceRecordId: createdServiceId } },
      });
      await prisma.countSheet.deleteMany({
        where: { serviceRecordId: createdServiceId },
      });
      await prisma.serviceRecord.deleteMany({
        where: { id: createdServiceId },
      });
      createdServiceId = null;
    }
    await prisma.auditLog.deleteMany({
      where: { actorId: { in: [secretaryUser.id, treasurerUser.id] } },
    });
    await prisma.districtRemittancePayment.deleteMany({
      where: { recordedById: secretaryUser.id },
    });
    await prisma.districtAllocationRule.deleteMany({
      where: { categoryId: categoryOffering.id },
    });
    await prisma.deposit.deleteMany({
      where: { carriedById: secretaryUser.id },
    });
    await prisma.expense.deleteMany({
      where: { requestedById: secretaryUser.id },
    });
    await prisma.expenseCategory.deleteMany({
      where: { id: categoryExpense.id },
    });
    await prisma.givingEntry.deleteMany({
      where: { categoryId: categoryOffering.id },
    });
    await prisma.countLine.deleteMany({
      where: { denominationId: denomination.id },
    });
    await prisma.countSheet.deleteMany({
      where: { categoryId: categoryOffering.id },
    });
    await prisma.serviceRecord.deleteMany({
      where: { title: "Audit Sunday" },
    });
    await prisma.givingCategory.deleteMany({
      where: { id: categoryOffering.id },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [secretaryUser.id, treasurerUser.id] } },
    });
  });

  it("asserts audit rows for Service Record creation, Count Save, and Giving Entry addition", async () => {
    // 1. Service Record Create
    const randomDay = String(Math.floor(10 + Math.random() * 18)).padStart(2, "0");
    const testDate = `2026-07-${randomDay}`;
    const service = await createServiceRecord(
      {
        serviceDate: testDate,
        serviceType: ServiceType.SUNDAY,
        title: "Audit Sunday",
      },
      secretaryUser.id
    );
    createdServiceId = service.id;

    const serviceAudit = await prisma.auditLog.findFirst({
      where: {
        action: "SERVICE_RECORD_CREATE",
        entityId: service.id,
      },
    });
    expect(serviceAudit).toBeDefined();
    expect(serviceAudit?.actorId).toBe(secretaryUser.id);

    // 2. Count Sheet Save
    const countSheet = await saveCount(
      {
        serviceRecordId: service.id,
        categoryId: categoryOffering.id,
        lines: [{ denominationId: denomination.id, quantity: 5 }],
      },
      secretaryUser.id
    );

    const countAudit = await prisma.auditLog.findFirst({
      where: {
        action: "COUNT_SHEET_SAVE",
        entityId: countSheet.id,
      },
    });
    expect(countAudit).toBeDefined();
    expect(countAudit?.actorId).toBe(secretaryUser.id);

    // 3. Giving Entry Add
    const givingEntry = await addGivingEntry(
      {
        serviceRecordId: service.id,
        categoryId: categoryOffering.id,
        payerName: "Kwame Nkrumah",
        amount: "100.00",
      },
      secretaryUser.id
    );

    const givingAudit = await prisma.auditLog.findFirst({
      where: {
        action: "GIVING_ENTRY_ADD",
        entityId: givingEntry.id,
      },
    });
    expect(givingAudit).toBeDefined();
    expect(givingAudit?.actorId).toBe(secretaryUser.id);

    // 4. Giving Entry Delete
    await deleteGivingEntry({ id: givingEntry.id }, secretaryUser.id);

    const deleteAudit = await prisma.auditLog.findFirst({
      where: {
        action: "GIVING_ENTRY_DELETE",
        entityId: givingEntry.id,
      },
    });
    expect(deleteAudit).toBeDefined();
    expect(deleteAudit?.actorId).toBe(secretaryUser.id);
  });

  it("asserts audit rows for Expense lifecycle (Create & Approve)", async () => {
    const expense = await createExpense(
      {
        expenseDate: "2026-06-15",
        categoryId: categoryExpense.id,
        payee: "Accra Power Utility",
        description: "Power bill for church premises",
        amount: "450.00",
        paymentMethod: ExpensePaymentMethod.CASH,
        submitImmediately: false,
      },
      secretaryUser.id
    );

    const createAudit = await prisma.auditLog.findFirst({
      where: {
        action: "EXPENSE_DRAFT_CREATED",
        entityId: expense.id,
      },
    });
    expect(createAudit).toBeDefined();
    expect(createAudit?.actorId).toBe(secretaryUser.id);

    // Submit expense
    await prisma.expense.update({
      where: { id: expense.id },
      data: { status: "SUBMITTED" },
    });

    // Approve expense (Treasurer)
    await approveExpense(expense.id, treasurerUser.id, Role.TREASURER);

    const approveAudit = await prisma.auditLog.findFirst({
      where: {
        action: "EXPENSE_APPROVED",
        entityId: expense.id,
      },
    });
    expect(approveAudit).toBeDefined();
    expect(approveAudit?.actorId).toBe(treasurerUser.id);
  });

  it("asserts audit rows for Bank Deposit lifecycle (Record & Confirm)", async () => {
    const deposit = await recordDeposit(
      {
        depositDate: "2026-06-16",
        kind: DepositKind.MOMO_TRANSFER,
        amount: "1200.00",
        bankReference: "DEP-998877",
        carriedById: secretaryUser.id,
      },
      secretaryUser.id
    );

    const recordAudit = await prisma.auditLog.findFirst({
      where: {
        action: "DEPOSIT_RECORDED",
        entityId: deposit.id,
      },
    });
    expect(recordAudit).toBeDefined();
    expect(recordAudit?.actorId).toBe(secretaryUser.id);

    // Confirm deposit (Treasurer)
    await confirmDeposit(deposit.id, treasurerUser.id, Role.TREASURER);

    const confirmAudit = await prisma.auditLog.findFirst({
      where: {
        action: "DEPOSIT_CONFIRMED",
        entityId: deposit.id,
      },
    });
    expect(confirmAudit).toBeDefined();
    expect(confirmAudit?.actorId).toBe(treasurerUser.id);
  });

  it("asserts audit rows for District Allocation Rule creation", async () => {
    const rule = await createAllocationRule(
      {
        categoryId: categoryOffering.id,
        percentage: "10.00",
        effectiveFrom: "2026-01-01",
      },
      secretaryUser.id
    );

    const ruleAudit = await prisma.auditLog.findFirst({
      where: {
        action: "DISTRICT_ALLOCATION_RULE_CREATE",
        entityId: rule.id,
      },
    });
    expect(ruleAudit).toBeDefined();
    expect(ruleAudit?.actorId).toBe(secretaryUser.id);
  });
});
