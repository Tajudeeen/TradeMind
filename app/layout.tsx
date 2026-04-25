import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TradeMind — Onchain AI Agent",
  description: "Personal onchain AI agent that learns from your trading behavior",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          height: "100vh",
          overflow: "hidden",
          background: "#09090b",
          color: "#f4f4f5",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}