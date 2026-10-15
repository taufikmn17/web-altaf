import type { Metadata } from "next";
import TapRushGame from "@/app/components/game/TapRushGame";

export const metadata: Metadata = {
  title: "Tap Rush Online - Game Multiplayer Altaf Story",
  description:
    "Buat room, ajak teman, dan adu kecepatan tap dalam game party online real-time Tap Rush.",
  alternates: {
    canonical: "/game/tap-rush",
  },
  openGraph: {
    title: "Tap Rush Online - Game Multiplayer Altaf Story",
    description: "Ajak teman ke room online dan adu kecepatan tap.",
    url: "/game/tap-rush",
    siteName: "Altaf Story",
    locale: "id_ID",
    type: "website",
  },
};

export default function TapRushPage() {
  return <TapRushGame />;
}
