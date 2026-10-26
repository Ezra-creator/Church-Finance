/**
 * PUCA Finance — Database Backup Routine
 * Connects to the local MySQL or TiDB Cloud database, exports all tables into
 * a dated SQL dump file (backups/backup_YYYYMMDD_HHMMSS.sql), and records an
 * audit log entry confirming the backup completion.
 *
 * Usage: pnpm backup
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

function getTimestampString(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

interface DBConfig {
  user: string;
  password?: string;
  host: string;
  port: string;
  database: string;
}

function parseDatabaseUrl(url: string): DBConfig {
  const parsed = new URL(url);
  return {
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    host: parsed.hostname,
    port: parsed.port || "3306",
    database: parsed.pathname.replace(/^\//, ""),
  };
}

async function exportUsingPrisma(dbName: string, filePath: string) {
  // Pure TypeScript SQL Dump Generator for TiDB Cloud / systems without mysqldump binary
  const writeStream = fs.createWriteStream(filePath, { encoding: "utf8" });
  writeStream.write(`-- PUCA Finance Database Backup\n`);
  writeStream.write(`-- Generated at: ${new Date().toISOString()}\n`);
  writeStream.write(`-- Database: ${dbName}\n\n`);
  writeStream.write(`SET FOREIGN_KEY_CHECKS = 0;\n\n`);

  const rawTables = await prisma.$queryRaw<Array<Record<string, string>>>`SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'`;
  const tableNames = rawTables.map((r) => Object.values(r)[0]);

  for (const table of tableNames) {
    writeStream.write(`-- --------------------------------------------------------\n`);
    writeStream.write(`-- Table structure for \`${table}\`\n`);
    writeStream.write(`-- --------------------------------------------------------\n`);
    writeStream.write(`DROP TABLE IF EXISTS \`${table}\`;\n`);

    const createRows = await prisma.$queryRawUnsafe<Array<Record<string, string>>>(`SHOW CREATE TABLE \`${table}\``);
    const createSql = createRows[0]?.["Create Table"];
    if (createSql) {
      writeStream.write(`${createSql};\n\n`);
    }

    const rows = await prisma.$queryRawUnsafe<Array<Record<string, any>>>(`SELECT * FROM \`${table}\``);
    if (rows.length > 0) {
      writeStream.write(`-- Dumping data for \`${table}\` (${rows.length} rows)\n`);
      for (const row of rows) {
        const columns = Object.keys(row).map((k) => `\`${k}\``).join(", ");
        const values = Object.values(row)
          .map((v) => {
            if (v === null || v === undefined) return "NULL";
            if (typeof v === "number" || typeof v === "bigint") return String(v);
            if (typeof v === "boolean") return v ? "1" : "0";
            if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace("T", " ")}'`;
            if (typeof v === "object") {
              const str = JSON.stringify(v);
              return `'${str.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
            }
            return `'${String(v).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
          })
          .join(", ");
        writeStream.write(`INSERT INTO \`${table}\` (${columns}) VALUES (${values});\n`);
      }
      writeStream.write("\n");
    }
  }

  writeStream.write(`SET FOREIGN_KEY_CHECKS = 1;\n`);
  writeStream.end();

  await new Promise<void>((resolve, reject) => {
    writeStream.on("finish", () => resolve());
    writeStream.on("error", reject);
  });
}

async function findMysqldumpPath(): Promise<string | null> {
  const commonLocations = [
    "mysqldump",
    "C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe",
    "C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysqldump.exe",
    "/usr/bin/mysqldump",
    "/usr/local/bin/mysqldump",
  ];

  for (const loc of commonLocations) {
    try {
      execSync(`"${loc}" --version`, { stdio: "ignore" });
      return loc;
    } catch {
      // Continue checking next location
    }
  }
  return null;
}

export async function runBackup(): Promise<{ filePath: string; sizeBytes: number }> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL environment variable is missing.");
  }

  const dbConfig = parseDatabaseUrl(dbUrl);
  const backupsDir = path.resolve(process.cwd(), "backups");
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const timestamp = getTimestampString();
  const filename = `backup_${timestamp}.sql`;
  const filePath = path.join(backupsDir, filename);

  const mysqldumpPath = await findMysqldumpPath();
  let usedMethod = "TypeScript Direct Exporter";

  if (mysqldumpPath) {
    try {
      const passwordArg = dbConfig.password ? `-p"${dbConfig.password}"` : "";
      const cmd = `"${mysqldumpPath}" -h ${dbConfig.host} -P ${dbConfig.port} -u ${dbConfig.user} ${passwordArg} --single-transaction --quick "${dbConfig.database}" > "${filePath}"`;
      execSync(cmd, { stdio: "pipe", shell: "powershell" });
      usedMethod = `mysqldump (${mysqldumpPath})`;
    } catch {
      // If mysqldump failed, fallback cleanly to TypeScript exporter
      await exportUsingPrisma(dbConfig.database, filePath);
    }
  } else {
    await exportUsingPrisma(dbConfig.database, filePath);
  }

  const stats = fs.statSync(filePath);

  // Find actor for audit record
  const secretary = await prisma.user.findFirst({
    where: { role: Role.FINANCE_SECRETARY, active: true },
  });
  const actorId = secretary?.id || (await prisma.user.findFirst())?.id || "system";

  // Record audit log entry
  await prisma.auditLog.create({
    data: {
      actorId: secretary?.id || null,
      action: "DATABASE_BACKUP_COMPLETED",
      entityType: "DATABASE",
      entityId: filename,
      after: {
        filename,
        sizeBytes: stats.size,
        method: usedMethod,
        timestamp: new Date().toISOString(),
      },
    },
  });

  return { filePath, sizeBytes: stats.size };
}

async function main() {
  console.log("PUCA Finance: Starting database backup...");
  try {
    const result = await runBackup();
    console.log(`PUCA Finance: Backup complete.`);
    console.log(`- File: ${result.filePath}`);
    console.log(`- Size: ${(result.sizeBytes / 1024).toFixed(2)} KB`);
    console.log(`- Audit: DATABASE_BACKUP_COMPLETED logged.`);
  } catch (error) {
    console.error("PUCA Finance: Backup failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute if run directly
if (process.argv[1] && process.argv[1].endsWith("backup.ts")) {
  main();
}
