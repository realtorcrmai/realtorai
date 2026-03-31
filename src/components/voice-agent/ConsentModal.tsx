"use client";

import { useState } from "react";
import { grantConsent } from "@/actions/consent";
import type { ConsentType } from "@/types/voice-agent";

interface ConsentModalProps {
  contactId: string;
  consentType: ConsentType;
  onConsented: () => void;
  onDenied: () => void;
}

export function ConsentModal({ contactId, consentType, onConsented, onDenied }: ConsentModalProps) {
  const [loading, setLoading] = useState(false);

  const handleAllow = async () => {
    setLoading(true);
    const result = await grantConsent({
      contactId,
      consentType,
      method: "electronic",
      complianceNotes: `Voice ${consentType} consent granted via CRM session start modal`,
    });

    setLoading(false);
    if (result.error) {
      console.error("Consent grant failed:", result.error);
      return;
    }
    onConsented();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="lf-card w-full max-w-md mx-4 p-6 shadow-xl">
        <div className="text-center mb-4">
          <span className="text-3xl">🔒</span>
          <h3 className="text-lg font-bold mt-2" style={{ color: "var(--lf-text)" }}>
            Voice Session Consent
          </h3>
        </div>

        <div className="space-y-3 text-sm" style={{ color: "var(--lf-text)" }}>
          <p>
            This voice session may be <strong>transcribed and stored</strong> for your records
            and quality assurance purposes.
          </p>
          <p>
            Transcripts are retained for <strong>90 days</strong> per PIPEDA requirements.
            You can withdraw consent at any time from Settings.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs">
            <strong>PIPEDA/PIPA Notice:</strong> By proceeding, you consent to the recording
            and AI processing of this voice interaction. Personal information discussed will be
            handled in accordance with Canadian privacy legislation.
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onDenied}
            className="lf-btn-ghost flex-1"
            disabled={loading}
          >
            Deny
          </button>
          <button
            onClick={handleAllow}
            className="lf-btn flex-1"
            disabled={loading}
          >
            {loading ? "Saving..." : "Allow"}
          </button>
        </div>
      </div>
    </div>
  );
}
