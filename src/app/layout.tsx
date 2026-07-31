import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

// Display face — warm, editorial serif. Gives the product an "invitation" feel
// rather than the default system-font look.
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
});

// UI face — neutral and highly legible at small sizes.
const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PartySnap — Collect Photos & Videos via QR Code",
  description:
    "Let your guests share photos and videos at your event. No app needed — just scan a QR code!",
};

export const viewport: Viewport = {
  themeColor: "#1A1613",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
