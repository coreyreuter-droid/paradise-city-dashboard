// app/layout.tsx
import type { Metadata } from "next";
import React from "react";
import "./globals.css";
import { Inter } from "next/font/google";
import { CsrfProvider } from "@/components/CsrfProvider";
import { Analytics } from '@vercel/analytics/react';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "CiviPortal – Financial Transparency",
  description:
    "Public-facing financial transparency portals for cities, counties, and local governments.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
        >
          Skip to main content
        </a>
        <CsrfProvider>
          <main id="main-content">{children}</main>
        </CsrfProvider>
        <Analytics />
      </body>
    </html>
  );
}