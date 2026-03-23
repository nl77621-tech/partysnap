export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession, type ExtendedSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadFileToDrive } from "@/lib/google-drive";

// POST /api/debug/repair?partyId=xxx
// Re-attempts Drive upload for any uploads that are missing a driveFileId.
// Only works if the upload file is still accessible — in this app files are
// NOT stored locally, so this endpoint just reports what's missing.
export async function GET(req: NextRequest) {
  const session = (await getSession()) as ExtendedSession | null;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const partyId = new URL(req.url).searchParams.get("partyId");

  const where = partyId
    ? { partyId, party: { hostId: session.user.id } }
    : { party: { hostId: session.user.id } };

  const missing = await prisma.upload.findMany({
    where: { ...where, driveFileId: null },
    include: { party: true },
    orderBy: { uploadedAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    message: "These uploads have no Drive file (file data is not stored locally — they cannot be re-uploaded automatically).",
    count: missing.length,
    uploads: missing.map((u) => ({
      id: u.id,
      fileName: u.fileName,
      party: u.party.name,
      uploadedAt: u.uploadedAt,
    })),
  });
}
