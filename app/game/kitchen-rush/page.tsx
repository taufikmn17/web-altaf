import type { Metadata } from "next";
import KitchenRush from "@/app/components/game/KitchenRush";

export const metadata: Metadata = {
  title: "Kitchen Rush - Game Masak Multiplayer - Altaf Story",
  description:
    "Kerja sama tim masak pesanan sebelum waktu habis. Ambil bahan, masak, dan antar! Game multiplayer co-op real-time.",
  keywords: [
    "game masak online",
    "game cooking multiplayer",
    "game co-op online",
    "kitchen rush",
    "game overcooked online",
    "game 4 pemain online",
    "Altaf Story games",
  ],
  alternates: {
    canonical: "/game/kitchen-rush",
  },
  openGraph: {
    title: "Kitchen Rush - Game Masak Multiplayer",
    description:
      "Kerja sama tim masak pesanan sebelum waktu habis. Game multiplayer co-op real-time!",
    url: "/game/kitchen-rush",
    siteName: "Altaf Story",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "/assets/img/hero.jpeg",
        width: 1200,
        height: 630,
        alt: "Kitchen Rush Altaf Story",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kitchen Rush - Game Masak Multiplayer",
    description:
      "Kerja sama tim masak pesanan sebelum waktu habis. Game multiplayer co-op real-time!",
    images: ["/assets/img/hero.jpeg"],
  },
};

export default function KitchenRushPage() {
  return <KitchenRush />;
}
