// app/layout.tsx
import type { Metadata } from "next";
import React from "react";
import "./globals.css";
import { Inter } from "next/font/google";

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
        {/* Skip link for keyboard and screen reader users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:top-4 focus:left-4 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-slate-900 focus:shadow focus:outline-none"
        >
          Skip to main content
        </a>

        {children}
      </body>
    </html>
  );
}