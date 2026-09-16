import { NextResponse } from "next/server";
import { checkNewsAlerts } from "@/lib/news/alerts";

// No real cron in a local Next.js app — called periodically from the client
// (see PeriodicChecks) while the app is open, same pattern as reports/check-due.
export async function GET() {
  const created = await checkNewsAlerts();
  return NextResponse.json({ created });
}
