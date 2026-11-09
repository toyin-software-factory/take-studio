import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Take Studio",
  description: "Upload a raw green screen take and get back a YouTube ready cut.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
