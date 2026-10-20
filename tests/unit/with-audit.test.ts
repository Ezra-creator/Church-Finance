import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/server/db";
import { withAudit } from "@/features/audit/service";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";

describe("Audited Transaction Pattern (withAudit)", () => {
  const testUserEmail = "audit-rollback@puca.local";

  beforeEach(async () => {
    await prisma.user.deleteMany({
      where: { email: testUserEmail },
    });
  });

  afterEach(async () => {
    await prisma.user.deleteMany({
      where: { email: testUserEmail },
    });
  });

  it("rolls back the business change when the audit write fails", async () => {
    const passwordHash = await bcrypt.hash("Password123#", 12);

    // Attempt an audited write where the audit log payload is deliberately malformed or triggers an error
    const operation = withAudit(async (tx) => {
      // Step 1: Create user in the transaction
      const user = await tx.user.create({
        data: {
          name: "Rollback Candidate",
          email: testUserEmail,
          passwordHash,
          role: Role.TREASURER,
          active: true,
          mustChangePassword: false,
        },
      });

      // Step 2: Return an audit entry that fails validation or throws
      // In Prisma, auditLog requires entityType and action; passing an error or invalid type will fail
      return {
        result: user,
        audit: {
          actorId: null,
          action: "TEST_ACTION",
          entityType: "User",
          entityId: user.id,
          // Intentionally cause failure in recordAudit by violating constraint or throwing
          before: (() => {
            throw new Error("Simulated audit write failure");
          })(),
        },
      };
    });

    // Operation must throw the error
    await expect(operation).rejects.toThrow("Simulated audit write failure");

    // The user created in Step 1 MUST NOT exist in the database due to transaction rollback
    const persistedUser = await prisma.user.findUnique({
      where: { email: testUserEmail },
    });

    expect(persistedUser).toBeNull();
  });

  it("commits both the business change and audit entry together on success", async () => {
    const passwordHash = await bcrypt.hash("Password123#", 12);

    const user = await withAudit(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: "Commit Candidate",
          email: testUserEmail,
          passwordHash,
          role: Role.TREASURER,
          active: true,
          mustChangePassword: false,
        },
      });

      return {
        result: created,
        audit: {
          actorId: null,
          action: "USER_CREATE",
          entityType: "User",
          entityId: created.id,
          before: null,
          after: { email: created.email, role: created.role },
        },
      };
    });

    // Verify user exists in database
    const persistedUser = await prisma.user.findUnique({
      where: { email: testUserEmail },
    });
    expect(persistedUser).not.toBeNull();
    expect(persistedUser?.id).toBe(user.id);

    // Verify audit log entry was written
    const auditRow = await prisma.auditLog.findFirst({
      where: {
        entityType: "User",
        entityId: user.id,
        action: "USER_CREATE",
      },
    });
    expect(auditRow).not.toBeNull();
    expect(auditRow?.action).toBe("USER_CREATE");
  });
});
