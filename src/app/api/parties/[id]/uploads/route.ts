import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/parties/:id/uploads — get uploads for a party (for slideshow)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const url = new URL(req.url);
  const after = url.searchParams.get("after");
  const limit = parseInt(url.searchParams.get("limit") || "50", 10);

  const where: Record<string, unknown> = { partyId: params.id };
  if (after) {
    where.uploadedAt = { gt: new Date(after) };
  }

  const uploads = await prisma.upload.findMany({
    where,
    orderBy: { uploadedAt: "asc" },
    take: Math.min(limit, 200),
  });

  return NextResponse.json(uploads);
}
