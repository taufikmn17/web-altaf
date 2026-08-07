"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";

// Fungsi Algoritma BFS untuk menghitung jarak terpendek yang akurat secara otomatis dari peta labirin
const calculateShortestPath = (
  mapData: number[][],
  start: { x: number; y: number },
  finish: { x: number; y: number }
) => {
  const queue: { x: number; y: number; dist: number }[] = [
    { x: start.x, y: start.y, dist: 0 },
  ];
  const visited: boolean[][] = Array.from({ length: mapData.length }, () =>
    Array(mapData[0].length).fill(false)
  );
  visited[start.y][start.x] = true;

  const directions = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.x === finish.x && current.y === finish.y) {
      return current.dist;
    }

    for (const dir of directions) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;

      if (
        ny >= 0 &&
        ny < mapData.length &&
        nx >= 0 &&
        nx < mapData[0].length &&
        mapData[ny][nx] !== 1 &&
        !visited[ny][nx]
      ) {
        visited[ny][nx] = true;
        queue.push({ x: nx, y: ny, dist: current.dist + 1 });
      }
    }
  }
  return 20;
};

// Koleksi Lintasan Labirin (0: Jalan, 1: Tembok, 2: Start, 3: Finish)
const rawMazeVariations = [
  {
    id: 1,
    name: "Lintasan 1: Kenangan Pertama 🌸",
    map: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [2, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
      [1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1],
      [1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 3, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
  },
  {
    id: 2,
    name: "Lintasan 2: Lorong Waktu Berdua 💫",
    map: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 3, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1],
      [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
      [1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1],
      [1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
  },
  {
    id: 3,
    name: "Lintasan 3: Labirin Masa Depan 💖",
    map: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 2, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1],
      [1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
      [1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 3, 1],
      [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
      [1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1],
      [1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
  },
];

const getCoords = (mapData: number[][]) => {
  let start = { x: 0, y: 1 };
  let finish = { x: 0, y: 0 };
  for (let y = 0; y < mapData.length; y++) {
    for (let x = 0; x < mapData[y].length; x++) {
      if (mapData[y][x] === 2) start = { x, y };
      if (mapData[y][x] === 3) finish = { x, y };
    }
  }
  return { start, finish };
};

export default function GameLabirinPage() {
  const [currentMazeIndex, setCurrentMazeIndex] = useState(0);
  const activeMazeData = rawMazeVariations[currentMazeIndex];

  const { start, finish } = getCoords(activeMazeData.map);
  const optimalSteps = calculateShortestPath(activeMazeData.map, start, finish);

  const [playerPosition, setPlayerPosition] = useState(start);
  const [isWon, setIsWon] = useState(false);
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    const newCoords = getCoords(activeMazeData.map);
    setPlayerPosition(newCoords.start);
    setMoves(0);
    setIsWon(false);
  }, [currentMazeIndex]);

  const movePlayer = (dx: number, dy: number) => {
    if (isWon) return;

    const newX = playerPosition.x + dx;
    const newY = playerPosition.y + dy;

    if (
      newY >= 0 &&
      newY < activeMazeData.map.length &&
      newX >= 0 &&
      newX < activeMazeData.map[0].length
    ) {
      if (activeMazeData.map[newY][newX] !== 1) {
        setPlayerPosition({ x: newX, y: newY });
        setMoves((prev) => prev + 1);

        if (activeMazeData.map[newY][newX] === 3) {
          setIsWon(true);
        }
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "KeyW"].includes(e.code)) {
        e.preventDefault();
        movePlayer(0, -1);
      }
      if (["ArrowDown", "KeyS"].includes(e.code)) {
        e.preventDefault();
        movePlayer(0, 1);
      }
      if (["ArrowLeft", "KeyA"].includes(e.code)) {
        e.preventDefault();
        movePlayer(-1, 0);
      }
      if (["ArrowRight", "KeyD"].includes(e.code)) {
        e.preventDefault();
        movePlayer(1, 0);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [playerPosition, isWon, activeMazeData]);

  const resetGame = () => {
    const newCoords = getCoords(activeMazeData.map);
    setPlayerPosition(newCoords.start);
    setIsWon(false);
    setMoves(0);
  };

  const nextMaze = () => {
    const nextIdx = (currentMazeIndex + 1) % rawMazeVariations.length;
    setCurrentMazeIndex(nextIdx);
  };

  return (
    <>
      <style jsx global>{`
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #db2777;
          border-radius: 9999px;
        }
      `}</style>

      <main
        className="h-[100dvh] w-full overflow-y-auto flex flex-col justify-between pt-24 pb-6 px-4 select-none"
        style={{
          background: "linear-gradient(to bottom, #1a0d14, #150b12, #0a0508)",
        }}
      >
        <Navbar />

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-pink-600/10 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="container mx-auto px-2 relative z-10 my-auto max-w-md flex flex-col items-center justify-center space-y-3">
          {/* Header & Ganti Lintasan */}
          <div className="text-center space-y-1 w-full">
            <div className="flex items-center justify-between px-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-300 text-[9px] font-bold uppercase tracking-widest">
                🗺️ {activeMazeData.name}
              </span>
              <button
                onClick={nextMaze}
                className="text-[10px] text-pink-400 bg-pink-500/20 hover:bg-pink-500/30 px-2.5 py-0.5 rounded-full border border-pink-500/30 transition"
              >
                Ganti Lintasan 🔀
              </button>
            </div>

            <div className="flex justify-between items-center px-1 text-[11px] text-pink-200/80 pt-1">
              <span>
                Langkahmu: <strong className="text-white">{moves}</strong>
              </span>
              <span>
                Target Terpendek:{" "}
                <strong className="text-pink-400">
                  {optimalSteps} langkah
                </strong>
              </span>
            </div>
          </div>

          {/* Kotak Area Labirin */}
          <div className="bg-[#120a0f]/90 backdrop-blur-xl border border-pink-500/35 p-1.5 rounded-2xl shadow-xl">
            <div
              className="grid gap-[1px] bg-pink-500/20 p-1 rounded-xl"
              style={{
                gridTemplateColumns: `repeat(${activeMazeData.map[0].length}, minmax(0, 1fr))`,
              }}
            >
              {activeMazeData.map.map((row, y) =>
                row.map((cell, x) => {
                  const isPlayer =
                    playerPosition.x === x && playerPosition.y === y;
                  const isFinish = cell === 3;
                  const isWall = cell === 1;

                  return (
                    <div
                      key={`${y}-${x}`}
                      className={`w-3.5 h-3.5 sm:w-5 sm:h-5 md:w-6 md:h-6 flex items-center justify-center rounded-[2px] transition-all duration-75 ${
                        isWall
                          ? "bg-[#2d1624]"
                          : isPlayer
                          ? "bg-pink-500 shadow-md shadow-pink-500/50 scale-105 z-10 rounded-sm"
                          : isFinish
                          ? "bg-rose-500/30 animate-pulse rounded-sm"
                          : "bg-[#1a0d14]/40"
                      }`}
                    >
                      {isPlayer && (
                        <span className="text-[9px] sm:text-xs">🧸</span>
                      )}
                      {isFinish && !isPlayer && (
                        <span className="text-[9px] sm:text-xs">💖</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Kontrol D-Pad Kompak */}
          <div className="grid grid-cols-3 gap-1 w-32 mx-auto">
            <div></div>
            <button
              onClick={() => movePlayer(0, -1)}
              className="bg-pink-500/20 hover:bg-pink-500/40 border border-pink-500/30 text-white font-bold py-1.5 rounded-lg text-xs transition active:scale-90 flex items-center justify-center shadow-sm"
            >
              ⬆️
            </button>
            <div></div>
            <button
              onClick={() => movePlayer(-1, 0)}
              className="bg-pink-500/20 hover:bg-pink-500/40 border border-pink-500/30 text-white font-bold py-1.5 rounded-lg text-xs transition active:scale-90 flex items-center justify-center shadow-sm"
            >
              ⬅️
            </button>
            <button
              onClick={() => movePlayer(0, 1)}
              className="bg-pink-500/20 hover:bg-pink-500/40 border border-pink-500/30 text-white font-bold py-1.5 rounded-lg text-xs transition active:scale-90 flex items-center justify-center shadow-sm"
            >
              ⬇️
            </button>
            <button
              onClick={() => movePlayer(1, 0)}
              className="bg-pink-500/20 hover:bg-pink-500/40 border border-pink-500/30 text-white font-bold py-1.5 rounded-lg text-xs transition active:scale-90 flex items-center justify-center shadow-sm"
            >
              ➡️
            </button>
          </div>

          {/* Tombol Navigasi Kembali */}
          <div>
            <Link
              href="/game"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full font-bold text-[10px] tracking-wider text-white shadow-md transition-all duration-200 transform hover:-translate-y-0.5 border border-pink-400/30"
              style={{
                background: "linear-gradient(135deg, #ec4899, #db2777)",
              }}
            >
              <span>← Kembali ke Daftar Game</span>
            </Link>
          </div>
        </div>

        {/* Modal Evaluasi Sesuai Target Terpendek */}
        {isWon && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
            <div className="bg-[#1a1017] border border-pink-500/40 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl space-y-3">
              <div className="text-4xl animate-bounce">
                {moves <= optimalSteps ? "🏆" : "💖"}
              </div>
              <h2 className="text-xl font-black text-white">
                {moves <= optimalSteps
                  ? "Sempurna & Sesuai Target!"
                  : "Berhasil, Tapi Agak Memutar!"}
              </h2>
              <p className="text-pink-200/80 text-xs leading-relaxed">
                Kamu menyelesaikan lintasan dalam{" "}
                <strong className="text-white">{moves} langkah</strong> (Target
                minimal: {optimalSteps} langkah).
                {moves <= optimalSteps ? (
                  <span className="block text-pink-400 mt-1 font-semibold">
                    Hebat! Kamu mengambil jalur terpendek yang sangat akurat! ✨
                  </span>
                ) : (
                  <span className="block text-yellow-300 mt-1">
                    Langkahmu sedikit melebihi target terpendek. Sepertinya
                    terlalu asyik bernostalgia ya? 😉
                  </span>
                )}
              </p>
              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={resetGame}
                  className="w-full py-2.5 rounded-full font-bold text-xs text-white shadow-lg border border-pink-400/30 transition hover:opacity-90"
                  style={{
                    background: "linear-gradient(135deg, #ec4899, #db2777)",
                  }}
                >
                  Coba Lagi (Ulangi Lintasan) 🔄
                </button>
                <button
                  onClick={nextMaze}
                  className="w-full py-2 rounded-full font-bold text-xs text-pink-200 bg-pink-500/20 border border-pink-500/30 transition hover:bg-pink-500/30"
                >
                  Pindah ke Lintasan Lain 🔀
                </button>
                <Link
                  href="/game"
                  className="w-full py-2 rounded-full font-bold text-xs text-pink-300/70 hover:text-white transition"
                >
                  Kembali ke Arena
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="text-center text-[9px] text-pink-300/40 pt-4 pb-1">
          Altaf Story &copy; 2026
        </div>
      </main>
    </>
  );
}
