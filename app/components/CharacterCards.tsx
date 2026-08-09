"use client";

import React from "react";
import Tilt from "react-parallax-tilt";

export default function CharacterCards() {
  return (
    <section
      id="characterCards"
      className="py-24 bg-gradient-to-b from-[#0a0508] via-[#120a0f] to-[#1a0d14] overflow-hidden text-center relative"
    >
      <div className="container mx-auto px-6 relative z-10">
        {/* Judul Bagian */}
        <div className="max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-pink-300 bg-pink-500/10 border border-pink-500/30 px-4 py-1.5 rounded-full inline-block mb-3 backdrop-blur-md shadow-sm">
            Player Profile
          </span>
          <h2 className="text-4xl font-extrabold text-white font-sans tracking-tight">
            Karakter & Statistik <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-500">
              Duo A6
            </span>
          </h2>
          <div className="w-16 h-1 bg-gradient-to-r from-pink-400 to-rose-500 mx-auto mt-4 rounded-full"></div>
        </div>

        {/* Grid Kartu Karakter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-4xl mx-auto items-stretch">
          {/* ================= KARTU 1: TAUFIK ================= */}
          <div>
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
                    <div className="relative">
                      <img
                        src="assets/img/pp_kartu2.jpeg"
                        alt="Taufik"
                        className="w-20 h-20 rounded-2xl object-cover border-2 border-pink-500/60 shadow-lg group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute -bottom-1 -right-1 bg-pink-600 text-white text-[10px] px-1.5 py-0.5 rounded-md font-bold">
                        A6
                      </div>
                    </div>
                    <div className="text-left">
                      <span className="text-[11px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        The Protector
                      </span>
                      <h3 className="text-2xl font-bold text-white mt-1 group-hover:text-pink-400 transition-colors">
                        Taufik
                      </h3>
                      <p className="text-xs text-pink-400/80 font-medium flex items-center gap-1 mt-0.5">
                        <i className="ri-gamepad-line"></i> ID: 67891
                      </p>
                    </div>
                  </div>

                  {/* Bar Statistik */}
                  <div className="space-y-4 text-left">
                    <div>
                      <div className="flex justify-between text-xs font-bold text-zinc-300 mb-1">
                        <span>TINGKAT KEPEKAAN</span>
                        <span className="text-pink-400 font-mono">40%</span>
                      </div>
                      <div className="w-full h-2.5 bg-pink-950/60 rounded-full overflow-hidden p-0.5 border border-pink-900/40">
                        <div
                          className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full"
                          style={{ width: "40%" }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-bold text-zinc-300 mb-1">
                        <span>KEMAMPUAN SABAR</span>
                        <span className="text-pink-400 font-mono">40%</span>
                      </div>
                      <div className="w-full h-2.5 bg-pink-950/60 rounded-full overflow-hidden p-0.5 border border-pink-900/40">
                        <div
                          className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full"
                          style={{ width: "40%" }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-bold text-zinc-300 mb-1">
                        <span>GANTENG</span>
                        <span className="text-pink-400 font-mono">100%</span>
                      </div>
                      <div className="w-full h-2.5 bg-pink-950/60 rounded-full overflow-hidden p-0.5 border border-pink-900/40">
                        <div
                          className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full"
                          style={{ width: "100%" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tags / Hashtag */}
                <div className="mt-8 pt-4 border-t border-pink-900/40 flex flex-wrap gap-2 justify-start">
                  <span className="text-xs font-semibold bg-pink-950/80 text-pink-300 border border-pink-800/40 px-3 py-1 rounded-full">
                    #Penyabar
                  </span>
                  <span className="text-xs font-semibold bg-pink-950/80 text-pink-300 border border-pink-800/40 px-3 py-1 rounded-full">
                    #KerasKepalaDikit
                  </span>
                  <span className="text-xs font-semibold bg-pink-950/80 text-pink-300 border border-pink-800/40 px-3 py-1 rounded-full">
                    #TukangKangen
                  </span>
                </div>
              </div>
            </Tilt>
          </div>

          {/* ================= KARTU 2: ALYA ================= */}
          <div>
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
                    <div className="relative">
                      <img
                        src="assets/img/pp_kartu.jpeg"
                        alt="Alya"
                        className="w-20 h-20 rounded-2xl object-cover border-2 border-pink-500/60 shadow-lg group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute -bottom-1 -right-1 bg-pink-600 text-white text-[10px] px-1.5 py-0.5 rounded-md font-bold">
                        A6
                      </div>
                    </div>
                    <div className="text-left">
                      <span className="text-[11px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        The Joybringer
                      </span>
                      <h3 className="text-2xl font-bold text-white mt-1 group-hover:text-pink-400 transition-colors">
                        Alya
                      </h3>
                      <p className="text-xs text-pink-400/80 font-medium flex items-center gap-1 mt-0.5">
                        <i className="ri-gamepad-line"></i> ID: 12345
                      </p>
                    </div>
                  </div>

                  {/* Bar Statistik */}
                  <div className="space-y-4 text-left">
                    <div>
                      <div className="flex justify-between text-xs font-bold text-zinc-300 mb-1">
                        <span>TINGKAT KEPEKAAN</span>
                        <span className="text-pink-400 font-mono">100%</span>
                      </div>
                      <div className="w-full h-2.5 bg-pink-950/60 rounded-full overflow-hidden p-0.5 border border-pink-900/40">
                        <div
                          className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full"
                          style={{ width: "100%" }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-bold text-zinc-300 mb-1">
                        <span>KEMAMPUAN SABAR</span>
                        <span className="text-pink-400 font-mono">200%</span>
                      </div>
                      <div className="w-full h-2.5 bg-pink-950/60 rounded-full overflow-hidden p-0.5 border border-pink-900/40">
                        <div
                          className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full"
                          style={{ width: "100%" }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-bold text-zinc-300 mb-1">
                        <span>CANTIK</span>
                        <span className="text-pink-400 font-mono">999%</span>
                      </div>
                      <div className="w-full h-2.5 bg-pink-950/60 rounded-full overflow-hidden p-0.5 border border-pink-900/40">
                        <div
                          className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full"
                          style={{ width: "100%" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tags / Hashtag */}
                <div className="mt-8 pt-4 border-t border-pink-900/40 flex flex-wrap gap-2 justify-start">
                  <span className="text-xs font-semibold bg-pink-950/80 text-pink-300 border border-pink-800/40 px-3 py-1 rounded-full">
                    #TukangNgambek
                  </span>
                  <span className="text-xs font-semibold bg-pink-950/80 text-pink-300 border border-pink-800/40 px-3 py-1 rounded-full">
                    #PerhatianBanget
                  </span>
                  <span className="text-xs font-semibold bg-pink-950/80 text-pink-300 border border-pink-800/40 px-3 py-1 rounded-full">
                    #BocilKedaiJupe
                  </span>
                </div>
              </div>
            </Tilt>
          </div>
        </div>
      </div>
    </section>
  );
}
