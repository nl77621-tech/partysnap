"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import PartyForm from "@/components/PartyForm";

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

  if (status === "loading" || loading) {
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
            &larr; Back
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Edit Party</h1>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">
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
