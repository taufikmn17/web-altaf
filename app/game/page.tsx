import { ArrowUpRight, Radio, UsersRound, Zap } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "Game Multiplayer Online - Altaf Story",
  description:
    "Buat room online, ajak teman, dan mainkan Tap Rush, game multiplayer real-time dari Altaf Story.",
  keywords: [
    "game multiplayer online",
    "game party online",
    "Tap Rush",
    "Altaf Story games",
  ],
  alternates: {
    canonical: "/game",
  },
  openGraph: {
    title: "Game Multiplayer Online - Altaf Story",
    description:
      "Buat room online, ajak teman, dan adu kecepatan tap di Tap Rush.",
    url: "/game",
    siteName: "Altaf Story",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "/assets/img/hero.jpeg",
        width: 1200,
        height: 630,
        alt: "Arena game multiplayer Tap Rush",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Game Multiplayer Online - Altaf Story",
    description:
      "Buat room online, ajak teman, dan adu kecepatan tap di Tap Rush.",
    images: ["/assets/img/hero.jpeg"],
  },
};

export default function DaftarGamePage() {
  return (
    <div className="game-hub-shell">
      <Navbar />

      <main className="game-hub-main">
        <div className="game-hub-overline"><span /> ALTAF ARCADE <span>01 / ONLINE</span></div>
        <header className="game-hub-heading">
          <p>PLAY WITH YOUR PEOPLE</p>
          <h1>Room up.<br /><span>Game on.</span></h1>
          <div className="game-hub-underline" />
        </header>

        <section className="game-feature">
          <div className="game-feature-art" aria-hidden="true">
            <div className="game-feature-scanlines" />
            <div className="game-feature-target"><Zap size={88} strokeWidth={1.5} /></div>
            <span className="game-feature-number">15</span>
            <span className="game-feature-art-label">SECONDS / ROUND</span>
            <span className="game-feature-live"><i /> LIVE ROOM</span>
          </div>
          <div className="game-feature-copy">
            <div className="game-feature-kicker"><Radio size={14} /> PARTY GAME / 001</div>
            <h2>Tap Rush</h2>
            <p className="game-feature-description">Jempol siap? Masuk ke room, tunggu teman, lalu tap secepat mungkin sebelum waktu habis.</p>
            <div className="game-feature-facts">
              <span><UsersRound size={16} /> 2—8 pemain</span>
              <span><Zap size={16} /> Real-time</span>
            </div>
            <Link href="/game/tap-rush" className="game-feature-cta">
              Buka room <ArrowUpRight size={18} />
            </Link>
          </div>
        </section>

        <div className="game-hub-footerline">
          <span>01 GAME DI ARENA</span>
          <span>LEBIH BAIK BARENG</span>
        </div>
      </main>

      <Footer />
    </div>
  );
}
