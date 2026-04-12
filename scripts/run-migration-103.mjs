import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

// Parse .env.local manually (no dotenv dependency)
const envContent = readFileSync(".env.local", "utf8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE env vars");
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  // Test connection
  const { data, error } = await supabase.from("users").select("id").limit(1);
  if (error) {
    console.error("Connection failed:", error.message);
    process.exit(1);
  }
  console.log("Connected OK");

  // Check if columns already exist by querying them
  const { error: listingsErr } = await supabase.from("listings").select("is_sample").limit(1);
  if (!listingsErr) {
    console.log("is_sample already exists on listings");
  } else {
    console.log("is_sample MISSING on listings:", listingsErr.message);
  }

  const { error: apptErr } = await supabase.from("appointments").select("is_sample").limit(1);
  if (!apptErr) {
    console.log("is_sample already exists on appointments");
  } else {
    console.log("is_sample MISSING on appointments:", apptErr.message);
  }

  const { error: nlErr } = await supabase.from("newsletters").select("is_sample").limit(1);
  if (!nlErr) {
    console.log("is_sample already exists on newsletters");
  } else {
    console.log("is_sample MISSING on newsletters:", nlErr.message);
  }

  const { error: npsErr } = await supabase.from("users").select("onboarding_nps").limit(1);
  if (!npsErr) {
    console.log("onboarding_nps already exists on users");
  } else {
    console.log("onboarding_nps MISSING on users:", npsErr.message);
  }

  // If any columns are missing, instruct user
  const missing = [listingsErr, apptErr, nlErr, npsErr].filter(Boolean);
  if (missing.length > 0) {
    console.log("\n--- MIGRATION NEEDED ---");
    console.log("Run the SQL in supabase/migrations/103_is_sample_columns.sql");
    console.log("via the Supabase SQL Editor at:");
    console.log(`https://supabase.com/dashboard/project/qcohfohjihazivkforsj/sql/new`);
    process.exit(1);
  } else {
    console.log("\nAll columns exist. Migration 103 already applied.");
  }
}

run().catch(console.error);
