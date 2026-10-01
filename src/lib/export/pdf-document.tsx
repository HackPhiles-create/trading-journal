// Pure JSX/react-pdf — deliberately NOT "server-only". pdf.tsx (server-only)
// reuses this for the Node Buffer-based web export; lib/local/export.ts
// (client-side) reuses it for the offline Android build's export, via
// react-pdf's browser-safe `pdf(...).toBlob()` API instead of renderToBuffer.
import React from "react";
import { Document, Page, Text, View, StyleSheet, Svg, Path, Image } from "@react-pdf/renderer";
import type { ReportSnapshot } from "@/lib/analytics/reports";

// Shape actually used below — both Prisma's TradeWithRelations and the local
// SQLite TradeDTO satisfy every field except `screenshots`, which needs an
// async, platform-specific read (disk on web, Capacitor Filesystem on
// native) to turn a stored filePath into embeddable bytes. Callers build
// this via toReportDocTrade() once they've resolved those bytes themselves.
export interface ReportDocTrade {
  id: string;
  entryDateTime: string | Date;
  exitDateTime?: string | Date | null;
  asset: { symbol: string };
  direction: string;
  result: string | null;
  actualPnl: number | null;
  actualRMultiple?: number | null;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  exitPrice?: number | null;
  lotSize?: number;
  session?: string | null;
  reasoningText?: string | null;
  marketCondition?: string | null;
  confirmation?: string | null;
  entryReason?: string | null;
  confluence?: string | null;
  riskReasoning?: string | null;
  emotionalState?: string | null;
  whatWentWell?: string | null;
  whatToImprove?: string | null;
  lessonLearned?: string | null;
  mistakes?: { label: string; note?: string | null }[];
  screenshots?: { phase: string; caption?: string | null; dataUri: string }[];
}

// Base trade fields every platform's Trade shape already has natively —
// everything here is synchronous/pure. Screenshots are handled separately
// (see ReportDocTrade's doc comment) since resolving them needs real I/O.
type ReportSourceTrade = Omit<ReportDocTrade, "screenshots" | "mistakes"> & {
  mistakes?: { note?: string | null; mistake: { label: string } }[];
  screenshots?: { filePath: string; phase: string; caption?: string | null }[];
};

type ReportDocScreenshot = NonNullable<ReportDocTrade["screenshots"]>[number];

export function toReportDocTrade(trade: ReportSourceTrade, screenshotDataUris: Map<string, string>): ReportDocTrade {
  return {
    ...trade,
    mistakes: trade.mistakes?.map((m) => ({ label: m.mistake.label, note: m.note })),
    screenshots: (trade.screenshots ?? [])
      .map((s): ReportDocScreenshot | null => {
        const dataUri = screenshotDataUris.get(s.filePath);
        return dataUri ? { phase: s.phase, caption: s.caption, dataUri } : null;
      })
      .filter((s): s is ReportDocScreenshot => s !== null),
  };
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
  tradeCard: { border: "1pt solid #E5E7EB", borderRadius: 8, padding: 10, marginBottom: 10 },
  tradeCardHeader: { flexDirection: "row", justifyContent: "space-between", paddingBottom: 6, marginBottom: 6, borderBottom: "1pt solid #E5E7EB" },
  tradeCardTitle: { fontSize: 11, fontWeight: 700 },
  tradeCardMeta: { fontSize: 9, color: "#6B7280" },
  levelsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 6 },
  levelItem: { minWidth: "15%" },
  levelLabel: { fontSize: 7, color: "#6B7280", textTransform: "uppercase" },
  levelValue: { fontSize: 9, fontWeight: 700, marginTop: 1 },
  subheading: { fontSize: 9, fontWeight: 700, marginTop: 6, marginBottom: 3, color: "#374151" },
  fieldGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  fieldBlock: { minWidth: "45%", marginBottom: 4 },
  fieldLabel: { fontSize: 7, color: "#6B7280", textTransform: "uppercase" },
  fieldValue: { fontSize: 9, marginTop: 1 },
  bodyText: { fontSize: 9, lineHeight: 1.4, marginBottom: 4 },
  reviewRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  reviewCol: { flex: 1 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 2 },
  tag: { fontSize: 8, border: "1pt solid #E5E7EB", borderRadius: 4, paddingVertical: 2, paddingHorizontal: 5 },
  screenshotsRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  screenshotGroup: { flex: 1 },
  screenshotGroupTitle: { fontSize: 8, fontWeight: 700, marginBottom: 3, color: "#6B7280" },
  screenshotThumbsRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  screenshotImage: { width: 140, height: 100, objectFit: "contain", border: "1pt solid #E5E7EB", borderRadius: 4 },
  screenshotCaption: { fontSize: 7, color: "#6B7280", marginTop: 1, maxWidth: 140 },
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

function fmtR(v: number | null | undefined) {
  if (v == null) return "—";
  const sign = v >= 0 ? "+" : "-";
  return `${sign}${Math.abs(v).toFixed(2)}R`;
}

function fmtPrice(v: number | null | undefined) {
  return v == null ? "—" : String(v);
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

function TradeDetailCard({ trade }: { trade: ReportDocTrade }) {
  const reasoningFields: [string, string | null | undefined][] = [
    ["Market condition", trade.marketCondition],
    ["Confirmation", trade.confirmation],
    ["Entry reason", trade.entryReason],
    ["Confluence", trade.confluence],
  ];
  const hasReasoning = Boolean(trade.reasoningText) || reasoningFields.some(([, v]) => v) || Boolean(trade.riskReasoning);
  const hasReview = Boolean(
    trade.emotionalState || trade.whatWentWell || trade.whatToImprove || trade.lessonLearned || trade.mistakes?.length
  );
  const before = trade.screenshots?.filter((s) => s.phase === "BEFORE") ?? [];
  const after = trade.screenshots?.filter((s) => s.phase === "AFTER") ?? [];

  return (
    <View style={styles.tradeCard} key={trade.id}>
      <View style={styles.tradeCardHeader}>
        <Text style={styles.tradeCardTitle}>
          {trade.asset.symbol} · {trade.direction} · {trade.result ?? "OPEN"}
        </Text>
        <Text style={styles.tradeCardMeta}>
          {new Date(trade.entryDateTime).toLocaleString()}
          {trade.session ? ` · ${trade.session}` : ""}
        </Text>
      </View>

      <View style={styles.levelsRow}>
        {[
          ["Entry", fmtPrice(trade.entryPrice)],
          ["Stop Loss", fmtPrice(trade.stopLoss)],
          ["Take Profit", fmtPrice(trade.takeProfit)],
          ["Exit", fmtPrice(trade.exitPrice)],
          ["Lot Size", trade.lotSize != null ? String(trade.lotSize) : "—"],
          ["R:R", fmtR(trade.actualRMultiple)],
          ["P&L", fmtMoney(trade.actualPnl)],
        ].map(([label, value]) => (
          <View style={styles.levelItem} key={label}>
            <Text style={styles.levelLabel}>{label}</Text>
            <Text style={styles.levelValue}>{value}</Text>
          </View>
        ))}
      </View>

      {hasReasoning && (
        <View>
          <Text style={styles.subheading}>Why this trade</Text>
          {trade.reasoningText && <Text style={styles.bodyText}>{trade.reasoningText}</Text>}
          <View style={styles.fieldGrid}>
            {reasoningFields
              .filter(([, v]) => v)
              .map(([label, value]) => (
                <View style={styles.fieldBlock} key={label}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <Text style={styles.fieldValue}>{value}</Text>
                </View>
              ))}
          </View>
          {trade.riskReasoning && (
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Risk reasoning</Text>
              <Text style={styles.fieldValue}>{trade.riskReasoning}</Text>
            </View>
          )}
        </View>
      )}

      {hasReview && (
        <View>
          <Text style={styles.subheading}>Review</Text>
          {trade.emotionalState && (
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Emotional state</Text>
              <Text style={styles.fieldValue}>{trade.emotionalState}</Text>
            </View>
          )}
          {(trade.whatWentWell || trade.whatToImprove) && (
            <View style={styles.reviewRow}>
              {trade.whatWentWell && (
                <View style={styles.reviewCol}>
                  <Text style={styles.fieldLabel}>What went well</Text>
                  <Text style={styles.fieldValue}>{trade.whatWentWell}</Text>
                </View>
              )}
              {trade.whatToImprove && (
                <View style={styles.reviewCol}>
                  <Text style={styles.fieldLabel}>What to improve</Text>
                  <Text style={styles.fieldValue}>{trade.whatToImprove}</Text>
                </View>
              )}
            </View>
          )}
          {trade.lessonLearned && (
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Lesson learned</Text>
              <Text style={styles.fieldValue}>{trade.lessonLearned}</Text>
            </View>
          )}
          {trade.mistakes && trade.mistakes.length > 0 && (
            <View style={styles.tagRow}>
              {trade.mistakes.map((m, i) => (
                <Text style={styles.tag} key={i}>
                  {m.label}
                  {m.note ? ` — ${m.note}` : ""}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {(before.length > 0 || after.length > 0) && (
        <View style={styles.screenshotsRow}>
          {before.length > 0 && (
            <View style={styles.screenshotGroup}>
              <Text style={styles.screenshotGroupTitle}>Before</Text>
              <View style={styles.screenshotThumbsRow}>
                {before.map((s, i) => (
                  <View key={i}>
                    <Image src={s.dataUri} style={styles.screenshotImage} />
                    {s.caption && <Text style={styles.screenshotCaption}>{s.caption}</Text>}
                  </View>
                ))}
              </View>
            </View>
          )}
          {after.length > 0 && (
            <View style={styles.screenshotGroup}>
              <Text style={styles.screenshotGroupTitle}>After</Text>
              <View style={styles.screenshotThumbsRow}>
                {after.map((s, i) => (
                  <View key={i}>
                    <Image src={s.dataUri} style={styles.screenshotImage} />
                    {s.caption && <Text style={styles.screenshotCaption}>{s.caption}</Text>}
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}
    </View>
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

        <Text style={styles.sectionTitle}>Trade Details</Text>
        {trades.length ? (
          trades.map((t) => <TradeDetailCard trade={t} key={t.id} />)
        ) : (
          <Text style={styles.observation}>No trades in this period.</Text>
        )}

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
