import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UK Wind Forecast Monitor",
  description: "Monitor UK national wind power generation vs. forecasts (January 2024)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
