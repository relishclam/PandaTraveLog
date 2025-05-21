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
        {/* Favicon configuration */}
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body className="font-nunito antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
