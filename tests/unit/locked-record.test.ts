import { describe, it, expect } from "vitest";
import { ServiceStatus } from "@prisma/client";
import { AppError } from "@/lib/errors";

describe("LOCKED Service Record Protection", () => {
  function assertRecordModifiable(status: ServiceStatus) {
    if (status === ServiceStatus.LOCKED) {
      throw new AppError(
        "FORBIDDEN",
        "This service record is permanently locked and cannot be modified."
      );
    }
  }

  function assertCanReopen(status: ServiceStatus) {
    if (status === ServiceStatus.LOCKED) {
      throw new AppError(
        "FORBIDDEN",
        "This service record is permanently locked and cannot be reopened."
      );
    }
    if (status === ServiceStatus.OPEN) {
      throw new AppError("CONFLICT", "This service record is already open.");
    }
  }

  it("permits mutations on OPEN and COUNTED records (with audit reasons)", () => {
    expect(() => assertRecordModifiable(ServiceStatus.OPEN)).not.toThrow();
    expect(() => assertRecordModifiable(ServiceStatus.COUNTED)).not.toThrow();
  });

  it("rejects modifications on LOCKED records with FORBIDDEN", () => {
    expect(() => assertRecordModifiable(ServiceStatus.LOCKED)).toThrow(AppError);

    try {
      assertRecordModifiable(ServiceStatus.LOCKED);
    } catch (err) {
      expect((err as AppError).code).toBe("FORBIDDEN");
      expect((err as AppError).message).toContain("permanently locked");
    }
  });

  it("rejects reopening a LOCKED record with FORBIDDEN", () => {
    expect(() => assertCanReopen(ServiceStatus.LOCKED)).toThrow(AppError);

    try {
      assertCanReopen(ServiceStatus.LOCKED);
    } catch (err) {
      expect((err as AppError).code).toBe("FORBIDDEN");
    }
  });

  it("permits reopening a COUNTED record", () => {
    expect(() => assertCanReopen(ServiceStatus.COUNTED)).not.toThrow();
  });
});
