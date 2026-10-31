import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://beat-book-six.vercel.app"),
  title: "BeatBook — Beauty, beautifully booked",
  description: "A thoughtful booking experience for independent makeup artists.",
  openGraph: {
    type: "website",
    siteName: "BeatBook",
    title: "BeatBook — Beauty, beautifully booked",
    description: "A thoughtful booking experience for independent makeup artists.",
    url: "https://beat-book-six.vercel.app/",
    images: [{
      url: "https://images.unsplash.com/photo-1758613653823-5baa7dd8073e?auto=format&fit=crop&w=1200&h=630&q=85",
      width: 1200,
      height: 630,
      alt: "A makeup artist preparing a client for a beauty appointment",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "BeatBook — Beauty, beautifully booked",
    description: "A thoughtful booking experience for independent makeup artists.",
    images: ["https://images.unsplash.com/photo-1758613653823-5baa7dd8073e?auto=format&fit=crop&w=1200&h=630&q=85"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

