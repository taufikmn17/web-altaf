"use client";

import React, { useState } from "react";

export default function Footprints() {
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const modalContent: Record<
    string,
    { title: string; subtitle: string; desc: string; icon: string }
  > = {
    pubg: {
      title: "Pochinki (Awal Bertemu)",
      subtitle: "Virtual World Connection",
      desc: "Semuanya berawal dari lobi game dan pertempuran kecil di Pochinki. Siapa sangka, canda gurau saat mabar justru menjadi awal dari takdir yang mempertemukan kita.",
      icon: "🎮",
    },
    firstmeet: {
      title: "Menjalin Asmara (Now)",
      subtitle: "Real Life Journey",
      desc: "Dari balik layar handphone, kini kita melangkah bersama di dunia nyata. Saling merajut asa, mengisi hari-hari dengan tawa, dan menguatkan dalam setiap keadaan.",
      icon: "❤️",
    },
    favorite: {
      title: "Pelaminan (Tujuan Akhir)",
      subtitle: "Forever & Always",
      desc: "Dua hati yang berkomitmen untuk berlabuh dalam satu ikatan suci pernikahan. Menjadi rumah satu sama lain hingga akhir usia.",
      icon: "💍",
    },
  };

  return (
    <section
      id="mapFootprints"
      className="py-24 bg-gradient-to-b from-[#1a0d14] via-[#120a0f] to-[#0a0508] overflow-hidden text-center relative"
    >
      <div className="container mx-auto px-6 relative z-10">
        {/* Judul Bagian */}
        <div className="max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-pink-300 bg-pink-500/10 border border-pink-500/30 px-4 py-1.5 rounded-full inline-block mb-3 backdrop-blur-md shadow-sm">
            Our Footprints
          </span>
          <h2 className="text-4xl font-extrabold text-white font-sans tracking-tight">
            Jejak Virtual <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-500">
              Hingga Dunia Nyata
            </span>
          </h2>
          <div className="w-16 h-1 bg-gradient-to-r from-pink-400 to-pink-600 mx-auto mt-4 rounded-full"></div>
        </div>

        {/* Kotak Kontainer Peta Perjalanan */}
        <div className="relative max-w-4xl mx-auto bg-pink-950/30 border-4 border-dashed border-pink-900/60 rounded-3xl p-8 md:p-12 shadow-inner overflow-hidden min-h-[350px] flex items-center justify-center backdrop-blur-md">
          {/* Garis Penghubung Desktop (SVG Curved Path) */}
          <svg
            className="absolute inset-0 w-full h-full hidden md:block pointer-events-none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M 150 200 Q 300 80 450 200 T 750 180"
              fill="none"
              stroke="#f472b6"
              strokeWidth="3"
              strokeDasharray="8,8"
            />
          </svg>

          {/* Garis Penghubung Mobile (Vertical Dashed Line) */}
          <div className="absolute top-12 bottom-12 w-0.5 border-l-2 border-dashed border-pink-500/50 md:hidden pointer-events-none"></div>

          {/* Titik-titik Milestone */}
          <div className="flex flex-col md:flex-row justify-around items-center gap-16 md:gap-12 w-full relative z-10 py-6">
            {/* Milestone 1: Awal Bertemu */}
            <button
              onClick={() => setActiveModal("pubg")}
              className="group relative flex flex-col items-center focus:outline-none transition-all duration-300 transform hover:scale-110 bg-[#1a0f18]/90 md:bg-transparent p-4 md:p-0 rounded-2xl shadow-md md:shadow-none border border-pink-900/40 md:border-none cursor-pointer"
            >
              <div className="w-16 h-16 rounded-full bg-[var(--primary-pink)] text-white flex items-center justify-center text-2xl shadow-md group-hover:bg-rose-600 transition-all duration-300">
                🎮
              </div>
              <span className="mt-3 font-bold text-white tracking-wide text-sm md:text-base">
                AWAL BERTEMU
              </span>
              <span className="text-xs text-pink-300 font-medium mt-0.5">
                POCHINKI 🗺️
              </span>
            </button>

            {/* Milestone 2: Menjalin Asmara */}
            <button
              onClick={() => setActiveModal("firstmeet")}
              className="group relative flex flex-col items-center focus:outline-none transition-all duration-300 transform hover:scale-110 bg-[#1a0f18]/90 md:bg-transparent p-4 md:p-0 rounded-2xl shadow-md md:shadow-none border border-pink-900/40 md:border-none cursor-pointer"
            >
              <div className="w-16 h-16 rounded-full bg-rose-500 text-white flex items-center justify-center text-2xl shadow-md group-hover:bg-rose-600 transition-all duration-300 animate-bounce">
                ❤️
              </div>
              <span className="mt-3 font-bold text-white tracking-wide text-sm md:text-base">
                MENJALIN ASMARA
              </span>
              <span className="text-xs text-rose-300 font-medium mt-0.5">
                NOW ✨
              </span>
            </button>

            {/* Milestone 3: Pelaminan */}
            <button
              onClick={() => setActiveModal("favorite")}
              className="group relative flex flex-col items-center focus:outline-none transition-all duration-300 transform hover:scale-110 bg-[#1a0f18]/90 md:bg-transparent p-4 md:p-0 rounded-2xl shadow-md md:shadow-none border border-pink-900/40 md:border-none cursor-pointer"
            >
              <div className="w-16 h-16 rounded-full bg-pink-400 text-white flex items-center justify-center text-2xl shadow-md group-hover:bg-pink-500 transition-all duration-300">
                💍
              </div>
              <span className="mt-3 font-bold text-white tracking-wide text-sm md:text-base">
                Pelaminan
              </span>
              <span className="text-xs text-pink-300 font-medium mt-0.5">
                Tujuan Akhir 🤍
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal Popup Interaktif */}
      {activeModal && modalContent[activeModal] && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex justify-center items-center px-4 animate-fadeIn">
          <div className="bg-[#1a0f18] border-2 border-pink-900/60 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center relative transform transition-all scale-100">
            <div className="w-16 h-16 bg-pink-950/60 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 shadow-inner border border-pink-800/40">
              {modalContent[activeModal].icon}
            </div>

            <span className="text-xs font-semibold uppercase tracking-widest text-pink-400">
              {modalContent[activeModal].subtitle}
            </span>

            <h3 className="text-2xl font-black text-white mt-1 mb-3">
              {modalContent[activeModal].title}
            </h3>

            <p className="text-zinc-300 text-sm leading-relaxed mb-8">
              {modalContent[activeModal].desc}
            </p>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full bg-[var(--primary-pink)] hover:bg-rose-600 text-white font-bold py-3 rounded-full transition-all shadow-md text-sm tracking-wider cursor-pointer"
            >
              Tutup Kenangan 🤍
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
