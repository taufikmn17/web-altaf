import type { Metadata } from "next";
import TwoSides from "@/app/components/game/TwoSides";

export const metadata: Metadata = {
  title: "Two Sides - Game Co-op 2 Pemain Altaf Story",
  description:
    "Game co-op real-time 2 pemain: satu lihat kunci, satu lihat lubang. Deskripsikan & cocokkan lewat komunikasi. Kerja sama wajib!",
  keywords: [
    "game co-op online",
    "game 2 pemain",
    "game kerjasama",
    "two sides game",
    "game kunci lubang",
    "game komunikasi",
    "Altaf Story games",
  ],
  alternates: {
    canonical: "/game/two-sides",
  },
  openGraph: {
    title: "Two Sides - Game Co-op 2 Pemain Altaf Story",
    description:
      "Co-op real-time: cocokkan kunci & lubang lewat komunikasi. Butuh kerja sama!",
    url: "/game/two-sides",
    siteName: "Altaf Story",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "/assets/img/hero.jpeg",
        width: 1200,
        height: 630,
        alt: "Two Sides Co-op Game Altaf Story",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Two Sides - Game Co-op 2 Pemain Altaf Story",
    description:
      "Co-op real-time: cocokkan kunci & lubang lewat komunikasi. Butuh kerja sama!",
    images: ["/assets/img/hero.jpeg"],
  },
};

export default function TwoSidesPage() {
  return <TwoSides />;
}
