import type { Metadata } from "next";
import CatMouse from "@/app/components/game/CatMouse";

export const metadata: Metadata = {
  title: "Cat & Mouse - Game Kejar-kejaran 1v1 - Altaf Story",
  description:
    "Game 1v1 real-time: satu jadi kucing pengejar, satu jadi tikus yang kabur. Kucing lebih cepat, tikus punya waktu!",
  keywords: [
    "game kejar kejaran",
    "game cat mouse",
    "game 1v1 online",
    "game multiplayer 2 pemain",
    "game asah otak",
    "game arcade online",
    "Cat & Mouse",
    "Altaf Story games",
  ],
  alternates: {
    canonical: "/game/cat-mouse",
  },
  openGraph: {
    title: "Cat & Mouse - Game Kejar-kejaran 1v1",
    description:
      "1v1 real-time: kucing vs tikus. Siapa menang? Cepat & tegang!",
    url: "/game/cat-mouse",
    siteName: "Altaf Story",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "/assets/img/hero.jpeg",
        width: 1200,
        height: 630,
        alt: "Cat & Mouse Altaf Story",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cat & Mouse - Game Kejar-kejaran 1v1",
    description:
      "1v1 real-time: kucing vs tikus. Siapa menang? Cepat & tegang!",
    images: ["/assets/img/hero.jpeg"],
  },
};

export default function CatMousePage() {
  return <CatMouse />;
}
