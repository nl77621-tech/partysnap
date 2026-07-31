"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, ImageIcon } from "@/components/Icons";

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

/** Human names so each swatch gets a meaningful accessible label. */
const COLOR_NAMES: Record<string, string> = {
  "#6366f1": "Indigo",
  "#8b5cf6": "Violet",
  "#ec4899": "Pink",
  "#ef4444": "Red",
  "#f97316": "Orange",
  "#eab308": "Gold",
  "#22c55e": "Green",
  "#14b8a6": "Teal",
  "#06b6d4": "Cyan",
  "#3b82f6": "Blue",
};

/** Formats the datetime-local value for the guest preview, tolerating empties. */
function previewDate(value: string) {
  if (!value) return "Date to be confirmed";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Date to be confirmed";
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

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

  const isPreset = COLORS.includes(form.themeColor.toLowerCase());

  return (
    <form onSubmit={handleSubmit} className="animate-rise-in space-y-6">
      <div className="card space-y-8 p-7 sm:p-9">
        <div>
          <label htmlFor="party-name" className="label">
            Party name
          </label>
          <input
            id="party-name"
            type="text"
            required
            placeholder={"Jake & Sarah’s Wedding"}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input text-lg"
          />
          <p className="mt-2 text-sm text-ink-500">
            This is the name guests see when they scan your QR code.
          </p>
        </div>

        <div>
          <label htmlFor="party-date" className="label">
            Date &amp; time
          </label>
          <input
            id="party-date"
            type="datetime-local"
            required
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="input"
          />
        </div>

        <div className="border-t border-ink-200/70 pt-8">
          <span className="label">Theme color</span>
          <p className="-mt-1 mb-4 text-sm text-ink-500">
            Sets the accent guests see on the upload page and slideshow.
          </p>

          <div className="flex flex-wrap gap-3">
            {COLORS.map((color) => {
              const selected = form.themeColor.toLowerCase() === color;
              return (
                <button
                  key={color}
                  type="button"
                  aria-label={`${COLOR_NAMES[color] ?? color} theme color`}
                  aria-pressed={selected}
                  title={COLOR_NAMES[color] ?? color}
                  onClick={() => setForm({ ...form, themeColor: color })}
                  className={`grid h-11 w-11 place-items-center rounded-full text-white
                              transition-all duration-200 ease-out
                              ${selected ? "scale-105 shadow-lift" : "hover:scale-110 hover:shadow-soft"}`}
                  style={{
                    backgroundColor: color,
                    boxShadow: selected
                      ? `0 0 0 2px #FAF7F2, 0 0 0 4px ${color}`
                      : undefined,
                  }}
                >
                  <CheckIcon
                    className={`h-[18px] w-[18px] transition-opacity duration-200 ${
                      selected ? "opacity-100" : "opacity-0"
                    }`}
                  />
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <label
              htmlFor="custom-color"
              className="font-sans text-sm font-medium text-ink-700"
            >
              Or pick your own
            </label>
            <input
              id="custom-color"
              type="color"
              value={form.themeColor}
              onChange={(e) => setForm({ ...form, themeColor: e.target.value })}
              className="h-9 w-12 cursor-pointer rounded-lg border border-ink-200 bg-white p-1
                         transition-colors duration-200 hover:border-ink-300"
            />
            <span
              className={`font-mono text-xs uppercase tracking-wider ${
                isPreset ? "text-ink-400" : "text-ink-600"
              }`}
            >
              {form.themeColor}
            </span>
          </div>
        </div>

        {/* Live preview — makes the color choice concrete rather than abstract. */}
        <div className="border-t border-ink-200/70 pt-8">
          <p className="eyebrow mb-3">Guests will see</p>
          <div className="overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-soft">
            <div
              className="relative flex h-24 items-end overflow-hidden p-4 transition-colors duration-300"
              style={{
                background: `linear-gradient(135deg, ${form.themeColor}, ${form.themeColor}b0)`,
              }}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute -right-2 -top-7 select-none font-display text-[5.5rem] font-semibold leading-none text-white/15"
              >
                {(form.name.trim().charAt(0) || "P").toUpperCase()}
              </span>
              <div className="relative">
                <h3 className="text-xl font-semibold leading-snug text-white">
                  {form.name.trim() || "Your party name"}
                </h3>
                <p className="mt-0.5 text-xs text-white/85">
                  {previewDate(form.date)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white transition-colors duration-300"
                style={{ backgroundColor: form.themeColor }}
              >
                <ImageIcon className="h-[18px] w-[18px]" />
              </span>
              <p className="text-sm text-ink-500">
                Add your photos to the party album
              </p>
            </div>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-2xl px-7 py-4
                   text-base font-semibold text-white shadow-soft
                   transition-all duration-200 hover:-translate-y-px hover:shadow-lift
                   active:translate-y-0 active:shadow-soft
                   disabled:pointer-events-none disabled:opacity-60"
        style={{ backgroundColor: form.themeColor }}
      >
        {saving && (
          <span
            aria-hidden
            className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-white/35 border-t-white"
          />
        )}
        {saving
          ? "Saving…"
          : mode === "create"
            ? "Create party"
            : "Save changes"}
      </button>
    </form>
  );
}
