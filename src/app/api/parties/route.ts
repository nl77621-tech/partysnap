export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession, type ExtendedSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generatePartyCode } from "@/lib/party-code";
import { createDriveFolder } from "@/lib/google-drive";

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
  const { name, date, themeColor } = body;

  if (!name || !date) {
    return NextResponse.json({ error: "Name and date are required" }, { status: 400 });
  }

  const code = generatePartyCode();

  // Auto-create a Google Drive folder for this party
  let driveFolderId: string | null = null;
  try {
    const account = await prisma.account.findFirst({
      where: { userId: session.user.id, provider: "google" },
    });
    if (account?.access_token) {
      // Try to create inside a PartySnap root folder, or just in root
      const folder = await createDriveFolder(
        `${name} (PartySnap)`,
        "root",
        account.access_token,
        account.refresh_token || undefined
      );
      driveFolderId = folder.id || null;
    }
  } catch (err) {
    console.error("Could not create Drive folder:", err);
    // Continue without Drive — uploads will still be tracked in DB
  }

  const party = await prisma.party.create({
    data: {
      name,
      date: new Date(date),
      code,
      themeColor: themeColor || "#6366f1",
      driveFolderId,
      hostId: session.user.id,
    },
  });

  return NextResponse.json(party, { status: 201 });
}
