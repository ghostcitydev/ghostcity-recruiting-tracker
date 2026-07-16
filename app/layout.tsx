import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "CFB 27 Dynasty Tracker",
  description: "Track team overalls, recruiting, transfers, and recruiting classes across your CFB 27 dynasty.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        <header className="border-b border-zinc-800 bg-zinc-900/60">
          <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
            <span className="font-semibold tracking-tight text-zinc-100">CFB 27 Dynasty Tracker</span>
            <nav className="flex gap-4 text-sm text-zinc-400">
              <Link href="/" className="hover:text-zinc-100">Dashboard</Link>
              <Link href="/charts" className="hover:text-zinc-100">Charts</Link>
              <Link href="/import" className="hover:text-zinc-100">Import Save</Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
