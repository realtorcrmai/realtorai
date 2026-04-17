"use client";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <h2 className="text-lg font-semibold text-[--lf-text]">Something went wrong</h2>
      <p className="text-sm text-gray-500">{error.message || "An unexpected error occurred"}</p>
      <button onClick={reset} className="lf-btn">Try again</button>
    </div>
  );
}
