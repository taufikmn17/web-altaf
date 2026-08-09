"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import TextType from "./TextType";

export default function WelcomeLotsoModal() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasSeenModal = sessionStorage.getItem("hasSeenLotsoModal");
    if (!hasSeenModal) {
      setIsVisible(true);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    sessionStorage.setItem("hasSeenLotsoModal", "true");
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-[#120a0f]/80 backdrop-blur-sm z-[9999] flex justify-center items-center p-4 animate-fadeIn">
      {/* Container Utama */}
      <div className="relative bg-[#120a0f] border-2 border-[#ec4899] rounded-3xl shadow-2xl shadow-[#ec4899]/30 w-full max-w-md p-8 pt-24 mt-20 animate-scaleIn">
        {/* Area Foto Lotso */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full bg-[#120a0f] border-4 border-[#ec4899] shadow-lg overflow-hidden flex items-center justify-center z-10">
          <Image
            src="/assets/img/lotso.png"
            alt="Lotso Huggin' Bear"
            width={160}
            height={160}
            priority={true}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Konten Modal */}
        <div className="text-center">
          <h2 className="text-4xl font-extrabold text-[#fdf8f6] mb-4 tracking-tighter drop-shadow-md">
            Hii, Welcome!
          </h2>

          {/* Efek Ketik TextType */}
          <div className="text-[#fbcfe8] text-lg mb-8 leading-relaxed font-medium min-h-[3.5rem] flex items-center justify-center">
            <TextType
              text={[
                "Ubur-ubur ikan lele, selamat datang di Altaf Story lee.",
                "Ikan hiu makan teri, waktunya scroll di Altaf Story.",
                "Makan bubur pakai sumpit, gabisa bang.",
              ]}
              typingSpeed={50}
              pauseDuration={2000}
              loop={true}
              showCursor={true}
              cursorCharacter="|"
            />
          </div>

          {/* Tombol Aksi Utama */}
          <button
            onClick={handleClose}
            className="w-full bg-[#ec4899] hover:bg-pink-600 text-[#fdf8f6] font-bold py-4 px-6 rounded-xl text-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
          >
            Mulai Jelajahi! ✨
          </button>
        </div>
      </div>

      {/* Animasi CSS */}
      <style jsx>{`
        @keyframes scaleIn {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.95);
          }
          100% {
            transform: scale(1);
          }
        }
        .animate-scaleIn {
          animation: scaleIn 0.4s ease-out forwards;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
