import {
  ArrowUpRight,
  Globe2,
  Grid3x3,
  HelpCircle,
  Radio,
  Swords,
  UsersRound,
  Zap,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "Game Arcade - Altaf Story",
  description:
    "Mainkan Tap Rush, Snake Duel, Tebak Negara, Sudoku Duel, dan Trivia Blitz online bareng teman — arena game real-time dari Altaf Story.",
  keywords: [
    "game multiplayer online",
    "game party online",
    "game ular online",
    "snake multiplayer",
    "kuis tebak negara",
    "tebak bendera",
    "sudoku online",
    "sudoku multiplayer",
    "game sudoku realtime",
    "kuis trivia online",
    "trivia multiplayer",
    "game kuis realtime",
    "Tap Rush",
    "Snake Duel",
    "Flag Quiz",
    "Sudoku Duel",
    "Trivia Blitz",
    "Altaf Story games",
  ],
  alternates: {
    canonical: "/game",
  },
  openGraph: {
    title: "Game Arcade - Altaf Story",
    description:
      "Tap Rush, Snake Duel, Tebak Negara, Sudoku Duel & Trivia Blitz — main bareng teman secara real-time.",
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
      "Tap Rush, Snake Duel, Tebak Negara, Sudoku Duel & Trivia Blitz — main bareng teman secara real-time.",
    images: ["/assets/img/hero.jpeg"],
  },
};

export default function DaftarGamePage() {
  return (
    <div className="game-hub-shell">
      <Navbar />

      <main className="game-hub-main">
        <div className="game-hub-overline">
          <span /> ALTAF ARCADE <span>05 / ONLINE</span>
        </div>
        <header className="game-hub-heading">
          <p>PLAY TOGETHER</p>
          <h1>
            Room up.
            <br />
            <span>Bring friends.</span>
          </h1>
          <div className="game-hub-underline" />
        </header>

        <div className="game-hub-grid">
          <section className="game-feature">
            <div className="game-feature-art" aria-hidden="true">
              <div className="game-feature-scanlines" />
              <div className="game-feature-target">
                <Zap size={88} strokeWidth={1.5} />
              </div>
              <span className="game-feature-number">15</span>
              <span className="game-feature-art-label">SECONDS / ROUND</span>
              <span className="game-feature-live">
                <i /> LIVE ROOM
              </span>
            </div>
            <div className="game-feature-copy">
              <div className="game-feature-kicker">
                <Radio size={14} /> PARTY GAME / 001
              </div>
              <h2>Tap Rush</h2>
              <p className="game-feature-description">
                Jempol siap? Masuk ke room, tunggu teman, lalu tap secepat
                mungkin dan hindari jebakan.
              </p>
              <div className="game-feature-facts">
                <span>
                  <UsersRound size={16} /> 2—8 pemain
                </span>
                <span>
                  <Zap size={16} /> Real-time
                </span>
              </div>
              <Link href="/game/tap-rush" className="game-feature-cta">
                Buka room <ArrowUpRight size={18} />
              </Link>
            </div>
          </section>

          <section className="game-feature">
            <div className="game-feature-art" aria-hidden="true">
              <div className="game-feature-scanlines" />
              <div className="game-feature-target">
                <Swords size={88} strokeWidth={1.5} />
              </div>
              <span className="game-feature-number">1V1</span>
              <span className="game-feature-art-label">SNAKE / DUEL</span>
              <span className="game-feature-live">
                <i /> LIVE ROOM
              </span>
            </div>
            <div className="game-feature-copy">
              <div className="game-feature-kicker">
                <Radio size={14} /> PARTY GAME / 002
              </div>
              <h2>Snake Duel</h2>
              <p className="game-feature-description">
                Dua ular, satu arena. Rebut buah, hindari tabrakan, dan buat
                lawan menyerah duluan.
              </p>
              <div className="game-feature-facts">
                <span>
                  <UsersRound size={16} /> 2 pemain
                </span>
                <span>
                  <Swords size={16} /> Duel 1v1
                </span>
              </div>
              <Link href="/game/snake-duel" className="game-feature-cta">
                Tantang teman <ArrowUpRight size={18} />
              </Link>
            </div>
          </section>

          <section className="game-feature">
            <div className="game-feature-art" aria-hidden="true">
              <div className="game-feature-scanlines" />
              <div className="game-feature-target">
                <Globe2 size={88} strokeWidth={1.5} />
              </div>
              <span className="game-feature-number">5</span>
              <span className="game-feature-art-label">SOAL / 10 DETIK</span>
              <span className="game-feature-live">
                <i /> LIVE ROOM
              </span>
            </div>
            <div className="game-feature-copy">
              <div className="game-feature-kicker">
                <Radio size={14} /> PARTY GAME / 003
              </div>
              <h2>Tebak Negara</h2>
              <p className="game-feature-description">
                Bendera muncul, tebak negaranya. Jawab salah? Teman tahu. Jawab
                duluan? Semua tahu. Adu cepat & tepat.
              </p>
              <div className="game-feature-facts">
                <span>
                  <UsersRound size={16} /> 2—8 pemain
                </span>
                <span>
                  <Globe2 size={16} /> Kuis real-time
                </span>
              </div>
              <Link href="/game/flag-quiz" className="game-feature-cta">
                Mulai kuis <ArrowUpRight size={18} />
              </Link>
            </div>
          </section>

          <section className="game-feature">
            <div className="game-feature-art" aria-hidden="true">
              <div className="game-feature-scanlines" />
              <div className="game-feature-target">
                <Grid3x3 size={88} strokeWidth={1.5} />
              </div>
              <span className="game-feature-number">9×9</span>
              <span className="game-feature-art-label">SUDOKU / PUZZLE</span>
              <span className="game-feature-live">
                <i /> LIVE ROOM
              </span>
            </div>
            <div className="game-feature-copy">
              <div className="game-feature-kicker">
                <Radio size={14} /> PARTY GAME / 004
              </div>
              <h2>Sudoku Duel</h2>
              <p className="game-feature-description">
                Puzzle sama, siapa cepat & benar mengisi, dia menang. Adu logika
                & ketenangan bareng teman.
              </p>
              <div className="game-feature-facts">
                <span>
                  <UsersRound size={16} /> 2—8 pemain
                </span>
                <span>
                  <Grid3x3 size={16} /> Real-time
                </span>
              </div>
              <Link href="/game/sudoku-duel" className="game-feature-cta">
                Main sudoku <ArrowUpRight size={18} />
              </Link>
            </div>
          </section>

          {/* ---- KARTU BARU: TRIVIA BLITZ ---- */}
          <section className="game-feature">
            <div className="game-feature-art" aria-hidden="true">
              <div className="game-feature-scanlines" />
              <div className="game-feature-target">
                <HelpCircle size={88} strokeWidth={1.5} />
              </div>
              <span className="game-feature-number">7</span>
              <span className="game-feature-art-label">SOAL / 15 DETIK</span>
              <span className="game-feature-live">
                <i /> LIVE ROOM
              </span>
            </div>
            <div className="game-feature-copy">
              <div className="game-feature-kicker">
                <Radio size={14} /> PARTY GAME / 005
              </div>
              <h2>Trivia Blitz</h2>
              <p className="game-feature-description">
                Kuis pilihan ganda umum. Jawab paling cepat & tepat — kalahkan
                teman. Soal dari sains, sejarah, geografi, sampai hiburan.
              </p>
              <div className="game-feature-facts">
                <span>
                  <UsersRound size={16} /> 2—8 pemain
                </span>
                <span>
                  <HelpCircle size={16} /> Kuis real-time
                </span>
              </div>
              <Link href="/game/trivia-blitz" className="game-feature-cta">
                Main trivia <ArrowUpRight size={18} />
              </Link>
            </div>
          </section>
        </div>

        <div className="game-hub-footerline">
          <span>05 GAME DI ARENA</span>
          <span>SEMUA ONLINE</span>
        </div>
      </main>

      <Footer />
    </div>
  );
}
