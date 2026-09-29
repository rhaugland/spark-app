import { NextResponse } from "next/server";
import { fetchEvents } from "@/lib/fetch-events";

export async function GET() {
  const events = await fetchEvents();
  return NextResponse.json(events);
}
