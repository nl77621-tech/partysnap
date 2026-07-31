"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PageLoader,
  PlusIcon,
  ImageIcon,
  TvIcon,
  SettingsIcon,
  ChartIcon,
  TrashIcon,
  SparkleIcon,
} from "@/components/Icons";

interface Party {
  id: string;
  name: string;
  date: string;
  code: string;
  themeColor: string;
  coverPhoto: string | null;
  _count: { uploads: number };
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const deleteParty = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch(`/api/parties/${id}`, { method: "DELETE" });
      setParties((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetch("/api/parties")
        .then((r) => r.json())
        .then(setParties)
        .finally(() => setLoading(false));
    }
  }, [session]);

  if (status === "loading" || loading) return <PageLoader />;

  const totalUploads = parties.reduce((n, p) => n + p._count.uploads, 0);

  return (
    <div className="min-h-screen bg-paper">
      <header className="app-header">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="wordmark">
            PartySnap
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-ink-500 sm:inline">
              {session?.user?.email}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="btn-ghost"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="eyebrow mb-2">
              {parties.length === 0
                ? "Getting started"
                : `${parties.length} ${parties.length === 1 ? "party" : "parties"} · ${totalUploads} ${
                    totalUploads === 1 ? "upload" : "uploads"
                  }`}
            </p>
            <h1 className="text-4xl font-semibold text-ink-900 sm:text-5xl">
              Your parties
            </h1>
          </div>
          <Link href="/party/new" className="btn-primary">
            <PlusIcon className="h-[18px] w-[18px]" />
            Create party
          </Link>
        </div>

        {parties.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {parties.map((party, i) => (
              <PartyCard
                key={party.id}
                party={party}
                index={i}
                confirming={confirmDeleteId === party.id}
                deleting={deletingId === party.id}
                onAskDelete={() => setConfirmDeleteId(party.id)}
                onCancelDelete={() => setConfirmDeleteId(null)}
                onConfirmDelete={() => deleteParty(party.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function PartyCard({
  party,
  index,
  confirming,
  deleting,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  party: Party;
  index: number;
  confirming: boolean;
  deleting: boolean;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}) {
  const date = new Date(party.date);

  return (
    <article
      className="card-interactive animate-rise-in flex flex-col overflow-hidden"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Theme-color banner — the one place each party's own color leads.
          Falls back to a ghosted monogram when there's no cover photo. */}
      <div
        className="relative flex h-32 items-end justify-between overflow-hidden p-4"
        style={{
          background: `linear-gradient(135deg, ${party.themeColor}, ${party.themeColor}b0)`,
        }}
      >
        {party.coverPhoto ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={party.coverPhoto}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(160deg, ${party.themeColor}55, ${party.themeColor}dd)`,
              }}
            />
          </>
        ) : (
          <span
            aria-hidden
            className="pointer-events-none absolute -right-3 -top-9 select-none font-display text-[7rem] font-semibold leading-none text-white/15"
          >
            {party.name.trim().charAt(0).toUpperCase()}
          </span>
        )}

        <span className="relative rounded-lg bg-black/25 px-2.5 py-1 font-mono text-xs font-medium tracking-wider text-white backdrop-blur-sm">
          {party.code}
        </span>
        <span className="relative flex items-center gap-1.5 rounded-lg bg-black/25 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
          <ImageIcon className="h-3.5 w-3.5" />
          {party._count.uploads}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-xl font-semibold leading-snug text-ink-900">
          {party.name}
        </h3>
        <p className="mt-1 text-sm text-ink-500">
          {date.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>

        <div className="flex-1" />

        {confirming ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="mb-3 text-sm text-red-800">
              Delete <strong>{party.name}</strong> and all its photo records?
            </p>
            <div className="flex gap-2">
              <button
                onClick={onConfirmDelete}
                disabled={deleting}
                className="btn-danger flex-1 px-3 py-2 text-xs"
              >
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
              <button
                onClick={onCancelDelete}
                className="btn-secondary flex-1 px-3 py-2 text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 flex items-center gap-2">
            <Link
              href={`/slideshow/${party.id}`}
              className="btn-primary flex-1 px-3 py-2.5 text-xs"
            >
              <TvIcon className="h-4 w-4" />
              Slideshow
            </Link>
            <IconLink
              href={`/party/${party.id}/settings`}
              label="Settings & QR code"
            >
              <SettingsIcon className="h-[18px] w-[18px]" />
            </IconLink>
            <IconLink href={`/party/${party.id}/stats`} label="Analytics">
              <ChartIcon className="h-[18px] w-[18px]" />
            </IconLink>
            <button
              onClick={onAskDelete}
              aria-label={`Delete ${party.name}`}
              title="Delete party"
              className="grid h-10 w-10 place-items-center rounded-xl border border-ink-200 bg-white text-ink-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <TrashIcon className="h-[18px] w-[18px]" />
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function IconLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="grid h-10 w-10 place-items-center rounded-xl border border-ink-200 bg-white text-ink-600 transition-colors hover:border-ink-300 hover:bg-ink-50 hover:text-ink-900"
    >
      {children}
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="card animate-rise-in mx-auto max-w-lg px-8 py-16 text-center">
      <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-ink-900 text-paper">
        <SparkleIcon className="h-6 w-6" />
      </div>
      <h2 className="text-2xl font-semibold text-ink-900">No parties yet</h2>
      <p className="mx-auto mt-2 max-w-xs text-[15px] leading-relaxed text-ink-600">
        Create your first party to get a QR code your guests can scan and start
        collecting photos.
      </p>
      <Link href="/party/new" className="btn-primary mt-7">
        <PlusIcon className="h-[18px] w-[18px]" />
        Create your first party
      </Link>
    </div>
  );
}
