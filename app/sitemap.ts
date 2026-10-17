// app/sitemap.ts
import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = new URL("https://www.altafstory.my.id");
  const pages = [
    "/",
    "/kisah-kita",
    "/destinasi",
    "/kuliner",
    "/game",
  ];

  return pages.map((page) => ({
    url: new URL(page, baseUrl).toString(),
  }));
}
