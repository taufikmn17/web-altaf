// app/sitemap.ts
import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://altafstory.my.id";

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/kisah-kita`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9, // Prioritas tinggi karena ini konten utama bucin
    },
    {
      url: `${baseUrl}/destinasi`,
      lastModified: new Date(),
      changeFrequency: "weekly", // Sering update via Sheets
      priority: 0.8,
    },
    {
      url: `${baseUrl}/kuliner`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/game`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];
}
