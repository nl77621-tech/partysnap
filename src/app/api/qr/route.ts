export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { generateQRCodeBuffer } from "@/lib/qr";

// GET /api/qr?code=ABCD1234&width=600
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const width = parseInt(req.nextUrl.searchParams.get("width") || "600", 10);

  if (!code) {
    return NextResponse.json({ error: "Code is required" }, { status: 400 });
  }

  // Derive base URL from the actual request so it always has https:// in production
  const proto = req.headers.get("x-forwarded-proto") || req.nextUrl.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") || req.nextUrl.host;
  const uploadUrl = `${proto}://${host}/upload/${code}`;

  const buffer = await generateQRCodeBuffer(uploadUrl, { width });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="qr-${code}.png"`,
      "Cache-Control": "no-store",
    },
  });
}
