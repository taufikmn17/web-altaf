import type { Metadata } from "next";
import SnakeDuel from "@/app/components/game/SnakeDuel";

export const metadata: Metadata = {
  title: "Snake Duel Online - Game Multiplayer Altaf Story",
  description:
    "Duel ular real-time 1v1. Buat room, ajak teman, dan buktikan siapa yang bertahan paling lama.",
  alternates: {
    canonical: "/game/snake-duel",
  },
  openGraph: {
    title: "Snake Duel Online - Game Multiplayer Altaf Story",
    description: "Duel ular real-time 1v1 melawan temanmu.",
    url: "/game/snake-duel",
    siteName: "Altaf Story",
    locale: "id_ID",
    type: "website",
  },
};

export default function SnakeDuelPage() {
  return <SnakeDuel />;
}
