export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession, type ExtendedSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/parties/:id
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const party = await prisma.party.findUnique({
    where: { id: params.id },
    include: { _count: { select: { uploads: true } } },
  });

  if (!party) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }

  return NextResponse.json(party);
}

// PUT /api/parties/:id
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = (await getSession()) as ExtendedSession | null;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const party = await prisma.party.findUnique({ where: { id: params.id } });
  if (!party || party.hostId !== session.user.id) {
    return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
  }

  const body = await req.json();
  const { name, date, themeColor, coverPhoto, driveFolderId } = body;

  const updated = await prisma.party.update({
    where: { id: params.id },
    data: {
      ...(name && { name }),
      ...(date && { date: new Date(date) }),
      ...(themeColor && { themeColor }),
      ...(coverPhoto !== undefined && { coverPhoto }),
      ...(driveFolderId !== undefined && { driveFolderId }),
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/parties/:id
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = (await getSession()) as ExtendedSession | null;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const party = await prisma.party.findUnique({ where: { id: params.id } });
  if (!party || party.hostId !== session.user.id) {
    return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
  }

  await prisma.party.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
