import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { QueryProvider } from "@/lib/query/provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OralDiagnostic",
  description: "PWA de triaje visual preventivo para feria de investigacion.",
  applicationName: "OralDiagnostic",
  appleWebApp: {
    capable: true,
    title: "OralDiagnostic",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <QueryProvider>{children}</QueryProvider>
        <Toaster richColors closeButton />
      </body>
    </html>
  );
}
