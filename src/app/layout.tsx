import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { Providers } from "@/app/providers";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  weight: ["400", "500", "600", "700"],
});

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
      <body className={`${nunito.variable} antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
