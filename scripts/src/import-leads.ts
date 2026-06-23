import { db, conversationsTable } from "@workspace/db";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const ADMIN_USER_ID = "admin_clientum";
const CSV_PATH = path.resolve(process.cwd(), "../files (9)/clientum_leads.csv");

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

async function importLeads() {
  const raw = fs.readFileSync(CSV_PATH, "utf-8");
  const lines = raw.split("\n").filter((l) => l.trim().length > 0);
  const header = parseCSVLine(lines[0]);

  console.log("📋 Columnas CSV:", header.join(" | "));

  const idxPrioridad = header.indexOf("Prioridad");
  const idxScore = header.indexOf("Score");
  const idxUrl = header.indexOf("GitHub URL");
  const idxOwner = header.indexOf("Owner");
  const idxResumen = header.indexOf("Resumen del proyecto");
  const idxPorQue = header.indexOf("Por qué es lead de Clientum");

  const rows = lines.slice(1).map((l) => parseCSVLine(l));
  console.log(`📊 Total filas: ${rows.length}`);

  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const prioridad = row[idxPrioridad] ?? "";
    const score = row[idxScore] ?? "";
    const url = row[idxUrl] ?? "";
    const owner = row[idxOwner] ?? "";
    const resumen = row[idxResumen] ?? "";
    const porQue = row[idxPorQue] ?? "";

    if (!owner) {
      skipped++;
      continue;
    }

    const leadStatus = prioridad === "Alta" ? "qualified" : "new";

    const notes = [
      `Prioridad: ${prioridad} | Score: ${score}`,
      `GitHub: ${url}`,
      `Proyecto: ${resumen}`,
      `Por qué Clientum: ${porQue}`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await db.insert(conversationsTable).values({
        id: randomUUID(),
        userId: ADMIN_USER_ID,
        phoneNumber: url || `github:${owner}`,
        contactName: owner,
        channel: "imported",
        leadStatus,
        leadNotes: notes,
        lastMessageAt: new Date(),
        createdAt: new Date(),
      });
      inserted++;
      process.stdout.write(`   ✅ ${owner} (${prioridad})\n`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("duplicate") || msg.includes("unique")) {
        skipped++;
        process.stdout.write(`   ⏭️  ${owner} ya existe\n`);
      } else {
        console.error(`   ❌ Error en ${owner}:`, msg);
        skipped++;
      }
    }
  }

  console.log(`\n🎉 Importación completa: ${inserted} insertados, ${skipped} omitidos.`);
  process.exit(0);
}

importLeads().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
