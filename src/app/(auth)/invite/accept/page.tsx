"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { acceptInvite } from "@/actions/team";
import { signIn, useSession } from "next-auth/react";

export default function InviteAcceptPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-2 border-brand border-t-transparent rounded-full" />
      </div>
    }>
      <InviteAcceptContent />
    </Suspense>
  );
}

function InviteAcceptContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status, update: updateSession } = useSession();
  const token = searchParams.get("token");

  const [state, setState] = useState<"loading" | "not_logged_in" | "accepting" | "success" | "error">( "loading");
  const [error, setError] = useState<string | null>(null);
  const [teamInfo, setTeamInfo] = useState<{ teamId: string; role: string } | null>(null);

  useEffect(() => {
    if (!token) {
      setState("error");
      setError("No invite token provided. Please check your invite link.");
      return;
    }

    if (status === "loading") return;

    if (status === "unauthenticated") {
      setState("not_logged_in");
      return;
    }

    // User is authenticated — attempt to accept
    setState("accepting");
    acceptInvite(token).then(async (result) => {
      if (result.error) {
        setState("error");
        setError(result.error);
      } else if (result.data) {
        // Refresh session so JWT picks up new teamId/teamRole
        await updateSession();
        setState("success");
        setTeamInfo(result.data);
      }
    });
  }, [token, status, updateSession]);

  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-brand border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading invite...</p>
        </div>
      </div>
    );
  }

  if (state === "not_logged_in") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="bg-card border border-border rounded-lg p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Team Invite</h1>
          <p className="text-muted-foreground mb-6">
            You&apos;ve been invited to join a team on Realtors360. Sign in or create an account to accept.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => signIn("google", { callbackUrl: `/invite/accept?token=${token}` })}
              className="w-full px-4 py-2 bg-card border border-border rounded-md hover:bg-muted transition-colors"
              aria-label="Sign in with Google"
            >
              Sign in with Google
            </button>
            <button
              onClick={() => router.push(`/login?callbackUrl=/invite/accept?token=${token}`)}
              className="w-full px-4 py-2 bg-brand text-white rounded-md hover:opacity-90 transition-opacity"
              aria-label="Sign in with email"
            >
              Sign in with Email
            </button>
            <button
              onClick={() => router.push(`/signup?callbackUrl=/invite/accept?token=${token}`)}
              className="w-full px-4 py-2 text-brand border border-brand rounded-md hover:bg-brand/5 transition-colors"
              aria-label="Create new account"
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state === "accepting") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-brand border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Joining team...</p>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="bg-card border border-border rounded-lg p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-foreground mb-2">Unable to Join</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-brand text-white rounded-md hover:opacity-90 transition-opacity"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Success
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="bg-card border border-border rounded-lg p-8 max-w-md w-full text-center">
        <div className="text-4xl mb-4">🎉</div>
        <h1 className="text-xl font-bold text-foreground mb-2">Welcome to the Team!</h1>
        <p className="text-muted-foreground mb-6">
          You&apos;ve joined as <span className="font-semibold capitalize">{teamInfo?.role}</span>. Your dashboard now includes team features.
        </p>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 bg-brand text-white rounded-md hover:opacity-90 transition-opacity"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
