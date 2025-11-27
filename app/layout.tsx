import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { CITY_CONFIG } from "@/lib/cityConfig";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: `${CITY_CONFIG.displayName} – Financial Transparency Dashboard`,
  description: CITY_CONFIG.tagline,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
