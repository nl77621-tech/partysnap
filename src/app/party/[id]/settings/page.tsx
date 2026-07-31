"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import {
  PageLoader,
  Spinner,
  ArrowLeftIcon,
  QrIcon,
  ImageIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
} from "@/components/Icons";

interface Party {
  id: string;
  name: string;
  code: string;
  themeColor: string;
  coverPhoto: string | null;
  driveFolderId: string | null;
}

interface Table {
  id: string;
  number: number;
  name: string | null;
  guests: string[];
}

export default function PartySettings() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const partyId = params.id as string;

  const [party, setParty] = useState<Party | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);

  // QR code state
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [tableCount, setTableCount] = useState(1);

  // Cover photo state
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverMsg, setCoverMsg] = useState<Status>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Table state
  const [newTableCount, setNewTableCount] = useState(1);
  const [savingTables, setSavingTables] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [tableMsg, setTableMsg] = useState<Status>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
  }, [status, router]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/parties/${partyId}`).then((r) => r.json()),
      fetch(`/api/parties/${partyId}/tables`).then((r) => r.json()),
    ])
      .then(([p, t]) => {
        setParty(p);
        setTables(Array.isArray(t) ? t : []);
        if (p.coverPhoto) setCoverPreview(p.coverPhoto);
      })
      .finally(() => setLoading(false));
  }, [partyId]);

  // Generate QR code once party is loaded
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

  const uploadUrl = party
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/upload/${party.code}`
    : "";

  const downloadQRPng = () => {
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
      pdf.setDrawColor(200);
      pdf.setLineDashPattern([3, 3], 0);
      pdf.line(0, pageH / 2, pageW, pageH / 2);

      pdf.setFontSize(28);
      pdf.setTextColor(party.themeColor);
      pdf.text(party.name, pageW / 2, 30, { align: "center" });
      pdf.setFontSize(14);
      pdf.setTextColor(100);
      pdf.text(tableCount > 1 ? `Table ${t}` : "Share your photos!", pageW / 2, 42, { align: "center" });

      const qrSize = 55;
      pdf.addImage(qrDataUrl, "PNG", (pageW - qrSize) / 2, 48, qrSize, qrSize);

      const bottomCenterY = pageH * 0.75;
      pdf.setFontSize(20);
      pdf.setTextColor(party.themeColor);
      pdf.text("Scan to share your", pageW / 2, bottomCenterY - 15, { align: "center" });
      pdf.text("photos & videos!", pageW / 2, bottomCenterY - 5, { align: "center" });
      pdf.setFontSize(12);
      pdf.setTextColor(130);
      pdf.text("No app needed — just point your camera!", pageW / 2, bottomCenterY + 8, { align: "center" });
      if (tableCount > 1) {
        pdf.setFontSize(16);
        pdf.setTextColor(party.themeColor);
        pdf.text(`Table ${t}`, pageW / 2, bottomCenterY + 22, { align: "center" });
      }
    }
    pdf.save(`partysnap-table-tent-${party.code}.pdf`);
  };

  // ── Cover photo ─────────────────────────────────────────────
  const handleCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCoverPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setCoverUploading(true);
    setCoverMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`/api/parties/${partyId}/cover`, { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        setCoverPreview(data.coverPhoto);
        setParty((p) => p ? { ...p, coverPhoto: data.coverPhoto } : p);
        setCoverMsg({ tone: "ok", text: "Cover photo saved" });
      } else {
        setCoverMsg({ tone: "error", text: data.error });
      }
    } catch {
      setCoverMsg({ tone: "error", text: "Upload failed. Please try again." });
    } finally {
      setCoverUploading(false);
    }
  };

  const removeCover = async () => {
    await fetch(`/api/parties/${partyId}/cover`, { method: "DELETE" });
    setCoverPreview(null);
    setParty((p) => p ? { ...p, coverPhoto: null } : p);
    setCoverMsg({ tone: "info", text: "Cover photo removed." });
  };

  // ── Tables ────────────────────────────────────────────────────
  const addTables = async () => {
    if (newTableCount < 1) return;
    setSavingTables(true);
    setTableMsg(null);
    const maxExisting = tables.length > 0 ? Math.max(...tables.map((t) => t.number)) : 0;
    try {
      const results = await Promise.all(
        Array.from({ length: newTableCount }, (_, i) => {
          const num = maxExisting + i + 1;
          return fetch(`/api/parties/${partyId}/tables`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ number: num, guests: [] }),
          }).then((r) => r.json());
        })
      );
      setTables((prev) => [...prev, ...results].sort((a, b) => a.number - b.number));
      setTableMsg({ tone: "ok", text: `Added ${newTableCount} table${newTableCount > 1 ? "s" : ""}` });
      setNewTableCount(1);
    } catch {
      setTableMsg({ tone: "error", text: "Failed to add tables" });
    } finally {
      setSavingTables(false);
    }
  };

  const saveTable = async (table: Table) => {
    const res = await fetch(`/api/parties/${partyId}/tables`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number: table.number, name: table.name, guests: table.guests }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTables((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setEditingTable(null);
    }
  };

  const deleteTable = async (tableId: string) => {
    await fetch(`/api/parties/${partyId}/tables?tableId=${tableId}`, { method: "DELETE" });
    setTables((prev) => prev.filter((t) => t.id !== tableId));
  };

  if (status === "loading" || loading) return <PageLoader />;

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

  const themeColor = party.themeColor;
  const guestTotal = tables.reduce((n, t) => n + t.guests.filter(Boolean).length, 0);

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
              style={{ backgroundColor: themeColor }}
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
          <h1 className="text-4xl font-semibold text-ink-900 sm:text-5xl">Settings</h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-600">
            Share your QR code, choose the cover guests see, and organize the
            seating chart.
          </p>
        </div>

        <div className="space-y-8">
          {/* ── Sharing & QR code ─────────────────────────────── */}
          <Section
            index={0}
            icon={<QrIcon className="h-[18px] w-[18px]" />}
            title="Sharing & QR code"
            description="Guests scan this to upload their photos — no app needed."
          >
            <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start">
              <div className="flex-shrink-0 rounded-2xl border border-ink-200 bg-white p-4 shadow-lift">
                {qrDataUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={qrDataUrl}
                    alt={`QR code linking to the upload page for ${party.name}`}
                    className="h-52 w-52"
                  />
                ) : (
                  <div className="h-52 w-52 animate-pulse rounded-xl bg-ink-100" />
                )}
              </div>

              <div className="min-w-0 flex-1 self-stretch">
                <p className="eyebrow mb-2">Upload link</p>
                <p className="break-all rounded-xl border border-ink-200 bg-ink-50 px-3 py-2.5 font-mono text-xs leading-relaxed text-ink-700">
                  {uploadUrl || "—"}
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    onClick={downloadQRPng}
                    disabled={!qrDataUrl}
                    className="btn-secondary"
                  >
                    <DownloadIcon className="h-[18px] w-[18px]" />
                    Download PNG
                  </button>
                </div>

                <div className="mt-5 rounded-xl border border-ink-200 bg-ink-50/60 p-4">
                  <h3 className="font-sans text-sm font-semibold text-ink-900">
                    Printable table tents
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-500">
                    A fold-in-half A4 card per table, ready for the printer.
                  </p>
                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <div>
                      <label
                        htmlFor="tent-count"
                        className="label mb-1.5 font-sans text-xs"
                      >
                        Cards
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
                      Download PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* ── Cover photo ───────────────────────────────────── */}
          <Section
            index={1}
            icon={<ImageIcon className="h-[18px] w-[18px]" />}
            title="Cover photo"
            description="Shown at the top of the guest upload page."
          >
            {coverPreview ? (
              <div>
                <div className="overflow-hidden rounded-xl border border-ink-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverPreview}
                    alt="Party cover"
                    className="h-56 w-full object-cover"
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={() => coverInputRef.current?.click()}
                    disabled={coverUploading}
                    className="btn-secondary"
                  >
                    <ImageIcon className="h-[18px] w-[18px]" />
                    Change photo
                  </button>
                  <button
                    onClick={removeCover}
                    className="btn-ghost text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <TrashIcon className="h-[18px] w-[18px]" />
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => coverInputRef.current?.click()}
                disabled={coverUploading}
                className="group flex h-44 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-ink-300 bg-ink-50/50 transition-colors hover:border-ink-400 hover:bg-ink-50 disabled:pointer-events-none"
              >
                {coverUploading ? (
                  <>
                    <Spinner className="h-6 w-6" />
                    <span className="text-sm text-ink-500">Uploading…</span>
                  </>
                ) : (
                  <>
                    <span className="grid h-11 w-11 place-items-center rounded-xl border border-ink-200 bg-white text-ink-500 transition-colors group-hover:text-ink-900">
                      <ImageIcon className="h-5 w-5" />
                    </span>
                    <span className="mt-1 text-sm font-medium text-ink-800">
                      Click to upload a cover
                    </span>
                    <span className="text-xs text-ink-400">
                      JPG, PNG or WEBP up to 20MB
                    </span>
                  </>
                )}
              </button>
            )}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverFile}
            />
            <StatusNote status={coverMsg} />
          </Section>

          {/* ── Tables & guests ───────────────────────────────── */}
          <Section
            index={2}
            icon={<TableIcon className="h-[18px] w-[18px]" />}
            title="Tables & guests"
            description="Organize your seating chart — up to 10 guests per table."
            meta={
              tables.length > 0
                ? `${tables.length} ${tables.length === 1 ? "table" : "tables"} · ${guestTotal} ${
                    guestTotal === 1 ? "guest" : "guests"
                  }`
                : undefined
            }
          >
            <div className="flex flex-wrap items-end gap-3 rounded-xl border border-ink-200 bg-ink-50/60 p-4">
              <div>
                <label htmlFor="add-tables" className="label mb-1.5 font-sans text-xs">
                  Tables to add
                </label>
                <input
                  id="add-tables"
                  type="number"
                  min={1}
                  max={50}
                  value={newTableCount}
                  onChange={(e) =>
                    setNewTableCount(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="input w-24 px-3 py-2 text-center text-sm"
                />
              </div>
              <button
                onClick={addTables}
                disabled={savingTables}
                className="btn-primary"
              >
                <PlusIcon className="h-[18px] w-[18px]" />
                {savingTables ? "Adding…" : "Add tables"}
              </button>
            </div>
            <StatusNote status={tableMsg} />

            {tables.length > 0 ? (
              <div className="mt-6 space-y-3">
                {tables.map((table, i) =>
                  editingTable?.id === table.id ? (
                    <TableEditor
                      key={table.id}
                      table={editingTable}
                      themeColor={themeColor}
                      onChange={setEditingTable}
                      onSave={() => saveTable(editingTable)}
                      onCancel={() => setEditingTable(null)}
                    />
                  ) : (
                    <TableRow
                      key={table.id}
                      table={table}
                      index={i}
                      themeColor={themeColor}
                      onEdit={() => setEditingTable({ ...table })}
                      onDelete={() => deleteTable(table.id)}
                    />
                  )
                )}
              </div>
            ) : (
              <div className="mt-6 rounded-xl border border-dashed border-ink-300 bg-ink-50/50 px-6 py-10 text-center">
                <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl border border-ink-200 bg-white text-ink-400">
                  <TableIcon className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm font-medium text-ink-800">No tables yet</p>
                <p className="mt-1 text-sm text-ink-500">
                  Add a few above to start building the seating chart.
                </p>
              </div>
            )}
          </Section>
        </div>
      </main>
    </div>
  );
}

// ── Layout helpers ────────────────────────────────────────────

function Section({
  icon,
  title,
  description,
  meta,
  index,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  meta?: string;
  index: number;
  children: React.ReactNode;
}) {
  return (
    <section
      className="card animate-rise-in overflow-hidden"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex flex-wrap items-start gap-3 border-b border-ink-200/70 px-6 py-5 sm:px-8">
        <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-ink-900 text-paper">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
          <p className="mt-0.5 text-sm text-ink-500">{description}</p>
        </div>
        {meta && (
          <span className="rounded-lg border border-ink-200 bg-ink-50 px-2.5 py-1 text-xs font-medium text-ink-600">
            {meta}
          </span>
        )}
      </div>
      <div className="px-6 py-6 sm:px-8">{children}</div>
    </section>
  );
}

/** Transient status line for the cover / tables sections. */
type Status = { tone: "ok" | "error" | "info"; text: string } | null;

function StatusNote({ status }: { status: Status }) {
  if (!status) return null;

  return (
    <p
      role="status"
      className={`mt-4 flex items-center gap-2 text-sm ${
        status.tone === "error" ? "text-red-600" : "text-ink-600"
      }`}
    >
      {status.tone === "ok" && (
        <CheckIcon className="h-4 w-4 flex-shrink-0 text-ink-900" />
      )}
      {status.tone === "error" && <AlertIcon className="h-4 w-4 flex-shrink-0" />}
      {status.text}
    </p>
  );
}

// ── Table roster ──────────────────────────────────────────────

function TableRow({
  table,
  index,
  themeColor,
  onEdit,
  onDelete,
}: {
  table: Table;
  index: number;
  themeColor: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const guests = table.guests.filter(Boolean);

  return (
    <div
      className="animate-rise-in flex items-center gap-4 rounded-xl border border-ink-200 bg-white px-4 py-3.5 transition-colors hover:border-ink-300"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <span
        className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full font-sans text-sm font-semibold text-white"
        style={{ backgroundColor: themeColor }}
      >
        {table.number}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-sans text-sm font-semibold text-ink-900">
          {table.name || `Table ${table.number}`}
        </p>
        {guests.length > 0 ? (
          <p className="truncate text-sm text-ink-500">{guests.join(", ")}</p>
        ) : (
          <p className="text-sm text-ink-400">No guests added yet</p>
        )}
      </div>

      <span className="hidden flex-shrink-0 rounded-lg border border-ink-200 bg-ink-50 px-2 py-1 text-xs font-medium tabular-nums text-ink-500 sm:inline-block">
        {guests.length}/10
      </span>

      <div className="flex flex-shrink-0 items-center gap-2">
        <button onClick={onEdit} className="btn-secondary px-3.5 py-2 text-xs">
          Edit
        </button>
        <button
          onClick={onDelete}
          aria-label={`Remove table ${table.number}`}
          title="Remove table"
          className="grid h-9 w-9 place-items-center rounded-xl border border-ink-200 bg-white text-ink-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        >
          <TrashIcon className="h-[18px] w-[18px]" />
        </button>
      </div>
    </div>
  );
}

function TableEditor({
  table,
  themeColor,
  onChange,
  onSave,
  onCancel,
}: {
  table: Table;
  themeColor: string;
  onChange: (t: Table) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const setGuest = (index: number, value: string) => {
    const guests = [...table.guests];
    guests[index] = value;
    while (guests.length > 0 && !guests[guests.length - 1]) guests.pop();
    onChange({ ...table, guests });
  };
  const guestSlots = Array.from({ length: 10 }, (_, i) => table.guests[i] || "");

  return (
    <div className="animate-fade-in space-y-5 rounded-xl border border-ink-300 bg-ink-50/50 p-5 shadow-soft">
      <div className="flex items-center gap-3">
        <span
          className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full font-sans text-sm font-semibold text-white"
          style={{ backgroundColor: themeColor }}
        >
          {table.number}
        </span>
        <input
          type="text"
          placeholder={`Table ${table.number} name (optional)`}
          value={table.name || ""}
          onChange={(e) => onChange({ ...table, name: e.target.value || null })}
          className="input flex-1 px-3 py-2.5 text-sm"
        />
      </div>

      <div>
        <p className="eyebrow mb-2.5">Guests (up to 10)</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {guestSlots.map((guest, i) => (
            <input
              key={i}
              type="text"
              placeholder={`Guest ${i + 1}`}
              value={guest}
              onChange={(e) => setGuest(i, e.target.value)}
              className="input px-3 py-2 text-sm"
            />
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="btn-ghost">
          Cancel
        </button>
        <button onClick={onSave} className="btn-primary">
          <CheckIcon className="h-[18px] w-[18px]" />
          Save table
        </button>
      </div>
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

function TableIcon(p: IconProps) {
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
      <ellipse cx="12" cy="12" rx="8.5" ry="5" />
      <circle cx="12" cy="4" r="1.6" />
      <circle cx="12" cy="20" r="1.6" />
      <circle cx="3.5" cy="8" r="1.6" />
      <circle cx="20.5" cy="8" r="1.6" />
      <circle cx="3.5" cy="16" r="1.6" />
      <circle cx="20.5" cy="16" r="1.6" />
    </svg>
  );
}

function AlertIcon(p: IconProps) {
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
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5" />
      <path d="M12 16.2h.01" />
    </svg>
  );
}
