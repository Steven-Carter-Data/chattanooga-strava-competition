import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ironman 70.3 Training Championship",
  description: "Gamified HR-zone-based Strava competition for Ironman 70.3 training",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
