"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import PartyForm from "@/components/PartyForm";
import { ArrowLeftIcon, PageLoader } from "@/components/Icons";

export default function EditParty() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const [party, setParty] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
  }, [status, router]);

  useEffect(() => {
    fetch(`/api/parties/${params.id}`)
      .then((r) => r.json())
      .then(setParty)
      .finally(() => setLoading(false));
  }, [params.id]);

  if (status === "loading" || loading) return <PageLoader />;

  if (!party) {
    return (
      <div className="min-h-screen bg-paper">
        <header className="app-header">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
            <Link href="/dashboard" className="btn-ghost -ml-3">
              <ArrowLeftIcon className="h-[18px] w-[18px]" />
              Back
            </Link>
            <span className="h-5 w-px bg-ink-200" />
            <Link href="/dashboard" className="wordmark">
              PartySnap
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-6 py-12">
          <div className="card animate-rise-in mx-auto max-w-lg px-8 py-16 text-center">
            <h2 className="text-2xl font-semibold text-ink-900">
              Party not found
            </h2>
            <p className="mx-auto mt-2 max-w-xs text-[15px] leading-relaxed text-ink-600">
              This party may have been deleted, or the link is no longer valid.
            </p>
            <Link href="/dashboard" className="btn-primary mt-7">
              Back to dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="app-header">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
          <Link href="/dashboard" className="btn-ghost -ml-3">
            <ArrowLeftIcon className="h-[18px] w-[18px]" />
            Back
          </Link>
          <span className="h-5 w-px bg-ink-200" />
          <Link href="/dashboard" className="wordmark">
            PartySnap
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-10">
          <p className="eyebrow mb-2">Edit party</p>
          <h1 className="text-4xl font-semibold text-ink-900 sm:text-5xl">
            {(party.name as string) || "Edit party"}
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-600">
            Update the details guests see. Changes apply everywhere the party
            appears.
          </p>
        </div>

        <PartyForm
          mode="edit"
          initialData={{
            id: party.id as string,
            name: party.name as string,
            date: party.date as string,
            themeColor: party.themeColor as string,
            coverPhoto: party.coverPhoto as string | null,
            driveFolderId: party.driveFolderId as string | null,
          }}
        />
      </main>
    </div>
  );
}
