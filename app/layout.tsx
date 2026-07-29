import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { AppChrome } from "@/components/AppChrome";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "SkinTwin",
  description: "AI skincare tracking, habit insights, and future-aging simulation.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${fraunces.variable}`}>
      <body className={dmSans.className}>
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
