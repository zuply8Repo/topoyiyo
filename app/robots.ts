import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: "https://app.yiyo.studio/sitemap.xml",
    host: "https://app.yiyo.studio",
  };
}
