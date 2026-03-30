import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Magnet Manufacturing Platform",
  description: "Custom photo magnets for consumers and businesses",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Header />
        <main className="min-h-screen">{children}</main>
        <footer className="bg-slate-900 text-white py-8 mt-16">
          <div className="max-w-7xl mx-auto px-4 text-center text-sm text-slate-400">
            © {new Date().getFullYear()} Magnet Manufacturing Platform. All rights reserved.
          </div>
        </footer>
      </body>
    </html>
  );
}
