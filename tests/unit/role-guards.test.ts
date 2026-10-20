import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireUser, requireRole } from "@/server/guards";
import { AppError } from "@/lib/errors";
import { Role } from "@prisma/client";

// Mock auth from session
vi.mock("@/server/session", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/server/session";

const mockAuth = vi.mocked(auth as unknown as () => Promise<unknown>);

describe("Role & Session Guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requireUser", () => {
    it("throws UNAUTHENTICATED error when no session exists", async () => {
      mockAuth.mockResolvedValue(null);

      await expect(requireUser()).rejects.toThrow(AppError);
      await expect(requireUser()).rejects.toThrow("Authentication required.");
    });

    it("returns user object when authenticated", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "usr_123",
          name: "Test User",
          email: "user@puca.local",
          role: Role.TREASURER,
          mustChangePassword: false,
        },
        expires: new Date().toISOString(),
      });

      const user = await requireUser();
      expect(user.id).toBe("usr_123");
      expect(user.role).toBe(Role.TREASURER);
    });
  });

  describe("requireRole", () => {
    it("throws FORBIDDEN error when user role is not permitted", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "usr_123",
          name: "Viewer",
          email: "viewer@puca.local",
          role: Role.PRESBYTERY_VIEWER,
          mustChangePassword: false,
        },
        expires: new Date().toISOString(),
      });

      await expect(
        requireRole(Role.FINANCE_SECRETARY, Role.TREASURER)
      ).rejects.toThrow(AppError);

      await expect(
        requireRole(Role.FINANCE_SECRETARY)
      ).rejects.toThrow("You do not have permission to perform this action.");
    });

    it("succeeds when user possesses the requested role", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "usr_sec",
          name: "Secretary",
          email: "sec@puca.local",
          role: Role.FINANCE_SECRETARY,
          mustChangePassword: false,
        },
        expires: new Date().toISOString(),
      });

      const user = await requireRole(Role.FINANCE_SECRETARY);
      expect(user.role).toBe(Role.FINANCE_SECRETARY);
    });

    it("succeeds when user matches one of several permitted roles", async () => {
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

      const user = await requireRole(
        Role.FINANCE_SECRETARY,
        Role.TREASURER
      );
      expect(user.role).toBe(Role.TREASURER);
    });
  });
});
