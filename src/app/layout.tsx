import type { Metadata, Viewport } from "next";
import { Noto_Sans_Arabic } from "next/font/google";
import "./globals.css";

const SITE_URL = "https://kabisni.vercel.app";
const DESCRIPTION =
  "كبسني لعبة تكبيس عربية مجانية في المتصفح: اجمع النقاط، اقضِ على الهورينغ، تحدَّ الزعيم. العب فوراً بدون حساب!";

const arabicFont = Noto_Sans_Arabic({
  subsets: ["arabic"],
  display: "swap",
  variable: "--font-arabic",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FFC000",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "كبسني | Kabisni",
    template: "%s | كبسني Kabisni",
  },
  description: DESCRIPTION,
  authors: [{ name: "Alaa MEKIBES", url: "https://github.com/alaa-mekibes/kabisni" }],
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
  alternates: { canonical: "/" },
  openGraph: {
    title: "كبسني | Kabisni",
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "كبسني Kabisni",
    type: "website",
    locale: "ar",
    images: [
      {
        url: "/img/Kabisni-thumbnail.webp",
        width: 1200,
        height: 630,
        alt: "كبسني | Kabisni",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "كبسني | Kabisni",
    description: DESCRIPTION,
    images: ["/img/Kabisni-thumbnail.webp"],
  },
  icons: { icon: "/img/favicon-32x32.webp", apple: "/img/apple-touch-icon.png" },
  manifest: "/manifest.webmanifest",
  category: "games",
};

function jsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "كبسني | Kabisni",
    applicationCategory: "GameApplication",
    operatingSystem: "Web",
    inLanguage: "ar",
    url: SITE_URL,
    description: DESCRIPTION,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    author: { "@type": "Person", name: "Alaa MEKIBES" },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" suppressHydrationWarning className={arabicFont.variable}>
      <head>
        {/* Preload first-paint gameplay sprites so events never decode mid-frame */}
        <link rel="preload" as="image" href="/img/bg.webp" />
        <link rel="preload" as="image" href="/img/kabisni.webp" />
        <link rel="preload" as="image" href="/img/lahnt.webp" />
        <link rel="preload" as="image" href="/img/Hoarding_Bug_Lethal_Company.webp" />
        {/* Apply persisted lang/theme before paint — no flash on toggle. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var l=JSON.parse(localStorage.getItem("kabisni:lang")||'"ar"');document.documentElement.lang=l==="en"?"en":"ar";if(JSON.parse(localStorage.getItem("kabisni:theme")||'"light"')==="dark")document.documentElement.classList.add("dark")}catch(e){document.documentElement.lang="ar"}`,
          }}
        />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()) }}
        />
        {children}
      </body>
    </html>
  );
}
