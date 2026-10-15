import type { Metadata } from "next";
import TriviaBlitz from "@/app/components/game/TriviaBlitz";

export const metadata: Metadata = {
  title: "Trivia Blitz - Altaf Story",
  description:
    "Kuis pilihan ganda umum real-time. Adu cepat & tepat jawab soal sains, sejarah, geografi, dan hiburan bareng teman.",
  keywords: [
    "kuis online",
    "trivia game",
    "kuis multiplayer",
    "trivia realtime",
    "game tanya jawab",
    "game kuis bareng teman",
    "Altaf Story games",
  ],
  alternates: { canonical: "/game/trivia-blitz" },
  openGraph: {
    title: "Trivia Blitz - Altaf Story",
    description:
      "Adu cepat & tepat jawab soal trivia bareng teman secara real-time.",
    url: "/game/trivia-blitz",
    siteName: "Altaf Story",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "/assets/img/hero.jpeg",
        width: 1200,
        height: 630,
        alt: "Trivia Blitz Altaf Story",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Trivia Blitz - Altaf Story",
    description:
      "Adu cepat & tepat jawab soal trivia bareng teman secara real-time.",
    images: ["/assets/img/hero.jpeg"],
  },
};

export default function TriviaBlitzPage() {
  return <TriviaBlitz />;
}
