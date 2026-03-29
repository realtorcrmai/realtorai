"use client";

import { useRouter, usePathname } from "next/navigation";

export function NetworkLink() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <button
      type="button"
      onClick={() => {
        const params = new URLSearchParams(window.location.search);
        params.set("tab", "intelligence");
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      }}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors mt-3"
    >
      View full network & intelligence →
    </button>
  );
}
