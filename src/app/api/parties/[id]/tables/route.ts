export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession, type ExtendedSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/parties/:id/tables
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = (await getSession()) as ExtendedSession | null;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const party = await prisma.party.findFirst({
    where: { id: params.id, hostId: session.user.id },
  });
  if (!party) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tables = await prisma.table.findMany({
    where: { partyId: params.id },
    orderBy: { number: "asc" },
  });

  return NextResponse.json(tables);
}

// POST /api/parties/:id/tables — create or bulk-upsert tables
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = (await getSession()) as ExtendedSession | null;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const party = await prisma.party.findFirst({
    where: { id: params.id, hostId: session.user.id },
  });
  if (!party) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { number, name, guests } = body as {
    number: number;
    name?: string;
    guests?: string[];
  };

  if (!number || number < 1) {
    return NextResponse.json({ error: "Table number required" }, { status: 400 });
  }

  const guestList = (guests || []).filter(Boolean).slice(0, 10);

  const table = await prisma.table.upsert({
    where: { partyId_number: { partyId: params.id, number } },
    create: { partyId: params.id, number, name: name || null, guests: guestList },
    update: { name: name || null, guests: guestList },
  });

  return NextResponse.json(table);
}

// DELETE /api/parties/:id/tables?tableId=xxx
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = (await getSession()) as ExtendedSession | null;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tableId = new URL(req.url).searchParams.get("tableId");
  if (!tableId) return NextResponse.json({ error: "tableId required" }, { status: 400 });

  await prisma.table.deleteMany({
    where: { id: tableId, party: { hostId: session.user.id } },
  });

  return NextResponse.json({ ok: true });
}
