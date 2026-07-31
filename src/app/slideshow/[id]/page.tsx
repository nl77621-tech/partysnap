"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";

interface Upload {
  id: string;
  fileName: string;
  driveFileId: string | null;
  driveThumbnail: string | null;
  caption: string | null;
  mediaType: string;
  uploadedAt: string;
}

interface Party {
  id: string;
  name: string;
  themeColor: string;
}

type ViewMode = "slideshow" | "grid";

// Normalize Drive thumbnail URLs to ensure they display correctly in <img> tags.
// Handles both old drive.google.com/thumbnail and lh3 CDN URLs.
function getDisplayUrl(driveThumbnail: string | null, driveFileId: string | null, size = "w1600"): string | null {
  if (!driveThumbnail && !driveFileId) return null;

  // Old-style drive.google.com/thumbnail?id=X&sz=... — extract ID and rebuild as lh3 CDN URL
  if (driveThumbnail?.includes("drive.google.com/thumbnail")) {
    const match = driveThumbnail.match(/[?&]id=([^&]+)/);
    const id = match?.[1] || driveFileId;
    if (id) return `https://lh3.googleusercontent.com/d/${id}=${size}`;
  }

  // lh3 CDN URL — ensure correct size suffix
  if (driveThumbnail?.includes("lh3.googleusercontent.com/d/")) {
    return driveThumbnail.replace(/=w\d+$/, `=${size}`).replace(/=s\d+$/, `=${size}`);
  }

  // Generic =s220 replacement (old Google thumbnail style)
  if (driveThumbnail) {
    return driveThumbnail.replace(/=s\d+$/, `=${size}`).replace(/=s220/, `=${size}`);
  }

  // Last resort: build from fileId
  if (driveFileId) return `https://lh3.googleusercontent.com/d/${driveFileId}=${size}`;
  return null;
}

/* Control-bar icons. Kept local to this file — they exist only for the TV
   chrome and aren't part of the shared app icon set. */
const ctl = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const GridIcon = () => (
  <svg {...ctl} className="h-[18px] w-[18px]">
    <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
  </svg>
);

const SlidesIcon = () => (
  <svg {...ctl} className="h-[18px] w-[18px]">
    <rect x="2.5" y="5" width="19" height="14" rx="2" />
    <path d="M7 19v2M17 19v2" />
  </svg>
);

const ShuffleIcon = () => (
  <svg {...ctl} className="h-[18px] w-[18px]">
    <path d="M17 3.5 21 7l-4 3.5M17 13.5 21 17l-4 3.5" />
    <path d="M3 7h3.5c1.5 0 2.4.8 3.3 2l3.4 6c.9 1.2 1.8 2 3.3 2H21" />
    <path d="M3 17h3.5c1.5 0 2.4-.8 3.3-2M21 7h-3.5c-1 0-1.8.4-2.5 1" />
  </svg>
);

const ExpandIcon = ({ exit }: { exit: boolean }) =>
  exit ? (
    <svg {...ctl} className="h-[18px] w-[18px]">
      <path d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6" />
    </svg>
  ) : (
    <svg {...ctl} className="h-[18px] w-[18px]">
      <path d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6" />
    </svg>
  );

const PlayIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
    <path d="M8 5.14v13.72a.6.6 0 0 0 .92.5l10.7-6.86a.6.6 0 0 0 0-1l-10.7-6.86a.6.6 0 0 0-.92.5Z" />
  </svg>
);

const PhotoIcon = ({ className = "" }: { className?: string }) => (
  <svg {...ctl} className={className}>
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <circle cx="8.5" cy="9.5" r="1.5" />
    <path d="m3.5 17 4.5-4.5a2 2 0 0 1 2.8 0l3.2 3.2m0 0 2-2a2 2 0 0 1 2.8 0l1.7 1.7" />
  </svg>
);

const SPEEDS = [
  { value: 3000, label: "Fast" },
  { value: 6000, label: "Normal" },
  { value: 10000, label: "Slow" },
  { value: 15000, label: "Very slow" },
];

export default function SlideshowPage() {
  const params = useParams();
  const [party, setParty] = useState<Party | null>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setMode] = useState<ViewMode>("slideshow");
  const [speed, setSpeed] = useState(6000);
  const [shuffle, setShuffle] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoModal, setVideoModal] = useState<{ fileId: string; fileName: string } | null>(null);
  const controlsTimeout = useRef<NodeJS.Timeout>();
  const pollInterval = useRef<NodeJS.Timeout>();

  // Load party info
  useEffect(() => {
    fetch(`/api/parties/${params.id}`)
      .then((r) => r.json())
      .then(setParty);
  }, [params.id]);

  // Poll for new uploads
  const fetchUploads = useCallback(async () => {
    const lastUpload = uploads[uploads.length - 1];
    const after = lastUpload ? `&after=${lastUpload.uploadedAt}` : "";
    const url = `/api/parties/${params.id}/uploads?limit=200${after}`;

    try {
      const res = await fetch(url);
      const newUploads: Upload[] = await res.json();
      if (newUploads.length > 0) {
        setUploads((prev) => {
          const existingIds = new Set(prev.map((u) => u.id));
          const unique = newUploads.filter((u) => !existingIds.has(u.id));
          return [...prev, ...unique];
        });
      }
    } catch {
      // Silently handle polling errors
    }
  }, [params.id, uploads]);

  useEffect(() => {
    // Initial fetch of all uploads
    fetch(`/api/parties/${params.id}/uploads?limit=200`)
      .then((r) => r.json())
      .then(setUploads);
  }, [params.id]);

  useEffect(() => {
    pollInterval.current = setInterval(fetchUploads, 5000);
    return () => clearInterval(pollInterval.current);
  }, [fetchUploads]);

  // Auto-advance slideshow
  useEffect(() => {
    if (mode !== "slideshow" || uploads.length === 0) return;

    const photos = uploads.filter((u) => u.mediaType === "image");
    if (photos.length === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        if (shuffle) {
          return Math.floor(Math.random() * photos.length);
        }
        return (prev + 1) % photos.length;
      });
    }, speed);

    return () => clearInterval(timer);
  }, [mode, uploads, speed, shuffle]);

  // Hide controls after inactivity
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => setShowControls(false), 4000);
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", resetControlsTimer);
    window.addEventListener("touchstart", resetControlsTimer);
    resetControlsTimer();
    return () => {
      window.removeEventListener("mousemove", resetControlsTimer);
      window.removeEventListener("touchstart", resetControlsTimer);
    };
  }, [resetControlsTimer]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (!party) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0A09]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
      </div>
    );
  }

  const photos = uploads.filter((u) => u.mediaType === "image");
  const currentPhoto = photos[currentIndex % Math.max(photos.length, 1)];

  if (uploads.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0B0A09] px-6 text-center text-white">
        <div
          className="mb-8 grid h-20 w-20 place-items-center rounded-3xl"
          style={{ backgroundColor: `${party.themeColor}26`, color: party.themeColor }}
        >
          <PhotoIcon className="h-9 w-9" />
        </div>
        <h1 className="font-display text-[clamp(2rem,5vw,3.25rem)] font-semibold tracking-[-0.02em]">
          {party.name}
        </h1>
        <p className="mt-3 text-lg text-white/55">Waiting for the first photo…</p>
        <div className="mt-8 flex items-center gap-2.5 text-sm text-white/35">
          <span className="relative flex h-2 w-2">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70"
              style={{ backgroundColor: party.themeColor }}
            />
            <span
              className="relative inline-flex h-2 w-2 rounded-full"
              style={{ backgroundColor: party.themeColor }}
            />
          </span>
          Listening for uploads
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#0B0A09]"
      onMouseMove={resetControlsTimer}
      style={{ cursor: showControls ? "default" : "none" }}
    >
      {/* Video modal */}
      {videoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm"
          onClick={() => setVideoModal(null)}
        >
          <button
            aria-label="Close video"
            className="absolute right-5 top-5 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            onClick={() => setVideoModal(null)}
          >
            <svg {...ctl} className="h-5 w-5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
          <div
            className="aspect-video w-full max-w-3xl overflow-hidden rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={`https://drive.google.com/file/d/${videoModal.fileId}/preview`}
              className="h-full w-full"
              allow="autoplay"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Slideshow mode */}
      {mode === "slideshow" && currentPhoto && (
        <div className="absolute inset-0">
          <div key={currentPhoto.id} className="animate-fadeIn absolute inset-0">
            {getDisplayUrl(currentPhoto.driveThumbnail, currentPhoto.driveFileId) ? (
              <>
                {/* Blurred fill so letterboxed photos never sit on dead black */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getDisplayUrl(currentPhoto.driveThumbnail, currentPhoto.driveFileId)!}
                  alt=""
                  aria-hidden
                  className="absolute inset-0 h-full w-full scale-125 object-cover opacity-40 blur-3xl saturate-150"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/45" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getDisplayUrl(currentPhoto.driveThumbnail, currentPhoto.driveFileId)!}
                  alt={currentPhoto.caption || ""}
                  className="ken-burns relative h-full w-full object-contain drop-shadow-2xl"
                />
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <div className="text-center text-white/60">
                  <PhotoIcon className="mx-auto mb-4 h-16 w-16" />
                  <p className="text-lg">{currentPhoto.fileName}</p>
                </div>
              </div>
            )}

            {/* Caption */}
            {currentPhoto.caption && (
              <div className="absolute bottom-16 left-0 right-0 flex justify-center px-8">
                <p className="max-w-3xl rounded-2xl bg-black/45 px-7 py-3.5 text-center font-display text-2xl italic text-white/95 shadow-2xl backdrop-blur-md">
                  {currentPhoto.caption}
                </p>
              </div>
            )}
          </div>

          {/* Time-to-next-slide bar */}
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10">
            <div
              key={`${currentPhoto.id}-${speed}`}
              className="h-full origin-left"
              style={{
                backgroundColor: party.themeColor,
                animation: `progressBar ${speed}ms linear forwards`,
              }}
            />
          </div>

          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-xs font-medium tracking-[0.18em] text-white/35">
            {(currentIndex % photos.length) + 1} / {photos.length}
          </div>
        </div>
      )}

      {/* Grid mode */}
      {mode === "grid" && (
        <div className="grid min-h-screen auto-rows-fr grid-cols-3 gap-2 p-2 pt-20 md:grid-cols-4 lg:grid-cols-6">
          {uploads.map((upload, i) => (
            <div
              key={upload.id}
              className="animate-slideUp relative aspect-square overflow-hidden rounded-xl bg-white/5"
              style={{ animationDelay: `${Math.min(i, 24) * 35}ms` }}
            >
              {upload.mediaType === "video" ? (
                <button
                  aria-label={`Play ${upload.fileName}`}
                  className="group flex h-full w-full flex-col items-center justify-center gap-2 bg-white/[0.07] transition-colors hover:bg-white/[0.12]"
                  onClick={() =>
                    upload.driveFileId &&
                    setVideoModal({ fileId: upload.driveFileId, fileName: upload.fileName })
                  }
                >
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white transition-transform group-hover:scale-110">
                    <PlayIcon className="ml-0.5 h-5 w-5" />
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/45">
                    Video
                  </span>
                </button>
              ) : getDisplayUrl(upload.driveThumbnail, upload.driveFileId, "w400") ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={getDisplayUrl(upload.driveThumbnail, upload.driveFileId, "w400")!}
                  alt={upload.caption || ""}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-white/25">
                  <PhotoIcon className="h-7 w-7" />
                </div>
              )}

              {upload.caption && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2.5 pt-8">
                  <p className="truncate text-xs text-white/90">{upload.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div
        className={`absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black/75 via-black/35 to-transparent p-5 pb-12 transition-opacity duration-500 ${
          showControls ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-semibold tracking-[-0.02em] text-white">
              {party.name}
            </h1>
            <p className="mt-0.5 text-xs font-medium uppercase tracking-[0.16em] text-white/45">
              {uploads.length} {uploads.length === 1 ? "upload" : "uploads"}
            </p>
          </div>

          {/* Glass control cluster */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/10 p-1.5 backdrop-blur-xl">
            <CtlButton
              onClick={() => setMode(mode === "slideshow" ? "grid" : "slideshow")}
              label={mode === "slideshow" ? "Switch to grid view" : "Switch to slideshow"}
            >
              {mode === "slideshow" ? <GridIcon /> : <SlidesIcon />}
              <span className="hidden sm:inline">
                {mode === "slideshow" ? "Grid" : "Slides"}
              </span>
            </CtlButton>

            {mode === "slideshow" && (
              <>
                <CtlButton
                  onClick={() => setShuffle(!shuffle)}
                  active={shuffle}
                  label={shuffle ? "Turn shuffle off" : "Turn shuffle on"}
                  pressed={shuffle}
                >
                  <ShuffleIcon />
                  <span className="hidden sm:inline">Shuffle</span>
                </CtlButton>

                <label className="sr-only" htmlFor="speed">
                  Slide duration
                </label>
                <select
                  id="speed"
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="cursor-pointer rounded-xl border-none bg-transparent px-2.5 py-2 text-sm font-medium text-white/85 outline-none transition-colors hover:bg-white/10"
                >
                  {SPEEDS.map((s) => (
                    <option key={s.value} value={s.value} className="bg-ink-900">
                      {s.label}
                    </option>
                  ))}
                </select>
              </>
            )}

            <CtlButton
              onClick={toggleFullscreen}
              label={isFullscreen ? "Exit full screen" : "Enter full screen"}
            >
              <ExpandIcon exit={isFullscreen} />
            </CtlButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function CtlButton({
  onClick,
  children,
  active = false,
  pressed,
  label,
}: {
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
  pressed?: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-white text-ink-900"
          : "text-white/85 hover:bg-white/15 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
