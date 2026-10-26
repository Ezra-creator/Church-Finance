import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireSecretaryOrTreasurer } from "@/server/guards";
import { AppError } from "@/lib/errors";
import { Role } from "@prisma/client";

// Mock auth from session
vi.mock("@/server/session", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/server/session";

const mockAuth = vi.mocked(auth as unknown as () => Promise<unknown>);

describe("Statement & Remittance Access Control (requireSecretaryOrTreasurer)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws UNAUTHENTICATED error when no session exists", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(requireSecretaryOrTreasurer()).rejects.toThrow(AppError);
    await expect(requireSecretaryOrTreasurer()).rejects.toThrow("Authentication required.");
  });

  it("throws FORBIDDEN error when user has PRESBYTERY_VIEWER role", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "usr_viewer",
        name: "Presbytery Viewer",
        email: "viewer@puca.local",
        role: Role.PRESBYTERY_VIEWER,
        mustChangePassword: false,
      },
      expires: new Date().toISOString(),
    });

    await expect(requireSecretaryOrTreasurer()).rejects.toThrow(AppError);
    await expect(requireSecretaryOrTreasurer()).rejects.toThrow(
      "You do not have permission to perform this action."
    );
  });

  it("allows access to user with FINANCE_SECRETARY role", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "usr_secretary",
        name: "Finance Secretary",
        email: "secretary@puca.local",
        role: Role.FINANCE_SECRETARY,
        mustChangePassword: false,
      },
      expires: new Date().toISOString(),
    });

    const user = await requireSecretaryOrTreasurer();
    expect(user.id).toBe("usr_secretary");
    expect(user.role).toBe(Role.FINANCE_SECRETARY);
  });

  it("allows access to user with TREASURER role", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "usr_treasurer",
        name: "Treasurer",
        email: "treasurer@puca.local",
        role: Role.TREASURER,
        mustChangePassword: false,
      },
      expires: new Date().toISOString(),
    });

    const user = await requireSecretaryOrTreasurer();
    expect(user.id).toBe("usr_treasurer");
    expect(user.role).toBe(Role.TREASURER);
  });
});
