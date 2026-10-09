import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

interface GameItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  path: string;
  status: "Tersedia" | "Coming Soon";
}

export const metadata: Metadata = {
  title: "Arsip Mini Games - Altaf Story",
  description: "Kumpulan mini games seru dan interaktif untuk dimainkan.",
};

// Daftar game yang tersedia
const gameList: GameItem[] = [
  {
    id: "game-kicau",
    title: "Tangkap Burung Yuks! 🐦",
    description:
      "Uji kecepatan refleksmu menangkap burung sebanyak-banyaknya sebelum waktu habis dan raih skor tertinggi!",
    icon: "🎯",
    path: "/game/gamekicau",
    status: "Tersedia",
  },
  {
    id: "game-labirin",
    title: "The Love Journey / Labirin Jadian 🗺️",
    description:
      "Bantu temukan jalur terbaik melewati labirin penuh liku menuju destinasi hati dan memori kita bersama.",
    icon: "🧩",
    path: "/game/gamelabirin",
    status: "Tersedia",
  },
  {
    id: "game-ular",
    title: "Ular Bucin / Snake of Love 🐍",
    description:
      "Bantu ular kumpulkan hati sebanyak-banyaknya! Hindari tembok dan badan sendiri. Semakin banyak hati, semakin cepat pula geraknya!",
    icon: "🐍",
    path: "/game/gameular",
    status: "Tersedia",
  },
  // ============ COMING SOON ============
  {
    id: "game-tebak-lagu",
    title: "Tebak Lagu Bucin 🎵",
    description:
      "Dengarkan potongan lagu dan tebak judulnya. Seberapa hafal kamu dengan lagu-lagu romantis? Segera hadir di Altaf Story!",
    icon: "🎶",
    path: "#",
    status: "Coming Soon",
  },
];

export default function DaftarGamePage() {
  return (
    <div
      className="min-h-screen relative overflow-hidden flex flex-col justify-between text-white"
      style={{
        background: "linear-gradient(to bottom, #1a0d14, #150b12, #0a0508)",
        fontFamily: "Georgia, serif",
      }}
    >
      <Navbar />

      {/* Main content dengan pt-28 dan pb-24 agar tidak mepet footer */}
      <main className="pt-28 pb-24 relative flex-grow">
        <div className="container mx-auto px-6 relative z-10">
          {/* Header Section dengan Efek Cahaya Ambient di belakangnya */}
          <div className="max-w-2xl mx-auto mb-16 text-center relative">
            {/* Efek Cahaya Ambient Background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-600/10 blur-[140px] rounded-full pointer-events-none -z-10"></div>

            <span className="text-xs font-bold uppercase tracking-widest text-pink-300 bg-pink-500/10 border border-pink-500/30 px-4 py-1.5 rounded-full inline-block mb-3 backdrop-blur-md shadow-sm">
              Game Arena ✨
            </span>

            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
              Pilih Game & <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-400 to-pink-500">
                Mulai Permainan Seru
              </span>
            </h1>

            <div className="w-16 h-1 bg-gradient-to-r from-pink-400 to-pink-600 mx-auto mt-4 rounded-full"></div>
          </div>

          {/* Grid List Game */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left">
            {gameList.map((game) => {
              const isComingSoon = game.status === "Coming Soon";

              // Kartu Coming Soon: pakai <div> biar tidak bisa diklik
              if (isComingSoon) {
                return (
                  <div
                    key={game.id}
                    className="relative bg-[#1a1017]/40 backdrop-blur-xl border border-pink-500/10 rounded-3xl p-8 shadow-xl flex flex-col justify-between opacity-60 cursor-not-allowed select-none overflow-hidden"
                  >
                    {/* Overlay Coming Soon */}
                    <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>

                    <div className="relative">
                      <div className="w-14 h-14 rounded-2xl bg-pink-500/5 border border-pink-500/20 flex items-center justify-center text-2xl mb-6 grayscale">
                        {game.icon}
                      </div>

                      <h3 className="text-xl font-bold text-white/70 mb-2">
                        {game.title}
                      </h3>

                      <p className="text-sm text-pink-200/50 leading-relaxed mb-6">
                        {game.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-pink-500/10 flex items-center justify-between text-xs font-bold uppercase tracking-wider relative">
                      <span className="text-pink-300/40 inline-flex items-center gap-1">
                        🔒 Belum Tersedia
                      </span>
                      <span className="text-yellow-300/70 bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20 normal-case">
                        Coming Soon
                      </span>
                    </div>
                  </div>
                );
              }

              // Kartu Tersedia: pakai <Link> biar bisa diklik
              return (
                <Link
                  key={game.id}
                  href={game.path}
                  className="bg-[#1a1017]/70 backdrop-blur-xl border border-pink-500/20 rounded-3xl p-8 shadow-xl hover:shadow-2xl hover:shadow-pink-500/20 hover:border-pink-500/50 transition-all duration-300 flex flex-col justify-between group cursor-pointer"
                >
                  <div>
                    <div className="w-14 h-14 rounded-2xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">
                      {game.icon}
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-pink-400 transition-colors">
                      {game.title}
                    </h3>

                    <p className="text-sm text-pink-200/70 leading-relaxed mb-6">
                      {game.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-pink-500/10 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                    <span className="text-pink-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                      Mulai Mainkan →
                    </span>
                    <span className="text-pink-300/60 bg-pink-500/10 px-3 py-1 rounded-full border border-pink-500/20 normal-case">
                      {game.status}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer Utama Website */}
      <Footer />
    </div>
  );
}
