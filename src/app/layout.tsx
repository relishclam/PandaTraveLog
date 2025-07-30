import type { Metadata } from "next";
// Remove next/font/google import that might be causing build issues
// import { Nunito } from "next/font/google";
import { Providers } from "@/app/providers";
import "./globals.css";
import { preloadPandaImages } from "@/utils/imagePaths";

// Preload panda images on the client side
if (typeof window !== 'undefined') {
  preloadPandaImages();
}

export const metadata: Metadata = {
  title: "PandaTraveLog - Your AI Travel Planner",
  description: "Plan your trips with PO, your friendly travel panda assistant",
  manifest: "/manifest.json",
  applicationName: "PandaTraveLog",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PandaTraveLog",
    startupImage: [
      '/images/logo/apple-icon-180x180.png'
    ]
  },
  formatDetection: {
    telephone: true
  },
  themeColor: "#f97316",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover",
  icons: {
    icon: [
      { url: "/images/logo/logo-icon.png", sizes: "256x256", type: "image/png" },
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
    ],
    shortcut: ["/images/logo/logo-icon.png"]
  }
};

export function generateViewport() {
  return {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: '#f97316'
  }
}

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
        {/* PWA and Favicon Configuration */}
        <meta name="theme-color" content="#f97316" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="PandaTraveLog" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="font-nunito">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
