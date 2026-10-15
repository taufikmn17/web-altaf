import type { Metadata } from "next";
import TapRushGame from "@/app/components/game/TapRushGame";

export const metadata: Metadata = {
  title: "Tap Battle 1v1 - Game Multiplayer Altaf Story",
  description:
    "Adu kecepatan tap 1v1 secara real-time. Gantian giliran, siapa duluan sampai 20 poin menang. Tap saat bukan giliran = stun!",
  keywords: [
    "tap battle",
    "game tap 1v1",
    "game multiplayer tap",
    "duel tap online",
    "tap rush",
    "game party online",
    "Altaf Story games",
  ],
  alternates: {
    canonical: "/game/tap-rush",
  },
  openGraph: {
    title: "Tap Battle 1v1 - Altaf Story",
    description:
      "Adu kecepatan tap 1v1 real-time. Gantian giliran, siapa cepat dia menang.",
    url: "/game/tap-rush",
    siteName: "Altaf Story",
    locale: "id_ID",
    type: "website",
  },
};

export default function TapRushPage() {
  return <TapRushGame />;
}
