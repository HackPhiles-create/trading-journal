"use client";

import { X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFilters } from "@/hooks/use-filters";
import { useAssets, useStrategies, useMistakes } from "@/hooks/use-reference-data";
import { DIRECTIONS, TRADE_RESULTS, SESSIONS } from "@/lib/constants";

export function FilterBar() {
  const filters = useFilters();
  const { data: assets = [] } = useAssets();
  const { data: strategies = [] } = useStrategies();
  const { data: mistakes = [] } = useMistakes();

  const hasActiveFilters =
    filters.assetId || filters.strategyId || filters.direction || filters.result || filters.session || filters.mistakeId || filters.dateFrom || filters.dateTo;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={filters.assetId ?? "all"} onValueChange={(v) => filters.setFilter("assetId", v === "all" ? null : v)}>
        <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Asset" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Assets</SelectItem>
          {assets.map((a) => (
            <SelectItem key={a.id} value={a.id}>{a.symbol}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.strategyId ?? "all"} onValueChange={(v) => filters.setFilter("strategyId", v === "all" ? null : v)}>
        <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Strategy" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Strategies</SelectItem>
          {strategies.map((s) => (
            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.direction ?? "all"} onValueChange={(v) => filters.setFilter("direction", v === "all" ? null : (v as never))}>
        <SelectTrigger className="h-9 w-[120px]"><SelectValue placeholder="Direction" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Buy/Sell</SelectItem>
          {DIRECTIONS.map((d) => (
            <SelectItem key={d} value={d}>{d}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.result ?? "all"} onValueChange={(v) => filters.setFilter("result", v === "all" ? null : (v as never))}>
        <SelectTrigger className="h-9 w-[130px]"><SelectValue placeholder="Result" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Win/Loss</SelectItem>
          {TRADE_RESULTS.map((r) => (
            <SelectItem key={r} value={r}>{r}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.session ?? "all"} onValueChange={(v) => filters.setFilter("session", v === "all" ? null : (v as never))}>
        <SelectTrigger className="h-9 w-[130px]"><SelectValue placeholder="Session" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sessions</SelectItem>
          {SESSIONS.map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.mistakeId ?? "all"} onValueChange={(v) => filters.setFilter("mistakeId", v === "all" ? null : v)}>
        <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Mistake" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Mistakes</SelectItem>
          {mistakes.map((m) => (
            <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="date"
        className="h-9 w-[140px]"
        value={filters.dateFrom ?? ""}
        onChange={(e) => filters.setFilter("dateFrom", e.target.value || null)}
      />
      <Input
        type="date"
        className="h-9 w-[140px]"
        value={filters.dateTo ?? ""}
        onChange={(e) => filters.setFilter("dateTo", e.target.value || null)}
      />

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" className="h-9 gap-1 text-muted-foreground" onClick={filters.resetFilters}>
          <X className="h-3.5 w-3.5" /> Clear
        </Button>
      )}
    </div>
  );
}
