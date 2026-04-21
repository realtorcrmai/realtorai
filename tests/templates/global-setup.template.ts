/**
 * Playwright Global Setup — Realtors360 CRM
 *
 * Handles:
 * 1. Demo user login via NextAuth credentials provider
 * 2. Save authenticated state for reuse across tests
 * 3. Seed test data via Supabase admin client
 * 4. Clean up stale test data from previous runs
 */
import { chromium, type FullConfig } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const DEMO_EMAIL = process.env.DEMO_EMAIL || 'demo@realestatecrm.com';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'demo1234';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const AUTH_STATE_PATH = './tests/e2e/.auth/demo-user.json';

// Supabase admin client for test data seeding
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function globalSetup(config: FullConfig) {
  console.log('[Global Setup] Starting...');

  // === Step 1: Clean up stale test data ===
  await cleanupTestData();

  // === Step 2: Seed required test data ===
  await seedTestData();

  // === Step 3: Login and save auth state ===
  await authenticateDemoUser();

  console.log('[Global Setup] Complete.');
}

async function cleanupTestData() {
  console.log('[Global Setup] Cleaning up stale test data...');

  // Delete test contacts (prefixed with "TEST_" for identification)
  const { error: contactErr } = await supabaseAdmin
    .from('contacts')
    .delete()
    .like('name', 'TEST_%');

  if (contactErr) {
    console.warn('[Global Setup] Contact cleanup warning:', contactErr.message);
  }

  // Delete test listings
  const { error: listingErr } = await supabaseAdmin
    .from('listings')
    .delete()
    .like('address', 'TEST_%');

  if (listingErr) {
    console.warn('[Global Setup] Listing cleanup warning:', listingErr.message);
  }

  // Delete test appointments
  const { error: showingErr } = await supabaseAdmin
    .from('appointments')
    .delete()
    .like('buyer_agent_name', 'TEST_%');

  if (showingErr) {
    console.warn('[Global Setup] Showing cleanup warning:', showingErr.message);
  }
}

async function seedTestData() {
  console.log('[Global Setup] Seeding test data...');

  // Get demo user's realtor_id
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', DEMO_EMAIL)
    .single();

  if (!user) {
    throw new Error(`Demo user not found: ${DEMO_EMAIL}`);
  }

  const realtorId = user.id;

  // Seed a test contact for use in E2E tests
  const { error: contactErr } = await supabaseAdmin
    .from('contacts')
    .upsert(
      {
        id: '00000000-0000-0000-0000-000000000001',
        realtor_id: realtorId,
        name: 'TEST_E2E Contact',
        email: 'test-e2e@example.com',
        phone: '+16045551234',
        type: 'buyer',
        pref_channel: 'sms',
        casl_consent_given: true,
        casl_consent_date: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );

  if (contactErr) {
    console.warn('[Global Setup] Contact seed warning:', contactErr.message);
  }

  // Seed a test listing
  const { error: listingErr } = await supabaseAdmin
    .from('listings')
    .upsert(
      {
        id: '00000000-0000-0000-0000-000000000002',
        realtor_id: realtorId,
        address: 'TEST_123 Main Street, Vancouver, BC',
        property_type: 'detached',
        list_price: 1500000,
        status: 'active',
        bedrooms: 4,
        bathrooms: 3,
      },
      { onConflict: 'id' },
    );

  if (listingErr) {
    console.warn('[Global Setup] Listing seed warning:', listingErr.message);
  }

  console.log('[Global Setup] Test data seeded successfully.');
}

async function authenticateDemoUser() {
  console.log('[Global Setup] Authenticating demo user...');

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to login page
    await page.goto(`${BASE_URL}/login`);

    // Fill demo credentials
    await page.getByLabel('Email').fill(DEMO_EMAIL);
    await page.getByLabel('Password').fill(DEMO_PASSWORD);

    // Click login button
    await page.getByRole('button', { name: /sign in|log in|demo/i }).click();

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 15_000 });

    // Verify we're logged in
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 5_000 }).catch(() => {
      // Fallback: just check we're on the dashboard URL
      if (!page.url().includes('dashboard')) {
        throw new Error('Login failed — not redirected to dashboard');
      }
    });

    // Save auth state (cookies + localStorage)
    await context.storageState({ path: AUTH_STATE_PATH });

    console.log('[Global Setup] Auth state saved to:', AUTH_STATE_PATH);
  } catch (error) {
    console.error('[Global Setup] Authentication failed:', error);
    // Take a screenshot for debugging
    await page.screenshot({ path: './test-results/global-setup-failure.png' });
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
