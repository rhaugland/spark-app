import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { friends, interests } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const allFriends = await db.select().from(friends).orderBy(friends.createdAt);
  const allInterests = await db.select().from(interests);

  const result = allFriends.map((f) => ({
    ...f,
    interests: allInterests.filter((i) => i.friendId === f.id),
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, phone, birthday, interests: interestList } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Check limit
  const existing = await db.select().from(friends);
  if (existing.length >= 15) {
    return NextResponse.json({ error: "Max 15 friends" }, { status: 400 });
  }

  const [friend] = await db
    .insert(friends)
    .values({
      name: name.trim(),
      phone: phone?.trim() || null,
      birthday: birthday || null,
    })
    .returning();

  if (interestList && Array.isArray(interestList) && interestList.length > 0) {
    await db.insert(interests).values(
      interestList.map((i: { label: string; category?: string }) => ({
        friendId: friend.id,
        label: i.label,
        category: i.category || null,
      }))
    );
  }

  const friendInterests = await db
    .select()
    .from(interests)
    .where(eq(interests.friendId, friend.id));

  return NextResponse.json({ ...friend, interests: friendInterests }, { status: 201 });
}
