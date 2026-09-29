import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { friends, interests } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { name, phone, birthday, interests: interestList } = body;

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name.trim();
  if (phone !== undefined) updates.phone = phone?.trim() || null;
  if (birthday !== undefined) updates.birthday = birthday || null;

  if (Object.keys(updates).length > 0) {
    await db.update(friends).set(updates).where(eq(friends.id, id));
  }

  // Replace interests if provided
  if (interestList && Array.isArray(interestList)) {
    await db.delete(interests).where(eq(interests.friendId, id));
    if (interestList.length > 0) {
      await db.insert(interests).values(
        interestList.map((i: { label: string; category?: string }) => ({
          friendId: id,
          label: i.label,
          category: i.category || null,
        }))
      );
    }
  }

  const [updated] = await db.select().from(friends).where(eq(friends.id, id));
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updatedInterests = await db
    .select()
    .from(interests)
    .where(eq(interests.friendId, id));

  return NextResponse.json({ ...updated, interests: updatedInterests });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(friends).where(eq(friends.id, id));
  return NextResponse.json({ ok: true });
}
