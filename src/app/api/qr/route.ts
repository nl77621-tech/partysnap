import { NextRequest, NextResponse } from "next/server";
import { generateQRCodeBuffer, getUploadUrl } from "@/lib/qr";

// GET /api/qr?code=ABCD1234&width=600
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const width = parseInt(req.nextUrl.searchParams.get("width") || "600", 10);

  if (!code) {
    return NextResponse.json({ error: "Code is required" }, { status: 400 });
  }

  const url = getUploadUrl(code);
  const buffer = await generateQRCodeBuffer(url, { width });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="qr-${code}.png"`,
      "Cache-Control": "public, max-age=31536000",
    },
  });
}
