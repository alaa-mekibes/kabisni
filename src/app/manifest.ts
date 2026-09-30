import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "كبسني | Kabisni",
    short_name: "Kabisni",
    description:
      "كبسني لعبة ويب إدمانية! اجمع النقاط، حارب حشرات الهورينغ، أنقذ صديقك لهنت، وواجه البوس الشرير في عالم رمادي مليء بالتحديات.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    dir: "rtl",
    lang: "ar",
    background_color: "#ffffff",
    theme_color: "#FFC000",
    icons: [
      { src: "/img/favicon-32x32.webp", sizes: "32x32", type: "image/webp" },
      { src: "/img/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/img/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/img/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
