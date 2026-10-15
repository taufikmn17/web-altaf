import type { Metadata } from "next";
import TriviaIndonesia from "@/app/components/game/TriviaIndonesia";

export const metadata: Metadata = {
  title: "Trivia Indonesia - Kuis Pengetahuan Indonesia - Altaf Story",
  description:
    "Kuis pengetahuan umum Indonesia: sejarah, budaya, geografi, bahasa, olahraga. Main multiplayer real-time bareng teman.",
  keywords: [
    "kuis indonesia",
    "trivia indonesia",
    "kuis pengetahuan umum",
    "kuis sejarah indonesia",
    "kuis budaya indonesia",
    "kuis geografi indonesia",
    "game kuis online",
    "game multiplayer indonesia",
    "Trivia Indonesia",
    "Altaf Story games",
  ],
  alternates: {
    canonical: "/game/trivia-indonesia",
  },
  openGraph: {
    title: "Trivia Indonesia - Kuis Pengetahuan Indonesia",
    description:
      "Adu wawasan tentang Indonesia — sejarah, budaya, geografi. Main bareng teman secara real-time.",
    url: "/game/trivia-indonesia",
    siteName: "Altaf Story",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "/assets/img/hero.jpeg",
        width: 1200,
        height: 630,
        alt: "Trivia Indonesia Altaf Story",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Trivia Indonesia - Kuis Pengetahuan Indonesia",
    description:
      "Adu wawasan tentang Indonesia — sejarah, budaya, geografi. Main bareng teman secara real-time.",
    images: ["/assets/img/hero.jpeg"],
  },
};

export default function TriviaIndonesiaPage() {
  return <TriviaIndonesia />;
}
