import type { Metadata } from "next";
import ScrambleDuel from "@/app/components/game/ScrambleDuel";

export const metadata: Metadata = {
  title: "Scramble Duel - Game Tebak Kata Acak 2 Pemain - Altaf Story",
  description:
    "Input kata, acak hurufnya, lawan harus menebak. 6 sesi — 3x kasih kata, 3x menebak. Siapa paling banyak benar, menang!",
  keywords: [
    "scramble duel",
    "game acak kata",
    "game tebak kata",
    "game susun huruf",
    "game kata online",
    "game tebak kata multiplayer",
    "game 2 pemain online",
  ],
  alternates: { canonical: "/game/scramble-duel" },
  openGraph: {
    title: "Scramble Duel - Game Tebak Kata Acak 2 Pemain",
    description:
      "Input kata, acak hurufnya, lawan harus menebak. 3x kasih kata, 3x menebak.",
    url: "/game/scramble-duel",
    siteName: "Altaf Story",
    locale: "id_ID",
    type: "website",
  },
};

export default function ScrambleDuelPage() {
  return <ScrambleDuel />;
}
