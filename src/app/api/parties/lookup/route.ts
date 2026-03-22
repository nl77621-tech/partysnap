import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/parties/lookup?code=ABCD1234 — lookup party by code (for guest upload page)
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Code is required" }, { status: 400 });
  }

  const party = await prisma.party.findUnique({
    where: { code },
    select: {
      id: true,
      name: true,
      date: true,
      code: true,
      themeColor: true,
      coverPhoto: true,
      expiresAt: true,
    },
  });

  if (!party) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }

  if (party.expiresAt && new Date() > party.expiresAt) {
    return NextResponse.json(
      { error: "This party's upload link has expired." },
      { status: 410 }
    );
  }

  return NextResponse.json(party);
}
