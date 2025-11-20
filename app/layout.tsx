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
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
