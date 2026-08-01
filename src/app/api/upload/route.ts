export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { uploadFileToDrive } from "@/lib/google-drive";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100MB

// This endpoint is public by design — guests upload without an account — so it
// is the app's main abuse surface: every accepted request costs the host Drive
// quota. Two layers guard it:
//   1. a per-IP window, checked before the body is buffered
//   2. a per-party hourly cap counted from Postgres, which a forged
//      x-forwarded-for header cannot bypass
const PER_IP = { windowMs: 10 * 60_000, max: 40, maxBytes: 600 * 1024 * 1024 };
const PER_PARTY_HOURLY_MAX = 500;

function tooMany(message: string, retryAfter: number) {
  return NextResponse.json(
    { error: message },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}

// Increase body size limit for video uploads
export async function POST(req: NextRequest) {
  try {
    // Reject oversized bodies from the declared length before reading them, so
    // an abusive client never gets 100MB buffered into memory on our behalf.
    const declaredLength = Number(req.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 100MB." },
        { status: 413 }
      );
    }

    const ipLimit = rateLimit(`upload:${clientKey(req.headers)}`, {
      ...PER_IP,
      bytes: declaredLength,
    });
    if (!ipLimit.ok) {
      return tooMany(
        ipLimit.reason === "bytes"
          ? "Upload limit reached. Please try again shortly."
          : "Too many uploads. Please slow down and try again shortly.",
        ipLimit.retryAfter
      );
    }

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

    // Validate file size (100MB). content-length was only an early hint —
    // this is the authoritative check against the real decoded file.
    if (file.size > MAX_FILE_BYTES) {
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

    // Durable backstop. Counts committed rows, so it survives restarts, holds
    // across multiple instances, and cannot be dodged by forging a client IP.
    const uploadsThisHour = await prisma.upload.count({
      where: {
        partyId: party.id,
        uploadedAt: { gt: new Date(Date.now() - 60 * 60_000) },
      },
    });
    if (uploadsThisHour >= PER_PARTY_HOURLY_MAX) {
      console.warn("[UPLOAD RATE LIMITED]", {
        partyId: party.id,
        uploadsThisHour,
      });
      return tooMany(
        "This party has reached its hourly upload limit. Please try again later.",
        600
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
          expiresAt: account.expires_at,       // pass so googleapis knows to refresh
          userId: party.host.id,               // pass so refreshed token gets saved to DB
        });
        driveFileId = driveFile.id || null;
        driveThumbnail = driveFile.thumbnailLink || null;
      } catch (driveError) {
        // Log full error details so they appear in Railway logs
        const errMsg = driveError instanceof Error ? driveError.message : String(driveError);
        const errStack = driveError instanceof Error ? driveError.stack : undefined;
        console.error("[DRIVE UPLOAD FAILED]", {
          partyId: party.id,
          folderId: party.driveFolderId,
          fileName: file.name,
          hasAccessToken: !!account.access_token,
          hasRefreshToken: !!account.refresh_token,
          tokenExpiresAt: account.expires_at
            ? new Date(account.expires_at * 1000).toISOString()
            : "unknown",
          error: errMsg,
          stack: errStack,
        });
      }
    } else {
      console.log("[DRIVE UPLOAD SKIPPED]", {
        hasFolderId: !!party.driveFolderId,
        hasAccount: !!party.host.accounts[0],
        partyId: party.id,
      });
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
