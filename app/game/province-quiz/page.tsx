import type { Metadata } from "next";
import ProvinceQuiz from "@/app/components/game/ProvinceQuiz";

export const metadata: Metadata = {
  title: "Tebak Lambang Daerah - Altaf Story",
  description:
    "Tebak nama provinsi dari lambangnya. Main real-time bareng teman, adu cepat & tepat. 38 provinsi Indonesia.",
  keywords: [
    "tebak lambang provinsi",
    "kuis lambang daerah",
    "game provinsi indonesia",
    "tebak lambang daerah online",
    "kuis multiplayer indonesia",
    "Altaf Story games",
  ],
  alternates: { canonical: "/game/province-quiz" },
  openGraph: {
    title: "Tebak Lambang Daerah - Altaf Story",
    description:
      "Tebak nama provinsi dari lambangnya, main real-time bareng teman.",
    url: "/game/province-quiz",
    siteName: "Altaf Story",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "/assets/img/hero.jpeg",
        width: 1200,
        height: 630,
        alt: "Tebak Lambang Daerah Altaf Story",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tebak Lambang Daerah - Altaf Story",
    description:
      "Tebak nama provinsi dari lambangnya, main real-time bareng teman.",
    images: ["/assets/img/hero.jpeg"],
  },
};

export default function ProvinceQuizPage() {
  return <ProvinceQuiz />;
}
