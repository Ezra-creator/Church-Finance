import { describe, it, expect } from "vitest";
import { validateUploadFile, MAX_FILE_SIZE_BYTES } from "@/lib/storage";
import { AppError } from "@/lib/errors";

describe("Storage Validation (R2 Upload Security)", () => {
  it("accepts valid mime types within 8 MB size limit", () => {
    expect(() => validateUploadFile("image/jpeg", 1024 * 500)).not.toThrow();
    expect(() => validateUploadFile("image/png", 1024 * 1024 * 2)).not.toThrow();
    expect(() => validateUploadFile("image/webp", 1024 * 800)).not.toThrow();
    expect(() => validateUploadFile("application/pdf", 1024 * 1024 * 7)).not.toThrow();
  });

  it("rejects unauthorized file formats (e.g. exe, zip, html)", () => {
    expect(() => validateUploadFile("application/x-msdownload", 1000)).toThrow(AppError);
    expect(() => validateUploadFile("application/zip", 1000)).toThrow(AppError);
    expect(() => validateUploadFile("text/html", 1000)).toThrow(AppError);
    expect(() => validateUploadFile("image/gif", 1000)).toThrow(AppError);
  });

  it("rejects files exceeding 8 MB size limit", () => {
    const tooLarge = MAX_FILE_SIZE_BYTES + 1;
    expect(() => validateUploadFile("image/jpeg", tooLarge)).toThrow(AppError);
  });

  it("rejects zero or negative file sizes", () => {
    expect(() => validateUploadFile("image/jpeg", 0)).toThrow(AppError);
    expect(() => validateUploadFile("image/jpeg", -50)).toThrow(AppError);
  });
});
