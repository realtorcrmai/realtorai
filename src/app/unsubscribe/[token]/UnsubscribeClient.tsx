"use client";

import { useState } from "react";
import { resubscribeContact } from "@/actions/contacts";

interface UnsubscribeClientProps {
  token: string;
}

export function UnsubscribeClient({ token }: UnsubscribeClientProps) {
  const [state, setState] = useState<"idle" | "loading" | "resubscribed" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  async function handleResubscribe() {
    setState("loading");
    try {
      const result = await resubscribeContact(token);
      if (result.success) {
        setState("resubscribed");
      } else {
        setErrorMsg(result.error ?? "Something went wrong. Please try again.");
        setState("error");
      }
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      setState("error");
    }
  }

  if (state === "resubscribed") {
    return (
      <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-5 text-center">
        <p className="text-sm font-medium text-emerald-800">
          You&apos;re back on the list. Welcome back!
        </p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-6 py-5 text-center">
        <p className="text-sm text-red-700">{errorMsg}</p>
        <button
          onClick={() => setState("idle")}
          className="mt-3 text-sm font-medium text-red-800 underline underline-offset-2"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <p className="mt-6 text-sm text-gray-500">
      Changed your mind?{" "}
      <button
        onClick={handleResubscribe}
        disabled={state === "loading"}
        className="font-medium text-indigo-600 underline underline-offset-2 transition-colors hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state === "loading" ? "Subscribing…" : "Re-subscribe"}
      </button>
    </p>
  );
}
