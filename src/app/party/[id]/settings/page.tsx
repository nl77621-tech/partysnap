"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";

interface Party {
  id: string;
  name: string;
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

  // Cover photo state
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverMsg, setCoverMsg] = useState("");
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Table state
  const [newTableCount, setNewTableCount] = useState(1);
  const [savingTables, setSavingTables] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [tableMsg, setTableMsg] = useState("");

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

  // ── Cover photo ─────────────────────────────────────────────
  const handleCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setCoverPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setCoverUploading(true);
    setCoverMsg("");

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch(`/api/parties/${partyId}/cover`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (res.ok) {
        setCoverPreview(data.coverPhoto);
        setParty((p) => p ? { ...p, coverPhoto: data.coverPhoto } : p);
        setCoverMsg("✅ Cover photo saved!");
      } else {
        setCoverMsg(`❌ ${data.error}`);
      }
    } catch {
      setCoverMsg("❌ Upload failed. Please try again.");
    } finally {
      setCoverUploading(false);
    }
  };

  const removeCover = async () => {
    await fetch(`/api/parties/${partyId}/cover`, { method: "DELETE" });
    setCoverPreview(null);
    setParty((p) => p ? { ...p, coverPhoto: null } : p);
    setCoverMsg("Cover photo removed.");
  };

  // ── Tables ────────────────────────────────────────────────────
  const addTables = async () => {
    if (newTableCount < 1) return;
    setSavingTables(true);
    setTableMsg("");

    // Find highest existing table number
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
      setTableMsg(`✅ Added ${newTableCount} table${newTableCount > 1 ? "s" : ""}`);
      setNewTableCount(1);
    } catch {
      setTableMsg("❌ Failed to add tables");
    } finally {
      setSavingTables(false);
    }
  };

  const saveTable = async (table: Table) => {
    const res = await fetch(`/api/parties/${partyId}/tables`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        number: table.number,
        name: table.name,
        guests: table.guests,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTables((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setEditingTable(null);
    }
  };

  const deleteTable = async (tableId: string) => {
    await fetch(`/api/parties/${partyId}/tables?tableId=${tableId}`, {
      method: "DELETE",
    });
    setTables((prev) => prev.filter((t) => t.id !== tableId));
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!party) return <div className="p-8 text-center">Party not found</div>;

  const themeColor = party.themeColor;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
            &larr; Back
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-500">{party.name}</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">

        {/* ── Cover Photo ── */}
        <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-lg">Cover Photo</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Shown at the top of the guest upload page
            </p>
          </div>
          <div className="p-6">
            {coverPreview ? (
              <div className="relative">
                <img
                  src={coverPreview}
                  alt="Cover"
                  className="w-full h-52 object-cover rounded-xl"
                />
                <div className="mt-3 flex gap-3">
                  <button
                    onClick={() => coverInputRef.current?.click()}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                  >
                    Change Photo
                  </button>
                  <button
                    onClick={removeCover}
                    className="px-4 py-2 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => coverInputRef.current?.click()}
                disabled={coverUploading}
                className="w-full h-40 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-indigo-400 hover:bg-indigo-50 transition-colors group"
                style={{ borderColor: coverUploading ? themeColor : undefined }}
              >
                {coverUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: themeColor }} />
                    <span className="text-sm text-gray-500">Uploading...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-8 h-8 text-gray-400 group-hover:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-600 group-hover:text-indigo-600">
                      Click to upload a photo
                    </span>
                    <span className="text-xs text-gray-400">JPG, PNG, WEBP up to 20MB</span>
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
            {coverMsg && (
              <p className="mt-2 text-sm text-gray-600">{coverMsg}</p>
            )}
          </div>
        </section>

        {/* ── Table Management ── */}
        <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-lg">Table Setup</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Organise your seating chart — up to 10 guests per table
            </p>
          </div>
          <div className="p-6 space-y-5">
            {/* Add tables */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  How many tables to add?
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={newTableCount}
                  onChange={(e) => setNewTableCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <button
                onClick={addTables}
                disabled={savingTables}
                className="mt-6 px-5 py-2 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: themeColor }}
              >
                {savingTables ? "Adding..." : "Add Tables"}
              </button>
            </div>
            {tableMsg && <p className="text-sm text-gray-600">{tableMsg}</p>}

            {/* Table list */}
            {tables.length > 0 ? (
              <div className="space-y-3">
                {tables.map((table) =>
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
                      themeColor={themeColor}
                      onEdit={() => setEditingTable({ ...table })}
                      onDelete={() => deleteTable(table.id)}
                    />
                  )
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">
                No tables yet — add some above
              </p>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function TableRow({
  table,
  themeColor,
  onEdit,
  onDelete,
}: {
  table: Table;
  themeColor: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
        style={{ backgroundColor: themeColor }}
      >
        {table.number}
      </div>
      <div className="flex-1 min-w-0">
        {table.name && (
          <p className="font-medium text-gray-800">{table.name}</p>
        )}
        {table.guests.length > 0 ? (
          <p className="text-sm text-gray-500 truncate">
            {table.guests.filter(Boolean).join(", ")}
          </p>
        ) : (
          <p className="text-sm text-gray-400 italic">No guests added</p>
        )}
        <p className="text-xs text-gray-400 mt-0.5">
          {table.guests.filter(Boolean).length}/10 guests
        </p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={onEdit}
          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          ✕
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
    // Remove trailing empty slots but keep filled ones
    while (guests.length > 0 && !guests[guests.length - 1]) guests.pop();
    onChange({ ...table, guests });
  };

  const guestSlots = Array.from({ length: 10 }, (_, i) => table.guests[i] || "");

  return (
    <div className="p-4 border-2 rounded-xl space-y-4" style={{ borderColor: themeColor }}>
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ backgroundColor: themeColor }}
        >
          {table.number}
        </div>
        <input
          type="text"
          placeholder={`Table ${table.number} name (optional)`}
          value={table.name || ""}
          onChange={(e) => onChange({ ...table, name: e.target.value || null })}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Guests (up to 10)
        </p>
        <div className="grid grid-cols-2 gap-2">
          {guestSlots.map((guest, i) => (
            <input
              key={i}
              type="text"
              placeholder={`Guest ${i + 1}`}
              value={guest}
              onChange={(e) => setGuest(i, e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400"
            />
          ))}
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          className="px-4 py-2 text-sm text-white rounded-lg font-medium transition-colors"
          style={{ backgroundColor: themeColor }}
        >
          Save Table
        </button>
      </div>
    </div>
  );
}
