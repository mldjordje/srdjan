import type { Metadata } from "next";
import { Cinzel, Manrope } from "next/font/google";
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
  title: "Doctor Barber",
  description: "Premium barber studio u Beogradu.",
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
      </body>
    </html>
  );
}
