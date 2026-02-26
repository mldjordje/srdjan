import type { Metadata } from "next";

export const metadata: Metadata = {
  manifest: "/manifest-admin.webmanifest",
  icons: {
    icon: "/icons/icon-512-novilogo.png",
    apple: "/apple-touch-icon-novilogo.png",
  },
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
