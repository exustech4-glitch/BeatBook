import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BeatBook — Beauty, beautifully booked",
  description: "A thoughtful booking experience for independent makeup artists.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
