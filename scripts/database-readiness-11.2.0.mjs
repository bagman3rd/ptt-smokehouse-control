#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const BUILD = "11.2.0";
const root = process.cwd();
const outDir = path.join(root, "artifacts", "build-11.2.0");
const requireDatabase = process.argv.includes("--require-database");

if (!process.env.DATABASE_URL) {
  const message = "DATABASE_URL is not set; database readiness check was not executed.";
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "database-readiness.json"),
    `${JSON.stringify({ buildVersion: BUILD, status: "SKIPPED", reason: message, generatedAt: new Date().toISOString() }, null, 2)}\n`,
    "utf8"
  );
  console.log(`SKIP — ${message}`);
  process.exit(requireDatabase ? 1 : 0);
}

let PrismaClient;
try {
  ({ PrismaClient } = await import("@prisma/client"));
} catch (error) {
  console.error("FAIL — @prisma/client is unavailable. Run the repository install and prisma generate first.");
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT table_name, column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `);
  const report = {
    buildVersion: BUILD,
    status: "EXECUTED",
    generatedAt: new Date().toISOString(),
    tableCount: new Set(rows.map((row) => row.table_name)).size,
    columnCount: rows.length,
    columns: rows
  };
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "database-readiness.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`PASS — inspected ${report.tableCount} public tables and ${report.columnCount} columns.`);
} finally {
  await prisma.$disconnect();
}
