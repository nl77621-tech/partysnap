"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PageLoader, QrIcon, CameraIcon, TvIcon } from "@/components/Icons";

const FEATURES = [
  {
    Icon: QrIcon,
    title: "Print & place",
    desc: "Every party gets its own QR code and printable table tents.",
  },
  {
    Icon: CameraIcon,
    title: "Guests just scan",
    desc: "No app, no account, no friction. The camera roll opens instantly.",
  },
  {
    Icon: TvIcon,
    title: "Watch it fill up",
    desc: "Photos land in your Drive and on the big screen as they arrive.",
  },
];

// Decorative photo tiles fanned behind the scan card. Tinted gradients stand in
// for real photography so the hero needs no image assets.
const TILES = [
  { rotate: -14, x: -132, y: 16, from: "#F4785C", to: "#F9B38C" },
  { rotate: 9, x: 138, y: -10, from: "#7C6BF0", to: "#B9A6F5" },
  { rotate: -5, x: 96, y: 116, from: "#2FA98A", to: "#8FD9BE" },
];

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) router.replace("/dashboard");
  }, [session, router]);

  if (status === "loading") return <PageLoader />;

  return (
    <div className="relative min-h-screen overflow-hidden bg-paper">
      {/* Warm ambient glows — keep the large cream field from reading as flat */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 h-[38rem] w-[38rem] rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(244,120,92,0.30), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-52 -right-32 h-[34rem] w-[34rem] rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(124,107,240,0.26), transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-6">
        {/* Nav */}
        <header className="flex items-center justify-between py-7">
          <span className="wordmark">PartySnap</span>
          <button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="btn-ghost"
          >
            Sign in
          </button>
        </header>

        {/* Hero */}
        <main className="grid items-center gap-16 pb-24 pt-10 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pt-16">
          <div className="animate-rise-in">
            <p className="eyebrow mb-5">Photo collection for events</p>

            <h1 className="font-display text-[clamp(2.75rem,6vw,4.5rem)] font-semibold leading-[0.98] tracking-[-0.03em] text-ink-900">
              Every photo
              <br />
              from your party.
              <br />
              <em className="italic text-accent-500">In one place.</em>
            </h1>

            <p className="mt-7 max-w-md text-lg leading-relaxed text-ink-600">
              Guests scan a QR code and their photos and videos land straight in
              your Google Drive — and on the big screen — as the night happens.
            </p>

            <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <button
                onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                className="btn-primary btn-lg w-full sm:w-auto"
              >
                <GoogleMark />
                Continue with Google
              </button>
              <p className="text-sm text-ink-500">
                Free to start · No app for guests
              </p>
            </div>
          </div>

          {/* Hero visual */}
          <div className="relative hidden h-[26rem] items-center justify-center lg:flex">
            {TILES.map((t, i) => (
              <div
                key={i}
                aria-hidden
                className="absolute h-40 w-32 rounded-2xl border-4 border-white shadow-lift"
                style={{
                  transform: `translate(${t.x}px, ${t.y}px) rotate(${t.rotate}deg)`,
                  background: `linear-gradient(150deg, ${t.from}, ${t.to})`,
                }}
              />
            ))}

            {/* Scan card */}
            <div className="relative z-10 w-56 -rotate-3 rounded-3xl bg-white p-6 shadow-float">
              <div className="grid place-items-center rounded-2xl bg-ink-900 p-5">
                <QrGlyph />
              </div>
              <p className="mt-4 text-center font-display text-lg font-semibold text-ink-900">
                Scan to share
              </p>
              <p className="text-center text-xs text-ink-500">
                partysnap.app/upload
              </p>
            </div>
          </div>
        </main>

        {/* Features */}
        <section className="grid gap-5 border-t border-ink-200/70 py-16 md:grid-cols-3">
          {FEATURES.map(({ Icon, title, desc }, i) => (
            <div
              key={title}
              className="animate-rise-in"
              style={{ animationDelay: `${100 + i * 90}ms` }}
            >
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-ink-900 text-paper">
                <Icon className="h-[22px] w-[22px]" />
              </div>
              <h3 className="mb-1.5 text-lg font-semibold text-ink-900">
                {title}
              </h3>
              <p className="text-[15px] leading-relaxed text-ink-600">{desc}</p>
            </div>
          ))}
        </section>

        <footer className="border-t border-ink-200/70 py-8 text-sm text-ink-500">
          PartySnap — photos go straight to the host&apos;s Google Drive.
        </footer>
      </div>
    </div>
  );
}

// Decorative QR stand-in for the hero. Deterministic (no RNG at render) so
// server and client markup match.
const QR_MODULES = (() => {
  const SIZE = 25;
  const inFinder = (x: number, y: number) =>
    (x < 8 && y < 8) || (x > SIZE - 9 && y < 8) || (x < 8 && y > SIZE - 9);
  const cells: [number, number][] = [];
  let seed = 1337;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      if (!inFinder(x, y) && seed % 100 < 45) cells.push([x, y]);
    }
  }
  return { SIZE, cells };
})();

function QrGlyph() {
  const { SIZE, cells } = QR_MODULES;
  const finders: [number, number][] = [
    [0, 0],
    [SIZE - 7, 0],
    [0, SIZE - 7],
  ];

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="h-24 w-24"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#FAF7F2" />
      ))}
      {finders.map(([fx, fy]) => (
        <g key={`${fx}-${fy}`} fill="none" stroke="#FAF7F2">
          <rect x={fx + 0.5} y={fy + 0.5} width="6" height="6" strokeWidth="1" />
          <rect x={fx + 2} y={fy + 2} width="3" height="3" fill="#FAF7F2" stroke="none" />
        </g>
      ))}
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
