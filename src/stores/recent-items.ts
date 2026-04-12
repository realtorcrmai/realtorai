import { create } from "zustand";
import { persist } from "zustand/middleware";

interface RecentItem {
  id: string;
  type: "contact" | "listing";
  label: string;
  href: string;
  viewedAt: number;
}

interface RecentStore {
  items: RecentItem[];
  addItem: (item: Omit<RecentItem, "viewedAt">) => void;
}

export const useRecentItems = create<RecentStore>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((state) => ({
          items: [
            { ...item, viewedAt: Date.now() },
            ...state.items.filter((i) => i.id !== item.id),
          ].slice(0, 10),
        })),
    }),
    { name: "r360-recent-items" }
  )
);
