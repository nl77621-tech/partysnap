export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getSession, type ExtendedSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadFileToDrive } from "@/lib/google-drive";

// POST /api/parties/:id/cover — upload a cover photo for the party
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

  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 20MB)" }, { status: 413 });
  }

  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "google" },
  });

  let coverUrl: string | null = null;

  if (account?.access_token && party.driveFolderId) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const driveFile = await uploadFileToDrive({
        fileName: `cover_${file.name}`,
        mimeType: file.type,
        fileBuffer: buffer,
        folderId: party.driveFolderId,
        description: "Party cover photo",
        accessToken: account.access_token,
        refreshToken: account.refresh_token || undefined,
        expiresAt: account.expires_at,
        userId: session.user.id,
      });
      coverUrl = driveFile.thumbnailLink || null;
    } catch (err) {
      console.error("[COVER UPLOAD FAILED]", err);
      return NextResponse.json(
        { error: "Failed to upload to Google Drive. Please try again." },
        { status: 500 }
      );
    }
  } else {
    return NextResponse.json(
      { error: "Google Drive not connected for this party. Please re-save the party first." },
      { status: 400 }
    );
  }

  // Save URL to party
  const updated = await prisma.party.update({
    where: { id: params.id },
    data: { coverPhoto: coverUrl },
  });

  return NextResponse.json({ coverPhoto: updated.coverPhoto });
}

// DELETE /api/parties/:id/cover — remove the cover photo
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = (await getSession()) as ExtendedSession | null;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.party.updateMany({
    where: { id: params.id, hostId: session.user.id },
    data: { coverPhoto: null },
  });

  return NextResponse.json({ ok: true });
}
