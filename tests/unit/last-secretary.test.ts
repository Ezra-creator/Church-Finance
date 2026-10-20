import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { prisma } from "@/server/db";
import {
  changeUserRole,
  deactivateUser,
} from "@/features/users/service";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";

describe("Last Secretary Protection & Self-Deactivation Guard", () => {
  const adminEmail = "sole-sec@puca.local";
  const secondSecEmail = "sec2@puca.local";
  let precomputedHash: string;
  let adminUser: { id: string };

  beforeAll(async () => {
    precomputedHash = await bcrypt.hash("TempPass123!", 12);
  });

  beforeEach(async () => {
    await prisma.auditLog.deleteMany({});
    await prisma.user.deleteMany({
      where: { email: { in: [adminEmail, secondSecEmail] } },
    });

    adminUser = await prisma.user.create({
      data: {
        name: "Sole Secretary",
        email: adminEmail,
        passwordHash: precomputedHash,
        role: Role.FINANCE_SECRETARY,
        active: true,
        mustChangePassword: false,
      },
    });
  });

  afterEach(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [adminEmail, secondSecEmail] } },
    });
  });

  it("prevents a user from deactivating themselves", async () => {
    await expect(
      deactivateUser(adminUser.id, adminUser.id)
    ).rejects.toThrowError("You cannot deactivate your own account.");
  });

  it("prevents deactivating the last active finance secretary", async () => {
    // Ensure no other active secretaries exist
    await prisma.user.updateMany({
      where: {
        role: Role.FINANCE_SECRETARY,
        id: { not: adminUser.id },
      },
      data: { active: false },
    });

    const dummyActorId = "external_actor_123";

    await expect(
      deactivateUser(adminUser.id, dummyActorId)
    ).rejects.toThrowError("Cannot deactivate the last active finance secretary.");
  });

  it("prevents demoting the last active finance secretary", async () => {
    // Ensure no other active secretaries exist
    await prisma.user.updateMany({
      where: {
        role: Role.FINANCE_SECRETARY,
        id: { not: adminUser.id },
      },
      data: { active: false },
    });

    const dummyActorId = "external_actor_123";

    await expect(
      changeUserRole(
        { userId: adminUser.id, role: Role.TREASURER },
        dummyActorId
      )
    ).rejects.toThrowError("Cannot demote the last active finance secretary.");
  });

  it("allows demoting or deactivating a secretary if another active secretary exists", async () => {
    const sec2 = await prisma.user.create({
      data: {
        name: "Second Secretary",
        email: secondSecEmail,
        passwordHash: precomputedHash,
        role: Role.FINANCE_SECRETARY,
        active: true,
        mustChangePassword: false,
      },
    });

    // 2 active secretaries exist, demoting adminUser by sec2 should succeed
    const updated = await changeUserRole(
      { userId: adminUser.id, role: Role.TREASURER },
      sec2.id
    );

    expect(updated.role).toBe(Role.TREASURER);

    // Deactivating the demoted user should succeed
    const deactivated = await deactivateUser(adminUser.id, sec2.id);
    expect(deactivated.active).toBe(false);
  });
});
