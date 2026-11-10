import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { getAssemblySettings } from "@/lib/assembly";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
  preload: false,
});

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getAssemblySettings();
  return {
    title: {
      template: `%s · ${settings.assemblyName}`,
      default: `${settings.assemblyName} · Finance`,
    },
    description: "Finance and custody system for the local assembly.",
    robots: {
      index: false,
      follow: false,
    },
    icons: {
      icon: "/icon.svg",
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2B5340",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-page text-text antialiased">
        {children}
      </body>
    </html>
  );
}
