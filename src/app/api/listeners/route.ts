import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { listeners } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET() {
  const all = await db.select().from(listeners).orderBy(listeners.createdAt);
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { source, sourceId, label, category, config } = body;

  if (!source || !sourceId || !label || !category) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Check if already exists
  const existing = await db
    .select()
    .from(listeners)
    .where(and(eq(listeners.source, source), eq(listeners.sourceId, sourceId)));

  if (existing.length > 0) {
    // Toggle active
    const updated = await db
      .update(listeners)
      .set({ active: !existing[0].active })
      .where(eq(listeners.id, existing[0].id))
      .returning();
    return NextResponse.json(updated[0]);
  }

  const [created] = await db
    .insert(listeners)
    .values({ source, sourceId, label, category, config, active: true })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
