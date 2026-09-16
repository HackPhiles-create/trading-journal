import { useMemo } from "react";
import { calculateRR, type RRInput, type RRResult } from "@/lib/trading-math";

export function useRRCalc(input: Partial<RRInput>): RRResult | null {
  return useMemo(() => {
    const { direction, entry, sl, tp, lotSize } = input;
    if (
      !direction ||
      entry == null ||
      sl == null ||
      tp == null ||
      lotSize == null ||
      Number.isNaN(entry) ||
      Number.isNaN(sl) ||
      Number.isNaN(tp) ||
      Number.isNaN(lotSize)
    ) {
      return null;
    }
    return calculateRR({ direction, entry, sl, tp, lotSize, contractSize: input.contractSize, accountBalance: input.accountBalance });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input.direction, input.entry, input.sl, input.tp, input.lotSize, input.contractSize, input.accountBalance]);
}
