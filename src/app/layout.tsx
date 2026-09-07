import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rosie Atelier",
  description: "Pattern, design, creativity and lifestyle.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}