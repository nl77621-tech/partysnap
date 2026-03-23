import { google } from "googleapis";
import { prisma } from "./db";

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
  );
}

export function getAuthenticatedClient(
  accessToken: string,
  refreshToken?: string,
  expiresAt?: number | null,   // Unix timestamp in SECONDS (from DB)
  userId?: string              // If provided, new tokens are saved to DB on refresh
) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    // googleapis needs expiry_date in MILLISECONDS to know when to auto-refresh
    expiry_date: expiresAt ? expiresAt * 1000 : undefined,
  });

  // When googleapis auto-refreshes the token, save the new token to the DB
  // so subsequent requests don't need to refresh again.
  if (userId && refreshToken) {
    oauth2Client.on("tokens", async (tokens) => {
      try {
        const update: Record<string, unknown> = {};
        if (tokens.access_token) update.access_token = tokens.access_token;
        if (tokens.expiry_date) update.expires_at = Math.floor(tokens.expiry_date / 1000);
        if (tokens.refresh_token) update.refresh_token = tokens.refresh_token;

        if (Object.keys(update).length > 0) {
          await prisma.account.updateMany({
            where: { userId, provider: "google" },
            data: update,
          });
        }
      } catch (err) {
        console.error("[TOKEN REFRESH SAVE FAILED]", err);
      }
    });
  }

  return oauth2Client;
}
