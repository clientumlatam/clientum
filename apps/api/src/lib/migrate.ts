import { pool } from "@workspace/db";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import { logger } from "./logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function runMigrations(): Promise<void> {
  if (!process.env["DATABASE_URL"]) {
    throw new Error("DATABASE_URL is required for running migrations");
  }

  const migrationsFolder = path.resolve(__dirname, "../../../lib/db/migrations");

  if (!existsSync(migrationsFolder)) {
    logger.warn(
      { migrationsFolder },
      "Migrations folder not found — skipping. Run 'pnpm --filter @workspace/db run generate' to create migrations."
    );
    return;
  }

  const db = drizzle(pool);
  logger.info({ migrationsFolder }, "Running database migrations...");
  await migrate(db, { migrationsFolder });
  logger.info("Database migrations completed successfully");
}
