// app/robots.ts
import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://altafstory.my.id"; // GANTI DENGAN DOMAIN ANDA

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Jika Anda memiliki halaman admin atau API rahasia, tambahkan di sini
      disallow: ["/api/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
