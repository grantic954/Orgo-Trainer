import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Orgo 2 Trainer",
  description: "Personal Organic Chemistry 2 practice app with structure drawing, spectra, and an AI tutor.",
};

// Preload heavy assets so the browser starts them in parallel with the HTML/JS
// instead of waiting for a React component to request them. Shaves 1-3 seconds
// off first visit to any page that uses RDKit.
const preloadLinks = (
  <>
    <link rel="preload" as="fetch" href="/RDKit_minimal.wasm" crossOrigin="anonymous" />
  </>
);

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>{preloadLinks}</head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
