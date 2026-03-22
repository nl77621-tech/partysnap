"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Upload {
  id: string;
  mediaType: string;
  fileSize: number;
  uploadedAt: string;
  sessionId: string | null;
}

interface Party {
  id: string;
  name: string;
  themeColor: string;
  _count: { uploads: number };
}

export default function StatsPage() {
  const params = useParams();
  const [party, setParty] = useState<Party | null>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/parties/${params.id}`).then((r) => r.json()),
      fetch(`/api/parties/${params.id}/uploads?limit=200`).then((r) => r.json()),
    ])
      .then(([p, u]) => {
        setParty(p);
        setUploads(u);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

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

  const photos = uploads.filter((u) => u.mediaType === "image");
  const videos = uploads.filter((u) => u.mediaType === "video");
  const totalSize = uploads.reduce((sum, u) => sum + u.fileSize, 0);
  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  // Upload timeline — group by hour
  const hourCounts: Record<string, number> = {};
  uploads.forEach((u) => {
    const hour = new Date(u.uploadedAt).toLocaleString("en-US", {
      hour: "numeric",
      hour12: true,
    });
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  const maxCount = Math.max(...Object.values(hourCounts), 1);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
            &larr; Dashboard
          </Link>
          <h1 className="text-xl font-bold text-gray-900">
            Analytics — {party.name}
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Uploads", value: uploads.length, emoji: "📤" },
            { label: "Photos", value: photos.length, emoji: "📸" },
            { label: "Videos", value: videos.length, emoji: "🎬" },
            { label: "Storage Used", value: formatSize(totalSize), emoji: "💾" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-gray-200 p-5 text-center"
            >
              <div className="text-3xl mb-2">{stat.emoji}</div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Upload Timeline */}
        {Object.keys(hourCounts).length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Upload Timeline
            </h2>
            <div className="flex items-end gap-2 h-40">
              {Object.entries(hourCounts).map(([hour, count]) => (
                <div key={hour} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500">{count}</span>
                  <div
                    className="w-full rounded-t-md transition-all"
                    style={{
                      height: `${(count / maxCount) * 100}%`,
                      backgroundColor: party.themeColor,
                      minHeight: 4,
                    }}
                  />
                  <span className="text-xs text-gray-400 truncate w-full text-center">
                    {hour}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
