import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

function findFiles(dir: string, pattern: RegExp): string[] {
  let results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(findFiles(fullPath, pattern));
    } else if (pattern.test(entry.name)) {
      results.push(fullPath);
    }
  }

  return results;
}

describe("Security Architecture - Authorization Guards Coverage", () => {
  it("verifies every server action contains an authorization guard (requireUser, requireRole, or requireSecretaryOrTreasurer)", () => {
    const featuresDir = path.resolve(__dirname, "../../src/features");
    const actionFiles = findFiles(featuresDir, /^actions\.ts$/);

    expect(actionFiles.length).toBeGreaterThanOrEqual(10);

    const violations: string[] = [];

    for (const filePath of actionFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      const relativePath = path.relative(path.resolve(__dirname, "../../"), filePath);

      // Find all exported async functions: export async function name(...)
      const functionMatches = [
        ...content.matchAll(/export\s+async\s+function\s+([a-zA-Z0-9_]+)\s*\(/g),
      ];

      for (const match of functionMatches) {
        const actionName = match[1];
        const startIndex = match.index!;
        // Slice the content starting from this function up to next export or end of file
        const functionBody = content.slice(startIndex, startIndex + 1500);

        const hasGuard =
          functionBody.includes("requireUser(") ||
          functionBody.includes("requireRole(") ||
          functionBody.includes("requireSecretaryOrTreasurer(");

        if (!hasGuard) {
          violations.push(`${relativePath} -> ${actionName} lacks an authorization guard.`);
        }
      }
    }

    expect(
      violations,
      `Found server actions without authorization guards:\n${violations.join("\n")}`
    ).toHaveLength(0);
  });

  it("verifies non-public API routes contain authorization guards or secret verification", () => {
    const apiDir = path.resolve(__dirname, "../../src/app/api");
    const routeFiles = findFiles(apiDir, /^route\.ts$/);

    expect(routeFiles.length).toBeGreaterThanOrEqual(4);

    const violations: string[] = [];

    for (const filePath of routeFiles) {
      const relativePath = path.relative(path.resolve(__dirname, "../../"), filePath);
      const normalizedPath = relativePath.replace(/\\/g, "/");

      // Public exemptions: health monitoring and Auth.js credentials handler
      if (
        normalizedPath.includes("api/health/route.ts") ||
        normalizedPath.includes("api/auth/[...nextauth]/route.ts")
      ) {
        continue;
      }

      const content = fs.readFileSync(filePath, "utf-8");

      // Check for guard calls or bearer secret checks
      const hasGuard =
        content.includes("requireUser(") ||
        content.includes("requireRole(") ||
        content.includes("requireSecretaryOrTreasurer(") ||
        content.includes("CRON_SECRET") ||
        content.includes("authorization");

      if (!hasGuard) {
        violations.push(`${normalizedPath} lacks an authorization check.`);
      }
    }

    expect(
      violations,
      `Found API routes without authorization checks:\n${violations.join("\n")}`
    ).toHaveLength(0);
  });
});
