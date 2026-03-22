import QRCode from "qrcode";

export async function generateQRCodeDataURL(
  url: string,
  options?: { width?: number; margin?: number; color?: string }
): Promise<string> {
  const { width = 400, margin = 2, color = "#000000" } = options || {};

  return QRCode.toDataURL(url, {
    width,
    margin,
    color: {
      dark: color,
      light: "#ffffff",
    },
    errorCorrectionLevel: "M",
  });
}

export async function generateQRCodeBuffer(
  url: string,
  options?: { width?: number; margin?: number; color?: string }
): Promise<Buffer> {
  const { width = 600, margin = 2, color = "#000000" } = options || {};

  return QRCode.toBuffer(url, {
    width,
    margin,
    color: {
      dark: color,
      light: "#ffffff",
    },
    errorCorrectionLevel: "M",
  });
}

export function getUploadUrl(partyCode: string): string {
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${base}/upload/${partyCode}`;
}
