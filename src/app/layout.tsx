import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TradeOS — Personal Trading Operating System",
  description: "Track trades, monitor performance, analyze mistakes, and grow your trading account with discipline.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
