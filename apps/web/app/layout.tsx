import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { SIMULATOR_SUMMARY } from "@/lib/simulator/config";
import Script from "next/script";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://hud.xyz"),
  title: {
    default: "hud.xyz",
    template: "%s | hud.xyz",
  },
  description: SIMULATOR_SUMMARY,
  applicationName: "hud.xyz",
};
const archivo = Archivo({ subsets: ["latin"], variable: "--font-sans" });

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", archivo.variable, jetbrainsMono.variable, "font-sans")}
    >
      <body className="flex min-h-svh flex-col bg-background">
        <NuqsAdapter>{children}</NuqsAdapter>
        <Toaster />
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  );
}
