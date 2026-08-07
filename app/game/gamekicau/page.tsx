"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Navbar from "../../components/Navbar";

interface Bird {
  id: number;
  x: number;
  y: number;
}

interface LeaderboardEntry {
  name: string;
  score: number | string;
  timestamp?: string;
}

export default function TangkapBurungGame() {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(35);
  const [birds, setBirds] = useState<Bird[]>([]);

  // Modal & Leaderboard States
  const [showNameModal, setShowNameModal] = useState<boolean>(false);
  const [showScoreModal, setShowScoreModal] = useState<boolean>(false);
  const [playerName, setPlayerName] = useState<string>("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Ref untuk menghindari masalah sinkronisasi state async & mencegah double submit
  const scoreRef = useRef<number>(0);
  const isEndedRef = useRef<boolean>(false);

  const gameAreaRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const baseUrl = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL || "";

  // Ambil data Leaderboard saat halaman dimuat
  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    if (!baseUrl) return;
    try {
      const res = await fetch(`${baseUrl}?sheet=gamekicau`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const sorted = data
          .sort((a, b) => Number(b.score) - Number(a.score))
          .slice(0, 3);
        setLeaderboard(sorted);
      }
    } catch (error) {
      console.error("Gagal memuat leaderboard:", error);
    }
  };

  // Game Loop: Timer & Tingkat Kesulitan Dinamis (Burung Banyak, Muncul Cepat & Cepat Hilang)
  useEffect(() => {
    let timerInterval: NodeJS.Timeout;
    let birdInterval: NodeJS.Timeout;

    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
      }

      // Timer Mundur
      timerInterval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            endGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Interval Muncul Burung (Dibuat lebih cepat: setiap 400ms burung baru muncul)
      const spawnRate = 400;

      birdInterval = setInterval(() => {
        if (gameAreaRef.current) {
          const areaWidth = gameAreaRef.current.clientWidth - 50;
          const areaHeight = gameAreaRef.current.clientHeight - 50;

          const randomX = Math.floor(Math.random() * Math.max(areaWidth, 50));
          const randomY = Math.floor(Math.random() * Math.max(areaHeight, 50));

          const birdId = Date.now();
          const newBird: Bird = {
            id: birdId,
            x: randomX,
            y: randomY,
          };

          // Kapasitas maksimal burung di layar diperbanyak (hingga 10 burung sekaligus)
          setBirds((prev) => [...prev.slice(-9), newBird]);

          // Burung akan otomatis hilang sendiri setelah 1000ms (1 detik) jika tidak diklik agar tingkat kesulitan naik
          setTimeout(() => {
            setBirds((prev) => prev.filter((b) => b.id !== birdId));
          }, 1000);
        }
      }, spawnRate);
    }

    return () => {
      clearInterval(timerInterval);
      clearInterval(birdInterval);
    };
  }, [isPlaying]);

  const handleStartClick = () => {
    setShowNameModal(true);
  };

  const saveNameAndStart = () => {
    if (!playerName.trim()) {
      alert("Masukkan nama kamu terlebih dahulu ya!");
      return;
    }
    setShowNameModal(false);
    setScore(0);
    scoreRef.current = 0;
    isEndedRef.current = false;
    setTimeLeft(35);
    setBirds([]);
    setIsPlaying(true);
  };

  const handleCatchBird = (birdId: number) => {
    if (!isPlaying) return;

    setScore((prev) => {
      const nextScore = prev + 1;
      scoreRef.current = nextScore;
      return nextScore;
    });

    setBirds((prev) => prev.filter((b) => b.id !== birdId));
  };

  const endGame = async () => {
    if (isEndedRef.current) return;
    isEndedRef.current = true;

    const finalScore = scoreRef.current;

    setIsPlaying(false);
    setBirds([]);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    setShowScoreModal(true);

    if (playerName && baseUrl) {
      setIsSubmitting(true);
      try {
        await fetch(baseUrl, {
          method: "POST",
          mode: "no-cors",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sheet: "gamekicau",
            name: playerName,
            score: Number(finalScore),
            timestamp: new Date().toLocaleString(),
          }),
        });

        setTimeout(() => {
          fetchLeaderboard();
          setIsSubmitting(false);
        }, 1500);
      } catch (error) {
        console.error("Gagal menyimpan skor:", error);
        setIsSubmitting(false);
      }
    }
  };

  return (
    <main
      className="min-h-screen pt-24 pb-16 px-4 sm:px-6 relative overflow-x-hidden text-white flex flex-col justify-between"
      style={{
        background: "linear-gradient(to bottom, #1a0d14, #150b12, #0a0508)",
      }}
    >
      <Navbar />

      {/* Background Glow Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-pink-600/10 blur-[100px] sm:blur-[140px] rounded-full pointer-events-none"></div>

      <div className="container mx-auto relative z-10 max-w-2xl text-center my-auto">
        {/* Skor & Waktu */}
        <div className="text-sm sm:text-lg mb-4 text-pink-200 font-semibold bg-[#1a1017]/70 backdrop-blur-md border border-pink-500/20 py-2 px-5 sm:px-6 rounded-full inline-block shadow-lg">
          Skor: <span className="text-pink-400 font-bold">{score}</span> |
          Waktu: <span className="text-rose-400 font-bold">{timeLeft}</span>s
        </div>

        {/* Tombol Mulai */}
        <div>
          {!isPlaying && (
            <button
              onClick={handleStartClick}
              className="mb-4 sm:mb-6 px-6 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white text-sm sm:text-base rounded-full font-bold shadow-lg hover:opacity-95 hover:scale-105 transition-all cursor-pointer"
            >
              Mulai Game
            </button>
          )}
        </div>

        {/* Area Bermain (Responsif & Proporsional di HP) */}
        <div
          ref={gameAreaRef}
          className="relative w-full max-w-md mx-auto h-[380px] sm:h-[450px] bg-[#1a1017]/80 backdrop-blur-xl border-2 border-pink-500/30 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden my-4"
        >
          {!isPlaying && timeLeft === 35 && (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-pink-200/70 text-xs sm:text-sm">
              Mode Sulit Aktif! Burung akan muncul lebih cepat dan banyak.
              Tangkap sebanyak-banyaknya sebelum waktu habis!
            </div>
          )}

          {isPlaying &&
            birds.map((bird) => (
              <button
                key={bird.id}
                onClick={() => handleCatchBird(bird.id)}
                className="absolute text-2xl sm:text-3xl transition-transform active:scale-90 cursor-pointer p-2 drop-shadow-md select-none touch-manipulation animate-pulse"
                style={{ top: `${bird.y}px`, left: `${bird.x}px` }}
                title="Tangkap!"
              >
                🐦
              </button>
            ))}
        </div>

        {/* Leaderboard Section */}
        <div className="mt-8 sm:mt-12 bg-[#1a1017]/60 backdrop-blur-xl border border-pink-500/20 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl">
          <h3 className="text-lg sm:text-xl font-bold text-pink-400 mb-3 sm:mb-4 text-center">
            🏆 Leaderboard Top 3
          </h3>
          <div className="flex flex-col gap-2 max-w-xs mx-auto text-left">
            {leaderboard.length === 0 ? (
              <p className="text-xs text-center text-pink-300/60 italic">
                Memuat data leaderboard...
              </p>
            ) : (
              leaderboard.map((item, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center bg-pink-500/10 border border-pink-500/20 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm"
                >
                  <span className="font-semibold text-pink-200 truncate pr-2">
                    {idx + 1}. {item.name}
                  </span>
                  <span className="font-bold text-pink-400 whitespace-nowrap">
                    {item.score} Poin
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tombol Navigasi Kembali */}
        <div className="mt-6 sm:mt-8 flex justify-center">
          <Link
            href="/game"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full font-bold text-[10px] sm:text-xs tracking-wider text-white shadow-md transition-all duration-200 transform hover:-translate-y-0.5 border border-pink-400/30"
            style={{
              background: "linear-gradient(135deg, #ec4899, #db2777)",
            }}
          >
            <span>← Kembali ke Daftar Game</span>
          </Link>
        </div>
      </div>

      {/* Modal Input Nama (Responsif) */}
      {showNameModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#1a1017] border border-pink-500/30 p-6 sm:p-8 rounded-2xl sm:rounded-3xl text-center w-full max-w-sm shadow-2xl relative">
            <button
              onClick={() => setShowNameModal(false)}
              className="absolute top-4 right-4 text-pink-300/60 hover:text-pink-400 transition cursor-pointer"
            >
              ✕
            </button>
            <h2 className="text-xl sm:text-2xl font-bold text-pink-400 mb-4">
              Siapa Namamu?
            </h2>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Masukkan nama..."
              className="w-full p-3 bg-black/40 border border-pink-500/30 rounded-xl mb-4 text-center text-sm sm:text-base text-white focus:outline-none focus:border-pink-500"
              autoFocus
            />
            <button
              onClick={saveNameAndStart}
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold rounded-xl shadow-lg cursor-pointer text-sm sm:text-base"
            >
              Mulai!
            </button>
          </div>
        </div>
      )}

      {/* Modal Skor Akhir (Responsif) */}
      {showScoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#1a1017] border border-pink-500/30 p-6 sm:p-8 rounded-2xl sm:rounded-3xl text-center w-full max-w-sm shadow-2xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-pink-400 mb-2">
              Waktu Habis! 🎉
            </h2>
            <p className="text-base sm:text-lg mb-2 text-pink-200/80">
              Skor kamu: <strong className="text-pink-400">{score}</strong>
            </p>
            <p className="text-xs mb-6 text-pink-300/60">
              {isSubmitting
                ? "Menyimpan skor ke database..."
                : "Skor berhasil disimpan ke database!"}
            </p>
            <button
              onClick={() => setShowScoreModal(false)}
              className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-rose-600 text-white text-sm sm:text-base font-bold rounded-xl shadow-lg cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      <audio ref={audioRef} src="/assets/music/kicau.mp3" preload="auto" />
    </main>
  );
}
