"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  PageLoader,
  ArrowLeftIcon,
  UploadIcon,
  ImageIcon,
  VideoIcon,
  DatabaseIcon,
  ChartIcon,
} from "@/components/Icons";

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
    return <PageLoader />;
  }

  if (!party) {
    return (
      <div className="min-h-screen bg-paper">
        <header className="app-header">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
            <BackLink />
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-6 py-12">
          <div className="card animate-rise-in mx-auto max-w-lg px-8 py-16 text-center">
            <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-ink-900 text-paper">
              <ChartIcon className="h-6 w-6" />
            </div>
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

  const stats: { label: string; value: string | number; icon: React.ReactNode }[] =
    [
      {
        label: "Total uploads",
        value: uploads.length,
        icon: <UploadIcon className="h-[18px] w-[18px]" />,
      },
      {
        label: "Photos",
        value: photos.length,
        icon: <ImageIcon className="h-[18px] w-[18px]" />,
      },
      {
        label: "Videos",
        value: videos.length,
        icon: <VideoIcon className="h-[18px] w-[18px]" />,
      },
      {
        label: "Storage used",
        value: formatSize(totalSize),
        icon: <DatabaseIcon className="h-[18px] w-[18px]" />,
      },
    ];

  return (
    <div className="min-h-screen bg-paper">
      <header className="app-header">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
          <BackLink />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-10">
          <p className="eyebrow mb-2">{party.name}</p>
          <h1 className="text-4xl font-semibold text-ink-900 sm:text-5xl">
            Analytics
          </h1>
        </div>

        {/* Stats grid */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className="card animate-rise-in p-5"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-ink-100 text-ink-500">
                {stat.icon}
              </div>
              <div className="mt-4 font-display text-[2.1rem] font-semibold leading-none tracking-[-0.02em] text-ink-900 tabular-nums">
                {stat.value}
              </div>
              <div className="mt-2 font-sans text-xs font-medium uppercase tracking-[0.08em] text-ink-500">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Upload timeline */}
        <section
          className="card animate-rise-in p-6 sm:p-7"
          style={{ animationDelay: "240ms" }}
        >
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="text-lg font-semibold text-ink-900">
              Upload timeline
            </h2>
            {Object.keys(hourCounts).length > 0 && (
              <p className="text-sm text-ink-500">
                Peak {maxCount} {maxCount === 1 ? "upload" : "uploads"} in an
                hour
              </p>
            )}
          </div>
          <p className="mb-6 text-sm text-ink-500">
            Uploads grouped by hour of day
          </p>

          {Object.keys(hourCounts).length > 0 ? (
            <TimelineChart
              hourCounts={hourCounts}
              maxCount={maxCount}
              color={party.themeColor}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-ink-200 px-6 py-14 text-center">
              <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-xl bg-ink-100 text-ink-400">
                <ChartIcon className="h-5 w-5" />
              </div>
              <p className="font-sans text-base font-medium text-ink-900">
                Nothing to chart yet
              </p>
              <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-ink-500">
                Once guests start uploading, you&rsquo;ll see when the party
                really got going.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/dashboard"
      className="btn-ghost -ml-3 px-3"
    >
      <ArrowLeftIcon className="h-[18px] w-[18px]" />
      Dashboard
    </Link>
  );
}

function TimelineChart({
  hourCounts,
  maxCount,
  color,
}: {
  hourCounts: Record<string, number>;
  maxCount: number;
  color: string;
}) {
  const entries = Object.entries(hourCounts);
  // With many distinct hours the tick labels collide — thin them out so at
  // most ~8 render, always keeping the first and last for orientation.
  const labelStep = Math.max(1, Math.ceil(entries.length / 8));
  const showLabel = (i: number) =>
    i === 0 || i === entries.length - 1 || i % labelStep === 0;

  // Three gridlines: 0, half the peak, the peak. Halves are rounded so the
  // axis reads in whole uploads.
  const ticks = [maxCount, Math.round(maxCount / 2), 0].filter(
    (v, i, a) => a.indexOf(v) === i,
  );

  const summary = entries
    .map(([hour, count]) => `${hour}: ${count}`)
    .join(", ");

  return (
    <div>
      <figure
        role="img"
        aria-label={`Bar chart of uploads by hour. ${summary}.`}
        className="m-0"
      >
        <div className="flex gap-3">
          {/* Y axis */}
          <div className="relative h-44 w-7 shrink-0">
            {ticks.map((t) => (
              <span
                key={t}
                className="absolute right-0 -translate-y-1/2 text-[11px] tabular-nums text-ink-400"
                style={{ top: `${100 - (t / maxCount) * 100}%` }}
              >
                {t}
              </span>
            ))}
          </div>

          {/* Plot area */}
          <div className="min-w-0 flex-1">
            <div className="relative h-44">
              {/* Gridlines + baseline */}
              {ticks.map((t) => (
                <div
                  key={t}
                  aria-hidden
                  className={`absolute inset-x-0 border-t ${
                    t === 0 ? "border-ink-300" : "border-ink-200/70"
                  }`}
                  style={{ top: `${100 - (t / maxCount) * 100}%` }}
                />
              ))}

              {/* Bars */}
              <div className="absolute inset-0 flex items-end gap-1.5 sm:gap-2">
                {entries.map(([hour, count]) => (
                  <div
                    key={hour}
                    className="group flex h-full min-w-0 flex-1 flex-col justify-end"
                  >
                    <div
                      className="relative flex w-full justify-center"
                      style={{
                        height: `${(count / maxCount) * 100}%`,
                        minHeight: 4,
                      }}
                    >
                      {/* Hover readout */}
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink-900 px-2 py-1 text-[11px] font-medium text-paper opacity-0 shadow-lift transition-opacity duration-150 group-hover:opacity-100">
                        {count} {count === 1 ? "upload" : "uploads"}
                        <span className="text-ink-400"> · {hour}</span>
                      </div>
                      <div
                        className="h-full w-full max-w-[44px] rounded-t-[5px] opacity-90 transition-opacity duration-200 group-hover:opacity-100"
                        style={{ backgroundColor: color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* X axis */}
            <div className="mt-2.5 flex gap-1.5 sm:gap-2">
              {entries.map(([hour], i) => (
                <div key={hour} className="min-w-0 flex-1 text-center">
                  {showLabel(i) && (
                    <span className="block truncate text-[11px] tabular-nums text-ink-400">
                      {hour}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </figure>

      {/* Text alternative — the numbers stay reachable without hovering. */}
      <details className="group mt-5 border-t border-ink-200/70 pt-4">
        <summary className="cursor-pointer list-none font-sans text-sm font-medium text-ink-600 transition-colors hover:text-ink-900">
          <span className="group-open:hidden">Show the numbers</span>
          <span className="hidden group-open:inline">Hide the numbers</span>
        </summary>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
          {entries.map(([hour, count]) => (
            <div
              key={hour}
              className="flex items-baseline justify-between gap-3 border-b border-ink-100 pb-1.5"
            >
              <dt className="text-sm text-ink-600">{hour}</dt>
              <dd className="text-sm font-medium tabular-nums text-ink-900">
                {count}
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}
