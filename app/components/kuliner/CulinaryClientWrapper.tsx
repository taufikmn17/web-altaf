"use client";

import React, { useState } from "react";
import Link from "next/link";
import DepthCarousel from "./DepthCarousel";

interface KulinerItem {
  id: string;
  src: string;
  title: string;
  rating: string;
  tag: string;
  desc: string;
  geo: string;
  status: string;
}

export default function CulinaryClientWrapper({
  culinaries,
}: {
  culinaries: KulinerItem[];
}) {
  const [selectedCulinary, setSelectedCulinary] = useState<KulinerItem | null>(
    null
  );

  const limitedCulinaries = culinaries.slice(0, 5);

  const carouselItems = limitedCulinaries.map((item) => ({
    image: item.src,
    alt: item.title,
  }));

  const [activeIndex, setActiveIndex] = useState(0);
  const activeCulinary = limitedCulinaries[activeIndex] || limitedCulinaries[0];

  return (
    <>
      {limitedCulinaries.length === 0 ? (
        <div className="w-full text-center py-10 text-sm text-pink-300/50 italic bg-[#1a1017]/60 backdrop-blur-md max-w-md mx-auto rounded-3xl border border-pink-500/20 p-6">
          Belum ada data kuliner di sheet &quot;kuliner&quot;.
        </div>
      ) : (
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center px-4 sm:px-6">
          {/* Depth Carousel Container yang menyesuaikan tinggi di berbagai device */}
          <div className="w-full h-[340px] xs:h-[370px] sm:h-[420px] md:h-[460px] relative mb-2 sm:mb-4">
            <DepthCarousel
              items={carouselItems}
              depth={160}
              spread={65}
              tilt={16}
              tiltDirection="right"
              perspective={1200}
              visibleCards={3}
              falloff={0.2}
              blur={4}
              autoplay={false}
              loop
              cardWidth={200}
              cardHeight={260}
              radius={16}
              tint="#05060a"
              duration={700}
              ease="power3.out"
              showControls
              showIndicators
              onChange={(index) => setActiveIndex(index)}
            />
          </div>

          {/* Informasi Detail Card Aktif - Dibuat rapat & pas tanpa jarak berlebih */}
          {activeCulinary && (
            <div className="w-full max-w-md sm:max-w-lg bg-[#1a1017]/90 backdrop-blur-xl border border-pink-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-2xl text-left transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5 sm:mb-2">
                  <span className="flex items-center gap-1 font-semibold text-pink-300 text-[11px] sm:text-xs truncate">
                    <svg
                      className="w-3.5 h-3.5 text-pink-400 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span className="truncate">
                      {activeCulinary.geo ? activeCulinary.geo : "Kuliner Kita"}
                    </span>
                  </span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="bg-black/60 backdrop-blur-md text-amber-300 border border-white/10 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1">
                      ⭐ {activeCulinary.rating}
                    </span>
                    <span className="text-pink-400/90 font-medium bg-black/40 border border-pink-500/20 px-2 py-0.5 rounded-md uppercase tracking-wider text-[9px]">
                      {activeCulinary.status}
                    </span>
                  </div>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-white mb-1 line-clamp-1">
                  {activeCulinary.title}
                </h3>

                <p className="text-[11px] sm:text-xs text-pink-200/70 leading-relaxed line-clamp-2 mb-3">
                  {activeCulinary.desc}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2.5 sm:pt-3 border-t border-pink-500/10">
                <span className="text-[10px] bg-pink-500/10 border border-pink-500/30 text-pink-300 font-semibold px-2.5 py-0.5 rounded-full truncate max-w-[130px]">
                  {activeCulinary.tag}
                </span>

                <button
                  onClick={() => setSelectedCulinary(activeCulinary)}
                  className="bg-pink-600/80 hover:bg-pink-600 text-white text-xs font-semibold px-3.5 py-1.5 rounded-full border border-pink-500/40 shadow-lg transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
                >
                  <svg
                    className="w-3.5 h-3.5 text-white shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <span>Detail</span>
                </button>
              </div>
            </div>
          )}

          {/* Tombol Lihat Selengkapnya */}
          {culinaries.length > 5 && (
            <div className="mt-5 sm:mt-6 text-center">
              <Link
                href="/kuliner"
                className="inline-block px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest text-pink-200 bg-pink-500/10 border border-pink-500/30 hover:bg-pink-500/20 hover:border-pink-500/60 transition-all duration-300 backdrop-blur-md shadow-lg active:scale-95"
              >
                Lihat Selengkapnya
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Modal Popup Detail */}
      {selectedCulinary && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex justify-center items-center p-4 pt-12 animate-fadeIn">
          <div className="bg-[#1a0f18] border-2 border-pink-900/60 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden relative transform transition-all scale-100 flex flex-col max-h-[85vh]">
            <div className="relative h-48 sm:h-56 w-full bg-black/60 flex-shrink-0">
              <img
                src={selectedCulinary.src}
                alt={selectedCulinary.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1a0f18] via-transparent to-transparent"></div>

              <span className="absolute top-3 right-3 bg-black/70 backdrop-blur-md text-amber-300 border border-white/10 text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                ⭐ {selectedCulinary.rating}
              </span>
            </div>

            <div className="p-4 sm:p-6 text-left overflow-y-auto flex-grow">
              <div className="text-xs font-semibold text-pink-400 mb-1">
                <span className="flex items-center gap-1.5">
                  <svg
                    className="w-4 h-4 text-pink-400 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span>
                    {selectedCulinary.geo
                      ? selectedCulinary.geo
                      : "Kuliner Kita"}
                  </span>
                </span>
              </div>

              <h3 className="text-xl font-black text-white mb-2">
                {selectedCulinary.title}
              </h3>

              <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed mb-4">
                {selectedCulinary.desc}
              </p>

              <div className="flex items-center gap-2 flex-wrap mb-5">
                <span className="text-xs bg-pink-500/10 border border-pink-500/30 text-pink-300 font-semibold px-3 py-1 rounded-full">
                  {selectedCulinary.tag}
                </span>
                <span className="text-pink-400/90 font-medium bg-black/40 border border-pink-500/20 px-2.5 py-1 rounded-md uppercase tracking-wider text-[10px]">
                  {selectedCulinary.status}
                </span>
              </div>

              <button
                onClick={() => setSelectedCulinary(null)}
                className="w-full bg-pink-600 hover:bg-rose-600 text-white font-bold py-2.5 rounded-full transition-all shadow-md text-xs tracking-wider cursor-pointer"
              >
                Tutup Kenangan 🤍
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
