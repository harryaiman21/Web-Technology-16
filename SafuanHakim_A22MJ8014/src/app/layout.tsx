import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DHL Incident Reporting MVP",
  description: "Collect, triage, assign, and report support incidents with UiPath automation."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
