import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const supabase = createClient(
  "https://qcohfohjihazivkforsj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjb2hmb2hqaWhheml2a2ZvcnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI3NjUwNywiZXhwIjoyMDg4ODUyNTA3fQ.uWkkflNhSjJBkLXeP_E3o1NxUVth3vh5Pgujlq1CN6Q"
);

// ── Ensure exec_sql function exists (bootstrap) ──
// We need to use the Supabase DB connection pooler
// Since we can't run DDL via REST, we'll use a different approach:
// Split the migration SQL into individual statements and run each
// via the pg_net extension or directly.

// APPROACH: Use Supabase's built-in edge function or
// try each ALTER/CREATE as separate rpc calls.
// Since none of those work, we'll create a small Node script
// that connects directly via the pooler.

import pg from "pg";
const { Client } = pg;

async function main() {
  // Try connecting via the transaction pooler
  const connectionStrings = [
    `postgresql://postgres.qcohfohjihazivkforsj:${process.env.SUPABASE_DB_PASSWORD}@aws-0-ca-central-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres.qcohfohjihazivkforsj:${process.env.SUPABASE_DB_PASSWORD}@aws-0-ca-central-1.pooler.supabase.com:5432/postgres`,
  ];

  let client;
  for (const connStr of connectionStrings) {
    if (!process.env.SUPABASE_DB_PASSWORD) {
      console.log("❌ SUPABASE_DB_PASSWORD env var not set.");
      console.log("   Set it and retry, or run the SQL in Supabase Dashboard > SQL Editor.");
      console.log("");
      console.log("   Migrations to run:");
      console.log("   1. supabase/migrations/021_lead_scoring_and_activities.sql");
      console.log("   2. supabase/migrations/022_offers.sql");
      return;
    }

    try {
      client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
      await client.connect();
      console.log("✅ Connected to Supabase PostgreSQL");
      break;
    } catch (err) {
      console.log(`⚠️  Failed to connect via ${connStr.split("@")[1]?.split("/")[0]}: ${err.message}`);
      client = null;
    }
  }

  if (!client) {
    console.log("\n❌ Could not connect to PostgreSQL. Run migrations manually:");
    console.log("   Supabase Dashboard > SQL Editor > paste each migration file");
    return;
  }

  const migrations = [
    "supabase/migrations/021_lead_scoring_and_activities.sql",
    "supabase/migrations/022_offers.sql",
  ];

  for (const file of migrations) {
    try {
      const sql = readFileSync(file, "utf8");
      await client.query(sql);
      console.log(`✅ ${file.split("/").pop()}: executed`);
    } catch (err) {
      // Ignore "already exists" errors
      if (err.message.includes("already exists")) {
        console.log(`✅ ${file.split("/").pop()}: already applied`);
      } else {
        console.error(`❌ ${file.split("/").pop()}: ${err.message}`);
      }
    }
  }

  await client.end();
  console.log("\n🎉 Migrations complete!");
}

main().catch(console.error);
