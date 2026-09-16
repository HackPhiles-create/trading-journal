import { queryAll, queryOne, run, runBatch, toBool } from "@/lib/local/db";
import { genId, nowIso, LocalApiError } from "@/lib/local/utils";
import { createTradeSchema, updateTradeSchema, closeTradeSchema } from "@/lib/schemas/trade";
import { validateTrade } from "@/lib/validation";
import { calculateRR } from "@/lib/trading-math";
import { getOrCreateLocalPreference } from "@/lib/local/preferences";
import { notifyLowRRLocal, generatePostTradeNotificationsLocal } from "@/lib/local/notifications";
import type { TradeDTO, TradeFilterQuery } from "@/hooks/use-trades";
import type { Direction } from "@/lib/constants";

function placeholders(n: number): string {
  return Array(n).fill("?").join(",");
}

async function attachRelations(tradeRows: Record<string, unknown>[]): Promise<TradeDTO[]> {
  if (tradeRows.length === 0) return [];
  const ids = tradeRows.map((r) => r.id as string);

  const [accounts, assets, strategies] = await Promise.all([
    queryAll("SELECT * FROM accounts"),
    queryAll("SELECT * FROM assets"),
    queryAll("SELECT * FROM strategies"),
  ]);
  const accountMap = new Map(accounts.map((a) => [a.id as string, a]));
  const assetMap = new Map(assets.map((a) => [a.id as string, a]));
  const strategyMap = new Map(strategies.map((s) => [s.id as string, s]));

  const [mistakeRows, checklistRows, screenshotRows] = await Promise.all([
    queryAll<{ id: string; tradeId: string; mistakeId: string; note: string | null; mistakeLabel: string }>(
      `SELECT tm.id, tm.tradeId, tm.mistakeId, tm.note, m.label as mistakeLabel
       FROM trade_mistakes tm JOIN mistakes m ON m.id = tm.mistakeId
       WHERE tm.tradeId IN (${placeholders(ids.length)})`,
      ids
    ),
    queryAll<{ id: string; tradeId: string; checklistItemId: string; checked: number; itemLabel: string }>(
      `SELECT tca.id, tca.tradeId, tca.checklistItemId, tca.checked, ci.label as itemLabel
       FROM trade_checklist_answers tca JOIN checklist_items ci ON ci.id = tca.checklistItemId
       WHERE tca.tradeId IN (${placeholders(ids.length)})`,
      ids
    ),
    queryAll<Record<string, unknown>>(`SELECT * FROM screenshots WHERE tradeId IN (${placeholders(ids.length)})`, ids),
  ]);

  const mistakesByTrade = new Map<string, TradeDTO["mistakes"]>();
  for (const r of mistakeRows) {
    const list = mistakesByTrade.get(r.tradeId) ?? [];
    list.push({ id: r.id, mistakeId: r.mistakeId, note: r.note ?? null, mistake: { id: r.mistakeId, label: r.mistakeLabel } });
    mistakesByTrade.set(r.tradeId, list);
  }
  const checklistByTrade = new Map<string, TradeDTO["checklistAnswers"]>();
  for (const r of checklistRows) {
    const list = checklistByTrade.get(r.tradeId) ?? [];
    list.push({ id: r.id, checklistItemId: r.checklistItemId, checked: toBool(r.checked), checklistItem: { id: r.checklistItemId, label: r.itemLabel } });
    checklistByTrade.set(r.tradeId, list);
  }
  const screenshotsByTrade = new Map<string, TradeDTO["screenshots"]>();
  for (const r of screenshotRows) {
    const tradeId = r.tradeId as string;
    const list = screenshotsByTrade.get(tradeId) ?? [];
    list.push({ id: r.id as string, filePath: r.filePath as string, phase: r.phase as string, caption: (r.caption as string) ?? null });
    screenshotsByTrade.set(tradeId, list);
  }

  return tradeRows.map((row): TradeDTO => {
    const account = accountMap.get(row.accountId as string);
    const asset = assetMap.get(row.assetId as string);
    const strategy = row.strategyId ? strategyMap.get(row.strategyId as string) : undefined;
    const id = row.id as string;
    return {
      id,
      accountId: row.accountId as string,
      assetId: row.assetId as string,
      strategyId: (row.strategyId as string) ?? null,
      direction: row.direction as string,
      status: row.status as string,
      session: (row.session as string) ?? null,
      entryDateTime: row.entryDateTime as string,
      entryPrice: row.entryPrice as number,
      stopLoss: row.stopLoss as number,
      takeProfit: row.takeProfit as number,
      lotSize: row.lotSize as number,
      exitPrice: (row.exitPrice as number) ?? null,
      exitDateTime: (row.exitDateTime as string) ?? null,
      result: (row.result as string) ?? null,
      actualPnl: (row.actualPnl as number) ?? null,
      actualRMultiple: (row.actualRMultiple as number) ?? null,
      reasoningText: (row.reasoningText as string) ?? null,
      marketCondition: (row.marketCondition as string) ?? null,
      confirmation: (row.confirmation as string) ?? null,
      entryReason: (row.entryReason as string) ?? null,
      confluence: (row.confluence as string) ?? null,
      riskReasoning: (row.riskReasoning as string) ?? null,
      emotionalState: (row.emotionalState as string) ?? null,
      whatWentWell: (row.whatWentWell as string) ?? null,
      whatToImprove: (row.whatToImprove as string) ?? null,
      lessonLearned: (row.lessonLearned as string) ?? null,
      isDemo: toBool(row.isDemo),
      account: account ? { id: account.id as string, name: account.name as string } : { id: row.accountId as string, name: "Unknown" },
      asset: asset
        ? { id: asset.id as string, symbol: asset.symbol as string, name: asset.name as string, contractSize: asset.contractSize as number }
        : { id: row.assetId as string, symbol: "?", name: "Unknown", contractSize: 1 },
      strategy: strategy ? { id: strategy.id as string, name: strategy.name as string } : null,
      mistakes: mistakesByTrade.get(id) ?? [],
      checklistAnswers: checklistByTrade.get(id) ?? [],
      screenshots: screenshotsByTrade.get(id) ?? [],
    };
  });
}

export async function listTrades(filters?: TradeFilterQuery): Promise<TradeDTO[]> {
  const clauses: string[] = [];
  const values: unknown[] = [];
  if (filters?.accountId) { clauses.push("accountId = ?"); values.push(filters.accountId); }
  if (filters?.assetId) { clauses.push("assetId = ?"); values.push(filters.assetId); }
  if (filters?.strategyId) { clauses.push("strategyId = ?"); values.push(filters.strategyId); }
  if (filters?.direction) { clauses.push("direction = ?"); values.push(filters.direction); }
  if (filters?.result) { clauses.push("result = ?"); values.push(filters.result); }
  if (filters?.session) { clauses.push("session = ?"); values.push(filters.session); }
  if (filters?.dateFrom) { clauses.push("entryDateTime >= ?"); values.push(filters.dateFrom); }
  if (filters?.dateTo) { clauses.push("entryDateTime <= ?"); values.push(filters.dateTo); }
  if (filters?.mistakeId) { clauses.push("id IN (SELECT tradeId FROM trade_mistakes WHERE mistakeId = ?)"); values.push(filters.mistakeId); }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = await queryAll(`SELECT * FROM trades ${where} ORDER BY entryDateTime DESC`, values);
  return attachRelations(rows);
}

export async function getTrade(id: string): Promise<TradeDTO> {
  const row = await queryOne("SELECT * FROM trades WHERE id = ?", [id]);
  if (!row) throw new LocalApiError("Trade not found.", 404);
  const [dto] = await attachRelations([row]);
  return dto;
}

async function existingTradesFor(accountId: string, assetId: string, excludeId?: string) {
  const rows = await queryAll<{ id: string; accountId: string; assetId: string; direction: string; entryPrice: number; entryDateTime: string }>(
    `SELECT id, accountId, assetId, direction, entryPrice, entryDateTime FROM trades WHERE accountId = ? AND assetId = ? ${excludeId ? "AND id != ?" : ""}`,
    excludeId ? [accountId, assetId, excludeId] : [accountId, assetId]
  );
  return rows.map((t) => ({ ...t, direction: t.direction as Direction, entryDateTime: new Date(t.entryDateTime) }));
}

export async function createTrade(input: unknown): Promise<{ trade: TradeDTO; warnings: { field: string; message: string }[] }> {
  const parsed = createTradeSchema.safeParse(input);
  if (!parsed.success) throw new LocalApiError(parsed.error.issues[0]?.message ?? "Invalid input");
  const data = parsed.data;

  const [asset, account, prefs, existingTrades] = await Promise.all([
    queryOne<{ id: string; contractSize: number }>("SELECT * FROM assets WHERE id = ?", [data.assetId]),
    queryOne("SELECT id FROM accounts WHERE id = ?", [data.accountId]),
    getOrCreateLocalPreference(),
    existingTradesFor(data.accountId, data.assetId),
  ]);
  if (!asset) throw new LocalApiError("Asset not found.", 404);
  if (!account) throw new LocalApiError("Account not found.", 404);

  const validation = validateTrade({
    direction: data.direction,
    entryPrice: data.entryPrice,
    stopLoss: data.stopLoss,
    takeProfit: data.takeProfit,
    lotSize: data.lotSize,
    entryDateTime: data.entryDateTime,
    assetId: data.assetId,
    accountId: data.accountId,
    preferredMinRR: prefs.preferredMinRR,
    existingTrades,
  });
  if (validation.errors.length > 0) throw new LocalApiError(validation.errors[0].message, 422);

  const id = genId();
  const now = nowIso();
  const statements = [
    {
      statement: `INSERT INTO trades (id, accountId, assetId, strategyId, direction, status, session, entryDateTime, entryPrice, stopLoss, takeProfit, lotSize, riskPercent, reasoningText, marketCondition, confirmation, entryReason, confluence, riskReasoning, isDemo, createdAt, updatedAt)
                  VALUES (?, ?, ?, ?, ?, 'OPEN', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      values: [
        id, data.accountId, data.assetId, data.strategyId || null, data.direction, data.session || null,
        data.entryDateTime.toISOString(), data.entryPrice, data.stopLoss, data.takeProfit, data.lotSize, data.riskPercent ?? null,
        data.reasoningText || null, data.marketCondition || null, data.confirmation || null, data.entryReason || null,
        data.confluence || null, data.riskReasoning || null, now, now,
      ],
    },
    ...data.checklistAnswers.map((a) => ({
      statement: "INSERT INTO trade_checklist_answers (id, tradeId, checklistItemId, checked) VALUES (?, ?, ?, ?)",
      values: [genId(), id, a.checklistItemId, a.checked ? 1 : 0],
    })),
  ];
  await runBatch(statements);

  const rr = calculateRR({ direction: data.direction, entry: data.entryPrice, sl: data.stopLoss, tp: data.takeProfit, lotSize: data.lotSize, contractSize: asset.contractSize });
  if (rr.rrRatio != null && rr.rrRatio < prefs.preferredMinRR) {
    await notifyLowRRLocal({ tradeId: id, rrRatio: rr.rrRatio, preferredMinRR: prefs.preferredMinRR });
  }

  const trade = await getTrade(id);
  return { trade, warnings: validation.warnings };
}

export async function updateTrade(id: string, input: unknown): Promise<TradeDTO> {
  const parsed = updateTradeSchema.safeParse(input);
  if (!parsed.success) throw new LocalApiError(parsed.error.issues[0]?.message ?? "Invalid input");
  const patch = parsed.data;

  const existing = await queryOne<Record<string, unknown>>("SELECT * FROM trades WHERE id = ?", [id]);
  if (!existing) throw new LocalApiError("Trade not found.", 404);

  const merged = {
    direction: (patch.direction ?? existing.direction) as Direction,
    entryPrice: patch.entryPrice ?? (existing.entryPrice as number),
    stopLoss: patch.stopLoss ?? (existing.stopLoss as number),
    takeProfit: patch.takeProfit ?? (existing.takeProfit as number),
    lotSize: patch.lotSize ?? (existing.lotSize as number),
    entryDateTime: patch.entryDateTime ?? new Date(existing.entryDateTime as string),
    assetId: patch.assetId ?? (existing.assetId as string),
    accountId: patch.accountId ?? (existing.accountId as string),
  };

  const prefs = await getOrCreateLocalPreference();
  const otherTrades = await existingTradesFor(merged.accountId, merged.assetId, id);
  const validation = validateTrade({ ...merged, preferredMinRR: prefs.preferredMinRR, existingTrades: otherTrades });
  if (validation.errors.length > 0) throw new LocalApiError(validation.errors[0].message, 422);

  const { checklistAnswers, ...rest } = patch;
  const fieldMap: Record<string, unknown> = { ...rest };
  if (fieldMap.entryDateTime instanceof Date) fieldMap.entryDateTime = fieldMap.entryDateTime.toISOString();

  const entries = Object.entries(fieldMap);
  const statements = [];
  if (entries.length > 0) {
    statements.push({
      statement: `UPDATE trades SET ${entries.map(([k]) => `${k} = ?`).join(", ")}, updatedAt = ? WHERE id = ?`,
      values: [...entries.map(([, v]) => v), nowIso(), id],
    });
  }
  if (checklistAnswers) {
    statements.push({ statement: "DELETE FROM trade_checklist_answers WHERE tradeId = ?", values: [id] });
    for (const a of checklistAnswers) {
      statements.push({
        statement: "INSERT INTO trade_checklist_answers (id, tradeId, checklistItemId, checked) VALUES (?, ?, ?, ?)",
        values: [genId(), id, a.checklistItemId, a.checked ? 1 : 0],
      });
    }
  }
  if (statements.length > 0) await runBatch(statements);

  return getTrade(id);
}

export async function closeTrade(id: string, input: unknown): Promise<TradeDTO> {
  const parsed = closeTradeSchema.safeParse(input);
  if (!parsed.success) throw new LocalApiError(parsed.error.issues[0]?.message ?? "Invalid input");
  const data = parsed.data;

  const existing = await queryOne<Record<string, unknown>>("SELECT * FROM trades WHERE id = ?", [id]);
  if (!existing) throw new LocalApiError("Trade not found.", 404);
  if (data.exitDateTime.getTime() < new Date(existing.entryDateTime as string).getTime()) {
    throw new LocalApiError("Exit date/time cannot be before the entry date/time.", 422);
  }

  const statements = [
    {
      statement: `UPDATE trades SET status = 'CLOSED', exitPrice = ?, exitDateTime = ?, result = ?, actualPnl = ?, actualRMultiple = ?, pnlManuallyOverridden = ?, emotionalState = ?, whatWentWell = ?, whatToImprove = ?, lessonLearned = ?, updatedAt = ? WHERE id = ?`,
      values: [
        data.exitPrice, data.exitDateTime.toISOString(), data.result, data.actualPnl, data.actualRMultiple ?? null,
        data.pnlManuallyOverridden ? 1 : 0, data.emotionalState || null, data.whatWentWell || null, data.whatToImprove || null,
        data.lessonLearned || null, nowIso(), id,
      ],
    },
    { statement: "DELETE FROM trade_mistakes WHERE tradeId = ?", values: [id] },
    ...data.mistakes.map((m) => ({
      statement: "INSERT INTO trade_mistakes (id, tradeId, mistakeId, note) VALUES (?, ?, ?, ?)",
      values: [genId(), id, m.mistakeId, m.note || null],
    })),
  ];
  await runBatch(statements);

  await generatePostTradeNotificationsLocal({ accountId: existing.accountId as string });

  return getTrade(id);
}

export async function deleteTrade(id: string): Promise<void> {
  await run("DELETE FROM trades WHERE id = ?", [id]);
}
