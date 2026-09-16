import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Direction, Session, TradeResult } from "@/lib/constants";

export interface FilterState {
  accountId: string | null; // null = All Accounts
  assetId: string | null;
  strategyId: string | null;
  direction: Direction | null;
  result: TradeResult | null;
  session: Session | null;
  mistakeId: string | null;
  dateFrom: string | null; // ISO date string
  dateTo: string | null;
}

interface FilterStore extends FilterState {
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;
}

const defaultFilters: FilterState = {
  accountId: null,
  assetId: null,
  strategyId: null,
  direction: null,
  result: null,
  session: null,
  mistakeId: null,
  dateFrom: null,
  dateTo: null,
};

export const useFilterStore = create<FilterStore>()(
  persist(
    (set) => ({
      ...defaultFilters,
      setFilter: (key, value) => set((state) => ({ ...state, [key]: value })),
      resetFilters: () => set(defaultFilters),
    }),
    { name: "trading-journal-filters" }
  )
);
