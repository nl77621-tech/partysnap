"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import PartyForm from "@/components/PartyForm";
import { ArrowLeftIcon, PageLoader } from "@/components/Icons";

export default function NewParty() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
  }, [status, router]);

  if (status === "loading") return <PageLoader />;

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
          <p className="eyebrow mb-2">New party</p>
          <h1 className="text-4xl font-semibold text-ink-900 sm:text-5xl">
            Set up your party
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-600">
            Name it, pick a date, and choose a color. You&rsquo;ll get a QR code
            for guests as soon as you&rsquo;re done.
          </p>
        </div>

        <PartyForm mode="create" />
      </main>
    </div>
  );
}
