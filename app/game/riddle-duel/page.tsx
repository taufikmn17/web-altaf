import type { Metadata } from "next";
import RiddleDuel from "@/app/components/game/RiddleDuel";

export const metadata: Metadata = {
  title: "Teka-Teki Duel - Altaf Story",
  description:
    "Adu cepat jawab teka-teki online bareng teman. Soal muncul acak, yang benar duluan dapat poin. Main real-time di Altaf Arcade.",
  keywords: [
    "game teka-teki online",
    "riddle game multiplayer",
    "game kuis online",
    "tebak teka-teki",
    "game bareng teman",
    "riddle duel",
    "Altaf Story games",
  ],
  alternates: {
    canonical: "/game/riddle-duel",
  },
  openGraph: {
    title: "Teka-Teki Duel - Altaf Story",
    description:
      "Jawab teka-teki paling cepat dan kalahkan temanmu. Game real-time dari Altaf Arcade.",
    url: "/game/riddle-duel",
    siteName: "Altaf Story",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "/assets/img/hero.jpeg",
        width: 1200,
        height: 630,
        alt: "Teka-Teki Duel Altaf Story",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Teka-Teki Duel - Altaf Story",
    description:
      "Jawab teka-teki paling cepat dan kalahkan temanmu. Game real-time dari Altaf Arcade.",
    images: ["/assets/img/hero.jpeg"],
  },
};

export default function RiddleDuelPage() {
  return <RiddleDuel />;
}
