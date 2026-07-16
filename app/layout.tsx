import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Nunito } from "next/font/google";
import "./globals.css";
import { AuthGate } from "@/components/AuthGate";
import { Nav } from "@/components/Nav";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SkinTwin",
  description: "AI skincare tracking, habit insights, and future-aging simulation.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={nunito.variable}>
      <body className={nunito.className}>
        <AuthGate>
          <Nav />
          <main className="mx-auto min-h-screen max-w-6xl px-4 py-8">{children}</main>
        </AuthGate>
      </body>
    </html>
  );
}
