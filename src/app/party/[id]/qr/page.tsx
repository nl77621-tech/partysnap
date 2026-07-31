"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { PageLoader, ArrowLeftIcon, QrIcon } from "@/components/Icons";

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
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetch(`/api/parties/${params.id}`)
      .then((r) => r.json())
      .then(setParty)
      .finally(() => setLoading(false));
  }, [params.id]);

  // Generate QR code client-side using window.location.origin — always correct URL
  useEffect(() => {
    if (!party) return;
    const uploadUrl = `${window.location.origin}/upload/${party.code}`;
    QRCode.toDataURL(uploadUrl, {
      width: 600,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
      errorCorrectionLevel: "M",
    }).then(setQrDataUrl);
  }, [party]);

  const uploadUrl = party ? `${typeof window !== "undefined" ? window.location.origin : ""}/upload/${party.code}` : "";

  const downloadPNG = () => {
    if (!qrDataUrl || !party) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `partysnap-${party.code}.png`;
    a.click();
  };

  const downloadTableTentPDF = async () => {
    if (!party || !qrDataUrl) return;

    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    for (let t = 1; t <= tableCount; t++) {
      if (t > 1) pdf.addPage();

      // Fold line
      pdf.setDrawColor(200);
      pdf.setLineDashPattern([3, 3], 0);
      pdf.line(0, pageH / 2, pageW, pageH / 2);

      // Top half
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

      const qrSize = 55;
      pdf.addImage(qrDataUrl, "PNG", (pageW - qrSize) / 2, 48, qrSize, qrSize);

      // Bottom half
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
    }

    pdf.save(`partysnap-table-tent-${party.code}.pdf`);
  };

  if (loading) return <PageLoader />;

  if (!party) {
    return (
      <div className="min-h-screen bg-paper">
        <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
          <h1 className="text-3xl font-semibold text-ink-900">Party not found</h1>
          <p className="mt-2 text-[15px] text-ink-600">
            This party may have been deleted, or the link is incorrect.
          </p>
          <Link href="/dashboard" className="btn-secondary mt-7">
            <ArrowLeftIcon className="h-[18px] w-[18px]" />
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="app-header">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-4">
          <Link href="/dashboard" className="btn-ghost -ml-3">
            <ArrowLeftIcon className="h-[18px] w-[18px]" />
            Dashboard
          </Link>
          <span aria-hidden className="h-5 w-px bg-ink-200" />
          <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-ink-600">
            <span
              aria-hidden
              className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ backgroundColor: party.themeColor }}
            />
            <span className="truncate">{party.name}</span>
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-10 animate-rise-in">
          <p className="eyebrow mb-2">
            {party.name} · {party.code}
          </p>
          <h1 className="text-4xl font-semibold text-ink-900 sm:text-5xl">QR code</h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-600">
            Guests scan this to upload their photos — no app needed.
          </p>
        </div>

        <div className="space-y-8">
          <section className="card animate-rise-in overflow-hidden">
            <div className="flex flex-col items-center gap-8 px-6 py-8 sm:flex-row sm:items-start sm:px-8">
              <div className="flex-shrink-0 rounded-2xl border border-ink-200 bg-white p-4 shadow-lift">
                {qrDataUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={qrDataUrl}
                    alt={`QR code linking to the upload page for ${party.name}`}
                    className="h-56 w-56"
                  />
                ) : (
                  <div className="h-56 w-56 animate-pulse rounded-xl bg-ink-100" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-ink-900 text-paper">
                    <QrIcon className="h-[18px] w-[18px]" />
                  </span>
                  <h2 className="truncate text-lg font-semibold text-ink-900">
                    {party.name}
                  </h2>
                </div>

                <p className="eyebrow mb-2 mt-6">Upload link</p>
                <p className="break-all rounded-xl border border-ink-200 bg-ink-50 px-3 py-2.5 font-mono text-xs leading-relaxed text-ink-700">
                  {uploadUrl || "—"}
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    onClick={downloadPNG}
                    disabled={!qrDataUrl}
                    className="btn-secondary"
                  >
                    <DownloadIcon className="h-[18px] w-[18px]" />
                    Download PNG
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section
            className="card animate-rise-in overflow-hidden"
            style={{ animationDelay: "60ms" }}
          >
            <div className="flex items-start gap-3 border-b border-ink-200/70 px-6 py-5 sm:px-8">
              <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-ink-900 text-paper">
                <PrinterIcon className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-ink-900">
                  Printable table tents
                </h2>
                <p className="mt-0.5 text-sm text-ink-500">
                  A fold-in-half A4 card per table, ready for the printer.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3 px-6 py-6 sm:px-8">
              <div>
                <label htmlFor="tent-count" className="label mb-1.5 font-sans text-xs">
                  Number of tables
                </label>
                <input
                  id="tent-count"
                  type="number"
                  min={1}
                  max={50}
                  value={tableCount}
                  onChange={(e) => setTableCount(parseInt(e.target.value) || 1)}
                  className="input w-24 px-3 py-2 text-center text-sm"
                />
              </div>
              <button
                onClick={downloadTableTentPDF}
                disabled={!qrDataUrl}
                className="btn-secondary"
              >
                <PrinterIcon className="h-[18px] w-[18px]" />
                Download PDF ({tableCount} {tableCount === 1 ? "card" : "cards"})
              </button>
            </div>
          </section>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </main>
    </div>
  );
}

// ── Local one-off icons (same line style as @/components/Icons) ─

type IconProps = React.SVGProps<SVGSVGElement>;

function DownloadIcon(p: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="w-5 h-5"
      {...p}
    >
      <path d="M12 4v12m0 0 5-5m-5 5-5-5" />
      <path d="M20 16.5v2A2.5 2.5 0 0 1 17.5 21h-11A2.5 2.5 0 0 1 4 18.5v-2" />
    </svg>
  );
}

function PrinterIcon(p: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="w-5 h-5"
      {...p}
    >
      <path d="M7 9V4.5A1.5 1.5 0 0 1 8.5 3h7A1.5 1.5 0 0 1 17 4.5V9" />
      <path d="M7 17H5.5A2.5 2.5 0 0 1 3 14.5v-3A2.5 2.5 0 0 1 5.5 9h13A2.5 2.5 0 0 1 21 11.5v3a2.5 2.5 0 0 1-2.5 2.5H17" />
      <rect x="7" y="14" width="10" height="7" rx="1.5" />
    </svg>
  );
}
