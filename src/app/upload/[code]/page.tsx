"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";

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

// Lightbox component — click a gallery photo to see it full-size
function Lightbox({
  src,
  caption,
  onClose,
}: {
  src: string;
  caption?: string | null;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl leading-none"
        onClick={onClose}
      >
        ✕
      </button>
      <div
        className="max-w-full max-h-full flex flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt=""
          className="max-w-[90vw] max-h-[80vh] rounded-xl object-contain"
        />
        {caption && (
          <p className="text-white/80 text-sm text-center">{caption}</p>
        )}
      </div>
    </div>
  );
}

export default function GuestUploadPage() {
  const params = useParams();
  const [party, setParty] = useState<Party | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string; caption?: string | null } | null>(null);
  const [videoModal, setVideoModal] = useState<string | null>(null); // Drive fileId
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [existingUploads, setExistingUploads] = useState<ExistingUpload[]>([]);
  const [globalCaption, setGlobalCaption] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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
        // Fetch existing uploads for gallery
        return fetch(`/api/parties/${p.id}/uploads?limit=200`);
      })
      .then((r) => r.json())
      .then(setExistingUploads)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.code]);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;

    const newUploads: UploadItem[] = Array.from(files).map((file) => ({
      file,
      progress: 0,
      status: "pending",
      caption: "",
      preview: file.type.startsWith("image") ? URL.createObjectURL(file) : "",
    }));

    setUploads((prev) => [...prev, ...newUploads]);

    // Start uploading each file
    newUploads.forEach((item, index) => {
      const actualIndex = uploads.length + index;
      uploadFile(item, actualIndex);
    });
  };

  const uploadFile = async (item: UploadItem, index: number) => {
    setUploads((prev) =>
      prev.map((u, i) => (i === index ? { ...u, status: "uploading" } : u))
    );

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
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploads((prev) =>
            prev.map((u, i) => (i === index ? { ...u, progress } : u))
          );
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploads((prev) =>
            prev.map((u, i) =>
              i === index ? { ...u, status: "done", progress: 100 } : u
            )
          );
        } else {
          setUploads((prev) =>
            prev.map((u, i) => (i === index ? { ...u, status: "error" } : u))
          );
        }
      };

      xhr.onerror = () => {
        setUploads((prev) =>
          prev.map((u, i) => (i === index ? { ...u, status: "error" } : u))
        );
      };

      xhr.send(formData);
    } catch {
      setUploads((prev) =>
        prev.map((u, i) => (i === index ? { ...u, status: "error" } : u))
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error || !party) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="text-6xl mb-4">😔</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          {error || "Party not found"}
        </h1>
        <p className="text-gray-500">Check the QR code and try again.</p>
      </div>
    );
  }

  const completedCount = uploads.filter((u) => u.status === "done").length;
  const themeColor = party.themeColor;

  return (
    <div className="min-h-screen" style={{ backgroundColor: `${themeColor}10` }}>
      {/* Lightbox */}
      {lightbox && (
        <Lightbox
          src={lightbox.src}
          caption={lightbox.caption}
          onClose={() => setLightbox(null)}
        />
      )}

      {/* Video modal */}
      {videoModal && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setVideoModal(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl leading-none z-10"
            onClick={() => setVideoModal(null)}
          >
            ✕
          </button>
          <div
            className="w-full max-w-lg aspect-video rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={`https://drive.google.com/file/d/${videoModal}/preview`}
              className="w-full h-full"
              allow="autoplay"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Header — with optional cover photo */}
      <div
        className="relative text-center text-white overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` }}
      >
        {party.coverPhoto && (
          <img
            src={party.coverPhoto}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
        )}
        <div className={`relative z-10 ${party.coverPhoto ? "pt-12 pb-10" : "pt-8 pb-6"} px-4`}>
          {party.coverPhoto && (
            <div className="mb-4 flex justify-center">
              <img
                src={party.coverPhoto}
                alt="Cover"
                className="w-24 h-24 rounded-full object-cover border-4 border-white/40 shadow-lg"
              />
            </div>
          )}
          <h1 className="text-2xl font-bold mb-1">{party.name}</h1>
          <p className="text-sm opacity-80">
            {new Date(party.date).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Caption */}
        <input
          type="text"
          placeholder="Add a caption (optional)"
          value={globalCaption}
          onChange={(e) => setGlobalCaption(e.target.value)}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-center focus:ring-2 focus:outline-none"
          style={{ focusRingColor: themeColor } as React.CSSProperties}
        />

        {/* Upload Buttons */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-5 rounded-2xl text-white font-semibold text-lg shadow-lg active:scale-95 transition-transform"
          style={{ backgroundColor: themeColor }}
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Upload Photos & Videos
          </span>
        </button>

        <button
          onClick={() => cameraInputRef.current?.click()}
          className="w-full py-4 rounded-2xl border-2 font-semibold text-lg active:scale-95 transition-transform"
          style={{ borderColor: themeColor, color: themeColor }}
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Take a Photo
          </span>
        </button>

        {/* Hidden File Inputs */}
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

        {/* Upload Progress */}
        {uploads.length > 0 && (
          <div className="space-y-3">
            {completedCount > 0 && (
              <div className="text-center py-3">
                <div className="text-3xl mb-1">🎉</div>
                <p className="font-semibold text-gray-700">
                  {completedCount} {completedCount === 1 ? "file" : "files"} uploaded!
                </p>
              </div>
            )}

            {uploads.map((item, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3 animate-slideUp"
              >
                {item.preview ? (
                  <img
                    src={item.preview}
                    alt=""
                    className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {item.file.name}
                  </p>
                  {item.status === "uploading" && (
                    <div className="mt-1.5 h-2 bg-gray-100 rounded-full overflow-hidden">
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
                    <p className="text-xs text-green-600 mt-0.5">Uploaded!</p>
                  )}
                  {item.status === "error" && (
                    <p className="text-xs text-red-500 mt-0.5">Failed — tap to retry</p>
                  )}
                </div>
                {item.status === "done" && (
                  <svg className="w-6 h-6 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Party Gallery */}
        {existingUploads.length > 0 && (
          <div className="pt-4">
            <h2 className="text-center text-sm font-semibold text-gray-500 mb-3">
              📸 {existingUploads.length} photo{existingUploads.length !== 1 ? "s" : ""} shared so far
            </h2>
            <div className="grid grid-cols-3 gap-1.5">
              {existingUploads.map((u) => {
                // Only use image CDN URL for images — video file IDs don't render as images
                const displayUrl = u.mediaType === "image"
                  ? getDisplayUrl(u.driveThumbnail, u.driveFileId)
                  : null;
                return (
                  <div
                    key={u.id}
                    className="aspect-square rounded-xl overflow-hidden bg-gray-100 relative"
                  >
                    {u.mediaType === "video" ? (
                      // Video tile — tap to play
                      <button
                        className="w-full h-full flex flex-col items-center justify-center bg-gray-800 gap-1 active:bg-gray-700 transition-colors"
                        onClick={() => u.driveFileId && setVideoModal(u.driveFileId)}
                      >
                        <svg className="w-8 h-8 text-white/70" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        <span className="text-white/50 text-xs truncate px-2 max-w-full">
                          Tap to play
                        </span>
                      </button>
                    ) : displayUrl ? (
                      <button
                        className="w-full h-full block"
                        onClick={() =>
                          setLightbox({
                            src: getDisplayUrl(u.driveThumbnail, u.driveFileId, "w1600")!,
                            caption: u.caption,
                          })
                        }
                      >
                        <img
                          src={displayUrl}
                          alt={u.caption || u.fileName}
                          className="w-full h-full object-cover active:scale-95 transition-transform"
                        />
                        <span className="absolute bottom-1 right-1 bg-black/40 rounded-full p-0.5">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                          </svg>
                        </span>
                      </button>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-2xl">📷</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pt-4">
          Powered by PartySnap — Photos go directly to the host
        </p>
      </div>
    </div>
  );
}
