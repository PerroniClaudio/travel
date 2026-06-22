import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Japan Travel Planner",
  description: "Mappe, luoghi e itinerari per Tokyo, Kyoto, Osaka e altro.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col overflow-hidden">{children}</body>
    </html>
  );
}
