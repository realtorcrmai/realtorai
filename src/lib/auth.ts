import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { createAdminClient } from "@/lib/supabase/admin";
import { ALL_FEATURES } from "@/lib/features";

const DEMO_EMAIL = process.env.DEMO_EMAIL || "demo@realestatecrm.com";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "demo1234";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 /* 1 hour */ },
  providers: [
    CredentialsProvider({
      name: "Demo Account",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
          return {
            id: "demo-user",
            name: "Demo User",
            email: DEMO_EMAIL,
          };
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
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, trigger }) {
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

      // Upsert user record and fetch role/features
      if (token.email) {
        const { data: existingUser } = await supabase
          .from("users")
          .select("id, role, enabled_features, is_active")
          .eq("email", token.email)
          .single();

        if (existingUser) {
          token.role = existingUser.role;
          token.enabledFeatures = existingUser.enabled_features;
          token.userId = existingUser.id;
        } else if (trigger === "signIn" || account) {
          // New user — insert with defaults
          const isAdmin = ADMIN_EMAIL && token.email === ADMIN_EMAIL;
          const { data: newUser } = await supabase
            .from("users")
            .insert({
              email: token.email,
              name: token.name as string | undefined,
              role: isAdmin ? "admin" : "realtor",
            })
            .select("id, role, enabled_features")
            .single();

          token.role = newUser?.role ?? "realtor";
          token.enabledFeatures = newUser?.enabled_features ?? ALL_FEATURES;
          token.userId = newUser?.id;
        }
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
  pages: {
    signIn: "/login",
  },
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
});
