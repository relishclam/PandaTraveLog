import type { Metadata } from "next";
// Remove next/font/google import that might be causing build issues
// import { Nunito } from "next/font/google";
import { Providers } from "@/app/providers";
import "./globals.css";

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
      </head>
      <body className="font-nunito antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
