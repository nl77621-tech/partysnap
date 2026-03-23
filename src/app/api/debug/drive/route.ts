export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getSession, type ExtendedSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAuthenticatedClient } from "@/lib/google-auth";
import { google } from "googleapis";

// GET /api/debug/drive — tests Drive connectivity for the signed-in host
export async function GET() {
  const session = (await getSession()) as ExtendedSession | null;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "google" },
  });

  if (!account) {
    return NextResponse.json({ error: "No Google account linked" }, { status: 400 });
  }

  const result: Record<string, unknown> = {
    hasAccessToken: !!account.access_token,
    hasRefreshToken: !!account.refresh_token,
    tokenExpiresAt: account.expires_at
      ? new Date(account.expires_at * 1000).toISOString()
      : null,
    tokenExpired: account.expires_at
      ? Date.now() > account.expires_at * 1000
      : "unknown",
    scope: account.scope,
  };

  // Try listing Drive files to test connectivity
  try {
    const auth = getAuthenticatedClient(
      account.access_token!,
      account.refresh_token || undefined
    );
    const drive = google.drive({ version: "v3", auth });

    const listRes = await drive.files.list({
      pageSize: 1,
      fields: "files(id,name)",
    });

    result.driveConnected = true;
    result.driveFileCount = listRes.data.files?.length ?? 0;
  } catch (err: unknown) {
    result.driveConnected = false;
    result.driveError =
      err instanceof Error ? err.message : String(err);
  }

  // Find the most recent party for this user and check its driveFolderId
  const latestParty = await prisma.party.findFirst({
    where: { hostId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { uploads: true } } },
  });

  if (latestParty) {
    result.latestParty = {
      name: latestParty.name,
      driveFolderId: latestParty.driveFolderId,
      uploadCount: latestParty._count.uploads,
    };

    // Check how many uploads have no Drive file
    const uploadsWithoutDrive = await prisma.upload.count({
      where: { partyId: latestParty.id, driveFileId: null },
    });
    result.uploadsWithoutDrive = uploadsWithoutDrive;
  }

  return NextResponse.json(result);
}
