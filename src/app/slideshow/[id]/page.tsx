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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    );
  }

  const photos = uploads.filter((u) => u.mediaType === "image");
  const currentPhoto = photos[currentIndex % Math.max(photos.length, 1)];

  if (uploads.length === 0) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <div className="text-6xl mb-6 animate-pulse">📸</div>
        <h1 className="text-3xl font-bold mb-2">{party.name}</h1>
        <p className="text-lg text-gray-400">Waiting for photos...</p>
        <p className="text-sm text-gray-500 mt-2">
          Uploads will appear here in real time
        </p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-black relative overflow-hidden cursor-none"
      onMouseMove={resetControlsTimer}
      style={{ cursor: showControls ? "default" : "none" }}
    >
      {/* Slideshow Mode */}
      {mode === "slideshow" && currentPhoto && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            key={currentPhoto.id}
            className="absolute inset-0 animate-fadeIn"
          >
            {currentPhoto.driveThumbnail ? (
              <img
                src={currentPhoto.driveThumbnail.replace("=s220", "=s1600")}
                alt=""
                className="w-full h-full object-contain ken-burns"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center text-white">
                  <svg className="w-20 h-20 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-lg opacity-70">{currentPhoto.fileName}</p>
                </div>
              </div>
            )}

            {/* Caption overlay */}
            {currentPhoto.caption && (
              <div className="absolute bottom-20 left-0 right-0 text-center">
                <span className="inline-block px-6 py-3 bg-black/60 backdrop-blur-sm rounded-full text-white text-lg">
                  {currentPhoto.caption}
                </span>
              </div>
            )}
          </div>

          {/* Photo counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-sm">
            {(currentIndex % photos.length) + 1} / {photos.length}
          </div>
        </div>
      )}

      {/* Grid Mode */}
      {mode === "grid" && (
        <div className="p-4 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 auto-rows-fr min-h-screen">
          {uploads.map((upload) => (
            <div
              key={upload.id}
              className="relative rounded-lg overflow-hidden bg-gray-900 aspect-square animate-slideUp"
            >
              {upload.driveThumbnail ? (
                <img
                  src={upload.driveThumbnail.replace("=s220", "=s400")}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {upload.mediaType === "video" ? (
                    <svg className="w-8 h-8 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>
              )}
              {upload.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-white text-xs truncate">{upload.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div
        className={`absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-500 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <h1 className="text-white font-bold text-lg">{party.name}</h1>
          <div className="flex items-center gap-3">
            <span className="text-white/60 text-sm">
              {uploads.length} {uploads.length === 1 ? "upload" : "uploads"}
            </span>

            {/* Mode toggle */}
            <button
              onClick={() => setMode(mode === "slideshow" ? "grid" : "slideshow")}
              className="px-3 py-1.5 bg-white/20 text-white rounded-lg text-sm hover:bg-white/30 transition-colors"
            >
              {mode === "slideshow" ? "Grid" : "Slideshow"}
            </button>

            {/* Speed control */}
            {mode === "slideshow" && (
              <select
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="bg-white/20 text-white rounded-lg text-sm px-2 py-1.5 border-none"
              >
                <option value={3000}>Fast (3s)</option>
                <option value={6000}>Normal (6s)</option>
                <option value={10000}>Slow (10s)</option>
                <option value={15000}>Very Slow (15s)</option>
              </select>
            )}

            {/* Shuffle */}
            <button
              onClick={() => setShuffle(!shuffle)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                shuffle
                  ? "bg-white text-black"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              Shuffle
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="px-3 py-1.5 bg-white/20 text-white rounded-lg text-sm hover:bg-white/30 transition-colors"
            >
              {isFullscreen ? "Exit FS" : "Fullscreen"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
