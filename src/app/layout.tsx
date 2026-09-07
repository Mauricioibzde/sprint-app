import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./prompt-ui.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap"
});

export const metadata: Metadata = {
  title: "SpriteCut PRO",
  description: "Recorte spritesheets, anime clips e exporte ZIP ou HTML animado."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
