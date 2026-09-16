import { CalendarGrid } from "@/components/calendar/calendar-grid";

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="text-sm text-muted-foreground">Your trading activity, day by day.</p>
      </div>
      <CalendarGrid />
    </div>
  );
}
