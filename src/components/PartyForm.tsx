"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PartyFormProps {
  initialData?: {
    id?: string;
    name: string;
    date: string;
    themeColor: string;
    coverPhoto?: string | null;
    driveFolderId?: string | null;
  };
  mode: "create" | "edit";
}

const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
];

export default function PartyForm({ initialData, mode }: PartyFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: initialData?.name || "",
    date: initialData?.date ? new Date(initialData.date).toISOString().slice(0, 16) : "",
    themeColor: initialData?.themeColor || "#6366f1",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const url = mode === "create" ? "/api/parties" : `/api/parties/${initialData?.id}`;
    const method = mode === "create" ? "POST" : "PUT";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        const party = await res.json();
        router.push(mode === "create" ? `/party/${party.id}/qr` : "/dashboard");
      }
    } catch {
      alert("Failed to save party");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Party Name *
        </label>
        <input
          type="text"
          required
          placeholder="Jake & Sarah's Wedding"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Date & Time *
        </label>
        <input
          type="datetime-local"
          required
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Theme Color
        </label>
        <div className="flex gap-3 flex-wrap">
          {COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setForm({ ...form, themeColor: color })}
              className={`w-10 h-10 rounded-full transition-all ${
                form.themeColor === color
                  ? "ring-4 ring-offset-2 ring-gray-400 scale-110"
                  : "hover:scale-110"
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
          <input
            type="color"
            value={form.themeColor}
            onChange={(e) => setForm({ ...form, themeColor: e.target.value })}
            className="w-10 h-10 rounded-full cursor-pointer border-2 border-gray-200"
            title="Custom color"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full py-4 bg-indigo-600 text-white rounded-lg font-semibold text-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
        style={{ backgroundColor: form.themeColor }}
      >
        {saving ? "Saving..." : mode === "create" ? "Create Party" : "Save Changes"}
      </button>
    </form>
  );
}
