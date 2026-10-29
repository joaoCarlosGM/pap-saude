import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";

// Redistributable SIL OFL fonts, verified against publisher tarball integrity.
// Build and browsers never contact Google Fonts.
const inter=localFont({src:"./fonts/inter.woff2",variable:"--font-sans",weight:"100 900",display:"swap"});
const geistSans=localFont({src:"./fonts/geist.woff2",variable:"--font-geist-sans",weight:"100 900",display:"swap"});
const geistMono=localFont({src:"./fonts/geist-mono.woff2",variable:"--font-geist-mono",weight:"100 900",display:"swap"});

export const metadata: Metadata = {
  title: "PAP Saúde",
  referrer: "no-referrer",
  description: "prontuário de atendimento pré-natall",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable)}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
