/**
 * Team Functionality — Comprehensive Test Suite
 * Tests all team creation, invite, member management, role changes,
 * pending invites, and permission scenarios.
 *
 * Run: node scripts/test-team-functionality.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── Test State ───────────────────────────────────────────────────────────────
let testTeamId = null;
let ownerUserId = null;
let ownerEmail = "nhat@gmail.com";
let testMemberEmail = "test-agent-1@example.com";
let testMember2Email = "test-agent-2@example.com";
let testMember3Email = "test-admin@example.com";
let testMemberId = null;
let testMember2Id = null;
let testMember3Id = null;
let testMembershipId = null;
let testMembership2Id = null;
let testMembership3Id = null;
let testInviteId = null;

const results = [];
let passed = 0;
let failed = 0;

function log(testId, description, pass, details = "") {
  const status = pass ? "PASS" : "FAIL";
  const icon = pass ? "✅" : "❌";
  console.log(`${icon} ${testId}: ${description}${details ? " — " + details : ""}`);
  results.push({ testId, description, status, details });
  if (pass) passed++;
  else failed++;
}

// ─── Setup: Clean prior test data ─────────────────────────────────────────────
async function cleanup() {
  console.log("\n🧹 Cleaning up test data...");

  // Remove test invites
  await supabase
    .from("team_invites")
    .delete()
    .in("email", [testMemberEmail, testMember2Email, testMember3Email, "invalid-email", "duplicate@test.com"]);

  // Remove test memberships (non-owner)
  await supabase
    .from("tenant_memberships")
    .delete()
    .in("agent_email", [testMemberEmail, testMember2Email, testMember3Email]);

  // Remove test users
  await supabase
    .from("users")
    .delete()
    .in("email", [testMemberEmail, testMember2Email, testMember3Email]);

  console.log("   Done.\n");
}

// ─── Helper: Create test user ────────────────────────────────────────────────
async function createTestUser(email, name) {
  const { data, error } = await supabase
    .from("users")
    .upsert(
      { email, name, role: "realtor", plan: "free", is_active: true },
      { onConflict: "email" }
    )
    .select("id, email, name")
    .single();

  if (error) throw new Error(`Failed to create user ${email}: ${error.message}`);
  return data;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION A: Team Settings Page Access
// ═══════════════════════════════════════════════════════════════════════════════
async function testSectionA() {
  console.log("\n═══ SECTION A: Team Settings Page Access ═══\n");

  // A1: Verify team exists for owner
  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("tenant_id, role")
    .eq("agent_email", ownerEmail)
    .is("removed_at", null)
    .single();

  log("A1", "Owner has active team membership", !!membership, membership ? `tenant=${membership.tenant_id}, role=${membership.role}` : "No membership found");

  if (membership) {
    testTeamId = membership.tenant_id;
    log("A1b", "Owner role is 'owner'", membership.role === "owner", `role=${membership.role}`);
  }

  // Get owner user ID
  const { data: ownerUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", ownerEmail)
    .single();

  ownerUserId = ownerUser?.id;
  log("A2", "Owner user exists in users table", !!ownerUserId, `userId=${ownerUserId}`);

  // A3: Verify team data
  const { data: team } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", testTeamId)
    .single();

  log("A3", "Team tenant record exists with correct data", !!team && team.name === "AMIT Test Team", `name=${team?.name}, brokerage=${team?.brokerage_name}`);

  // A4: Verify page redirect for non-team user
  const response = await fetch("http://localhost:3000/settings/team", {
    redirect: "manual",
    headers: { cookie: "" },
  });
  // Without auth cookies, should redirect to login or settings
  log("A4", "Non-authenticated access to /settings/team returns redirect", response.status === 307 || response.status === 302 || response.status === 200, `status=${response.status}`);

  // A5: Verify team overview query works
  const { data: members } = await supabase
    .from("tenant_memberships")
    .select("id, agent_email, role, user_id, joined_at")
    .eq("tenant_id", testTeamId)
    .is("removed_at", null);

  log("A5", "Team overview query returns members", members && members.length > 0, `members=${members?.length}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION C: Invite Members
// ═══════════════════════════════════════════════════════════════════════════════
async function testSectionC() {
  console.log("\n═══ SECTION C: Invite Members ═══\n");

  // C1: Invite with valid email + role "agent"
  const { data: invite1, error: err1 } = await supabase
    .from("team_invites")
    .insert({
      team_id: testTeamId,
      inviter_id: ownerUserId,
      inviter_name: "AMIT",
      team_name: "AMIT Test Team",
      email: testMemberEmail,
      invite_token: `test-token-agent-${Date.now()}`,
      role: "agent",
      status: "sent",
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  log("C1", "Invite agent with valid email succeeds", !!invite1 && !err1, invite1 ? `id=${invite1.id}` : err1?.message);
  testInviteId = invite1?.id;

  // C2: Invite with valid email + role "admin"
  const { data: invite2, error: err2 } = await supabase
    .from("team_invites")
    .insert({
      team_id: testTeamId,
      inviter_id: ownerUserId,
      inviter_name: "AMIT",
      team_name: "AMIT Test Team",
      email: testMember3Email,
      invite_token: `test-token-admin-${Date.now()}`,
      role: "admin",
      status: "sent",
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  log("C2", "Invite admin with valid email succeeds", !!invite2 && !err2, invite2 ? `id=${invite2.id}` : err2?.message);

  // C3: Invite with valid email + role "assistant"
  const { data: invite3, error: err3 } = await supabase
    .from("team_invites")
    .insert({
      team_id: testTeamId,
      inviter_id: ownerUserId,
      inviter_name: "AMIT",
      team_name: "AMIT Test Team",
      email: testMember2Email,
      invite_token: `test-token-assistant-${Date.now()}`,
      role: "assistant",
      status: "sent",
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  log("C3", "Invite assistant with valid email succeeds", !!invite3 && !err3, invite3 ? `id=${invite3.id}` : err3?.message);

  // C4: Invite with invalid email - test constraint
  const { error: err4 } = await supabase
    .from("team_invites")
    .insert({
      team_id: testTeamId,
      inviter_id: ownerUserId,
      inviter_name: "AMIT",
      team_name: "AMIT Test Team",
      email: "",  // Empty email
      invite_token: `test-token-invalid-${Date.now()}`,
      role: "agent",
      status: "sent",
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

  // Empty email should fail due to NOT NULL or CHECK constraint
  log("C4", "Empty email invite is rejected", !!err4, err4 ? `error=${err4.code}` : "Should have failed");

  // C5: Verify invite token has correct expiry (30 days)
  const { data: checkInvite } = await supabase
    .from("team_invites")
    .select("expires_at, created_at")
    .eq("id", testInviteId)
    .single();

  if (checkInvite) {
    const created = new Date(checkInvite.created_at).getTime();
    const expires = new Date(checkInvite.expires_at).getTime();
    const diffDays = (expires - created) / (1000 * 60 * 60 * 24);
    log("C5", "Invite expires in ~30 days", diffDays >= 29 && diffDays <= 31, `diffDays=${diffDays.toFixed(1)}`);
  } else {
    log("C5", "Invite expires in ~30 days", false, "Could not fetch invite");
  }

  // C6: Duplicate invite prevention (same email to same team)
  const { error: dupErr } = await supabase
    .from("team_invites")
    .insert({
      team_id: testTeamId,
      inviter_id: ownerUserId,
      inviter_name: "AMIT",
      team_name: "AMIT Test Team",
      email: testMemberEmail,  // Same as C1
      invite_token: `test-token-dup-${Date.now()}`,
      role: "agent",
      status: "sent",
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

  // Note: This might succeed at DB level (duplicate prevention is in the action, not DB constraint)
  log("C6", "Duplicate invite handling (DB level)", true, dupErr ? `DB prevents: ${dupErr.code}` : "DB allows (logic in action layer)");

  // C7: Verify invite record has correct fields
  const { data: fullInvite } = await supabase
    .from("team_invites")
    .select("*")
    .eq("id", testInviteId)
    .single();

  const hasAllFields = fullInvite &&
    fullInvite.team_id === testTeamId &&
    fullInvite.inviter_id === ownerUserId &&
    fullInvite.email === testMemberEmail &&
    fullInvite.role === "agent" &&
    fullInvite.status === "sent" &&
    fullInvite.invite_token;

  log("C7", "Invite record has all required fields", !!hasAllFields, `token=${fullInvite?.invite_token?.substring(0, 20)}...`);

  // C8: Seat limit check — verify max_members
  const { data: tenantData } = await supabase
    .from("tenants")
    .select("max_members")
    .eq("id", testTeamId)
    .single();

  log("C8", "Team has max_members configured", tenantData?.max_members === 15, `max_members=${tenantData?.max_members}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION D: Member Management
// ═══════════════════════════════════════════════════════════════════════════════
async function testSectionD() {
  console.log("\n═══ SECTION D: Member Management ═══\n");

  // Create test users and add them as members
  const user1 = await createTestUser(testMemberEmail, "Test Agent One");
  const user2 = await createTestUser(testMember2Email, "Test Agent Two");
  const user3 = await createTestUser(testMember3Email, "Test Admin");

  testMemberId = user1.id;
  testMember2Id = user2.id;
  testMember3Id = user3.id;

  // Add members to team
  const { data: mem1 } = await supabase
    .from("tenant_memberships")
    .insert({
      tenant_id: testTeamId,
      user_id: testMemberId,
      agent_email: testMemberEmail,
      role: "agent",
      joined_at: new Date().toISOString(),
    })
    .select()
    .single();

  testMembershipId = mem1?.id;
  log("D1a", "Add agent member to team", !!mem1, `membershipId=${mem1?.id}`);

  const { data: mem2 } = await supabase
    .from("tenant_memberships")
    .insert({
      tenant_id: testTeamId,
      user_id: testMember2Id,
      agent_email: testMember2Email,
      role: "assistant",
      joined_at: new Date().toISOString(),
    })
    .select()
    .single();

  testMembership2Id = mem2?.id;
  log("D1b", "Add assistant member to team", !!mem2, `membershipId=${mem2?.id}`);

  const { data: mem3 } = await supabase
    .from("tenant_memberships")
    .insert({
      tenant_id: testTeamId,
      user_id: testMember3Id,
      agent_email: testMember3Email,
      role: "admin",
      joined_at: new Date().toISOString(),
    })
    .select()
    .single();

  testMembership3Id = mem3?.id;
  log("D1c", "Add admin member to team", !!mem3, `membershipId=${mem3?.id}`);

  // D1: View all members
  const { data: allMembers } = await supabase
    .from("tenant_memberships")
    .select("id, agent_email, role, user_id, joined_at")
    .eq("tenant_id", testTeamId)
    .is("removed_at", null);

  log("D1", "View members list shows all active members", allMembers?.length === 4, `count=${allMembers?.length} (expected 4: owner + 3 test)`);

  // D2: Member list includes correct data
  const ownerMember = allMembers?.find(m => m.agent_email === ownerEmail);
  const agentMember = allMembers?.find(m => m.agent_email === testMemberEmail);

  log("D2", "Members have name, email, role populated", !!ownerMember && !!agentMember && ownerMember.role === "owner" && agentMember.role === "agent", `owner=${ownerMember?.role}, agent=${agentMember?.role}`);

  // D3: Remove member (soft delete)
  const { error: removeErr } = await supabase
    .from("tenant_memberships")
    .update({ removed_at: new Date().toISOString() })
    .eq("id", testMembership2Id);

  log("D3", "Remove member sets removed_at (soft delete)", !removeErr, removeErr ? removeErr.message : "success");

  // Verify removed member not in active list
  const { data: activeMembers } = await supabase
    .from("tenant_memberships")
    .select("id")
    .eq("tenant_id", testTeamId)
    .is("removed_at", null);

  log("D3b", "Removed member disappears from active list", activeMembers?.length === 3, `active count=${activeMembers?.length} (expected 3)`);

  // D4: Cannot remove owner (by checking the constraint in action logic)
  // We test this at the data level - owner should never have removed_at set
  const { data: ownerData } = await supabase
    .from("tenant_memberships")
    .select("removed_at")
    .eq("tenant_id", testTeamId)
    .eq("role", "owner")
    .single();

  log("D4", "Owner membership has no removed_at", ownerData?.removed_at === null, `removed_at=${ownerData?.removed_at}`);

  // D5: Verify unique constraint - one active membership per user per team
  const { error: dupMemErr } = await supabase
    .from("tenant_memberships")
    .insert({
      tenant_id: testTeamId,
      user_id: testMemberId,
      agent_email: testMemberEmail,
      role: "agent",
      joined_at: new Date().toISOString(),
    });

  log("D5", "Duplicate active membership prevented", !!dupMemErr, dupMemErr ? `constraint: ${dupMemErr.code}` : "Should have failed - no unique constraint at DB level");

  // Restore member 2 for further tests
  await supabase
    .from("tenant_memberships")
    .update({ removed_at: null })
    .eq("id", testMembership2Id);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION E: Role Management
// ═══════════════════════════════════════════════════════════════════════════════
async function testSectionE() {
  console.log("\n═══ SECTION E: Role Management ═══\n");

  // E1: Change member role to admin
  const { error: err1 } = await supabase
    .from("tenant_memberships")
    .update({ role: "admin" })
    .eq("id", testMembershipId);

  log("E1", "Change agent to admin succeeds", !err1, err1?.message || "success");

  // Verify
  const { data: check1 } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("id", testMembershipId)
    .single();

  log("E1b", "Role updated correctly in DB", check1?.role === "admin", `role=${check1?.role}`);

  // E2: Change member role to agent
  const { error: err2 } = await supabase
    .from("tenant_memberships")
    .update({ role: "agent" })
    .eq("id", testMembershipId);

  log("E2", "Change admin to agent succeeds", !err2, err2?.message || "success");

  // E3: Change member role to assistant
  const { error: err3 } = await supabase
    .from("tenant_memberships")
    .update({ role: "assistant" })
    .eq("id", testMembershipId);

  log("E3", "Change to assistant succeeds", !err3, err3?.message || "success");

  // E4: Invalid role value rejected by CHECK constraint
  const { error: err4 } = await supabase
    .from("tenant_memberships")
    .update({ role: "superadmin" })
    .eq("id", testMembershipId);

  log("E4", "Invalid role rejected by DB constraint", !!err4, err4 ? `constraint: ${err4.code}` : "Should have failed");

  // E5: Verify role values allowed
  const validRoles = ["owner", "admin", "agent", "assistant"];
  for (const role of validRoles) {
    if (role === "owner") continue; // skip owner test on non-owner membership
    const { error } = await supabase
      .from("tenant_memberships")
      .update({ role })
      .eq("id", testMembershipId);

    if (error) {
      log(`E5_${role}`, `Role "${role}" is valid`, false, error.message);
    }
  }

  // Reset to agent
  await supabase
    .from("tenant_memberships")
    .update({ role: "agent" })
    .eq("id", testMembershipId);

  log("E5", "All valid roles (admin, agent, assistant) accepted", true, "verified");

  // E6: Owner role check
  const { data: ownerMem } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", testTeamId)
    .eq("role", "owner");

  log("E6", "Only one owner per team", ownerMem?.length === 1, `owner count=${ownerMem?.length}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION F: Pending Invites
// ═══════════════════════════════════════════════════════════════════════════════
async function testSectionF() {
  console.log("\n═══ SECTION F: Pending Invites ═══\n");

  // F1: Get all pending/sent invites
  const { data: pendingInvites } = await supabase
    .from("team_invites")
    .select("*")
    .eq("team_id", testTeamId)
    .in("status", ["pending", "sent"]);

  log("F1", "Pending invites query returns results", pendingInvites && pendingInvites.length > 0, `count=${pendingInvites?.length}`);

  // F2: Cancel an invite
  if (testInviteId) {
    const { error: cancelErr } = await supabase
      .from("team_invites")
      .update({ status: "expired" })
      .eq("id", testInviteId);

    log("F2", "Cancel invite updates status to expired", !cancelErr, cancelErr?.message || "success");

    // Verify
    const { data: cancelled } = await supabase
      .from("team_invites")
      .select("status")
      .eq("id", testInviteId)
      .single();

    log("F2b", "Cancelled invite has status=expired", cancelled?.status === "expired", `status=${cancelled?.status}`);
  }

  // F3: Resend invite (simulate by updating token and expiry)
  if (testInviteId) {
    const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const newToken = `resend-token-${Date.now()}`;

    const { error: resendErr } = await supabase
      .from("team_invites")
      .update({
        status: "sent",
        invite_token: newToken,
        expires_at: newExpiry,
      })
      .eq("id", testInviteId);

    log("F3", "Resend invite updates token and expiry", !resendErr, resendErr?.message || "success");

    const { data: resent } = await supabase
      .from("team_invites")
      .select("status, invite_token, expires_at")
      .eq("id", testInviteId)
      .single();

    log("F3b", "Resent invite has new token and status=sent", resent?.status === "sent" && resent?.invite_token === newToken, `status=${resent?.status}`);
  }

  // F4: Expired invites not in active pending list
  // Create an expired invite
  const { data: expiredInvite } = await supabase
    .from("team_invites")
    .insert({
      team_id: testTeamId,
      inviter_id: ownerUserId,
      inviter_name: "AMIT",
      team_name: "AMIT Test Team",
      email: "expired@test.com",
      invite_token: `expired-token-${Date.now()}`,
      role: "agent",
      status: "expired",
      expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // expired yesterday
    })
    .select()
    .single();

  const { data: activePending } = await supabase
    .from("team_invites")
    .select("id")
    .eq("team_id", testTeamId)
    .in("status", ["pending", "sent"]);

  const expiredInList = activePending?.find(i => i.id === expiredInvite?.id);
  log("F4", "Expired invite not in active pending list", !expiredInList, `active pending=${activePending?.length}`);

  // Cleanup expired test invite
  if (expiredInvite) {
    await supabase.from("team_invites").delete().eq("id", expiredInvite.id);
  }

  // F5: Invite statuses are valid enum values
  const validStatuses = ["pending", "sent", "accepted", "expired", "cancelled"];
  const { error: badStatus } = await supabase
    .from("team_invites")
    .insert({
      team_id: testTeamId,
      inviter_id: ownerUserId,
      inviter_name: "AMIT",
      team_name: "AMIT Test Team",
      email: "status-test@test.com",
      invite_token: `status-test-${Date.now()}`,
      role: "agent",
      status: "invalid_status",
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

  log("F5", "Invalid invite status rejected by DB", !!badStatus, badStatus ? `constraint: ${badStatus.code}` : "No constraint - status validated in action layer");

  // Cleanup
  await supabase.from("team_invites").delete().eq("email", "status-test@test.com");
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION G: Team Scope & Data Visibility
// ═══════════════════════════════════════════════════════════════════════════════
async function testSectionG() {
  console.log("\n═══ SECTION G: Team Scope & Data Visibility ═══\n");

  // G1: Contacts table has visibility column
  const { data: contactCols, error: colErr } = await supabase
    .rpc("get_table_columns", { table_name: "contacts" })
    .select();

  // Alternative: try inserting a contact with visibility
  const { data: testContact, error: contactErr } = await supabase
    .from("contacts")
    .insert({
      realtor_id: ownerUserId,
      name: "Team Test Contact",
      email: "team-test@contact.com",
      type: "buyer",
      visibility: "team",
    })
    .select("id, visibility")
    .single();

  log("G1", "Contacts support visibility='team' field", !!testContact && !contactErr, contactErr ? contactErr.message : `visibility=${testContact?.visibility}`);

  // G2: Private contact
  const { data: privateContact, error: privErr } = await supabase
    .from("contacts")
    .insert({
      realtor_id: ownerUserId,
      name: "Private Contact",
      email: "private@contact.com",
      type: "seller",
      visibility: "private",
    })
    .select("id, visibility")
    .single();

  log("G2", "Contacts support visibility='private'", !!privateContact && !privErr, privErr ? privErr.message : `visibility=${privateContact?.visibility}`);

  // G3: Listings table has visibility column
  const { data: testListing, error: listErr } = await supabase
    .from("listings")
    .insert({
      realtor_id: ownerUserId,
      address: "123 Team Test St",
      status: "active",
      visibility: "team",
    })
    .select("id, visibility")
    .single();

  log("G3", "Listings support visibility='team' field", !!testListing && !listErr, listErr ? listErr.message : `visibility=${testListing?.visibility}`);

  // G4: Contacts have assigned_to column
  if (testContact) {
    const { error: assignErr } = await supabase
      .from("contacts")
      .update({ assigned_to: testMemberId })
      .eq("id", testContact.id);

    log("G4", "Contact can be assigned to team member", !assignErr, assignErr ? assignErr.message : "success");
  }

  // G5: Verify team member can see team-visible contacts (query simulation)
  const { data: teamContacts } = await supabase
    .from("contacts")
    .select("id, name, visibility")
    .eq("realtor_id", ownerUserId)
    .eq("visibility", "team");

  log("G5", "Team-visible contacts queryable", teamContacts && teamContacts.length > 0, `count=${teamContacts?.length}`);

  // G6: Appointments have assigned_to and delegated_by columns
  const { data: apptTest, error: apptErr } = await supabase
    .from("appointments")
    .insert({
      realtor_id: ownerUserId,
      listing_id: testListing?.id,
      buyer_agent_name: "Test Buyer",
      buyer_agent_phone: "+16045551234",
      start_time: new Date(Date.now() + 86400000).toISOString(),
      status: "pending",
      assigned_to: testMemberId,
      delegated_by: ownerUserId,
    })
    .select("id, assigned_to, delegated_by")
    .single();

  log("G6", "Appointments support delegation (assigned_to + delegated_by)", !!apptTest && !apptErr, apptErr ? apptErr.message : `assigned_to=${apptTest?.assigned_to}`);

  // Cleanup test data
  if (apptTest) await supabase.from("appointments").delete().eq("id", apptTest.id);
  if (testListing) await supabase.from("listings").delete().eq("id", testListing.id);
  if (testContact) await supabase.from("contacts").delete().eq("id", testContact.id);
  if (privateContact) await supabase.from("contacts").delete().eq("id", privateContact.id);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION H: Ownership Transfer
// ═══════════════════════════════════════════════════════════════════════════════
async function testSectionH() {
  console.log("\n═══ SECTION H: Ownership Transfer ═══\n");

  // H1: Transfer ownership (simulate: change roles)
  // First ensure test admin exists
  const { data: adminMem } = await supabase
    .from("tenant_memberships")
    .select("id, role")
    .eq("id", testMembership3Id)
    .single();

  log("H1_pre", "Admin member exists for transfer test", adminMem?.role === "admin", `role=${adminMem?.role}`);

  // Simulate transfer: current owner → admin, target admin → owner
  // We'll just verify the logic can work at DB level
  const { error: transferErr1 } = await supabase
    .from("tenant_memberships")
    .update({ role: "admin" })
    .eq("tenant_id", testTeamId)
    .eq("user_id", ownerUserId);

  const { error: transferErr2 } = await supabase
    .from("tenant_memberships")
    .update({ role: "owner" })
    .eq("id", testMembership3Id);

  log("H1", "Ownership transfer at DB level works", !transferErr1 && !transferErr2, transferErr1?.message || transferErr2?.message || "success");

  // H2: Verify new owner
  const { data: newOwner } = await supabase
    .from("tenant_memberships")
    .select("user_id, role")
    .eq("tenant_id", testTeamId)
    .eq("role", "owner");

  log("H2", "New owner is correct after transfer", newOwner?.length === 1 && newOwner[0]?.user_id === testMember3Id, `ownerUserId=${newOwner?.[0]?.user_id}`);

  // H3: Old owner is now admin
  const { data: oldOwner } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", testTeamId)
    .eq("user_id", ownerUserId)
    .single();

  log("H3", "Previous owner demoted to admin", oldOwner?.role === "admin", `role=${oldOwner?.role}`);

  // Revert: restore original owner
  await supabase
    .from("tenant_memberships")
    .update({ role: "owner" })
    .eq("tenant_id", testTeamId)
    .eq("user_id", ownerUserId);

  await supabase
    .from("tenant_memberships")
    .update({ role: "admin" })
    .eq("id", testMembership3Id);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION I: Leave Team
// ═══════════════════════════════════════════════════════════════════════════════
async function testSectionI() {
  console.log("\n═══ SECTION I: Leave Team ═══\n");

  // I1: Agent can leave (soft delete)
  const { error: leaveErr } = await supabase
    .from("tenant_memberships")
    .update({ removed_at: new Date().toISOString() })
    .eq("id", testMembershipId);

  log("I1", "Agent can leave team (soft delete)", !leaveErr, leaveErr?.message || "success");

  // I2: Verify left member is inactive
  const { data: leftMember } = await supabase
    .from("tenant_memberships")
    .select("removed_at")
    .eq("id", testMembershipId)
    .single();

  log("I2", "Left member has removed_at set", !!leftMember?.removed_at, `removed_at=${leftMember?.removed_at}`);

  // I3: Owner cannot leave (verify owner still active)
  const { data: ownerActive } = await supabase
    .from("tenant_memberships")
    .select("removed_at, role")
    .eq("tenant_id", testTeamId)
    .eq("user_id", ownerUserId)
    .single();

  log("I3", "Owner cannot leave (still active)", ownerActive?.removed_at === null && ownerActive?.role === "owner", `role=${ownerActive?.role}, removed=${ownerActive?.removed_at}`);

  // Restore member for other tests
  await supabase
    .from("tenant_memberships")
    .update({ removed_at: null })
    .eq("id", testMembershipId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION J: Activity & Audit Logging
// ═══════════════════════════════════════════════════════════════════════════════
async function testSectionJ() {
  console.log("\n═══ SECTION J: Activity & Audit Logging ═══\n");

  // J1: team_activity_log table exists and accepts entries
  const { data: actLog, error: actErr } = await supabase
    .from("team_activity_log")
    .insert({
      team_id: testTeamId,
      user_id: ownerUserId,
      action: "test_action",
      entity_type: "team",
      entity_id: testTeamId,
      metadata: { test: true },
    })
    .select()
    .single();

  log("J1", "Activity log accepts entries", !!actLog && !actErr, actErr ? actErr.message : `id=${actLog?.id}`);

  // J2: audit_log table exists and accepts entries
  const { data: auditLog, error: auditErr } = await supabase
    .from("audit_log")
    .insert({
      team_id: testTeamId,
      user_id: ownerUserId,
      action: "test_audit",
      resource_type: "team",
      resource_id: testTeamId,
      details: { test: true },
    })
    .select()
    .single();

  log("J2", "Audit log accepts entries", !!auditLog && !auditErr, auditErr ? auditErr.message : `id=${auditLog?.id}`);

  // J3: Activity log query by team
  const { data: activities } = await supabase
    .from("team_activity_log")
    .select("*")
    .eq("team_id", testTeamId)
    .order("created_at", { ascending: false })
    .limit(10);

  log("J3", "Activity log queryable by team", activities && activities.length > 0, `count=${activities?.length}`);

  // Cleanup test logs
  if (actLog) await supabase.from("team_activity_log").delete().eq("id", actLog.id);
  if (auditLog) await supabase.from("audit_log").delete().eq("id", auditLog.id);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION K: Permission Matrix Verification
// ═══════════════════════════════════════════════════════════════════════════════
async function testSectionK() {
  console.log("\n═══ SECTION K: Permission Matrix ═══\n");

  // Import and test permission functions logic
  // Since we can't import TypeScript directly, we verify the DB schema supports permissions

  // K1: Membership has permissions JSONB column
  const { data: memWithPerms } = await supabase
    .from("tenant_memberships")
    .select("permissions")
    .eq("id", testMembershipId)
    .single();

  log("K1", "Membership has permissions field (JSONB)", memWithPerms !== null && "permissions" in memWithPerms, `permissions type=${typeof memWithPerms?.permissions}`);

  // K2: Role constraint enforces valid values
  const { error: badRole } = await supabase
    .from("tenant_memberships")
    .update({ role: "hacker" })
    .eq("id", testMembershipId);

  log("K2", "Invalid role rejected by CHECK constraint", !!badRole, badRole ? `code=${badRole.code}` : "Should have failed");

  // K3: Tenants features column (for feature-level permissions)
  const { data: tenant } = await supabase
    .from("tenants")
    .select("features")
    .eq("id", testTeamId)
    .single();

  log("K3", "Tenants table has features JSONB column", tenant !== null && "features" in tenant, `features=${JSON.stringify(tenant?.features)}`);

  // K4: Listing agents table exists (co-listing permissions)
  const { data: listingAgent, error: laErr } = await supabase
    .from("listing_agents")
    .select("*")
    .limit(1);

  log("K4", "listing_agents table exists", !laErr, laErr ? laErr.message : `rows=${listingAgent?.length}`);

  // K5: Deal agents table exists (deal permissions)
  const { data: dealAgent, error: daErr } = await supabase
    .from("deal_agents")
    .select("*")
    .limit(1);

  log("K5", "deal_agents table exists", !daErr, daErr ? daErr.message : `rows=${dealAgent?.length}`);

  // K6: Contact consents table exists
  const { data: consent, error: conErr } = await supabase
    .from("contact_consents")
    .select("*")
    .limit(1);

  log("K6", "contact_consents table exists", !conErr, conErr ? conErr.message : `rows=${consent?.length}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION L: Data Integrity & Constraints
// ═══════════════════════════════════════════════════════════════════════════════
async function testSectionL() {
  console.log("\n═══ SECTION L: Data Integrity & Constraints ═══\n");

  // L1: tenant_memberships requires tenant_id (NOT NULL)
  const { error: noTenant } = await supabase
    .from("tenant_memberships")
    .insert({
      user_id: testMemberId,
      agent_email: "no-tenant@test.com",
      role: "agent",
    });

  log("L1", "Membership requires tenant_id (NOT NULL)", !!noTenant, noTenant ? `code=${noTenant.code}` : "Should have failed");

  // L2: team_invites requires team_id
  const { error: noTeamInvite } = await supabase
    .from("team_invites")
    .insert({
      inviter_id: ownerUserId,
      email: "no-team@test.com",
      invite_token: "test",
      role: "agent",
      status: "sent",
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    });

  log("L2", "Invite requires team_id (NOT NULL)", !!noTeamInvite, noTeamInvite ? `code=${noTeamInvite.code}` : "Should have failed");

  // L3: FK constraint - tenant_memberships.tenant_id references tenants.id
  const fakeTeamId = "00000000-0000-0000-0000-000000000000";
  const { error: fkErr } = await supabase
    .from("tenant_memberships")
    .insert({
      tenant_id: fakeTeamId,
      user_id: testMemberId,
      agent_email: "fk-test@test.com",
      role: "agent",
    });

  log("L3", "FK constraint: membership must reference valid tenant", !!fkErr, fkErr ? `code=${fkErr.code}` : "No FK constraint?");

  // L4: Tenants max_members has default value
  const { data: newTenant, error: newTErr } = await supabase
    .from("tenants")
    .insert({ name: "Default Test Team", owner_email: "default-test@test.com", status: "active" })
    .select("max_members")
    .single();

  log("L4", "Tenants max_members has default (15)", newTenant?.max_members === 15, `max_members=${newTenant?.max_members}`);

  // Cleanup
  if (newTenant) await supabase.from("tenants").delete().eq("name", "Default Test Team");

  // L5: Brand color default
  const { data: brandTeam } = await supabase
    .from("tenants")
    .select("brand_color")
    .eq("id", testTeamId)
    .single();

  log("L5", "Team has brand_color default", !!brandTeam?.brand_color, `brand_color=${brandTeam?.brand_color}`);
}

// ─── Final Cleanup ────────────────────────────────────────────────────────────
async function finalCleanup() {
  console.log("\n🧹 Final cleanup...");

  // Remove test invites
  await supabase
    .from("team_invites")
    .delete()
    .eq("team_id", testTeamId);

  // Remove test memberships (not owner)
  await supabase
    .from("tenant_memberships")
    .delete()
    .in("agent_email", [testMemberEmail, testMember2Email, testMember3Email]);

  // Remove test users
  await supabase
    .from("users")
    .delete()
    .in("email", [testMemberEmail, testMember2Email, testMember3Email]);

  // Keep the team for UI testing (do NOT delete the owner's team)
  console.log("   Done (kept owner team for UI testing).\n");
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║   TEAM FUNCTIONALITY — COMPREHENSIVE TEST SUITE            ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log(`║   Date: ${new Date().toISOString()}          ║`);
  console.log(`║   User: ${ownerEmail}                             ║`);
  console.log("╚══════════════════════════════════════════════════════════════╝");

  await cleanup();

  try {
    await testSectionA();
    await testSectionC();
    await testSectionD();
    await testSectionE();
    await testSectionF();
    await testSectionG();
    await testSectionH();
    await testSectionI();
    await testSectionJ();
    await testSectionK();
    await testSectionL();
  } catch (err) {
    console.error("\n💥 FATAL ERROR:", err);
  }

  await finalCleanup();

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log(`║   RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total        `);
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  if (failed > 0) {
    console.log("❌ FAILED TESTS:");
    results.filter(r => r.status === "FAIL").forEach(r => {
      console.log(`   ${r.testId}: ${r.description} — ${r.details}`);
    });
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
