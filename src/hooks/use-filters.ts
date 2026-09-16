import { useFilterStore } from "@/lib/stores/filter-store";

// Thin wrapper around the filter store so components don't import zustand
// directly. Returns the current filter values plus a stable API-query object
// used as the TanStack Query key across Dashboard/Analytics/Journal.
export function useFilters() {
  const filters = useFilterStore();
  const { setFilter, resetFilters, ...values } = filters;

  return {
    ...values,
    setFilter,
    resetFilters,
    asQuery: {
      accountId: values.accountId ?? undefined,
      assetId: values.assetId ?? undefined,
      strategyId: values.strategyId ?? undefined,
      direction: values.direction ?? undefined,
      result: values.result ?? undefined,
      session: values.session ?? undefined,
      mistakeId: values.mistakeId ?? undefined,
      dateFrom: values.dateFrom ?? undefined,
      dateTo: values.dateTo ?? undefined,
    },
  };
}
