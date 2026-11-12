import type { Metadata, Viewport } from "next";
import { Outfit, Silkscreen } from "next/font/google";
import { Suspense } from "react";
import { DockFallback } from "@/components/dock";
import { Shell } from "@/components/shell";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin", "latin-ext"],
  variable: "--font-outfit",
  display: "swap",
});

const pixel = Silkscreen({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-pixel",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "OSAKA",
    template: "%s · OSAKA",
  },
  description: "OSAKA imzalı Fabric modu. Minecraft 26.1.2, Java 25 ve Fabric API gerektirir.",
  icons: {
    icon: [{ url: "/icon-192.png", type: "image/png", sizes: "192x192" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: "OSAKA",
    statusBarStyle: "black-translucent",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0c0b0a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" data-scroll-behavior="smooth" className={`${outfit.variable} ${pixel.variable}`}>
      <body>
        <a className="skip" href="#icerik">
          Skip
        </a>
        <Suspense fallback={<DockFallback />}>
          <Shell>{children}</Shell>
        </Suspense>
      </body>
    </html>
  );
}
