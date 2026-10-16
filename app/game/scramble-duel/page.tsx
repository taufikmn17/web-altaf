import type { Metadata } from "next";
import ScrambleDuel from "@/app/components/game/ScrambleDuel";

export const metadata: Metadata = {
  title: "Scramble Duel - Game Tebak Kata 2 Pemain - Altaf Story",
  description:
    "Gantian input kata, hurufnya diacak, lawan harus menebak. Game tebak kata real-time 2 pemain — adu kosakata & kecepatan!",
  keywords: [
    "game tebak kata",
    "scramble word",
    "game word puzzle",
    "game 2 pemain online",
    "game adu kata",
    "word game multiplayer",
    "scramble duel",
    "Altaf Story games",
  ],
  alternates: {
    canonical: "/game/scramble-duel",
  },
  openGraph: {
    title: "Scramble Duel - Game Tebak Kata 2 Pemain",
    description:
      "Gantian input kata, hurufnya diacak, lawan harus menebak. Adu kosakata & kecepatan!",
    url: "/game/scramble-duel",
    siteName: "Altaf Story",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "/assets/img/hero.jpeg",
        width: 1200,
        height: 630,
        alt: "Scramble Duel Altaf Story",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Scramble Duel - Game Tebak Kata 2 Pemain",
    description:
      "Gantian input kata, hurufnya diacak, lawan harus menebak. Adu kosakata & kecepatan!",
    images: ["/assets/img/hero.jpeg"],
  },
};

export default function ScrambleDuelPage() {
  return <ScrambleDuel />;
}
