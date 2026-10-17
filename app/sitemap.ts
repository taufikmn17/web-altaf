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
    "/game/cat-mouse",
    "/game/flag-quiz",
    "/game/free-to-game",
    "/game/kitchen-rush",
    "/game/scramble-duel",
    "/game/snake-duel",
    "/game/sudoku-duel",
    "/game/trivia-blitz",
    "/game/trivia-indonesia",
    "/game/two-sides",
  ];

  return pages.map((page) => ({
    url: new URL(page, baseUrl).toString(),
  }));
}
