"use client";

import Link from "next/link";
import { Lock } from "lucide-react";

interface UpgradePromptProps {
  feature: string;
  plan?: string;
}

/**
 * Contextual upgrade prompt for gated pages (B5).
 * Shows in place of page content when user's plan doesn't include the feature.
 */
export function UpgradePrompt({ feature, plan = "Professional" }: UpgradePromptProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#4f35d2]/10 flex items-center justify-center mb-6">
        <Lock className="w-8 h-8 text-[#4f35d2]" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">
        Upgrade to {plan} to unlock {feature}
      </h2>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        This feature is available on the {plan} plan and above. Upgrade to access all the tools you need to grow your business.
      </p>
      <div className="flex gap-3">
        <Link
          href="/settings/billing"
          className="px-6 py-2.5 bg-[#4f35d2] text-white text-sm font-medium rounded-xl hover:bg-[#3d28a8] transition-colors"
        >
          View Plans
        </Link>
        <Link
          href="/"
          className="px-6 py-2.5 border border-gray-200 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
