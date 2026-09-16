"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { ArrowUpDown, ArrowUpRight, ArrowDownRight, Search, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/skeletons";
import { FilterBar } from "@/components/trade-table/filter-bar";
import { useTrades, type TradeDTO } from "@/hooks/use-trades";
import { useFilters } from "@/hooks/use-filters";
import { calculateRR } from "@/lib/trading-math";
import { formatCurrency, formatPrice, formatRR } from "@/lib/format";
import { cn } from "@/lib/utils";

const RESULT_STYLES: Record<string, string> = {
  WIN: "bg-profit/10 text-profit border-profit/20",
  LOSS: "bg-loss/10 text-loss border-loss/20",
  BREAKEVEN: "bg-muted text-muted-foreground border-border",
};

function SortButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
      {label}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );
}

export function TradeTable() {
  const router = useRouter();
  const { asQuery } = useFilters();
  const { data: trades = [], isLoading } = useTrades(asQuery);
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "entryDateTime", desc: true }]);

  const columns = useMemo<ColumnDef<TradeDTO>[]>(
    () => [
      {
        accessorKey: "entryDateTime",
        header: ({ column }) => <SortButton label="Date" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} />,
        cell: ({ row }) => (
          <div className="whitespace-nowrap text-sm">
            <p className="font-medium text-foreground">{format(new Date(row.original.entryDateTime), "MMM d, yyyy")}</p>
            <p className="text-xs text-muted-foreground">{format(new Date(row.original.entryDateTime), "HH:mm")}</p>
          </div>
        ),
      },
      {
        accessorKey: "asset.symbol",
        header: "Asset",
        cell: ({ row }) => <span className="font-medium">{row.original.asset.symbol}</span>,
      },
      {
        accessorKey: "direction",
        header: "Direction",
        cell: ({ row }) => (
          <span className={cn("flex items-center gap-1 text-sm font-medium", row.original.direction === "BUY" ? "text-profit" : "text-loss")}>
            {row.original.direction === "BUY" ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {row.original.direction}
          </span>
        ),
      },
      { accessorKey: "entryPrice", header: "Entry", cell: ({ row }) => <span className="tabular-nums">{formatPrice(row.original.entryPrice)}</span> },
      { accessorKey: "stopLoss", header: "SL", cell: ({ row }) => <span className="tabular-nums text-loss">{formatPrice(row.original.stopLoss)}</span> },
      { accessorKey: "takeProfit", header: "TP", cell: ({ row }) => <span className="tabular-nums text-profit">{formatPrice(row.original.takeProfit)}</span> },
      {
        id: "rr",
        header: "R:R",
        cell: ({ row }) => {
          const t = row.original;
          const rr = calculateRR({ direction: t.direction as never, entry: t.entryPrice, sl: t.stopLoss, tp: t.takeProfit, lotSize: t.lotSize, contractSize: t.asset.contractSize });
          return <span className="tabular-nums text-muted-foreground">{formatRR(rr.rrRatio)}</span>;
        },
      },
      { accessorKey: "lotSize", header: "Lot", cell: ({ row }) => <span className="tabular-nums">{row.original.lotSize}</span> },
      {
        accessorKey: "actualPnl",
        header: ({ column }) => <SortButton label="P&L" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} />,
        cell: ({ row }) => {
          const pnl = row.original.actualPnl;
          if (pnl == null) return <span className="text-muted-foreground">—</span>;
          return <span className={cn("font-medium tabular-nums", pnl >= 0 ? "text-profit" : "text-loss")}>{formatCurrency(pnl, { showSign: true })}</span>;
        },
      },
      {
        accessorKey: "result",
        header: "Result",
        cell: ({ row }) =>
          row.original.result ? (
            <Badge variant="outline" className={cn("text-[11px]", RESULT_STYLES[row.original.result])}>{row.original.result}</Badge>
          ) : (
            <Badge variant="outline" className="text-[11px]">OPEN</Badge>
          ),
      },
      { accessorKey: "strategy.name", header: "Strategy", cell: ({ row }) => <span className="text-muted-foreground">{row.original.strategy?.name ?? "—"}</span> },
      {
        id: "mistakes",
        header: "Mistakes",
        cell: ({ row }) =>
          row.original.mistakes.length ? (
            <div className="flex flex-wrap gap-1">
              {row.original.mistakes.slice(0, 2).map((m) => (
                <Badge key={m.id} variant="outline" className="border-loss/20 bg-loss/5 text-[10px] text-loss">
                  {m.mistake.label}
                </Badge>
              ))}
              {row.original.mistakes.length > 2 && <span className="text-xs text-muted-foreground">+{row.original.mistakes.length - 2}</span>}
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
    ],
    []
  );

  const filteredTrades = useMemo(() => {
    if (!search.trim()) return trades;
    const q = search.toLowerCase();
    return trades.filter(
      (t) =>
        t.asset.symbol.toLowerCase().includes(q) ||
        t.strategy?.name.toLowerCase().includes(q) ||
        t.direction.toLowerCase().includes(q) ||
        t.account.name.toLowerCase().includes(q)
    );
  }, [trades, search]);

  const table = useReactTable({
    data: filteredTrades,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterBar />
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search trades..." className="h-9 w-56 pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={10} columns={9} />
      ) : filteredTrades.length === 0 ? (
        <EmptyState icon={BookOpen} title="No trades found" description="Try adjusting your filters, or log your first trade." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id} className="hover:bg-transparent">
                    {hg.headers.map((header) => (
                      <TableHead key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/journal/${row.original.id}`)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1} · {filteredTrades.length} trades
            </p>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
