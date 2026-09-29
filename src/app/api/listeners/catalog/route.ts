import { NextResponse } from "next/server";
import { CATALOG } from "@/lib/listener-catalog";

export async function GET() {
  return NextResponse.json(CATALOG);
}
