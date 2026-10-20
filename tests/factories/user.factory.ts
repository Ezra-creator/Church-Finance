import { Role, User } from "@prisma/client";

export function buildUserFixture(overrides: Partial<User> = {}): User {
  const id = overrides.id || `user_${Math.random().toString(36).substring(2, 9)}`;
  const now = new Date();

  return {
    id,
    name: overrides.name || "Test Officer",
    email: overrides.email || `${id}@puca.local`,
    passwordHash: overrides.passwordHash || "$2a$12$e8x/k.r/9x1xEXAMPLEHASH",
    role: overrides.role || Role.FINANCE_SECRETARY,
    active: overrides.active ?? true,
    mustChangePassword: overrides.mustChangePassword ?? false,
    failedLogins: overrides.failedLogins ?? 0,
    lockedUntil: overrides.lockedUntil ?? null,
    lastLoginAt: overrides.lastLoginAt ?? null,
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
  };
}
