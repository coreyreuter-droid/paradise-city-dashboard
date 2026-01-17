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
        <CsrfProvider>
          {children}
        </CsrfProvider>
        <Analytics />
      </body>
    </html>
  );
}