import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { createAdminClient } from "@/lib/supabase/admin";

const DEMO_EMAIL = process.env.DEMO_EMAIL || "demo@realestatecrm.com";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "demo1234";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
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
    async jwt({ token, account }) {
      if (account && account.provider === "google" && account.refresh_token) {
        const supabase = createAdminClient();
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
      return token;
    },
    async session({ session, token }) {
      session.user.accessToken = token.accessToken as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
});
