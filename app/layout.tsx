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
      <body className="min-h-full flex flex-col" style={{ background: 'var(--ocean-950)' }}>
        <header
          className="border-b"
          style={{ background: 'var(--ocean-900)', borderColor: 'var(--ocean-800)' }}
        >
          <div className="mx-auto flex max-w-[1600px] items-center gap-8 px-6 py-3">
            <span className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--ocean-300)' }}>
              CFB 27 Tracker
            </span>
            <nav className="flex gap-1 text-sm">
              <NavLink href="/">Dashboard</NavLink>
              <NavLink href="/charts">Charts</NavLink>
              <NavLink href="/import">Import</NavLink>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
      style={{ color: 'var(--ocean-300)' }}
      // hover handled via className
    >
      {children}
    </Link>
  );
}
