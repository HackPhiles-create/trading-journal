import { NextResponse } from "next/server";
import { getCalendar } from "@/lib/news/forex-factory";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country");
  const impact = searchParams.get("impact");

  const events = await getCalendar();
  const filtered = events.filter((e) => {
    if (country && e.country !== country) return false;
    if (impact && e.impact !== impact) return false;
    return true;
  });

  return NextResponse.json(filtered.sort((a, b) => a.date.getTime() - b.date.getTime()));
}
