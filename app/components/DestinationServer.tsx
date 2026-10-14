import React from "react";
import DestinationClientWrapper from "./DestinationClientWrapper";
import { getDestinations } from "@/app/lib/google-sheets";

export default async function Destination() {
  const destinations = await getDestinations();

  return (
    <section
      id="destinasi"
      style={{ fontFamily: "Georgia, serif" }}
      className="py-24 bg-gradient-to-b from-[#0a0508] via-[#120a0f] to-[#1a0d14] overflow-hidden text-center relative"
    >
      {/* Efek Cahaya Ambient Background */}
      {/* <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-600/10 blur-[140px] rounded-full pointer-events-none"></div> */}

      <div className="container mx-auto px-6 relative z-10">
        {/* Header Section */}
        <div className="max-w-2xl mx-auto mb-16 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-pink-300 bg-pink-500/10 border border-pink-500/30 px-4 py-1.5 rounded-full inline-block mb-3 backdrop-blur-md shadow-sm">
            Our Adventure
          </span>

          <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
            Geser Ke Kanan <br />
            <span className="text-pink-400">Lihat Berbagai Destinasi Kita</span>
          </h2>

          <div className="w-16 h-1 bg-pink-500 mx-auto mt-4 rounded-full"></div>
        </div>
      </div>

      {/* Memanggil Client Component untuk drag scroll */}
      <DestinationClientWrapper destinations={destinations} />
    </section>
  );
}
