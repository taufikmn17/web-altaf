import React from "react";
import CulinaryClientWrapper from "./CulinaryClientWrapper";
import { getCulinaries } from "@/app/lib/google-sheets";

export default async function CulinarySection() {
  const culinaries = await getCulinaries();

  return (
    <section
      id="kuliner"
      style={{ fontFamily: "Georgia, serif" }}
      className="py-28 relative overflow-hidden text-center bg-gradient-to-b from-[#1a0d14] via-[#150b12] to-[#0a0508]"
    >
      {/* Efek Cahaya Ambient Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-600/10 blur-[140px] rounded-full pointer-events-none"></div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Header Section */}
        <div className="max-w-2xl mx-auto mb-16 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-pink-300 bg-pink-500/10 border border-pink-500/30 px-4 py-1.5 rounded-full inline-block mb-3 backdrop-blur-md shadow-sm">
            Memory Lane
          </span>

          <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
            Tempat Favorit & <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-400 to-pink-500">
              Petualangan Kuliner Kita
            </span>
          </h2>

          <div className="w-16 h-1 bg-gradient-to-r from-pink-400 to-pink-600 mx-auto mt-4 rounded-full"></div>
        </div>

        {/* Kirim data hasil ISR ke Client Component untuk interaksi tombol & grid */}
        <CulinaryClientWrapper culinaries={culinaries} />
      </div>
    </section>
  );
}
