import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DemoProvider } from "@/lib/store";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Spazio — See your room furnished",
  description:
    "See your room furnished with real, purchasable furniture. Spazio class demo.",
};

export const viewport: Viewport = {
  themeColor: "#14342B",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        <DemoProvider>
          <SiteHeader />
          <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6">
            {children}
          </main>
          <footer className="border-t border-forest-900/10 px-4 py-6 text-center text-xs text-forest-900/45">
            Spazio · class demo · Bogotá · prices in COP · payments are simulated
          </footer>
        </DemoProvider>
      </body>
    </html>
  );
}
