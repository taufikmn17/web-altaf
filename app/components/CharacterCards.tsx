"use client";

import React from "react";
import Image from "next/image";
import Tilt from "react-parallax-tilt";

interface StatItem {
  label: string;
  value: string;
  percentage: number; // Untuk lebar bar (max 100%)
}

interface Character {
  name: string;
  role: string;
  id: string;
  image: string;
  stats: StatItem[];
  tags: string[];
}

const characters: Character[] = [
  {
    name: "Taufik",
    role: "The Protector",
    id: "67891",
    image: "/assets/img/pp_kartu2.jpeg", // Pastikan path diawali slash jika di folder public
    stats: [
      { label: "TINGKAT KEPEKAAN", value: "40%", percentage: 40 },
      { label: "KEMAMPUAN SABAR", value: "40%", percentage: 40 },
      { label: "GANTENG", value: "100%", percentage: 100 },
    ],
    tags: ["#Penyabar", "#KerasKepalaDikit", "#TukangKangen"],
  },
  {
    name: "Alya",
    role: "The Joybringer",
    id: "12345",
    image: "/assets/img/pp_kartu.jpeg",
    stats: [
      { label: "TINGKAT KEPEKAAN", value: "100%", percentage: 100 },
      { label: "KEMAMPUAN SABAR", value: "200%", percentage: 100 },
      { label: "CANTIK", value: "999%", percentage: 100 },
    ],
    tags: ["#TukangNgambek", "#PerhatianBanget", "#BocilKedaiJupe"],
  },
];

export default function CharacterCards() {
  return (
    <section
      id="characterCards"
      style={{ fontFamily: "Georgia, serif" }}
      className="py-24 bg-gradient-to-b from-[#0a0508] via-[#120a0f] to-[#1a0d14] overflow-hidden text-center relative"
    >
      <div className="container mx-auto px-6 relative z-10">
        {/* Judul Bagian */}
        <div className="max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-pink-300 bg-pink-500/10 border border-pink-500/30 px-4 py-1.5 rounded-full inline-block mb-3 backdrop-blur-md shadow-sm">
            Player Profile
          </span>
          <h2 className="text-4xl font-extrabold text-white tracking-tight">
            Karakter & Statistik <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-500">
              Duo A6
            </span>
          </h2>
          <div className="w-16 h-1 bg-gradient-to-r from-pink-400 to-rose-500 mx-auto mt-4 rounded-full"></div>
        </div>

        {/* Grid Kartu Karakter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-4xl mx-auto items-stretch">
          {characters.map((char, index) => (
            <div key={index}>
              <Tilt
                tiltMaxAngleX={10}
                tiltMaxAngleY={10}
                scale={1.03}
                transitionSpeed={2500}
                perspective={1000}
                className="h-full cursor-pointer"
              >
                <div className="h-full bg-[#1a0f18]/90 backdrop-blur-md rounded-3xl border border-pink-900/50 p-7 shadow-2xl relative overflow-hidden flex flex-col justify-between group hover:border-pink-500/80 transition-all duration-500 hover:shadow-pink-900/30">
                  {/* Efek Glow Sudut */}
                  <div className="absolute -top-16 -right-16 w-40 h-40 bg-pink-600/20 rounded-full blur-3xl group-hover:bg-pink-500/30 transition-all duration-500 pointer-events-none"></div>

                  <div>
                    {/* Header Profil */}
                    <div className="flex items-center gap-4 border-b border-pink-900/40 pb-5 mb-6">
                      <div className="relative w-20 h-20 shrink-0">
                        <Image
                          src={char.image}
                          alt={char.name}
                          fill
                          sizes="80px"
                          className="rounded-2xl object-cover border-2 border-pink-500/60 shadow-lg group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute -bottom-1 -right-1 bg-pink-600 text-white text-[10px] px-1.5 py-0.5 rounded-md font-bold z-10">
                          A6
                        </div>
                      </div>
                      <div className="text-left">
                        <span className="text-[11px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          {char.role}
                        </span>
                        <h3 className="text-2xl font-bold text-white mt-1 group-hover:text-pink-400 transition-colors">
                          {char.name}
                        </h3>
                        <p className="text-xs text-pink-400/80 font-medium flex items-center gap-1 mt-0.5">
                          <i className="ri-gamepad-line"></i> ID: {char.id}
                        </p>
                      </div>
                    </div>

                    {/* Bar Statistik */}
                    <div className="space-y-4 text-left">
                      {char.stats.map((stat, statIdx) => (
                        <div key={statIdx}>
                          <div className="flex justify-between text-xs font-bold text-zinc-300 mb-1">
                            <span>{stat.label}</span>
                            <span className="text-pink-400 font-mono">
                              {stat.value}
                            </span>
                          </div>
                          <div className="w-full h-2.5 bg-pink-950/60 rounded-full overflow-hidden p-0.5 border border-pink-900/40">
                            <div
                              className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full transition-all duration-500"
                              style={{ width: `${stat.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tags / Hashtag */}
                  <div className="mt-8 pt-4 border-t border-pink-900/40 flex flex-wrap gap-2 justify-start">
                    {char.tags.map((tag, tagIdx) => (
                      <span
                        key={tagIdx}
                        className="text-xs font-semibold bg-pink-950/80 text-pink-300 border border-pink-800/40 px-3 py-1 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Tilt>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
