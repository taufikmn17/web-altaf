import type { Metadata } from "next";
import OrbBlitzGame from "@/app/components/game/OrbBlitzGame";

export const metadata: Metadata = {
  title: "Orb Blitz Offline - Game Arcade Altaf Story",
  description:
    "Game reaction offline: tap orb sebelum menghilang, rangkai combo, dan kejar high score tanpa perlu koneksi atau room.",
  alternates: {
    canonical: "/game/orb-blitz",
  },
  openGraph: {
    title: "Orb Blitz Offline - Game Arcade Altaf Story",
    description:
      "Tap orb sebelum menghilang. Combo tinggi, high score tersimpan di perangkatmu.",
    url: "/game/orb-blitz",
    siteName: "Altaf Story",
    locale: "id_ID",
    type: "website",
  },
};

export default function OrbBlitzPage() {
  return <OrbBlitzGame />;
}
