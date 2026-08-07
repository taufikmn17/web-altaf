"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface Heart {
  x: number;
  y: number;
  size: number;
  speedY: number;
  opacity: number;
  color: string;
  angle: number;
  swingSpeed: number;
}

interface Sparkle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  speedX: number;
  speedY: number;
  opacity: number;
}

export default function Hero() {
  const [isLotsoVisible, setIsLotsoVisible] = useState<boolean>(true);
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  useEffect(() => {
    const cycleInterval = setInterval(() => {
      setIsLotsoVisible((prev) => !prev);
    }, 5000);

    return () => clearInterval(cycleInterval);
  }, []);

  useEffect(() => {
    if (isLotsoVisible) {
      const newSparkles: Sparkle[] = [];
      const colors = ["#f472b6", "#fb7185", "#fbcfe8", "#ffffff", "#f43f5e"];

      for (let i = 0; i < 20; i++) {
        newSparkles.push({
          id: Math.random(),
          x: (Math.random() - 0.5) * 200,
          y: Math.random() * -50 - 10,
          size: Math.random() * 6 + 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          speedX: (Math.random() - 0.5) * 4,
          speedY: Math.random() * -3 - 1,
          opacity: 1,
        });
      }
      setSparkles(newSparkles);

      const sparkleTimer = setTimeout(() => {
        setSparkles([]);
      }, 1500);

      return () => clearTimeout(sparkleTimer);
    }
  }, [isLotsoVisible]);

  useEffect(() => {
    const canvas = document.getElementById(
      "loveLanternCanvas"
    ) as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let hearts: Heart[] = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const colors = ["#ec4899", "#ec4899", "#fbcfe8"];

    for (let i = 0; i < 15; i++) {
      hearts.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 10 + 10,
        speedY: Math.random() * 0.8 + 0.4,
        opacity: Math.random() * 0.5 + 0.3,
        color: colors[Math.floor(Math.random() * colors.length)],
        angle: Math.random() * Math.PI * 2,
        swingSpeed: Math.random() * 0.02 + 0.01,
      });
    }

    const drawHeart = (
      x: number,
      y: number,
      size: number,
      color: string,
      opacity: number
    ) => {
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.fillStyle = color;
      ctx.beginPath();
      const d = size;
      ctx.moveTo(x, y + d / 4);
      ctx.bezierCurveTo(x, y, x - d / 2, y, x - d / 2, y + d / 4);
      ctx.bezierCurveTo(x - d / 2, y + d / 2, x, y + (d * 3) / 4, x, y + d);
      ctx.bezierCurveTo(
        x,
        y + (d * 3) / 4,
        x + d / 2,
        y + d / 2,
        x + d / 2,
        y + d / 4
      );
      ctx.bezierCurveTo(x + d / 2, y, x, y, x, y + d / 4);
      ctx.fill();
      ctx.restore();
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      hearts.forEach((heart) => {
        heart.y -= heart.speedY;
        heart.angle += heart.swingSpeed;
        const currentX = heart.x + Math.sin(heart.angle) * 15;

        if (heart.y < -20) {
          heart.y = canvas.height + 20;
          heart.x = Math.random() * canvas.width;
        }

        drawHeart(currentX, heart.y, heart.size, heart.color, heart.opacity);
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    const handleCanvasClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      for (let i = 0; i < 2; i++) {
        hearts.push({
          x: clickX + (Math.random() - 0.5) * 20,
          y: clickY,
          size: Math.random() * 8 + 10,
          speedY: Math.random() * 1 + 0.8,
          opacity: 0.9,
          color: "#ec4899",
          angle: 0,
          swingSpeed: 0.02,
        });
      }
    };

    canvas.addEventListener("click", handleCanvasClick);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      canvas.removeEventListener("click", handleCanvasClick);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <section
      id="home"
      className="relative min-h-screen w-full flex flex-col justify-between items-center overflow-hidden pt-24 pb-0 px-4"
    >
      <style jsx global>{`
        @keyframes slideUp {
          0% {
            transform: translateY(120px);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes slideDown {
          0% {
            transform: translateY(0);
            opacity: 1;
          }
          100% {
            transform: translateY(150px);
            opacity: 0;
          }
        }
        .animate-slide-up {
          animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-slide-down {
          animation: slideDown 0.8s cubic-bezier(0.7, 0, 0.84, 0) forwards;
        }
      `}</style>

      {/* Gambar Background */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/assets/img/hero.jpeg"
          alt="Hero Background"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>

      {/* Efek Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#120a0f]/80 via-[#120a0f]/50 to-[#120a0f]/90 z-10"></div>

      <canvas
        id="loveLanternCanvas"
        className="absolute inset-0 z-20 w-full h-full cursor-pointer pointer-events-auto"
      ></canvas>

      <div className="w-full z-30"></div>

      {/* Card di Tengah (Lebih transparan dengan bg-[#120a0f]/30) */}
      <div className="relative z-30 w-full max-w-lg mx-auto p-6 md:p-9 rounded-3xl bg-[#120a0f]/30 border border-pink-500/20 shadow-2xl text-white text-center transform hover:scale-[1.01] transition-transform duration-500 space-y-4 pointer-events-auto my-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-pink-500/20 border border-pink-300/40 text-[#fbcfe8] text-xs font-bold tracking-widest uppercase shadow-inner animate-pulse">
          <i className="ri-heart-fill text-[#ec4899]"></i> Our Love Story
        </div>

        <h2 className="text-sm md:text-base font-medium text-[#fbcfe8] tracking-wider">
          Berdua, satu cerita
        </h2>

        <h1 className="text-3xl md:text-5xl font-black text-white leading-snug tracking-tight drop-shadow-md">
          Petualangan Ini
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-500">
            Dimulai Dengan Kamu 🤍
          </span>
        </h1>

        <div className="pt-2">
          <Link
            href="#about"
            className="inline-flex items-center gap-2 px-7 py-3 rounded-full font-bold text-sm tracking-wider text-white shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-pink-500/40 active:translate-y-0 border border-pink-400/30 w-fit mx-auto"
            style={{ background: "linear-gradient(135deg, #ec4899, #db2777)" }}
          >
            <span>Lihat Cerita</span>
            <svg
              className="w-4 h-4 animate-bounce"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </Link>
        </div>
      </div>

      {/* Gambar Lotso */}
      <div className="relative z-35 pointer-events-none flex justify-center w-full mt-auto overflow-visible">
        <div className="relative">
          {sparkles.map((sparkle) => (
            <span
              key={sparkle.id}
              className="absolute rounded-full animate-ping z-40 pointer-events-none"
              style={{
                width: `${sparkle.size}px`,
                height: `${sparkle.size}px`,
                backgroundColor: sparkle.color,
                left: `calc(50% + ${sparkle.x}px)`,
                bottom: `20px`,
                boxShadow: `0 0 10px ${sparkle.color}, 0 0 20px ${sparkle.color}`,
              }}
            />
          ))}

          <div
            className={`relative w-80 sm:w-96 md:w-[420px] h-52 sm:h-60 md:h-68 ${
              isLotsoVisible ? "animate-slide-up" : "animate-slide-down"
            }`}
          >
            <Image
              src="/assets/img/lotso3.png"
              alt="Lotso Bear"
              fill
              priority
              sizes="(max-width: 768px) 384px, 420px"
              className="object-contain object-bottom drop-shadow-[0_10px_25px_rgba(236,72,153,0.5)]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
