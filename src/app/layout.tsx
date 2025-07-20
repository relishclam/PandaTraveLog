import type { Metadata } from "next";
// Remove next/font/google import that might be causing build issues
// import { Nunito } from "next/font/google";
import { Providers } from "@/app/providers";
import "./globals.css";
import { preloadPandaImages } from "@/utils/imagePaths";
import PWAInstaller from "@/components/PWAInstaller";

// Preload panda images on the client side
if (typeof window !== 'undefined') {
  preloadPandaImages();
}

export const metadata: Metadata = {
  title: "PandaTraveLog - Your AI Travel Planner",
  description: "Plan your trips with PO, your friendly travel panda assistant",
  manifest: "/manifest.json",
  themeColor: "#f97316",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PandaTraveLog"
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Add Nunito font using standard link method */}
        <link 
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap" 
          rel="stylesheet"
        />
        {/* PWA Meta Tags */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#f97316" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="PandaTraveLog" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        {/* Favicon configuration */}
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body className="font-nunito antialiased">
        <Providers>
          {children}
          <PWAInstaller />
        </Providers>
      </body>
    </html>
  );
}
