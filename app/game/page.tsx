import {
  ArrowUpRight,
  ChefHat,
  Flag,
  Gamepad2,
  Globe2,
  Grid3x3,
  HelpCircle,
  Key,
  PawPrint,
  Puzzle,
  Radio,
  Swords,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "Game Arcade - Altaf Story",
  description:
    "Mainkan Two Sides, Snake Duel, Tebak Negara, Sudoku Duel, Trivia Blitz, Trivia Indonesia, Cat & Mouse, Kitchen Rush, dan Scramble Duel — plus jelajahi katalog Free to Game di Altaf Story.",
  keywords: [
    "game multiplayer online",
    "game party online",
    "game co-op online",
    "game 2 pemain",
    "game kerjasama",
    "two sides game",
    "game kunci lubang",
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
    "kuis dunia",
    "kuis indonesia",
    "trivia indonesia",
    "kuis pengetahuan umum",
    "game kejar kejaran",
    "game cat mouse",
    "game kucing tikus",
    "game masak online",
    "game cooking multiplayer",
    "kitchen rush",
    "game scramble",
    "scramble duel",
    "game acak kata",
    "game tebak kata",
    "game susun huruf",
    "game kata online",
    "game tebak kata multiplayer",
    "free to game",
    "katalog game gratis",
    "game multiplayer gratis",
    "Two Sides",
    "Snake Duel",
    "Flag Quiz",
    "Sudoku Duel",
    "Trivia Blitz",
    "Trivia Indonesia",
    "Cat & Mouse",
    "Kitchen Rush",
    "Scramble Duel",
    "Free to Game",
    "Altaf Story games",
  ],
  alternates: {
    canonical: "/game",
  },
  openGraph: {
    title: "Game Arcade - Altaf Story",
    description:
      "Two Sides, Snake Duel, Tebak Negara, Sudoku Duel, Trivia Blitz, Trivia Indonesia, Cat & Mouse, Kitchen Rush, Scramble Duel & katalog Free to Game — main bareng teman secara real-time.",
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
      "Two Sides, Snake Duel, Tebak Negara, Sudoku Duel, Trivia Blitz, Trivia Indonesia, Cat & Mouse, Kitchen Rush, Scramble Duel & katalog Free to Game — main bareng teman secara real-time.",
    images: ["/assets/img/hero.jpeg"],
  },
};

export default function DaftarGamePage() {
  return (
    <div className="game-hub-shell">
      <Navbar />

      <main className="game-hub-main">
        <div className="game-hub-overline">
          <span /> ALTAF ARCADE <span>10 / ONLINE</span>
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
          {/* ---- 001: TWO SIDES ---- */}
          <section className="game-feature">
            <div className="game-feature-art" aria-hidden="true">
              <div className="game-feature-scanlines" />
              <div className="game-feature-target">
                <Key size={88} strokeWidth={1.5} />
              </div>
              <span className="game-feature-number">2P</span>
              <span className="game-feature-art-label">CO-OP / PUZZLE</span>
              <span className="game-feature-live">
                <i /> LIVE ROOM
              </span>
            </div>
            <div className="game-feature-copy">
              <div className="game-feature-kicker">
                <Radio size={14} /> PARTY GAME / 001
              </div>
              <h2>Two Sides</h2>
              <p className="game-feature-description">
                Saling deskripsikan objek rahasia — temanmu harus menebak. Lalu
                gantian. Komunikasi adalah kuncinya!
              </p>
              <div className="game-feature-facts">
                <span>
                  <UsersRound size={16} /> 2 pemain
                </span>
                <span>
                  <Key size={16} /> Co-op puzzle
                </span>
              </div>
              <Link href="/game/two-sides" className="game-feature-cta">
                Main bareng <ArrowUpRight size={18} />
              </Link>
            </div>
          </section>

          {/* ---- 002: CAT & MOUSE ---- */}
          <section className="game-feature">
            <div className="game-feature-art" aria-hidden="true">
              <div className="game-feature-scanlines" />
              <div className="game-feature-target">
                <PawPrint size={88} strokeWidth={1.5} />
              </div>
              <span className="game-feature-number">1V1</span>
              <span className="game-feature-art-label">KEJAR-KEJARAN</span>
              <span className="game-feature-live">
                <i /> LIVE ROOM
              </span>
            </div>
            <div className="game-feature-copy">
              <div className="game-feature-kicker">
                <Radio size={14} /> PARTY GAME / 002
              </div>
              <h2>Cat & Mouse</h2>
              <p className="game-feature-description">
                Satu jadi kucing pengejar, satu jadi tikus yang kabur. Kucing
                lebih cepat, tikus punya waktu. Siapa yang menang?
              </p>
              <div className="game-feature-facts">
                <span>
                  <UsersRound size={16} /> 2 pemain
                </span>
                <span>
                  <PawPrint size={16} /> Kejar-kejaran
                </span>
              </div>
              <Link href="/game/cat-mouse" className="game-feature-cta">
                Tantang teman <ArrowUpRight size={18} />
              </Link>
            </div>
          </section>

          {/* ---- 003: SNAKE DUEL ---- */}
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
                <Radio size={14} /> PARTY GAME / 003
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

          {/* ---- 004: TEBAK NEGARA ---- */}
          <section className="game-feature">
            <div className="game-feature-art" aria-hidden="true">
              <div className="game-feature-scanlines" />
              <div className="game-feature-target">
                <Flag size={88} strokeWidth={1.5} />
              </div>
              <span className="game-feature-number">5</span>
              <span className="game-feature-art-label">SOAL / 10 DETIK</span>
              <span className="game-feature-live">
                <i /> LIVE ROOM
              </span>
            </div>
            <div className="game-feature-copy">
              <div className="game-feature-kicker">
                <Radio size={14} /> PARTY GAME / 004
              </div>
              <h2>Tebak Negara</h2>
              <p className="game-feature-description">
                Bendera muncul, tebak negaranya. Jawab salah? Teman tahu. Jawab
                duluan? Semua tahu. Adu cepat & tepat.
              </p>
              <div className="game-feature-facts">
                <span>
                  <UsersRound size={16} /> 2—4 pemain
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

          {/* ---- 005: SUDOKU DUEL ---- */}
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
                <Radio size={14} /> PARTY GAME / 005
              </div>
              <h2>Sudoku Duel</h2>
              <p className="game-feature-description">
                Puzzle sama, siapa cepat & benar mengisi, dia menang. Adu logika
                & ketenangan bareng teman.
              </p>
              <div className="game-feature-facts">
                <span>
                  <UsersRound size={16} /> 2—4 pemain
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

          {/* ---- 006: TRIVIA BLITZ ---- */}
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
                <Radio size={14} /> PARTY GAME / 006
              </div>
              <h2>Trivia Blitz</h2>
              <p className="game-feature-description">
                Kuis dunia pilihan ganda. Jawab paling cepat & tepat — kalahkan
                teman. Soal dari sains, sejarah, geografi, sampai hiburan.
              </p>
              <div className="game-feature-facts">
                <span>
                  <UsersRound size={16} /> 2—4 pemain
                </span>
                <span>
                  <Globe2 size={16} /> Kuis dunia
                </span>
              </div>
              <Link href="/game/trivia-blitz" className="game-feature-cta">
                Main trivia <ArrowUpRight size={18} />
              </Link>
            </div>
          </section>

          {/* ---- 007: TRIVIA INDONESIA ---- */}
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
                <Radio size={14} /> PARTY GAME / 007
              </div>
              <h2>Trivia Indonesia</h2>
              <p className="game-feature-description">
                Uji wawasan tentang Indonesia — sejarah, budaya, geografi,
                bahasa, dan olahraga. Adu cepat & tepat bareng teman!
              </p>
              <div className="game-feature-facts">
                <span>
                  <UsersRound size={16} /> 2—4 pemain
                </span>
                <span>
                  <HelpCircle size={16} /> Kuis Nusantara
                </span>
              </div>
              <Link href="/game/trivia-indonesia" className="game-feature-cta">
                Main trivia <ArrowUpRight size={18} />
              </Link>
            </div>
          </section>

          {/* ---- 008: KITCHEN RUSH ---- */}
          <section className="game-feature">
            <div className="game-feature-art" aria-hidden="true">
              <div className="game-feature-scanlines" />
              <div className="game-feature-target">
                <ChefHat size={88} strokeWidth={1.5} />
              </div>
              <span className="game-feature-number">2-4</span>
              <span className="game-feature-art-label">CO-OP COOKING</span>
              <span className="game-feature-live">
                <i /> LIVE ROOM
              </span>
            </div>
            <div className="game-feature-copy">
              <div className="game-feature-kicker">
                <Radio size={14} /> PARTY GAME / 008
              </div>
              <h2>Kitchen Rush</h2>
              <p className="game-feature-description">
                Kerja sama masak pesanan sebelum waktu habis. Ambil bahan,
                masak, dan antar ke delivery. Makin cepat, makin tinggi skor!
              </p>
              <div className="game-feature-facts">
                <span>
                  <UsersRound size={16} /> 2—4 pemain
                </span>
                <span>
                  <ChefHat size={16} /> Co-op cooking
                </span>
              </div>
              <Link href="/game/kitchen-rush" className="game-feature-cta">
                Masak bareng <ArrowUpRight size={18} />
              </Link>
            </div>
          </section>

          {/* ---- 009: SCRAMBLE DUEL (GAME BARU) ---- */}
          <section className="game-feature">
            <div className="game-feature-art" aria-hidden="true">
              <div className="game-feature-scanlines" />
              <div className="game-feature-target">
                <Puzzle size={88} strokeWidth={1.5} />
              </div>
              <span className="game-feature-number">1V1</span>
              <span className="game-feature-art-label">ACAK / KATA</span>
              <span className="game-feature-live">
                <i /> LIVE ROOM
              </span>
            </div>
            <div className="game-feature-copy">
              <div className="game-feature-kicker">
                <Radio size={14} /> PARTY GAME / 009
              </div>
              <h2>Scramble Duel</h2>
              <p className="game-feature-description">
                Satu pemain menulis kata rahasia, hurufnya diacak, dan lawan
                harus menebak kata aslinya. Adu cepat & tepat sebelum waktu
                habis!
              </p>
              <div className="game-feature-facts">
                <span>
                  <UsersRound size={16} /> 2 pemain
                </span>
                <span>
                  <Puzzle size={16} /> Tebak kata acak
                </span>
              </div>
              <Link href="/game/scramble-duel" className="game-feature-cta">
                Tantang teman <ArrowUpRight size={18} />
              </Link>
            </div>
          </section>

          {/* ---- 010: FREE TO GAME ---- */}
          <section className="game-feature is-external">
            <div className="game-feature-art" aria-hidden="true">
              <div className="game-feature-scanlines" />
              <div className="game-feature-target">
                <Gamepad2 size={88} strokeWidth={1.5} />
              </div>
              <span className="game-feature-number">100+</span>
              <span className="game-feature-art-label">GAME GRATIS</span>
              <span className="game-feature-live">
                <i /> KATALOG
              </span>
            </div>
            <div className="game-feature-copy">
              <div className="game-feature-kicker">
                <Radio size={14} /> KATALOG GAME / 010
              </div>
              <h2>Free to Game</h2>
              <p className="game-feature-description">
                Jelajahi ratusan game gratis & multiplayer dari seluruh dunia.
                Filter berdasarkan kategori, platform, dan urutkan sesuai
                keinginan.
              </p>
              <div className="game-feature-facts">
                <span>
                  <Gamepad2 size={16} /> 100+ game
                </span>
                <span>
                  <Globe2 size={16} /> Multiplayer
                </span>
              </div>
              <Link href="/game/free-to-game" className="game-feature-cta">
                Jelajahi sekarang <ArrowUpRight size={18} />
              </Link>
            </div>
          </section>
        </div>

        <div className="game-hub-footerline">
          <span>10 GAME DI ARENA</span>
          <span>SEMUA ONLINE</span>
        </div>
      </main>

      <Footer />
    </div>
  );
}
