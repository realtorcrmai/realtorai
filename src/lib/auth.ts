import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { createAdminClient } from "@/lib/supabase/admin";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
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
      if (account && account.refresh_token) {
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
  secret: process.env.NEXTAUTH_SECRET,
});
