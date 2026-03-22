import { NextRequest, NextResponse } from "next/server";
import { getSession, type ExtendedSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generatePartyCode } from "@/lib/party-code";

// GET /api/parties — list all parties for the authenticated host
export async function GET() {
  const session = (await getSession()) as ExtendedSession | null;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parties = await prisma.party.findMany({
    where: { hostId: session.user.id },
    include: { _count: { select: { uploads: true } } },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(parties);
}

// POST /api/parties — create a new party
export async function POST(req: NextRequest) {
  const session = (await getSession()) as ExtendedSession | null;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, date, themeColor, coverPhoto, driveFolderId } = body;

  if (!name || !date) {
    return NextResponse.json({ error: "Name and date are required" }, { status: 400 });
  }

  const code = generatePartyCode();

  const party = await prisma.party.create({
    data: {
      name,
      date: new Date(date),
      code,
      themeColor: themeColor || "#6366f1",
      coverPhoto: coverPhoto || null,
      driveFolderId: driveFolderId || null,
      hostId: session.user.id,
    },
  });

  return NextResponse.json(party, { status: 201 });
}
