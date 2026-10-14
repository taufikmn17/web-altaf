import { ArrowUpRight, Crosshair, Radio, Trophy, UsersRound, WifiOff, Zap } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "Game Arcade - Altaf Story",
  description:
    "Mainkan Tap Rush online bareng teman, atau Orb Blitz offline solo — arena game dari Altaf Story.",
  keywords: [
    "game multiplayer online",
    "game party online",
    "game offline",
    "Tap Rush",
    "Orb Blitz",
    "Altaf Story games",
  ],
  alternates: {
    canonical: "/game",
  },
  openGraph: {
    title: "Game Arcade - Altaf Story",
    description:
      "Tap Rush untuk party online, Orb Blitz untuk blitz solo offline.",
    url: "/game",
    siteName: "Altaf Story",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "/assets/img/hero.jpeg",
        width: 1200,
        height: 630,
        alt: "Arena game Altaf Story",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Game Arcade - Altaf Story",
    description:
      "Tap Rush untuk party online, Orb Blitz untuk blitz solo offline.",
    images: ["/assets/img/hero.jpeg"],
  },
};

export default function DaftarGamePage() {
  return (
    <div className="game-hub-shell">
      <Navbar />

      <main className="game-hub-main">
        <div className="game-hub-overline"><span /> ALTAF ARCADE <span>02 / MIXED</span></div>
        <header className="game-hub-heading">
          <p>PLAY YOUR WAY</p>
          <h1>Room up.<br /><span>Or go solo.</span></h1>
          <div className="game-hub-underline" />
        </header>

        <div className="game-hub-grid">
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

          <section className="game-feature">
            <div className="game-feature-art game-feature-art-offline" aria-hidden="true">
              <div className="game-feature-scanlines" />
              <div className="game-feature-target game-feature-target-orb"><Crosshair size={72} strokeWidth={1.5} /></div>
              <span className="game-feature-number">∞</span>
              <span className="game-feature-art-label">COMBO / ENDLESS</span>
              <span className="game-feature-live game-feature-offline"><i /> OFFLINE</span>
            </div>
            <div className="game-feature-copy">
              <div className="game-feature-kicker"><WifiOff size={14} /> SOLO ARCADE / 002</div>
              <h2>Orb Blitz</h2>
              <p className="game-feature-description">Tap orb sebelum menghilang, jaga combo, dan kejar high score. Tanpa room, tanpa koneksi.</p>
              <div className="game-feature-facts">
                <span><Trophy size={16} /> Local high score</span>
                <span><Crosshair size={16} /> Reaction</span>
              </div>
              <Link href="/game/orb-blitz" className="game-feature-cta game-feature-cta-orange">
                Main sekarang <ArrowUpRight size={18} />
              </Link>
            </div>
          </section>
        </div>

        <div className="game-hub-footerline">
          <span>02 GAME DI ARENA</span>
          <span>ONLINE + OFFLINE</span>
        </div>
      </main>

      <Footer />
    </div>
  );
}
