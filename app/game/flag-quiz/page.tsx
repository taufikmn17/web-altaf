import type { Metadata } from "next";
import FlagQuiz from "@/app/components/game/FlagQuiz";

export const metadata: Metadata = {
  title: "Tebak Negara Online - Game Multiplayer Altaf Story",
  description:
    "Kuis tebak bendera negara real-time. Buat room, ajak teman, dan buktikan siapa paling cepat menebak.",
  alternates: {
    canonical: "/game/flag-quiz",
  },
  openGraph: {
    title: "Tebak Negara Online - Game Multiplayer Altaf Story",
    description: "Kuis tebak bendera 5 soal, 10 detik per soal, multiplayer.",
    url: "/game/flag-quiz",
    siteName: "Altaf Story",
    locale: "id_ID",
    type: "website",
  },
};

export default function FlagQuizPage() {
  return <FlagQuiz />;
}
