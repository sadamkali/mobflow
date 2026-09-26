import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MobiFlow Uganda | Wi-Fi Access Portal",
  description: "Choose an Internet bundle and pay with MTN or Airtel Mobile Money.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
