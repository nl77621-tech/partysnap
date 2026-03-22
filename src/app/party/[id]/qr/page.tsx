"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { jsPDF } from "jspdf";

interface Party {
  id: string;
  name: string;
  code: string;
  themeColor: string;
}

export default function QRCodePage() {
  const params = useParams();
  const [party, setParty] = useState<Party | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableCount, setTableCount] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetch(`/api/parties/${params.id}`)
      .then((r) => r.json())
      .then(setParty)
      .finally(() => setLoading(false));
  }, [params.id]);

  const qrUrl = party ? `/api/qr?code=${party.code}&width=600` : "";
  const uploadUrl = party
    ? `${window.location.origin}/upload/${party.code}`
    : "";

  const downloadPNG = async () => {
    if (!party) return;
    const res = await fetch(qrUrl);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `partysnap-${party.code}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadTableTentPDF = async () => {
    if (!party) return;

    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    for (let t = 1; t <= tableCount; t++) {
      if (t > 1) pdf.addPage();

      // Fold line
      pdf.setDrawColor(200);
      pdf.setLineDashPattern([3, 3], 0);
      pdf.line(0, pageH / 2, pageW, pageH / 2);

      // Top half (will be back when folded)
      pdf.setFontSize(28);
      pdf.setTextColor(party.themeColor);
      pdf.text(party.name, pageW / 2, 30, { align: "center" });

      pdf.setFontSize(14);
      pdf.setTextColor(100);
      pdf.text(
        tableCount > 1 ? `Table ${t}` : "Share your photos!",
        pageW / 2,
        42,
        { align: "center" }
      );

      // QR code on top half
      const qrRes = await fetch(`/api/qr?code=${party.code}&width=400`);
      const qrBlob = await qrRes.blob();
      const qrDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(qrBlob);
      });

      const qrSize = 55;
      pdf.addImage(qrDataUrl, "PNG", (pageW - qrSize) / 2, 48, qrSize, qrSize);

      // Bottom half (front when folded) — upside down
      pdf.saveGraphicsState();

      // Draw text upside down on bottom half
      const bottomCenterY = pageH * 0.75;

      pdf.setFontSize(20);
      pdf.setTextColor(party.themeColor);
      pdf.text("Scan to share your", pageW / 2, bottomCenterY - 15, { align: "center" });
      pdf.text("photos & videos!", pageW / 2, bottomCenterY - 5, { align: "center" });

      pdf.setFontSize(12);
      pdf.setTextColor(130);
      pdf.text("No app needed — just point your camera!", pageW / 2, bottomCenterY + 8, {
        align: "center",
      });

      if (tableCount > 1) {
        pdf.setFontSize(16);
        pdf.setTextColor(party.themeColor);
        pdf.text(`Table ${t}`, pageW / 2, bottomCenterY + 22, { align: "center" });
      }

      pdf.restoreGraphicsState();
    }

    pdf.save(`partysnap-table-tent-${party.code}.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!party) {
    return <div className="min-h-screen flex items-center justify-center">Party not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
            &larr; Dashboard
          </Link>
          <h1 className="text-xl font-bold text-gray-900">QR Code — {party.name}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 text-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
          <img src={qrUrl} alt="QR Code" className="mx-auto w-64 h-64 mb-4" />
          <p className="text-lg font-semibold" style={{ color: party.themeColor }}>
            {party.name}
          </p>
          <p className="text-sm text-gray-500 font-mono mt-1">{party.code}</p>
          <p className="text-xs text-gray-400 mt-2 break-all">{uploadUrl}</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={downloadPNG}
            className="w-full py-3 px-6 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Download QR as PNG
          </button>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Table Tent PDF</h3>
            <div className="flex items-center gap-4 mb-4 justify-center">
              <label className="text-sm text-gray-600">Number of tables:</label>
              <input
                type="number"
                min={1}
                max={50}
                value={tableCount}
                onChange={(e) => setTableCount(parseInt(e.target.value) || 1)}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center"
              />
            </div>
            <button
              onClick={downloadTableTentPDF}
              className="w-full py-3 px-6 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              Download Table Tent PDF ({tableCount} {tableCount === 1 ? "card" : "cards"})
            </button>
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </main>
    </div>
  );
}
