import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: {
    default: "DISASTRA AI - Platform Intelijen & Pemantauan Bencana Indonesia",
    template: "%s | DISASTRA AI",
  },
  description:
    "DISASTRA AI — Platform pemantauan geospasial real-time, simulasi 3D multi-bencana, analisis dampak berbasis Google Gemini AI, dan asisten tanggap darurat mitigasi bencana di Indonesia.",
  keywords: [
    "DISASTRA AI",
    "GeoBencana",
    "BMKG",
    "BNPB",
    "Gempa Bumi",
    "Tsunami",
    "Gunung Berapi",
    "Mitigasi Bencana",
    "Indonesia",
  ],
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

import { ThemeProvider } from "@/context/theme-context";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
              try {
                var t = localStorage.getItem('disastra_theme');
                if (t === 'light') {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                  document.documentElement.setAttribute('data-theme', 'light');
                } else {
                  document.documentElement.classList.remove('light');
                  document.documentElement.classList.add('dark');
                  document.documentElement.setAttribute('data-theme', 'dark');
                }
              } catch (e) {}
            })()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col transition-colors duration-200">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
