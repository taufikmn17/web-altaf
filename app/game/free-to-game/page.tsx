import type { Metadata } from "next";
import FreeToGame from "@/app/components/game/FreeToGame";

export const metadata: Metadata = {
  title: "Free to Game - Katalog Game Gratis - Altaf Story",
  description:
    "Jelajahi katalog game gratis & multiplayer dari seluruh dunia. Filter berdasarkan kategori, platform, dan urutkan sesuai keinginan.",
  keywords: [
    "free to game",
    "game gratis",
    "game multiplayer gratis",
    "game mmorpg gratis",
    "katalog game gratis",
    "game pc gratis",
    "game browser gratis",
    "Altaf Story games",
  ],
  alternates: {
    canonical: "/game/free-to-game",
  },
  openGraph: {
    title: "Free to Game - Katalog Game Gratis - Altaf Story",
    description:
      "Jelajahi katalog game gratis & multiplayer dari seluruh dunia.",
    url: "/game/free-to-game",
    siteName: "Altaf Story",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "/assets/img/hero.jpeg",
        width: 1200,
        height: 630,
        alt: "Free to Game Altaf Story",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free to Game - Katalog Game Gratis - Altaf Story",
    description:
      "Jelajahi katalog game gratis & multiplayer dari seluruh dunia.",
    images: ["/assets/img/hero.jpeg"],
  },
};

export default function FreeToGamePage() {
  return <FreeToGame />;
}
