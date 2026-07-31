"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import {
  PageLoader,
  CameraIcon,
  ImageIcon,
  VideoIcon,
  PlayIcon,
  CheckIcon,
  CloseIcon,
  ZoomIcon,
} from "@/components/Icons";

// Normalize Drive thumbnail URLs for reliable display in <img> tags
function getDisplayUrl(thumbnail: string | null, fileId: string | null, size = "w400"): string | null {
  if (!thumbnail && !fileId) return null;
  if (thumbnail?.includes("drive.google.com/thumbnail")) {
    const match = thumbnail.match(/[?&]id=([^&]+)/);
    const id = match?.[1] || fileId;
    if (id) return `https://lh3.googleusercontent.com/d/${id}=${size}`;
  }
  if (thumbnail?.includes("lh3.googleusercontent.com/d/")) {
    return thumbnail.replace(/=w\d+$/, `=${size}`).replace(/=s\d+$/, `=${size}`);
  }
  if (thumbnail) return thumbnail.replace(/=s\d+$/, `=${size}`);
  if (fileId) return `https://lh3.googleusercontent.com/d/${fileId}=${size}`;
  return null;
}

interface Party {
  id: string;
  name: string;
  date: string;
  code: string;
  themeColor: string;
  coverPhoto: string | null;
}

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  caption: string;
  preview: string;
}

interface ExistingUpload {
  id: string;
  fileName: string;
  driveFileId: string | null;
  driveThumbnail: string | null;
  mediaType: string;
  caption: string | null;
}

function Lightbox({
  src,
  caption,
  onClose,
}: {
  src: string;
  caption?: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-ink-900/95 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        aria-label="Close"
        className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        onClick={onClose}
      >
        <CloseIcon className="h-5 w-5" />
      </button>
      <div
        className="flex max-h-full max-w-full flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={caption || ""}
          className="max-h-[80vh] max-w-[90vw] rounded-2xl object-contain shadow-float"
        />
        {caption && (
          <p className="max-w-md text-center text-sm text-white/75">{caption}</p>
        )}
      </div>
    </div>
  );
}

export default function GuestUploadPage() {
  const params = useParams();
  const [party, setParty] = useState<Party | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string; caption?: string | null } | null>(null);
  const [videoModal, setVideoModal] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [existingUploads, setExistingUploads] = useState<ExistingUpload[]>([]);
  const [globalCaption, setGlobalCaption] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(0);

  useEffect(() => {
    fetch(`/api/parties/lookup?code=${params.code}`)
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json();
          throw new Error(data.error || "Party not found");
        }
        return r.json();
      })
      .then((p) => {
        setParty(p);
        return fetch(`/api/parties/${p.id}/uploads?limit=200`);
      })
      .then((r) => r.json())
      .then(setExistingUploads)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.code]);

  const handleFiles = (files: FileList | null) => {
    if (!files?.length) return;

    const newUploads: UploadItem[] = Array.from(files).map((file) => ({
      id: `u${nextId.current++}`,
      file,
      progress: 0,
      status: "pending",
      caption: "",
      preview: file.type.startsWith("image") ? URL.createObjectURL(file) : "",
    }));

    setUploads((prev) => [...prev, ...newUploads]);
    // Track each item by its own id — indexes go stale when a second batch is
    // added while the first is still uploading.
    newUploads.forEach(uploadFile);
  };

  const patch = (id: string, changes: Partial<UploadItem>) =>
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...changes } : u)));

  const uploadFile = async (item: UploadItem) => {
    patch(item.id, { status: "uploading" });

    const formData = new FormData();
    formData.append("file", item.file);
    formData.append("partyCode", params.code as string);
    if (globalCaption || item.caption) {
      formData.append("caption", item.caption || globalCaption);
    }

    try {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload");

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          patch(item.id, { progress: Math.round((e.loaded / e.total) * 100) });
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          patch(item.id, { status: "done", progress: 100 });
        } else {
          patch(item.id, { status: "error" });
        }
      };

      xhr.onerror = () => patch(item.id, { status: "error" });
      xhr.send(formData);
    } catch {
      patch(item.id, { status: "error" });
    }
  };

  if (loading) return <PageLoader />;

  if (error || !party) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center">
        <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-ink-100 text-ink-400">
          <CameraIcon className="h-7 w-7" />
        </div>
        <h1 className="mb-2 text-2xl font-semibold text-ink-900">
          {error || "Party not found"}
        </h1>
        <p className="text-ink-500">Check the QR code and try again.</p>
      </div>
    );
  }

  const completedCount = uploads.filter((u) => u.status === "done").length;
  const themeColor = party.themeColor;

  return (
    <div
      className="min-h-screen bg-paper pb-16"
      style={{ "--tc": themeColor } as React.CSSProperties}
    >
      {lightbox && (
        <Lightbox
          src={lightbox.src}
          caption={lightbox.caption}
          onClose={() => setLightbox(null)}
        />
      )}

      {videoModal && (
        <div
          className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-ink-900/95 p-4 backdrop-blur-sm"
          onClick={() => setVideoModal(null)}
        >
          <button
            aria-label="Close"
            className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            onClick={() => setVideoModal(null)}
          >
            <CloseIcon className="h-5 w-5" />
          </button>
          <div
            className="aspect-video w-full max-w-lg overflow-hidden rounded-2xl shadow-float"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={`https://drive.google.com/file/d/${videoModal}/preview`}
              className="h-full w-full"
              allow="autoplay"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Header */}
      <header className="relative overflow-hidden text-white">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(150deg, ${themeColor}, ${themeColor}c0)`,
          }}
        />
        {party.coverPhoto && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={party.coverPhoto}
              alt=""
              className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-[2px]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />
          </>
        )}

        <div className="relative z-10 px-6 pb-10 pt-12 text-center">
          {party.coverPhoto && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={party.coverPhoto}
              alt=""
              className="mx-auto mb-5 h-24 w-24 rounded-full border-4 border-white/70 object-cover shadow-float"
            />
          )}
          <h1 className="text-balance font-display text-[clamp(1.75rem,7vw,2.5rem)] font-semibold leading-tight drop-shadow-sm">
            {party.name}
          </h1>
          <p className="mt-2 text-sm font-medium uppercase tracking-[0.12em] text-white/80">
            {new Date(party.date).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Curved transition into the page body */}
        <div className="relative z-10 h-6 rounded-t-3xl bg-paper" />
      </header>

      <div className="mx-auto max-w-lg space-y-4 px-5">
        <div className="text-center">
          <p className="eyebrow">Share your photos</p>
        </div>

        <input
          type="text"
          placeholder="Add a caption (optional)"
          value={globalCaption}
          onChange={(e) => setGlobalCaption(e.target.value)}
          className="input text-center focus:border-[var(--tc)]"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full rounded-2xl py-5 text-base font-semibold text-white shadow-lift transition-transform active:scale-[0.98]"
          style={{ backgroundColor: themeColor }}
        >
          <span className="flex items-center justify-center gap-2.5">
            <ImageIcon className="h-[22px] w-[22px]" />
            Choose photos &amp; videos
          </span>
        </button>

        <button
          onClick={() => cameraInputRef.current?.click()}
          className="w-full rounded-2xl border-2 bg-white py-4 text-base font-semibold transition-transform active:scale-[0.98]"
          style={{ borderColor: themeColor, color: themeColor }}
        >
          <span className="flex items-center justify-center gap-2.5">
            <CameraIcon className="h-[22px] w-[22px]" />
            Take a photo
          </span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {/* Upload progress */}
        {uploads.length > 0 && (
          <div className="space-y-2.5 pt-2">
            {completedCount > 0 && (
              <div
                className="animate-rise-in flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold"
                style={{ backgroundColor: `${themeColor}14`, color: themeColor }}
              >
                <CheckIcon className="h-[18px] w-[18px]" />
                {completedCount} {completedCount === 1 ? "file" : "files"} shared —
                thank you!
              </div>
            )}

            {uploads.map((item) => (
              <div
                key={item.id}
                className="animate-rise-in card flex items-center gap-3 p-3"
              >
                {item.preview ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={item.preview}
                    alt=""
                    className="h-14 w-14 flex-shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-400">
                    <VideoIcon className="h-6 w-6" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-800">
                    {item.file.name}
                  </p>
                  {item.status === "uploading" && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${item.progress}%`,
                          backgroundColor: themeColor,
                        }}
                      />
                    </div>
                  )}
                  {item.status === "done" && (
                    <p className="mt-0.5 text-xs text-emerald-600">Shared</p>
                  )}
                  {item.status === "error" && (
                    <button
                      onClick={() => uploadFile(item)}
                      className="mt-0.5 text-xs font-medium text-red-600 underline underline-offset-2"
                    >
                      Failed — tap to retry
                    </button>
                  )}
                </div>

                {item.status === "done" && (
                  <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                    <CheckIcon className="h-4 w-4" />
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Gallery */}
        {existingUploads.length > 0 && (
          <section className="pt-6">
            <div className="mb-3 flex items-center gap-3">
              <h2 className="font-sans text-sm font-semibold text-ink-700">
                {existingUploads.length}{" "}
                {existingUploads.length === 1 ? "memory" : "memories"} so far
              </h2>
              <div className="h-px flex-1 bg-ink-200" />
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {existingUploads.map((u) => {
                const displayUrl =
                  u.mediaType === "image"
                    ? getDisplayUrl(u.driveThumbnail, u.driveFileId)
                    : null;

                return (
                  <div
                    key={u.id}
                    className="relative aspect-square overflow-hidden rounded-xl bg-ink-100"
                  >
                    {u.mediaType === "video" ? (
                      <button
                        aria-label={`Play ${u.fileName}`}
                        className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-ink-800 transition-colors active:bg-ink-700"
                        onClick={() => u.driveFileId && setVideoModal(u.driveFileId)}
                      >
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white">
                          <PlayIcon className="ml-0.5 h-4 w-4" />
                        </span>
                        <span className="text-[10px] font-medium uppercase tracking-wider text-white/60">
                          Video
                        </span>
                      </button>
                    ) : displayUrl ? (
                      <button
                        aria-label={u.caption || `View ${u.fileName}`}
                        className="group block h-full w-full"
                        onClick={() =>
                          setLightbox({
                            src: getDisplayUrl(u.driveThumbnail, u.driveFileId, "w1600")!,
                            caption: u.caption,
                          })
                        }
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={displayUrl}
                          alt={u.caption || u.fileName}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-300 group-active:scale-95"
                        />
                        <span className="absolute bottom-1.5 right-1.5 grid h-6 w-6 place-items-center rounded-full bg-ink-900/45 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                          <ZoomIcon className="h-3.5 w-3.5" />
                        </span>
                      </button>
                    ) : (
                      <div className="grid h-full w-full place-items-center text-ink-300">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <p className="pt-6 text-center text-xs text-ink-400">
          Powered by PartySnap · Photos go straight to the host
        </p>
      </div>
    </div>
  );
}
