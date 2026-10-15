import type { Metadata } from "next";
import SudokuDuel from "@/app/components/game/SudokuDuel";

export const metadata: Metadata = {
  title: "Sudoku Duel - Altaf Story",
  description:
    "Adu cepat selesaikan Sudoku bareng teman. Puzzle sama, siapa cepat & benar menang. Main real-time di Altaf Arcade.",
  keywords: [
    "sudoku online",
    "sudoku multiplayer",
    "game sudoku realtime",
    "main sudoku bareng teman",
    "sudoku duel",
    "Altaf Story games",
  ],
  alternates: {
    canonical: "/game/sudoku-duel",
  },
  openGraph: {
    title: "Sudoku Duel - Altaf Story",
    description: "Adu cepat selesaikan Sudoku bareng teman secara real-time.",
    url: "/game/sudoku-duel",
    siteName: "Altaf Story",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "/assets/img/hero.jpeg",
        width: 1200,
        height: 630,
        alt: "Sudoku Duel Altaf Story",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sudoku Duel - Altaf Story",
    description: "Adu cepat selesaikan Sudoku bareng teman secara real-time.",
    images: ["/assets/img/hero.jpeg"],
  },
};

export default function SudokuDuelPage() {
  return <SudokuDuel />;
}
