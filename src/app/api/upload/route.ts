export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { uploadFileToDrive } from "@/lib/google-drive";

export const runtime = "nodejs";

// Increase body size limit for video uploads
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const partyCode = formData.get("partyCode") as string;
    const caption = formData.get("caption") as string | null;
    const tableNumber = formData.get("tableNumber") as string | null;
    const file = formData.get("file") as File;

    if (!partyCode || !file) {
      return NextResponse.json(
        { error: "Party code and file are required" },
        { status: 400 }
      );
    }

    // Validate file size (100MB)
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 100MB." },
        { status: 413 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif",
      "video/mp4", "video/quicktime", "video/webm", "video/avi", "video/mov",
    ];
    if (!allowedTypes.some((t) => file.type.startsWith(t.split("/")[0]))) {
      return NextResponse.json(
        { error: "Unsupported file format. Please upload images or videos." },
        { status: 400 }
      );
    }

    // Find the party
    const party = await prisma.party.findUnique({
      where: { code: partyCode },
      include: {
        host: {
          include: {
            accounts: {
              where: { provider: "google" },
              take: 1,
            },
          },
        },
      },
    });

    if (!party) {
      return NextResponse.json({ error: "Party not found" }, { status: 404 });
    }

    // Check expiry
    if (party.expiresAt && new Date() > party.expiresAt) {
      return NextResponse.json(
        { error: "This party's upload link has expired." },
        { status: 410 }
      );
    }

    const mediaType = file.type.startsWith("video") ? "video" : "image";

    // Upload to Google Drive if configured
    let driveFileId: string | null = null;
    let driveThumbnail: string | null = null;

    if (party.driveFolderId && party.host.accounts[0]) {
      const account = party.host.accounts[0];
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const driveFile = await uploadFileToDrive({
          fileName: file.name,
          mimeType: file.type,
          fileBuffer: buffer,
          folderId: party.driveFolderId,
          description: caption || undefined,
          accessToken: account.access_token!,
          refreshToken: account.refresh_token || undefined,
        });
        driveFileId = driveFile.id || null;
        driveThumbnail = driveFile.thumbnailLink || null;
      } catch (driveError) {
        console.error("Google Drive upload failed:", driveError);
        // Continue — save upload record even if Drive upload fails
      }
    }

    // Save upload record
    const upload = await prisma.upload.create({
      data: {
        partyId: party.id,
        fileName: file.name,
        driveFileId,
        driveThumbnail,
        caption,
        tableNumber: tableNumber ? parseInt(tableNumber, 10) : null,
        mediaType,
        fileSize: file.size,
      },
    });

    return NextResponse.json(upload, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }
}
