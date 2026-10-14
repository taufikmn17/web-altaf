"use client";

import {
  ArrowLeft,
  Crosshair,
  Heart,
  Rocket,
  Sparkles,
  Timer,
  Trophy,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type GamePhase = "menu" | "playing" | "over";

type Orb = {
  id: string;
  x: number;
  y: number;
  size: number;
  bornAt: number;
  lifetime: number;
  tone: "cyan" | "orange" | "gold";
};

const STORAGE_KEY = "altaf-orb-blitz-highscore";
const MAX_LIVES = 3;
const START_SPAWN_MS = 900;
const MIN_SPAWN_MS = 320;
const START_LIFE_MS = 1800;
const MIN_LIFE_MS = 720;
const MAX_ORBS = 5;

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function makeOrb(now: number, lifetime: number): Orb {
  const tones: Orb["tone"][] = ["cyan", "orange", "gold"];
  return {
    id: crypto.randomUUID(),
    x: randomBetween(10, 88),
    y: randomBetween(14, 86),
    size: randomBetween(52, 78),
    bornAt: now,
    lifetime,
    tone: tones[Math.floor(Math.random() * tones.length)],
  };
}

function readHighScore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
  } catch {
    return 0;
  }
}

export default function OrbBlitzGame() {
  const [phase, setPhase] = useState<GamePhase>("menu");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [orbs, setOrbs] = useState<Orb[]>([]);
  const [highScore, setHighScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [hitFlash, setHitFlash] = useState(0);

  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const livesRef = useRef(MAX_LIVES);
  const phaseRef = useRef<GamePhase>("menu");
  const startedAtRef = useRef(0);
  const nextSpawnAtRef = useRef(0);
  const arenaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setHighScore(readHighScore());
  }, []);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (phase !== "playing") return;

    let frame = 0;

    let lastHudSecond = -1;

    const tick = (now: number) => {
      if (phaseRef.current !== "playing") return;

      const runMs = now - startedAtRef.current;
      const second = Math.floor(runMs / 1000);
      if (second !== lastHudSecond) {
        lastHudSecond = second;
        setElapsedMs(runMs);
      }

      const difficulty = Math.min(1, runMs / 45_000);
      const lifetime = Math.round(START_LIFE_MS - (START_LIFE_MS - MIN_LIFE_MS) * difficulty);
      const spawnGap = Math.round(START_SPAWN_MS - (START_SPAWN_MS - MIN_SPAWN_MS) * difficulty);

      setOrbs((current) => {
        const alive = current.filter((orb) => now - orb.bornAt < orb.lifetime);
        const expiredCount = current.length - alive.length;
        let next = alive;
        let changed = expiredCount > 0;

        if (expiredCount > 0) {
          const nextLives = Math.max(0, livesRef.current - expiredCount);
          livesRef.current = nextLives;
          setLives(nextLives);
          comboRef.current = 0;
          setCombo(0);

          if (nextLives === 0) {
            const finalScore = scoreRef.current;
            const previousBest = readHighScore();
            const beatRecord = finalScore > previousBest;

            if (beatRecord) {
              try {
                localStorage.setItem(STORAGE_KEY, String(finalScore));
              } catch {
                /* ignore quota / private mode */
              }
              setHighScore(finalScore);
            }

            setIsNewRecord(beatRecord);
            phaseRef.current = "over";
            setPhase("over");
            return [];
          }
        }

        if (now >= nextSpawnAtRef.current && next.length < MAX_ORBS) {
          next = [...next, makeOrb(now, lifetime)];
          nextSpawnAtRef.current = now + spawnGap;
          changed = true;
        }

        return changed ? next : current;
      });

      if (phaseRef.current === "playing") {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  const startGame = () => {
    const now = performance.now();
    scoreRef.current = 0;
    comboRef.current = 0;
    livesRef.current = MAX_LIVES;
    startedAtRef.current = now;
    nextSpawnAtRef.current = now + 420;

    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setLives(MAX_LIVES);
    setOrbs([]);
    setElapsedMs(0);
    setIsNewRecord(false);
    setHitFlash(0);
    setPhase("playing");
  };

  const hitOrb = (orbId: string) => {
    if (phaseRef.current !== "playing") return;

    setOrbs((current) => current.filter((orb) => orb.id !== orbId));

    const nextCombo = comboRef.current + 1;
    comboRef.current = nextCombo;
    setCombo(nextCombo);
    setBestCombo((best) => Math.max(best, nextCombo));

    const gain = 10 + Math.min(40, (nextCombo - 1) * 4);
    const nextScore = scoreRef.current + gain;
    scoreRef.current = nextScore;
    setScore(nextScore);
    setHitFlash((value) => value + 1);
  };

  const missArena = (event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (phaseRef.current !== "playing") return;
    if (event.target !== arenaRef.current) return;
    comboRef.current = 0;
    setCombo(0);
  };

  const seconds = Math.floor(elapsedMs / 1000);

  return (
    <main className="orb-blitz-shell">
      <div className="orb-blitz-topbar">
        <Link href="/game" className="orb-blitz-back">
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Semua game</span>
        </Link>
        <span className="orb-blitz-season">OFFLINE ARCADE / 02</span>
      </div>

      <section className="orb-blitz-layout">
        <header className="orb-blitz-heading">
          <div className="orb-blitz-kicker">
            <Crosshair size={14} /> REACTION TARGET GAME
          </div>
          <h1>
            Orb Blitz<span>!</span>
          </h1>
          <p>Tap orb sebelum menghilang. Jaga combo, kejar high score.</p>
        </header>

        {phase === "menu" && (
          <section className="orb-blitz-panel">
            <div className="orb-blitz-intro">
              <div className="orb-blitz-orb-static" aria-hidden="true">
                <Zap size={28} fill="currentColor" />
              </div>
              <div>
                <h2>Satu jari. Banyak orb.</h2>
                <p>
                  Orb muncul di arena. Tap tepat waktu, rangkai combo, dan bertahan
                  selama mungkin. Tanpa login, tanpa room — langsung main.
                </p>
              </div>
            </div>

            <div className="orb-blitz-stats">
              <div>
                <Trophy size={16} />
                <span>HIGH SCORE</span>
                <strong>{highScore}</strong>
              </div>
              <div>
                <Heart size={16} />
                <span>NYAWA</span>
                <strong>{MAX_LIVES}</strong>
              </div>
              <div>
                <Sparkles size={16} />
                <span>COMBO</span>
                <strong>x∞</strong>
              </div>
            </div>

            <button className="orb-blitz-primary" type="button" onClick={startGame}>
              <Rocket size={17} /> Mulai blitz
            </button>

            <ul className="orb-blitz-howto">
              <li>Tap orb = skor + combo</li>
              <li>Orb habis sendiri = nyawa berkurang</li>
              <li>Tap area kosong = combo reset</li>
            </ul>
          </section>
        )}

        {phase === "playing" && (
          <section className="orb-blitz-play">
            <div className="orb-blitz-hud">
              <div>
                <span>SKOR</span>
                <strong key={hitFlash}>{score}</strong>
              </div>
              <div>
                <span>COMBO</span>
                <strong className={combo >= 5 ? "is-hot" : ""}>x{combo}</strong>
              </div>
              <div>
                <span>WAKTU</span>
                <strong>
                  <Timer size={15} aria-hidden="true" /> {String(seconds).padStart(2, "0")}s
                </strong>
              </div>
              <div className="orb-blitz-lives" aria-label={`${lives} nyawa tersisa`}>
                {Array.from({ length: MAX_LIVES }, (_, index) => (
                  <Heart
                    key={index}
                    size={18}
                    className={index < lives ? "is-alive" : ""}
                    fill={index < lives ? "currentColor" : "none"}
                  />
                ))}
              </div>
            </div>

            <div
              ref={arenaRef}
              className="orb-blitz-arena"
              onMouseDown={missArena}
              onTouchStart={missArena}
              role="application"
              aria-label="Arena Orb Blitz"
            >
              {orbs.map((orb) => (
                <button
                  key={orb.id}
                  type="button"
                  className={`orb-blitz-target tone-${orb.tone}`}
                  style={{
                    left: `${orb.x}%`,
                    top: `${orb.y}%`,
                    width: orb.size,
                    height: orb.size,
                    animationDuration: `${orb.lifetime}ms`,
                  }}
                  onMouseDown={(event) => {
                    event.stopPropagation();
                    hitOrb(orb.id);
                  }}
                  onTouchStart={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    hitOrb(orb.id);
                  }}
                  aria-label="Tap orb"
                >
                  <span />
                </button>
              ))}
              {orbs.length === 0 && (
                <p className="orb-blitz-waiting">Orb datang…</p>
              )}
            </div>
          </section>
        )}

        {phase === "over" && (
          <section className="orb-blitz-panel orb-blitz-over">
            <div className="orb-blitz-finish-mark">GAME OVER</div>
            <h2>{isNewRecord ? "Rekor baru!" : "Blitz selesai"}</h2>
            <p>
              {isNewRecord
                ? "Jempolmu lagi on fire. High score tersimpan di perangkat ini."
                : "Coba lagi — jaga combo biar skor meledak."}
            </p>

            <div className="orb-blitz-results">
              <div>
                <span>SKOR</span>
                <strong>{score}</strong>
              </div>
              <div>
                <span>BEST COMBO</span>
                <strong>x{bestCombo}</strong>
              </div>
              <div>
                <span>HIGH SCORE</span>
                <strong>{Math.max(highScore, score)}</strong>
              </div>
            </div>

            <div className="orb-blitz-over-actions">
              <button className="orb-blitz-primary" type="button" onClick={startGame}>
                <Rocket size={17} /> Main lagi
              </button>
              <button
                className="orb-blitz-secondary"
                type="button"
                onClick={() => setPhase("menu")}
              >
                Menu
              </button>
            </div>
          </section>
        )}

        <footer className="orb-blitz-footnote">
          <span>100% OFFLINE</span>
          <span>LOCAL HIGH SCORE</span>
          <span>NO SUPABASE</span>
        </footer>
      </section>
    </main>
  );
}
