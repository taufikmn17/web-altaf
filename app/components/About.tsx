"use client";

import React from "react";
import Link from "next/link"; // Gunakan next/link jika diarahkan ke halaman lain, atau ganti href sesuai kebutuhan

export default function About() {
  return (
    <section
      id="about"
      style={{ fontFamily: "Georgia, serif" }}
      className="py-24 bg-gradient-to-b from-[#0a0508] via-[#120a0f] to-[#1a0d14] overflow-hidden text-center relative"
    >
      {/* Efek Cahaya Ambient Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-pink-500/10 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Judul Bagian / Section Title */}
        <div className="max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-pink-300 bg-pink-500/10 border border-pink-500/30 px-4 py-1.5 rounded-full inline-block mb-3 backdrop-blur-md shadow-sm">
            How It Started
          </span>
          <h2 className="text-4xl font-extrabold text-white tracking-tight">
            Awal Mula <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-500">
              Cerita Kita
            </span>
          </h2>
          <div className="w-16 h-1 bg-gradient-to-r from-pink-400 to-pink-600 mx-auto mt-4 rounded-full"></div>
        </div>

        {/* Paragraf Cerita */}
        <div className="max-w-3xl mx-auto text-zinc-300 leading-relaxed space-y-6 text-base md:text-lg mb-12">
          <p>
            Semua berawal dari sebuah ketidaksengajaan yang menuntun langkah
            kami ke satu arah yang sama. Di antara miliaran pasang mata dan
            riuhnya dunia, takdir mempertemukan kami lewat untaian kata,
            obrolan-obrolan sederhana, dan tawa kecil yang perlahan-lahan mulai
            terasa hangat. Sesuatu yang awalnya biasa saja, berubah menjadi rasa
            penasaran yang menuntut ruang lebih besar di dalam hati.
          </p>
          <p>
            Sejak saat itu, perjalanan kami dimulai. Kami belajar bahwa cinta
            tidak selalu butuh alasan yang megah, ia hanya butuh dua orang yang
            saling menemukan kenyamanan. Dari sekadar menyapa, kini kami sadar
            bahwa kami telah melangkah sejauh ini menemukan tempat terbaik untuk
            pulang dan saling menjaga satu sama lain.
          </p>
        </div>

        {/* Tombol Lihat Selengkapnya */}
        <div className="flex justify-center">
          <Link
            href="/kisah-kita" // Sesuaikan dengan route halaman kisah lengkap Anda
            className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-medium text-sm tracking-wide bg-[#1a1017]/80 backdrop-blur-xl border border-pink-500/30 shadow-xl hover:border-pink-500/60 hover:bg-pink-950/30 transition-all duration-300 transform hover:-translate-y-1"
          >
            <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping absolute left-6"></span>
            <span className="w-2 h-2 rounded-full bg-pink-500 relative left-0"></span>

            <span>Lihat Selengkapnya Kisah Kita</span>

            <svg
              className="w-4 h-4 text-pink-400 transform group-hover:translate-x-1.5 transition-transform duration-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              ></path>
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
