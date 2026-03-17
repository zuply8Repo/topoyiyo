import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import "./globals.css";
import Providers from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://app.yiyo.studio"),
  title: {
    default: "YiyoStudio",
    template: "%s | YiyoStudio",
  },
  description:
    "Create, review, and approve AI-powered social content in one streamlined workflow.",
  applicationName: "YiyoStudio",
  keywords: [
    "YiyoStudio",
    "AI social content",
    "content workflow",
    "content approval",
    "social media planning",
  ],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://app.yiyo.studio",
    siteName: "YiyoStudio",
    title: "YiyoStudio",
    description:
      "Create, review, and approve AI-powered social content in one streamlined workflow.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "YiyoStudio",
      },
    ],
  },
  icons: {
    icon: [{ url: "/logo/logo_yiyo_simple.svg", type: "image/svg+xml" }],
    shortcut: "/logo/logo_yiyo_simple.svg",
    apple: "/logo/logo_yiyo_simple.svg",
  },
  manifest: "/manifest.webmanifest",
  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClerkProvider
          appearance={{
            theme: shadcn,
          }}
        >
          <Providers>{children}</Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
