import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bourbon Chasers Strava Training Championship",
  description: "Heart rate zone-based Strava competition for the Bourbon Chasers training to conquer Ironman 70.3 Chattanooga",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased art-deco-bg">
        {children}
      </body>
    </html>
  );
}
