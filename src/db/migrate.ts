import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import fs from "fs";
import path from "path";

config({ path: ".env.local" });

async function migrate() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ DATABASE_URL is not set in .env.local!");
    process.exit(1);
  }

  const sql = neon(dbUrl);
  console.log("🚀 Applying Drizzle migrations to Neon PostgreSQL...");

  const drizzleDir = path.join(process.cwd(), "drizzle");
  const files = fs.readdirSync(drizzleDir).filter((f) => f.endsWith(".sql"));

  for (const file of files) {
    console.log(`📄 Executing ${file}...`);
    const sqlContent = fs.readFileSync(path.join(drizzleDir, file), "utf8");
    // Execute SQL script
    const statements = sqlContent
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const stmt of statements) {
      await sql.query(stmt);
    }
    console.log(`✅ ${file} applied successfully.`);
  }

  console.log("🎉 All tables successfully created in Neon database!");
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
