// Pure JSX/react-pdf — deliberately NOT "server-only". pdf.tsx (server-only)
// reuses this for the Node Buffer-based web export; lib/local/export.ts
// (client-side) reuses it for the offline Android build's export, via
// react-pdf's browser-safe `pdf(...).toBlob()` API instead of renderToBuffer.
import React from "react";
import { Document, Page, Text, View, StyleSheet, Svg, Path } from "@react-pdf/renderer";
import type { ReportSnapshot } from "@/lib/analytics/reports";

// Minimal shape actually used below — both Prisma's TradeWithRelations and
// the local SQLite TradeDTO satisfy this structurally.
export interface ReportDocTrade {
  id: string;
  entryDateTime: string | Date;
  asset: { symbol: string };
  direction: string;
  result: string | null;
  actualPnl: number | null;
}

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#111827" },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 10, color: "#6B7280", marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: 700, marginTop: 16, marginBottom: 8 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metricCard: { width: "23%", border: "1pt solid #E5E7EB", borderRadius: 8, padding: 8, marginBottom: 8 },
  metricLabel: { fontSize: 8, color: "#6B7280" },
  metricValue: { fontSize: 14, fontWeight: 700, marginTop: 2 },
  row: { flexDirection: "row", borderBottom: "1pt solid #E5E7EB", paddingVertical: 4 },
  headerRow: { flexDirection: "row", borderBottom: "1pt solid #111827", paddingVertical: 4, fontWeight: 700 },
  cell: { flex: 1 },
  chartBox: { border: "1pt solid #E5E7EB", borderRadius: 8, padding: 8, marginTop: 4 },
  observation: { marginBottom: 4 },
});

function fmtMoney(v: number | null | undefined) {
  if (v == null) return "—";
  const sign = v >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(v).toFixed(2)}`;
}

function fmtPct(v: number | null | undefined) {
  if (v == null) return "—";
  return `${v.toFixed(1)}%`;
}

function EquitySparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const width = 500;
  const height = 100;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);
  const path = points
    .map((p, i) => {
      const x = i * stepX;
      const y = height - ((p - min) / range) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <Svg width={width} height={height}>
      <Path d={path} stroke="#0A84FF" strokeWidth={2} fill="none" />
    </Svg>
  );
}

export function ReportDocument({
  report,
  equityPoints,
  trades,
}: {
  report: ReportSnapshot;
  equityPoints: number[];
  trades: ReportDocTrade[];
}) {
  const period = `${new Date(report.periodStart).toLocaleDateString()} — ${new Date(report.periodEnd).toLocaleDateString()}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{report.type === "WEEKLY" ? "Weekly" : "Monthly"} Trading Performance Report</Text>
        <Text style={styles.subtitle}>{period}</Text>

        <View style={styles.metricGrid}>
          {[
            ["Total P&L", fmtMoney(report.summary.totalPnl)],
            ["Win Rate", fmtPct(report.summary.winRate)],
            ["Total Trades", String(report.summary.totalTrades)],
            ["Profit Factor", report.summary.profitFactor?.toFixed(2) ?? "—"],
            ["Avg R:R", report.summary.avgRR ? `1:${report.summary.avgRR.toFixed(2)}` : "—"],
            ["Avg Win", fmtMoney(report.summary.avgWin)],
            ["Avg Loss", fmtMoney(report.summary.avgLoss)],
            ["Largest Win", fmtMoney(report.summary.largestWin)],
          ].map(([label, value]) => (
            <View style={styles.metricCard} key={label}>
              <Text style={styles.metricLabel}>{label}</Text>
              <Text style={styles.metricValue}>{value}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Equity Curve</Text>
        <View style={styles.chartBox}>
          <EquitySparkline points={equityPoints} />
        </View>

        <Text style={styles.sectionTitle}>Key Observations</Text>
        {report.keyObservations.length ? (
          report.keyObservations.map((obs, i) => (
            <Text style={styles.observation} key={i}>
              • {obs}
            </Text>
          ))
        ) : (
          <Text style={styles.observation}>Not enough data yet for behavioral observations.</Text>
        )}

        <Text style={styles.sectionTitle}>Trade Summary</Text>
        <View style={styles.headerRow}>
          <Text style={styles.cell}>Date</Text>
          <Text style={styles.cell}>Asset</Text>
          <Text style={styles.cell}>Dir</Text>
          <Text style={styles.cell}>Result</Text>
          <Text style={styles.cell}>P&L</Text>
        </View>
        {trades.slice(0, 40).map((t) => (
          <View style={styles.row} key={t.id}>
            <Text style={styles.cell}>{new Date(t.entryDateTime).toLocaleDateString()}</Text>
            <Text style={styles.cell}>{t.asset.symbol}</Text>
            <Text style={styles.cell}>{t.direction}</Text>
            <Text style={styles.cell}>{t.result ?? "OPEN"}</Text>
            <Text style={styles.cell}>{fmtMoney(t.actualPnl)}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Mistake Analysis</Text>
        <View style={styles.headerRow}>
          <Text style={styles.cell}>Mistake</Text>
          <Text style={styles.cell}>Occurrences</Text>
          <Text style={styles.cell}>Losses</Text>
          <Text style={styles.cell}>P&L Impact</Text>
        </View>
        {report.mostCommonMistakes.map((m) => (
          <View style={styles.row} key={m.mistakeId}>
            <Text style={styles.cell}>{m.label}</Text>
            <Text style={styles.cell}>{m.occurrences}</Text>
            <Text style={styles.cell}>{m.lossCount}</Text>
            <Text style={styles.cell}>{fmtMoney(m.pnlImpact)}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}
