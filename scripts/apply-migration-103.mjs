/**
 * Apply migration 103 via Supabase's pg_net extension or direct connection.
 * Tries multiple approaches to run DDL.
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

// Parse .env.local
const envContent = readFileSync(".env.local", "utf8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key, {
  db: { schema: "public" },
  auth: { persistSession: false },
});

const statements = [
  "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS is_sample BOOLEAN DEFAULT false",
  "ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS is_sample BOOLEAN DEFAULT false",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_nps INTEGER CHECK (onboarding_nps >= 1 AND onboarding_nps <= 5)",
  "CREATE INDEX IF NOT EXISTS idx_appointments_is_sample ON appointments(realtor_id) WHERE is_sample = true",
  "CREATE INDEX IF NOT EXISTS idx_newsletters_is_sample ON newsletters(realtor_id) WHERE is_sample = true",
];

async function tryCreateExecFunction() {
  // Try to create a temporary SQL execution function
  const createFn = `
    CREATE OR REPLACE FUNCTION _temp_exec_ddl(ddl text)
    RETURNS void AS $$
    BEGIN EXECUTE ddl; END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  // Use the REST API to call a function that creates our helper
  // This won't work via REST either... but let's try via the SQL header trick
  const res = await fetch(`${url}/rest/v1/`, {
    method: "GET",
    headers: {
      "apikey": key,
      "Authorization": `Bearer ${key}`,
    },
  });
  return res.ok;
}

async function runViaPgNet() {
  // Try using pg_net extension if available
  for (const sql of statements) {
    console.log(`Running: ${sql.substring(0, 60)}...`);

    const { data, error } = await supabase.rpc("_temp_exec_ddl", { ddl: sql });
    if (error) {
      if (error.message.includes("could not find the function")) {
        return false; // Function doesn't exist
      }
      console.error(`  Error: ${error.message}`);
    } else {
      console.log("  OK");
    }
  }
  return true;
}

async function verify() {
  console.log("\nVerifying columns...");

  const checks = [
    { table: "appointments", col: "is_sample" },
    { table: "newsletters", col: "is_sample" },
    { table: "users", col: "onboarding_nps" },
  ];

  let allGood = true;
  for (const { table, col } of checks) {
    const { error } = await supabase.from(table).select(col).limit(1);
    if (error) {
      console.log(`  ✗ ${table}.${col} — MISSING`);
      allGood = false;
    } else {
      console.log(`  ✓ ${table}.${col} — exists`);
    }
  }
  return allGood;
}

async function main() {
  console.log("Checking current state...");
  if (await verify()) {
    console.log("\nAll columns already exist! Migration not needed.");
    process.exit(0);
  }

  console.log("\nAttempting migration via RPC...");
  const rpcWorked = await runViaPgNet();

  if (!rpcWorked) {
    console.log("\nRPC not available. Trying direct pg connection...");

    try {
      const pg = await import("pg");
      const Pool = pg.default?.Pool || pg.Pool;

      // Supabase direct connection (transaction mode)
      const connStr = `postgresql://postgres.qcohfohjihazivkforsj:${key}@aws-0-ca-central-1.pooler.supabase.com:5432/postgres`;
      const pool = new Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false } });

      for (const sql of statements) {
        console.log(`Running: ${sql.substring(0, 60)}...`);
        try {
          await pool.query(sql);
          console.log("  OK");
        } catch (err) {
          console.error(`  Error: ${err.message}`);
        }
      }

      await pool.end();
    } catch (err) {
      console.error(`pg connection failed: ${err.message}`);
      console.log("\n--- MANUAL ACTION NEEDED ---");
      console.log("Run these in https://supabase.com/dashboard/project/qcohfohjihazivkforsj/sql/new :");
      for (const sql of statements) console.log(`  ${sql};`);
      process.exit(1);
    }
  }

  // Verify
  console.log("\nVerifying...");
  if (await verify()) {
    console.log("\nMigration 103 applied successfully!");
  } else {
    console.log("\nSome columns still missing. Check errors above.");
    process.exit(1);
  }
}

main().catch(console.error);
