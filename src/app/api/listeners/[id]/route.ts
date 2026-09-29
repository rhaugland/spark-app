import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { listeners } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(listeners).where(eq(listeners.id, id));
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const [updated] = await db
    .update(listeners)
    .set(body)
    .where(eq(listeners.id, id))
    .returning();
  return NextResponse.json(updated);
}
