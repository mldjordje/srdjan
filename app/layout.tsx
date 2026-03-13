import type { Metadata, Viewport } from "next";
import { Cinzel, Manrope } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import Providers from "./providers";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.frizerskisalonsrdjan.com";

const displayFont = Cinzel({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-display",
});

const bodyFont = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Frizerski salon Srdjan | Zakazivanje",
  description:
    "Online zakazivanje termina za Frizerski salon Srdjan, sa kalendarima po radniku i upravljanjem smenama.",
  keywords: ["frizerski salon", "zakazivanje", "srdjan", "sisanje", "fade", "brada", "termini"],
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: "Frizerski salon Srdjan | Zakazivanje",
    description: "Aplikacija za zakazivanje termina sa smenama i kalendarima po radniku.",
    url: siteUrl,
    siteName: "Salon Srdjan",
    locale: "sr_RS",
    type: "website",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon-512-novilogo.png",
    apple: "/apple-touch-icon-novilogo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#111111",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sr" data-theme="luxury">
      <body className={`${displayFont.variable} ${bodyFont.variable}`}>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
