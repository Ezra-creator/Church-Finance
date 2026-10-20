import { describe, it, expect, vi } from "vitest";
import { recordAudit } from "@/features/audit/service";

describe("Phase 2 Audit Trail Enforcement", () => {
  it("records audit entry for member mutations", async () => {
    const mockTx = {
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: "audit_1" }),
      },
    } as any;

    await recordAudit(mockTx, {
      actorId: "secretary_1",
      action: "MEMBER_CREATE",
      entityType: "Member",
      entityId: "mem_123",
      after: {
        fullName: "Ama Serwaa",
        phone: "+233244123456",
        memberNumber: "MEM-001",
      },
    });

    expect(mockTx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: "secretary_1",
        action: "MEMBER_CREATE",
        entityType: "Member",
        entityId: "mem_123",
      }),
    });
  });

  it("records audit entry for cash count saving", async () => {
    const mockTx = {
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: "audit_2" }),
      },
    } as any;

    await recordAudit(mockTx, {
      actorId: "treasurer_1",
      action: "COUNT_SHEET_SAVE",
      entityType: "CountSheet",
      entityId: "sheet_456",
      after: {
        categoryCode: "TITHE",
        total: "1250.00",
        linesCount: 8,
      },
    });

    expect(mockTx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: "treasurer_1",
        action: "COUNT_SHEET_SAVE",
        entityType: "CountSheet",
        entityId: "sheet_456",
      }),
    });
  });

  it("records audit entry with reason for reopening counted service", async () => {
    const mockTx = {
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: "audit_3" }),
      },
    } as any;

    await recordAudit(mockTx, {
      actorId: "secretary_1",
      action: "SERVICE_RECORD_REOPEN",
      entityType: "ServiceRecord",
      entityId: "srv_789",
      reason: "Correcting miscounted GH₵ 20 banknote bundle",
      before: { status: "COUNTED" },
      after: { status: "OPEN" },
    });

    expect(mockTx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: "secretary_1",
        action: "SERVICE_RECORD_REOPEN",
        entityType: "ServiceRecord",
        entityId: "srv_789",
        reason: "Correcting miscounted GH₵ 20 banknote bundle",
      }),
    });
  });

  it("records audit entry for tithe giving entry creation and deletion", async () => {
    const mockTx = {
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: "audit_4" }),
      },
    } as any;

    await recordAudit(mockTx, {
      actorId: "secretary_1",
      action: "GIVING_ENTRY_ADD",
      entityType: "GivingEntry",
      entityId: "entry_1",
      after: {
        amount: "500.00",
        memberId: "mem_123",
        receiptId: "rcpt_1",
      },
    });

    expect(mockTx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "GIVING_ENTRY_ADD",
        entityType: "GivingEntry",
        entityId: "entry_1",
      }),
    });

    await recordAudit(mockTx, {
      actorId: "secretary_1",
      action: "GIVING_ENTRY_DELETE",
      entityType: "GivingEntry",
      entityId: "entry_1",
      reason: "Member payment was assigned to incorrect date",
      before: {
        amount: "500.00",
        receiptNumber: "R-2026-0001",
      },
    });

    expect(mockTx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "GIVING_ENTRY_DELETE",
        entityType: "GivingEntry",
        entityId: "entry_1",
        reason: "Member payment was assigned to incorrect date",
      }),
    });
  });
});
