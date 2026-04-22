"use client";

import { useSession } from "next-auth/react";
import { signIn } from "next-auth/react";
import { Mail, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmailSyncStepProps {
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

/**
 * Onboarding Step 3: Email Sync (I1).
 * If user signed up via Google SSO, auto-shows as connected.
 * Otherwise, shows Google OAuth button for email scopes.
 */
export function EmailSyncStep({ onNext, onBack, onSkip }: EmailSyncStepProps) {
  const { data: session } = useSession();

  // Check if Google is already connected (SSO users have accessToken)
  const isConnected = !!session?.user?.accessToken;

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-xl font-bold">Connect your email</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Send emails from Magnate, track opens and clicks
        </p>
      </div>

      {isConnected ? (
        <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-green-200 bg-green-50">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
            <Check className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-green-800">Connected via Google</p>
            <p className="text-xs text-green-600">{session?.user?.email}</p>
          </div>
        </div>
      ) : (
        <button
          onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
          className="flex items-center gap-4 p-4 rounded-xl border-2 border-muted hover:border-primary transition-colors text-left w-full"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 shrink-0">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold">Connect Gmail</p>
            <p className="text-xs text-muted-foreground">
              Log conversations, send emails, track engagement
            </p>
          </div>
        </button>
      )}

      <p className="text-xs text-center text-muted-foreground">
        Gmail only for now. Outlook support coming soon.
      </p>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button className="flex-1" onClick={onNext}>
          {isConnected ? "Continue" : "Continue without email"}
        </Button>
      </div>
      <button onClick={onSkip} className="w-full text-xs text-muted-foreground hover:underline text-center">
        Skip for now
      </button>
    </div>
  );
}
