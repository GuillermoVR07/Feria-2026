import type { MetadataRoute } from "next";

const appName = process.env.NEXT_PUBLIC_APP_NAME || "OralDiagnostic";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${appName} MVP`,
    short_name: appName,
    description:
      "PWA de triaje visual preventivo para feria de investigacion. No emite diagnostico medico.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f8fafc",
    theme_color: "#0f766e",
    categories: ["health", "education", "medical"],
    lang: "es",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
