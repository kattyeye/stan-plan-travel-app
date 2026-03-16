import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stan Plan — Custom Travel Planning",
  description: "Personalized trip plans built for your group, your vibe, and your budget.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
