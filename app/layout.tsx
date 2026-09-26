import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MobiFlow Uganda | Mobile Money Payments",
  description: "Simple MTN and Airtel Mobile Money payments in Uganda.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
