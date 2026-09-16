import { Smile, AlertTriangle, Lightbulb, ThumbsUp, ThumbsDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { TradeDTO } from "@/hooks/use-trades";

const EMOTION_EMOJI: Record<string, string> = {
  CALM: "😌",
  CONFIDENT: "😎",
  FOMO: "😬",
  FEAR: "😨",
  GREED: "🤑",
  REVENGE: "😤",
  NEUTRAL: "😐",
  OTHER: "🤔",
};

export function ReviewPanel({ trade }: { trade: TradeDTO }) {
  if (trade.status !== "CLOSED") return null;

  const hasContent = trade.whatWentWell || trade.whatToImprove || trade.lessonLearned || trade.emotionalState || trade.mistakes.length > 0;
  if (!hasContent) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <h3 className="text-sm font-semibold text-foreground">Review</h3>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {trade.whatWentWell && (
          <div className="rounded-xl border border-profit/20 bg-profit/5 p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-profit">
              <ThumbsUp className="h-3.5 w-3.5" /> What went well
            </div>
            <p className="mt-1.5 text-sm text-foreground">{trade.whatWentWell}</p>
          </div>
        )}
        {trade.whatToImprove && (
          <div className="rounded-xl border border-loss/20 bg-loss/5 p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-loss">
              <ThumbsDown className="h-3.5 w-3.5" /> What to improve
            </div>
            <p className="mt-1.5 text-sm text-foreground">{trade.whatToImprove}</p>
          </div>
        )}
      </div>

      {trade.lessonLearned && (
        <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Lightbulb className="h-3.5 w-3.5" /> Lesson learned
          </div>
          <p className="mt-1.5 text-sm text-foreground">{trade.lessonLearned}</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-4">
        {trade.emotionalState && (
          <div className="flex items-center gap-1.5 text-sm text-foreground">
            <Smile className="h-4 w-4 text-muted-foreground" />
            <span>{EMOTION_EMOJI[trade.emotionalState] ?? ""} {trade.emotionalState}</span>
          </div>
        )}

        {trade.mistakes.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-loss" />
            {trade.mistakes.map((m) => (
              <Badge key={m.id} variant="outline" className="border-loss/20 bg-loss/5 text-loss">
                {m.mistake.label}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
