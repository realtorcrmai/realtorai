import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { createAdminClient } from "@/lib/supabase/admin";
import { ALL_FEATURES } from "@/lib/features";
import {
  getClientIp,
  recordFailedAttempt,
  isRateLimited,
  resetRateLimit,
} from "@/lib/rate-limit";

const DEMO_EMAIL = process.env.DEMO_EMAIL || "demo@realestatecrm.com";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "demo1234";
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
          throw new Error(
            `Too many login attempts. Please try again in ${minutesUntilRetry} minute${minutesUntilRetry !== 1 ? "s" : ""}.`
          );
        }

        // Validate credentials
        if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
          // Success: reset rate limit for this IP
          resetRateLimit(clientIp);
          return {
            id: "demo-user",
            name: "Demo User",
            email: DEMO_EMAIL,
          };
        }

        // Failed attempt: record it
        const isNowBlocked = recordFailedAttempt(clientIp);
        if (isNowBlocked) {
          throw new Error(
            "Too many login attempts. Please try again in 15 minutes."
          );
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
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, trigger }) {
      try {
        const supabase = createAdminClient();

        // Store Google tokens on sign-in
        if (account && account.provider === "google" && account.refresh_token) {
          await supabase.from("google_tokens").upsert(
            {
              user_email: token.email as string,
              access_token: account.access_token!,
              refresh_token: account.refresh_token,
              expiry_date: account.expires_at
                ? account.expires_at * 1000
                : null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_email" }
          );

          token.accessToken = account.access_token;
          token.refreshToken = account.refresh_token;
        }

        // Skip DB lookup if role/features are already cached in the token
        // Only fetch on sign-in or if data is missing
        const needsUserFetch = !token.role || !token.enabledFeatures || trigger === "signIn" || account;

        if (token.email && needsUserFetch && usersTableExists !== false) {
          const { data: existingUser, error: fetchError } = await supabase
            .from("users")
            .select("id, role, enabled_features, is_active")
            .eq("email", token.email)
            .single();

          const tableMissing = fetchError?.message?.includes("schema cache") ||
            fetchError?.code === "42P01";

          if (tableMissing) {
            usersTableExists = false;
            token.role = token.role ?? "realtor";
            token.enabledFeatures = token.enabledFeatures ?? ALL_FEATURES;
          } else {
            usersTableExists = true;
            if (fetchError && fetchError.code !== "PGRST116") {
              console.error("[auth] Error fetching user:", fetchError.message);
            }

            if (existingUser) {
              token.role = existingUser.role;
              token.enabledFeatures = existingUser.enabled_features;
              token.userId = existingUser.id;
            } else if (trigger === "signIn" || account) {
              const isAdmin = ADMIN_EMAIL && token.email === ADMIN_EMAIL;
              const { data: newUser, error: insertError } = await supabase
                .from("users")
                .insert({
                  email: token.email,
                  name: token.name as string | undefined,
                  role: isAdmin ? "admin" : "realtor",
                })
                .select("id, role, enabled_features")
                .single();

              if (insertError) {
                console.error("[auth] Error inserting user:", insertError.message);
              }

              token.role = newUser?.role ?? "realtor";
              token.enabledFeatures = newUser?.enabled_features ?? ALL_FEATURES;
              token.userId = newUser?.id;
            }
          }
        } else if (token.email && !token.role) {
          // Users table known to be missing — use defaults
          token.role = "realtor";
          token.enabledFeatures = ALL_FEATURES;
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
      return session;
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
