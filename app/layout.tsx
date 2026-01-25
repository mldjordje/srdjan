import type { Metadata } from "next";
import { Cinzel, Manrope } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import Providers from "./providers";

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
  metadataBase: new URL("https://www.doctorbarber.rs"),
  title: "Doctor Barber Niš | Barber Studio",
  description:
    "Barber studio u Nišu za klasično šišanje, fade i bradu. Online zakazivanje termina bez čekanja.",
  keywords: [
    "frizer Niš",
    "barber Niš",
    "šišanje Niš",
    "fade Niš",
    "fade šišanje",
    "brada",
    "muški frizer Niš",
    "Doctor Barber",
  ],
  alternates: {
    canonical: "https://www.doctorbarber.rs/",
  },
  openGraph: {
    title: "Doctor Barber Niš | Barber Studio",
    description:
      "Barber studio u Nišu za klasično šišanje, fade i bradu. Online zakazivanje termina bez čekanja.",
    url: "https://www.doctorbarber.rs/",
    siteName: "Doctor Barber",
    locale: "sr_RS",
    type: "website",
  },
  manifest: "/manifest.webmanifest",
  themeColor: "#111111",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
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
