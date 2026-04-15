"use client";

export default function ContactsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full text-center">
        <p className="text-sm font-semibold text-destructive mb-2">
          Something went wrong
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          {error.message || "An unexpected error occurred loading contacts."}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 text-sm font-medium rounded-md bg-brand text-white hover:bg-brand/90 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
