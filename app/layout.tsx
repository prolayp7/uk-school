import type { Metadata } from "next";
import { connection } from "next/server";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "School website",
    template: "%s | School website",
  },
  description: "Information and updates from the school.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await connection();
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
