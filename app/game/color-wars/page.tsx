import type { Metadata } from "next";
import ColorWars from "@/app/components/game/ColorWars";

export const metadata: Metadata = {
  title: "Color Wars - Game Rebut Wilayah 2 Pemain - Altaf Story",
  description:
    "Rebut wilayah dengan warna! Game 2 pemain real-time — gerak bebas, warnai kotak, dan kuasai grid lebih banyak dari lawan.",
  keywords: [
    "game rebut wilayah",
    "color wars",
    "game 2 pemain online",
    "game multiplayer cepat",
    "game warna online",
    "game pvp simple",
    "Altaf Story games",
  ],
  alternates: {
    canonical: "/game/color-wars",
  },
  openGraph: {
    title: "Color Wars - Game Rebut Wilayah 2 Pemain",
    description:
      "Rebut wilayah dengan warna! Game 2 pemain real-time — siapa paling banyak kuasai grid, dia menang.",
    url: "/game/color-wars",
    siteName: "Altaf Story",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "/assets/img/hero.jpeg",
        width: 1200,
        height: 630,
        alt: "Color Wars Altaf Story",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Color Wars - Game Rebut Wilayah 2 Pemain",
    description:
      "Rebut wilayah dengan warna! Game 2 pemain real-time — siapa paling banyak kuasai grid, dia menang.",
    images: ["/assets/img/hero.jpeg"],
  },
};

export default function ColorWarsPage() {
  return <ColorWars />;
}
