import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "YiyoStudio",
    short_name: "YiyoStudio",
    description:
      "Create, review, and approve AI-powered social content in one streamlined workflow.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#111111",
    icons: [
      {
        src: "/logo/logo_yiyo_simple.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/logo/yiyo_logo.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
