import { describe, it, expect } from "vitest";
import { normalizeGhanaPhone } from "@/lib/phone";
import { AppError } from "@/lib/errors";

describe("normalizeGhanaPhone", () => {
  it("normalises 10-digit number with leading 0 (0244123456)", () => {
    expect(normalizeGhanaPhone("0244123456")).toBe("+233244123456");
  });

  it("normalises international number with + prefix (+233244123456)", () => {
    expect(normalizeGhanaPhone("+233244123456")).toBe("+233244123456");
  });

  it("normalises international number without + prefix (233244123456)", () => {
    expect(normalizeGhanaPhone("233244123456")).toBe("+233244123456");
  });

  it("normalises 9-digit local number without leading 0 (244123456)", () => {
    expect(normalizeGhanaPhone("244123456")).toBe("+233244123456");
  });

  it("handles spaces, hyphens, and parentheses", () => {
    expect(normalizeGhanaPhone("+233 (024) 412-3456")).toBe("+233244123456");
    expect(normalizeGhanaPhone("024 412 3456")).toBe("+233244123456");
    expect(normalizeGhanaPhone("233-24-412-3456")).toBe("+233244123456");
  });

  it("returns null for empty or null inputs", () => {
    expect(normalizeGhanaPhone(null)).toBeNull();
    expect(normalizeGhanaPhone(undefined)).toBeNull();
    expect(normalizeGhanaPhone("   ")).toBeNull();
  });

  it("throws AppError on invalid length or non-digits", () => {
    expect(() => normalizeGhanaPhone("12345")).toThrow(AppError);
    expect(() => normalizeGhanaPhone("024412345678")).toThrow(AppError);
    expect(() => normalizeGhanaPhone("not-a-phone")).toThrow(AppError);
  });
});
