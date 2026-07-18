import type { Metadata, Viewport } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "latin-ext"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Oceanman Edirne | Yeni Nesil Erkek Bakımı",
  description: "Edirne'de saç, sakal, cilt bakımı ve solaryum hizmetleri. Oceanman ile tarzınızı yeniden keşfedin.",
  icons: { icon: "/images/oceanman-logo.jpg", apple: "/images/oceanman-logo.jpg" },
  openGraph: {
    title: "Oceanman Edirne | Yeni Nesil Erkek Bakımı",
    description: "Saç, sakal, bakım ve solaryum için Oceanman Edirne.",
    images: [{ url: "/images/oceanman-barber.jpg", width: 640, height: 640, alt: "Oceanman Edirne" }],
    locale: "tr_TR",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0b1412",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body className={`${manrope.variable} ${playfair.variable}`}>{children}</body>
    </html>
  );
}
