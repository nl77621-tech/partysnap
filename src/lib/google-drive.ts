import { google } from "googleapis";
import { Readable } from "stream";
import { getAuthenticatedClient } from "./google-auth";

interface UploadOptions {
  fileName: string;
  mimeType: string;
  fileBuffer: Buffer;
  folderId: string;
  description?: string;
  accessToken: string;
  refreshToken?: string;
}

export async function uploadFileToDrive(options: UploadOptions) {
  const { fileName, mimeType, fileBuffer, folderId, description, accessToken, refreshToken } = options;

  const auth = getAuthenticatedClient(accessToken, refreshToken);
  const drive = google.drive({ version: "v3", auth });

  const fileMetadata: Record<string, unknown> = {
    name: fileName,
    parents: [folderId],
  };
  if (description) {
    fileMetadata.description = description;
  }

  const media = {
    mimeType,
    body: Readable.from(fileBuffer),
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: "id,name,mimeType,thumbnailLink,webViewLink",
  });

  const fileId = response.data.id;

  // Make file publicly readable so thumbnail URLs never expire
  if (fileId) {
    try {
      await drive.permissions.create({
        fileId,
        requestBody: { role: "reader", type: "anyone" },
      });
      // Use stable Google Drive thumbnail URL that doesn't expire
      response.data.thumbnailLink = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
    } catch {
      // Fall back to original thumbnailLink if permissions fail
    }
  }

  return response.data;
}

export async function createDriveFolder(
  name: string,
  parentFolderId: string,
  accessToken: string,
  refreshToken?: string
) {
  const auth = getAuthenticatedClient(accessToken, refreshToken);
  const drive = google.drive({ version: "v3", auth });

  const response = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    },
    fields: "id,name",
  });

  return response.data;
}

export async function getDriveThumbnail(
  fileId: string,
  accessToken: string,
  refreshToken?: string
) {
  const auth = getAuthenticatedClient(accessToken, refreshToken);
  const drive = google.drive({ version: "v3", auth });

  const response = await drive.files.get({
    fileId,
    fields: "thumbnailLink,webContentLink",
  });

  return response.data;
}
