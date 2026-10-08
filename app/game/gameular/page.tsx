"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Position = { x: number; y: number };

const GRID_SIZE = 17;
const INITIAL_SPEED = 180;
const SPEED_INCREMENT = 8;
const MIN_SPEED = 80;

const INITIAL_SNAKE: Position[] = [
  { x: 8, y: 8 },
  { x: 8, y: 9 },
  { x: 8, y: 10 },
];

export default function GameUlarPage() {
  const [snake, setSnake] = useState<Position[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<Position>({ x: 4, y: 4 });
  const [direction, setDirection] = useState<Direction>("UP");
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  const directionRef = useRef<Direction>("UP");
  const snakeRef = useRef<Position[]>(snake);
  const foodRef = useRef<Position>(food);
  const scoreRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("altaf_snake_highscore");
      if (saved) setHighScore(parseInt(saved, 10));
    }
  }, []);

  useEffect(() => {
    snakeRef.current = snake;
  }, [snake]);
  useEffect(() => {
    foodRef.current = food;
  }, [food]);
  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  const generateFood = useCallback((currentSnake: Position[]): Position => {
    let newFood: Position;
    let attempts = 0;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      attempts++;
    } while (
      currentSnake.some((s) => s.x === newFood.x && s.y === newFood.y) &&
      attempts < 200
    );
    return newFood;
  }, []);

  useEffect(() => {
    if (!gameStarted || gameOver || isPaused) return;

    const speed = Math.max(MIN_SPEED, INITIAL_SPEED - score * SPEED_INCREMENT);

    const interval = setInterval(() => {
      const currentSnake = snakeRef.current;
      const currentDirection = directionRef.current;
      const currentFood = foodRef.current;

      const head = currentSnake[0];
      let newHead: Position = { ...head };

      switch (currentDirection) {
        case "UP":
          newHead.y -= 1;
          break;
        case "DOWN":
          newHead.y += 1;
          break;
        case "LEFT":
          newHead.x -= 1;
          break;
        case "RIGHT":
          newHead.x += 1;
          break;
      }

      if (
        newHead.x < 0 ||
        newHead.x >= GRID_SIZE ||
        newHead.y < 0 ||
        newHead.y >= GRID_SIZE
      ) {
        handleGameOver();
        return;
      }

      const bodyToCheck = currentSnake.slice(0, -1);
      if (bodyToCheck.some((s) => s.x === newHead.x && s.y === newHead.y)) {
        handleGameOver();
        return;
      }

      const newSnake = [newHead, ...currentSnake];

      if (newHead.x === currentFood.x && newHead.y === currentFood.y) {
        setSnake(newSnake);
        setScore((prev) => prev + 1);
        setFood(generateFood(newSnake));
      } else {
        newSnake.pop();
        setSnake(newSnake);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [gameStarted, gameOver, isPaused, score, generateFood]);

  const handleGameOver = () => {
    setGameOver(true);
    setGameStarted(false);
    const finalScore = scoreRef.current;
    if (finalScore > highScore) {
      setHighScore(finalScore);
      if (typeof window !== "undefined") {
        localStorage.setItem("altaf_snake_highscore", finalScore.toString());
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameStarted || gameOver) return;

      const currentDir = directionRef.current;

      const keyMap: Record<string, Direction> = {
        ArrowUp: "UP",
        KeyW: "UP",
        ArrowDown: "DOWN",
        KeyS: "DOWN",
        ArrowLeft: "LEFT",
        KeyA: "LEFT",
        ArrowRight: "RIGHT",
        KeyD: "RIGHT",
      };

      const newDir = keyMap[e.code];
      if (!newDir) return;

      e.preventDefault();

      const opposites: Record<Direction, Direction> = {
        UP: "DOWN",
        DOWN: "UP",
        LEFT: "RIGHT",
        RIGHT: "LEFT",
      };

      if (opposites[newDir] === currentDir) return;

      setDirection(newDir);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameStarted, gameOver]);

  const changeDirection = (newDir: Direction) => {
    if (!gameStarted || gameOver) return;
    const currentDir = directionRef.current;
    const opposites: Record<Direction, Direction> = {
      UP: "DOWN",
      DOWN: "UP",
      LEFT: "RIGHT",
      RIGHT: "LEFT",
    };
    if (opposites[newDir] === currentDir) return;
    setDirection(newDir);
  };

  const startGame = () => {
    const initialSnake = [
      { x: 8, y: 8 },
      { x: 8, y: 9 },
      { x: 8, y: 10 },
    ];
    setSnake(initialSnake);
    snakeRef.current = initialSnake;
    setDirection("UP");
    directionRef.current = "UP";
    setScore(0);
    scoreRef.current = 0;
    setGameOver(false);
    setIsPaused(false);
    setFood(generateFood(initialSnake));
    setGameStarted(true);
  };

  const togglePause = () => {
    if (!gameStarted || gameOver) return;
    setIsPaused((p) => !p);
  };

  const getSpeedLevel = () => {
    const level = Math.floor(score / 5) + 1;
    return Math.min(level, 10);
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
        className="min-h-[100dvh] w-full overflow-y-auto flex flex-col justify-between pt-24 pb-6 px-4 select-none text-white"
        style={{
          background: "linear-gradient(to bottom, #1a0d14, #150b12, #0a0508)",
          fontFamily: "Georgia, serif",
        }}
      >
        <Navbar />

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] sm:w-[600px] sm:h-[600px] bg-pink-600/10 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="container mx-auto px-2 relative z-10 my-auto max-w-md flex flex-col items-center justify-center space-y-3">
          {/* Header Info */}
          <div className="text-center space-y-2 w-full">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-300 text-[9px] font-bold uppercase tracking-widest">
              🐍 Game Ular Bucin
            </span>

            <div className="flex justify-between items-center px-1 text-[11px] text-pink-200/80 pt-1">
              <span>
                Skor: <strong className="text-white">{score}</strong>
              </span>
              <span>
                Level:{" "}
                <strong className="text-pink-400">{getSpeedLevel()}</strong>
              </span>
              <span>
                🏆 <strong className="text-pink-400">{highScore}</strong>
              </span>
            </div>
          </div>

          {/* Area Bermain */}
          <div className="bg-[#120a0f]/90 backdrop-blur-xl border border-pink-500/35 p-2 sm:p-3 rounded-2xl shadow-xl relative">
            <div
              className="grid gap-[1px] bg-pink-500/20 p-1 rounded-xl relative"
              style={{
                gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
                width: "min(85vw, 400px)",
                height: "min(85vw, 400px)",
              }}
            >
              {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
                const x = i % GRID_SIZE;
                const y = Math.floor(i / GRID_SIZE);

                // HANYA tampilkan ular & makanan saat game sudah dimulai
                const isHead =
                  gameStarted && snake[0]?.x === x && snake[0]?.y === y;
                const isBody =
                  gameStarted &&
                  snake.slice(1).some((s) => s.x === x && s.y === y);
                const isFood = gameStarted && food.x === x && food.y === y;

                return (
                  <div
                    key={i}
                    className={`flex items-center justify-center rounded-[2px] transition-all duration-75 ${
                      isHead
                        ? "bg-gradient-to-br from-pink-400 to-rose-600 shadow-md shadow-pink-500/50 scale-105 z-10 rounded-sm"
                        : isBody
                        ? "bg-pink-500/70 rounded-sm"
                        : isFood
                        ? "bg-rose-500/30 animate-pulse rounded-sm"
                        : "bg-[#1a0d14]/40"
                    }`}
                  >
                    {isHead && (
                      <span className="text-[8px] sm:text-[11px]">🐍</span>
                    )}
                    {isFood && !isHead && (
                      <span className="text-[8px] sm:text-[11px]">💖</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Overlay Start */}
            {!gameStarted && !gameOver && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md rounded-2xl p-4 text-center z-20">
                <div className="text-4xl mb-3">🐍💖</div>
                <p className="text-pink-200/80 text-xs sm:text-sm mb-4 px-4 leading-relaxed">
                  Bantu ular kumpulkan hati sebanyak-banyaknya! Hindari tembok
                  dan badan sendiri.
                </p>
                <button
                  onClick={startGame}
                  className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-rose-600 text-white text-sm font-bold rounded-full shadow-lg hover:opacity-95 hover:scale-105 transition-all cursor-pointer"
                >
                  Mulai Game 🎮
                </button>
              </div>
            )}

            {/* Overlay Pause */}
            {isPaused && gameStarted && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md rounded-2xl p-4 text-center z-20">
                <div className="text-4xl mb-3">⏸️</div>
                <p className="text-white text-base font-bold mb-3">
                  Game Dijeda
                </p>
                <button
                  onClick={togglePause}
                  className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-rose-600 text-white text-sm font-bold rounded-full shadow-lg hover:opacity-95 transition-all cursor-pointer"
                >
                  Lanjutkan ▶️
                </button>
              </div>
            )}
          </div>

          {/* Kontrol D-Pad */}
          <div className="grid grid-cols-3 gap-1 w-32 mx-auto">
            <div></div>
            <button
              onClick={() => changeDirection("UP")}
              disabled={!gameStarted || gameOver}
              className="bg-pink-500/20 hover:bg-pink-500/40 border border-pink-500/30 text-white font-bold py-1.5 rounded-lg text-xs transition active:scale-90 flex items-center justify-center shadow-sm disabled:opacity-40"
            >
              ⬆️
            </button>
            <div></div>
            <button
              onClick={() => changeDirection("LEFT")}
              disabled={!gameStarted || gameOver}
              className="bg-pink-500/20 hover:bg-pink-500/40 border border-pink-500/30 text-white font-bold py-1.5 rounded-lg text-xs transition active:scale-90 flex items-center justify-center shadow-sm disabled:opacity-40"
            >
              ⬅️
            </button>
            <button
              onClick={() => changeDirection("DOWN")}
              disabled={!gameStarted || gameOver}
              className="bg-pink-500/20 hover:bg-pink-500/40 border border-pink-500/30 text-white font-bold py-1.5 rounded-lg text-xs transition active:scale-90 flex items-center justify-center shadow-sm disabled:opacity-40"
            >
              ⬇️
            </button>
            <button
              onClick={() => changeDirection("RIGHT")}
              disabled={!gameStarted || gameOver}
              className="bg-pink-500/20 hover:bg-pink-500/40 border border-pink-500/30 text-white font-bold py-1.5 rounded-lg text-xs transition active:scale-90 flex items-center justify-center shadow-sm disabled:opacity-40"
            >
              ➡️
            </button>
          </div>

          {/* Tombol Pause */}
          {gameStarted && !gameOver && (
            <button
              onClick={togglePause}
              className="text-[10px] text-pink-400 bg-pink-500/20 hover:bg-pink-500/30 px-4 py-1.5 rounded-full border border-pink-500/30 transition"
            >
              {isPaused ? "▶️ Lanjutkan" : "⏸️ Jeda Game"}
            </button>
          )}

          <p className="text-[9px] text-pink-300/50 text-center px-4">
            💡 Gunakan tombol panah / WASD untuk bergerak
          </p>

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

        {/* Modal Game Over */}
        {gameOver && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
            <div className="bg-[#1a1017] border border-pink-500/40 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl space-y-3">
              <div className="text-4xl animate-bounce">
                {score >= 15 ? "🏆" : score >= 8 ? "💖" : "🐍"}
              </div>
              <h2 className="text-xl font-black text-white">
                {score >= 15
                  ? "Hebat Luar Biasa!"
                  : score >= 8
                  ? "Bagus Sekali!"
                  : "Coba Lagi Yuk!"}
              </h2>
              <div className="py-2">
                <p className="text-xs text-pink-300/70 mb-1">Skor Kamu</p>
                <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-500">
                  {score}
                </p>
                {score >= highScore && score > 0 && (
                  <p className="text-[10px] text-yellow-400 font-bold mt-1">
                    ✨ Rekor Baru! ✨
                  </p>
                )}
              </div>
              <p className="text-pink-200/80 text-xs leading-relaxed px-2">
                {score >= 15
                  ? "Kamu jago banget main ularnya! Koleksi hatinya banyak! 💖"
                  : score >= 8
                  ? "Kerja bagus! Sedikit lagi jadi master ular bucin!"
                  : "Jangan menyerah! Coba lagi dan kumpulkan lebih banyak hati 💕"}
              </p>
              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={startGame}
                  className="w-full py-2.5 rounded-full font-bold text-xs text-white shadow-lg border border-pink-400/30 transition hover:opacity-90 cursor-pointer"
                  style={{
                    background: "linear-gradient(135deg, #ec4899, #db2777)",
                  }}
                >
                  Main Lagi 🔄
                </button>
                <Link
                  href="/game"
                  className="w-full py-2 rounded-full font-bold text-xs text-pink-200 bg-pink-500/20 border border-pink-500/30 transition hover:bg-pink-500/30 text-center"
                >
                  Kembali ke Arena 🎮
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
