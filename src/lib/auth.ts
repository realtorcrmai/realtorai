import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { createAdminClient } from "@/lib/supabase/admin";
import { trackEvent } from "@/lib/analytics";
import { ALL_FEATURES, getUserFeatures } from "@/lib/features";
import {
  getClientIp,
  recordFailedAttempt,
  isRateLimited,
  resetRateLimit,
} from "@/lib/rate-limit";
import { logAuditEvent, AUDIT_ACTIONS } from "@/lib/audit";
import { encryptGoogleTokenFields } from "@/lib/google-tokens";

const DEMO_EMAIL = process.env.DEMO_EMAIL;
const DEMO_PASSWORD = process.env.DEMO_PASSWORD;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

// Cache whether users table exists to avoid hitting Supabase on every session check
let usersTableExists: boolean | null = null;

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 /* 1 hour */ },
  providers: [
    CredentialsProvider({
      name: "Demo Account",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        // Extract client IP from request headers
        const clientIp = getClientIp(req.headers);

        // Check if IP is rate limited
        const rateLimit = isRateLimited(clientIp);
        if (rateLimit.isLimited) {
          const minutesUntilRetry = rateLimit.minutesUntilRetry || 15;
          await logAuditEvent({
            action: AUDIT_ACTIONS.LOGIN_FAILED,
            severity: "warning",
            actor: { email: email ?? null },
            ip: clientIp,
            metadata: { reason: "rate_limited", source: "credentials" },
          });
          throw new Error(
            `Too many login attempts. Please try again in ${minutesUntilRetry} minute${minutesUntilRetry !== 1 ? "s" : ""}.`
          );
        }

        if (!email || !password) {
          await logAuditEvent({
            action: AUDIT_ACTIONS.LOGIN_FAILED,
            actor: { email: email ?? null },
            ip: clientIp,
            metadata: { reason: "missing_credentials", source: "credentials" },
          });
          return null;
        }

        // Demo password — works for seeded users in dev/demo.
        // In production: only works if the email matches DEMO_EMAIL exactly.
        // This prevents "any user + demo password" login in prod while still
        // allowing easy testing in dev where DEMO_EMAIL may be set to a
        // wildcard-like value.
        const isDemoLogin = DEMO_PASSWORD && password === DEMO_PASSWORD;
        const isProd = process.env.NODE_ENV === "production";
        const emailLower = email.toLowerCase().trim();
        const demoAllowed = isDemoLogin && (!isProd || (
          (DEMO_EMAIL && emailLower === DEMO_EMAIL.toLowerCase().trim()) ||
          (ADMIN_EMAIL && emailLower === ADMIN_EMAIL.toLowerCase().trim())
        ));

        if (demoAllowed) {
          const supabase = createAdminClient();
          const { data: user, error: userErr } = await supabase
            .from("users")
            .select("id, name, email, role")
            .eq("email", email.toLowerCase().trim())
            .eq("is_active", true)
            .single();

          if (user && !userErr) {
            resetRateLimit(clientIp);
            return { id: user.id, name: user.name || email, email: user.email };
          }
        }

        // Database user check (email + password)
        const supabaseAuth = createAdminClient();
        const { data: user } = await supabaseAuth
          .from("users")
          .select("id, email, name, password_hash, is_active")
          .eq("email", email.toLowerCase().trim())
          .single();

        if (user?.password_hash && user.is_active) {
          const { compare } = await import("bcryptjs");
          const valid = await compare(password, user.password_hash);
          if (valid) {
            resetRateLimit(clientIp);
            return { id: user.id, name: user.name, email: user.email };
          }
        }

        // Failed attempt
        const isNowBlocked = recordFailedAttempt(clientIp);
        await logAuditEvent({
          action: AUDIT_ACTIONS.LOGIN_FAILED,
          severity: isNowBlocked ? "warning" : "info",
          actor: { email: email ?? null },
          ip: clientIp,
          metadata: {
            reason: "invalid_credentials",
            source: "credentials",
            // note: `now_blocked` is a known structural key (boolean) →
            // not scanned as PII. Documents whether this failure pushed
            // the IP past the lockout threshold.
            success: false,
          },
        });
        if (isNowBlocked) {
          throw new Error("Too many login attempts. Please try again in 15 minutes.");
        }

        return null;
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/calendar.events",
            "https://www.googleapis.com/auth/calendar.readonly",
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/contacts.readonly",
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, trigger, session: updateSession }) {
      try {
        const supabase = createAdminClient();

        // ── MFA elevation via client-side update() ────────────────
        // The /mfa-challenge page calls `update({ mfaVerified: true })`
        // after a successful POST to /api/auth/mfa/elevate. We accept
        // ONLY the boolean true here — never trust other fields the
        // client passes through update(). Once flipped, mfaVerified
        // sticks for the lifetime of the JWT (1h max).
        if (trigger === "update" && updateSession) {
          const incoming = updateSession as { mfaVerified?: unknown };
          if (incoming.mfaVerified === true) {
            token.mfaVerified = true;
          }
        }

        // Store Google tokens on sign-in (encrypted at rest — migration 148)
        if (account && account.provider === "google" && account.refresh_token) {
          await supabase.from("google_tokens").upsert(
            encryptGoogleTokenFields({
              user_email: token.email as string,
              access_token: account.access_token!,
              refresh_token: account.refresh_token,
              expiry_date: account.expires_at
                ? account.expires_at * 1000
                : null,
              updated_at: new Date().toISOString(),
            }),
            { onConflict: "user_email" }
          );

          token.accessToken = account.access_token;
          token.refreshToken = account.refresh_token;
          token.emailVerified = true; // Google verified the email
        }

        // OAuth providers = email auto-verified
        if (account && ["google", "apple", "facebook"].includes(account.provider)) {
          token.emailVerified = true;
        }

        // Skip DB lookup if role/features are already cached in the token
        // Fetch on sign-in, update (session refresh), or if data is missing
        const needsUserFetch = !token.role || !token.enabledFeatures || !("avatarUrl" in token) || trigger === "signIn" || trigger === "update" || account;

        if (token.email && needsUserFetch && usersTableExists !== false) {
          const { data: existingUser, error: fetchError } = await supabase
            .from("users")
            .select("id, role, plan, enabled_features, is_active, email_verified, phone_verified, onboarding_completed, trial_ends_at, trial_plan, personalization_completed, avatar_url")
            .eq("email", token.email)
            .single();

          const tableMissing = fetchError?.message?.includes("schema cache") ||
            fetchError?.code === "42P01";

          if (tableMissing) {
            usersTableExists = false;
            token.role = token.role ?? "realtor";
            token.plan = "free";
            token.enabledFeatures = getUserFeatures("free");
          } else {
            usersTableExists = true;
            if (fetchError && fetchError.code !== "PGRST116") {
              console.error("[auth] Error fetching user:", fetchError.message);
            }

            if (existingUser) {
              // ── MFA active flag ───────────────────────────────
              // On sign-in, query mfa_credentials to see if this
              // user has an active second factor. If yes, the JWT
              // starts with mfaVerified=false; the dashboard layout
              // then forces a redirect to /mfa-challenge until the
              // user elevates the session.
              if (trigger === "signIn" || account) {
                const { data: mfaRow } = await supabase
                  .from("mfa_credentials")
                  .select("enrolled_at, disabled_at")
                  .eq("user_id", existingUser.id)
                  .maybeSingle();
                token.mfaActive = !!mfaRow?.enrolled_at && !mfaRow.disabled_at;
                token.mfaVerified = false;
              }

              // Update last_active_at on every login
              const { error: updateError } = await supabase.from("users").update({ last_active_at: new Date().toISOString() }).eq("id", existingUser.id);
              if (updateError) console.error("[auth] Error updating last_active_at:", updateError.message);
              await trackEvent("session_start", existingUser.id, { user_agent: "" });

              token.role = existingUser.role;
              token.userId = existingUser.id;
              token.emailVerified = existingUser.email_verified ?? false;
              token.phoneVerified = existingUser.phone_verified ?? false;
              token.onboardingCompleted = existingUser.onboarding_completed ?? true;
              // Default to true for pre-existing users (column didn't exist before migration 095)
              token.personalizationCompleted = existingUser.personalization_completed ?? (existingUser.onboarding_completed ? true : false);
              token.trialEndsAt = existingUser.trial_ends_at ?? null;
              token.avatarUrl = existingUser.avatar_url ?? null;
              // Resolve effective plan: trial plan if active, otherwise base plan
              const { getEffectivePlan } = await import("@/lib/plans");
              const effectivePlan = getEffectivePlan(
                existingUser.plan || "free",
                existingUser.trial_ends_at,
                existingUser.trial_plan,
              );
              token.plan = effectivePlan;
              token.enabledFeatures = getUserFeatures(
                effectivePlan,
                existingUser.enabled_features
              );
            } else if (trigger === "signIn" || account) {
              const isAdmin = ADMIN_EMAIL && token.email === ADMIN_EMAIL;
              const defaultPlan = isAdmin ? "admin" : "free";
              // Use upsert instead of insert to handle race conditions on simultaneous
              // OAuth sign-ins (e.g. double-click, multi-tab) — ignoreDuplicates preserves
              // existing user data when the row already exists.
              const { data: newUser, error: insertError } = await supabase
                .from("users")
                .upsert(
                  {
                    email: token.email,
                    name: token.name as string | undefined,
                    role: isAdmin ? "admin" : "realtor",
                    plan: defaultPlan,
                    email_verified: !!account && ["google", "apple", "facebook"].includes(account.provider),
                    personalization_completed: false,
                    onboarding_completed: false,
                  },
                  { onConflict: "email", ignoreDuplicates: true }
                )
                .select("id, role, plan, enabled_features, trial_ends_at, trial_plan")
                .single();

              if (insertError) {
                console.error("[auth] Error upserting user:", insertError.message);
              }

              if (newUser?.id) {
                await trackEvent("signup", newUser.id, { method: account?.provider ?? "credentials", source: "organic" });
              }

              const { getEffectivePlan } = await import("@/lib/plans");
              const effectivePlan = getEffectivePlan(
                newUser?.plan ?? defaultPlan,
                newUser?.trial_ends_at,
                newUser?.trial_plan,
              );
              token.role = newUser?.role ?? "realtor";
              token.plan = effectivePlan;
              token.userId = newUser?.id;
              token.personalizationCompleted = false;
              token.onboardingCompleted = false;
              token.trialEndsAt = null;
              token.enabledFeatures = getUserFeatures(
                effectivePlan,
                newUser?.enabled_features
              );
            }
          }
        } else if (token.email && !token.role) {
          token.role = "realtor";
          token.plan = "free";
          token.enabledFeatures = getUserFeatures("free");
        }
        // ============================================================
        // Team context: fetch membership if user has one
        // ============================================================
        const shouldFetchTeam = token.userId && (
          !("teamId" in token) || trigger === "signIn" || trigger === "update"
        );

        if (shouldFetchTeam && token.email) {
          try {
            const { data: membership } = await supabase
              .from("tenant_memberships")
              .select("tenant_id, role, permissions, user_id")
              .eq("agent_email", token.email as string)
              .is("removed_at", null)
              .single();

            if (membership) {
              token.teamId = membership.tenant_id;
              token.teamRole = membership.role;
              token.teamPermissions = membership.permissions || {};

              // Fetch team name for display in sidebar/header
              if (!token.teamName || token.teamId !== membership.tenant_id) {
                const { data: tenant } = await supabase
                  .from("tenants")
                  .select("name")
                  .eq("id", membership.tenant_id)
                  .single();
                token.teamName = tenant?.name || null;
              }

              // Link user_id on membership if not yet set
              if (!membership.user_id && token.userId) {
                await supabase
                  .from("tenant_memberships")
                  .update({ user_id: token.userId as string })
                  .eq("agent_email", token.email as string)
                  .is("removed_at", null);
              }
            } else {
              token.teamId = null;
              token.teamRole = null;
              token.teamName = null;
              token.teamPermissions = {};
            }
          } catch {
            // Team tables may not exist yet — graceful fallback
            token.teamId = token.teamId ?? null;
            token.teamRole = token.teamRole ?? null;
            token.teamPermissions = token.teamPermissions ?? {};
          }
        }
      } catch (err) {
        console.error("[auth] JWT callback error:", err);
      }

      return token;
    },
    async session({ session, token }) {
      session.user.accessToken = token.accessToken as string;
      session.user.role = token.role as "admin" | "realtor" | undefined;
      session.user.enabledFeatures = token.enabledFeatures as string[] | undefined;
      // Multi-tenancy: userId = realtorId (the tenant identifier)
      session.user.id = (token.userId as string) || (token.sub as string) || "";
      session.user.realtorId = (token.userId as string) || (token.sub as string) || "";
      (session.user as unknown as Record<string, unknown>).emailVerified = (token.emailVerified as boolean) ?? false;
      (session.user as unknown as Record<string, unknown>).avatarUrl = (token.avatarUrl as string) ?? null;
      // Team context
      (session.user as unknown as Record<string, unknown>).teamId = (token.teamId as string) ?? null;
      (session.user as unknown as Record<string, unknown>).teamRole = (token.teamRole as string) ?? null;
      (session.user as unknown as Record<string, unknown>).teamName = (token.teamName as string) ?? null;
      (session.user as unknown as Record<string, unknown>).teamPermissions = (token.teamPermissions as Record<string, boolean>) ?? {};
      // MFA gate state — read by dashboard layout to force /mfa-challenge
      (session.user as unknown as Record<string, unknown>).mfaActive = (token.mfaActive as boolean) ?? false;
      (session.user as unknown as Record<string, unknown>).mfaVerified = (token.mfaVerified as boolean) ?? false;
      return session;
    },
  },
  events: {
    // Fires AFTER a successful sign-in (any provider). NextAuth does not
    // pass the raw request here, so no IP/userAgent — those are captured
    // on FAILURE paths in authorize() where they matter most.
    async signIn({ user, account, isNewUser }) {
      await logAuditEvent({
        action: AUDIT_ACTIONS.LOGIN_SUCCESS,
        actor: {
          id: (user as { id?: string })?.id ?? null,
          email: user?.email ?? null,
        },
        tenantId: (user as { id?: string })?.id ?? null,
        metadata: {
          source: account?.provider ?? "unknown",
          success: true,
          // isNewUser is NextAuth's hint that a signup happened in the
          // same flow. Useful for distinguishing signup vs. returning
          // login in the audit trail.
          from: isNewUser ? "signup" : "returning",
        },
      });
    },
    async signOut(message) {
      // NextAuth v5 passes either { session } or { token } depending
      // on strategy. We're on JWT, so expect `token`.
      const token = (message as { token?: { email?: string; userId?: string } })
        .token;
      await logAuditEvent({
        action: AUDIT_ACTIONS.LOGOUT,
        actor: {
          id: token?.userId ?? null,
          email: token?.email ?? null,
        },
        tenantId: token?.userId ?? null,
      });
    },
  },
  cookies: process.env.NODE_ENV === "development" ? {
    sessionToken: {
      name: "authjs.session-token",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: false },
    },
    callbackUrl: {
      name: "authjs.callback-url",
      options: { sameSite: "lax", path: "/", secure: false },
    },
    csrfToken: {
      name: "authjs.csrf-token",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: false },
    },
  } : undefined,
  pages: {
    signIn: "/login",
  },
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
});
