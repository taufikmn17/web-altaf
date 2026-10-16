"use client";

import {
  ArrowLeft,
  Check,
  Copy,
  DoorOpen,
  Palette,
  Radio,
  Rocket,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/app/lib/supabase-browser";

type RoomPlayer = {
  id: string;
  name: string;
  isHost: boolean;
  ready: boolean;
};

type GamePhase = "lobby" | "playing" | "results";

type Vec = { x: number; y: number };

type PlayerState = {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  score: number;
};

const COLS = 15;
const ROWS = 15;
const TICK_MS = 90;
const ROUND_TIME_MS = 60_000;
const ROOM_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const P1_COLOR = "#ec4899"; // pink
const P2_COLOR = "#22d3ee"; // cyan

type PowerUp = {
  id: string;
  type: "double" | "speed";
  x: number;
  y: number;
  spawnedAt: number;
  expiresAt: number;
};

const START_POSITIONS: Vec[] = [
  { x: 2, y: 7 },
  { x: 12, y: 7 },
];

function makeRoomCode() {
  const values = new Uint32Array(6);
  crypto.getRandomValues(values);
  return Array.from(
    values,
    (value) => ROOM_CHARACTERS[value % ROOM_CHARACTERS.length],
  ).join("");
}

function directionFromKey(key: string): Vec | null {
  switch (key.toLowerCase()) {
    case "arrowup":
    case "w":
      return { x: 0, y: -1 };
    case "arrowdown":
    case "s":
      return { x: 0, y: 1 };
    case "arrowleft":
    case "a":
      return { x: -1, y: 0 };
    case "arrowright":
    case "d":
      return { x: 1, y: 0 };
    default:
      return null;
  }
}

function makeEmptyGrid(): (string | null)[][] {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => null),
  );
}

export default function ColorWars() {
  const supabase = getSupabaseBrowserClient();
  const [playerId, setPlayerId] = useState("");
  const channelRef = useRef<RealtimeChannel | null>(null);
  const loopRef = useRef<number | null>(null);

  const [playerName, setPlayerName] = useState("");
  const [roomInput, setRoomInput] = useState("");
  const [activeRoom, setActiveRoom] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [phase, setPhase] = useState<GamePhase>("lobby");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [joiningRoom, setJoiningRoom] = useState(false);

  const [myPos, setMyPos] = useState<Vec | null>(null);
  const [peer, setPeer] = useState<PlayerState | null>(null);
  const [grid, setGrid] = useState<(string | null)[][]>(() => makeEmptyGrid());
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [roundEndsAt, setRoundEndsAt] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(ROUND_TIME_MS);
  const [myScore, setMyScore] = useState(0);
  const [peerScore, setPeerScore] = useState(0);
  const [activePower, setActivePower] = useState<"double" | "speed" | null>(
    null,
  );
  const [activePowerUntil, setActivePowerUntil] = useState(0);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [winnerName, setWinnerName] = useState("");

  const myPosRef = useRef<Vec | null>(null);
  const gridRef = useRef<(string | null)[][]>(makeEmptyGrid());
  const dirQueueRef = useRef<Vec[]>([]);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const phaseRef = useRef<GamePhase>("lobby");
  const activePowerRef = useRef<"double" | "speed" | null>(null);
  const myScoreRef = useRef(0);
  const powerUpsRef = useRef<PowerUp[]>([]);

  useEffect(() => {
    myPosRef.current = myPos;
  }, [myPos]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    activePowerRef.current = activePower;
  }, [activePower]);
  useEffect(() => {
    myScoreRef.current = myScore;
  }, [myScore]);
  useEffect(() => {
    powerUpsRef.current = powerUps;
  }, [powerUps]);

  const pushDir = (dir: Vec) => {
    const q = dirQueueRef.current;
    if (q.length > 2) return;
    q.push(dir);
  };

  const myColor = isHost ? P1_COLOR : P2_COLOR;

  // Helper: update grid state + gridRef sinkron
  const updateGrid = (
    updater: (current: (string | null)[][]) => (string | null)[][],
  ) => {
    const next = updater(gridRef.current);
    gridRef.current = next;
    setGrid(next);
  };

  // ---- Realtime channel ----
  useEffect(() => {
    if (!activeRoom || !supabase || !playerId) return;

    const channel = supabase.channel(`color-wars:${activeRoom}`, {
      config: {
        broadcast: { self: false },
        presence: { key: playerId },
      },
    });
    channelRef.current = channel;

    const syncFromPresence = () => {
      const state = channel.presenceState<RoomPlayer>();
      const connected = Object.values(state)
        .flat()
        .filter((p) => p.id && !p.id.startsWith("peek-"))
        .sort((a, b) => Number(b.isHost) - Number(a.isHost));
      setPlayers(connected);
    };

    channel.on("presence", { event: "sync" }, syncFromPresence);
    channel.on("presence", { event: "join" }, syncFromPresence);
    channel.on("presence", { event: "leave" }, syncFromPresence);

    channel.on("broadcast", { event: "game-reset" }, () => {
      const empty = makeEmptyGrid();
      gridRef.current = empty;
      setGrid(empty);
      setMyPos(null);
      setPeer(null);
      setPowerUps([]);
      setRoundEndsAt(null);
      setMyScore(0);
      setPeerScore(0);
      setActivePower(null);
      setWinnerId(null);
      setWinnerName("");
      setPhase("lobby");
      dirQueueRef.current = [];
    });

    channel.on("broadcast", { event: "round-start" }, ({ payload }) => {
      const data = payload as {
        endsAt?: number;
        startPositions?: Record<string, Vec>;
      };
      if (typeof data.endsAt !== "number" || !data.startPositions) return;

      const myStart = data.startPositions[playerId] ?? { x: 7, y: 7 };
      const empty = makeEmptyGrid();
      gridRef.current = empty;
      setGrid(empty);
      setMyPos(myStart);
      myPosRef.current = myStart;
      setPeer(null);
      setPowerUps([]);
      setRoundEndsAt(data.endsAt);
      setRemainingMs(ROUND_TIME_MS);
      setMyScore(0);
      setPeerScore(0);
      setActivePower(null);
      setWinnerId(null);
      setWinnerName("");
      setPhase("playing");
      setError("");
      dirQueueRef.current = [];
    });

    channel.on("broadcast", { event: "player-state" }, ({ payload }) => {
      const data = payload as PlayerState;
      if (!data.id || data.id === playerId) return;
      setPeer(data);
      setPeerScore(data.score);
    });

    channel.on("broadcast", { event: "grid-update" }, ({ payload }) => {
      const data = payload as {
        changes?: { x: number; y: number; color: string | null }[];
      };
      if (!Array.isArray(data.changes)) return;
      updateGrid((current) => {
        const next = current.map((row) => [...row]);
        for (const c of data.changes!) {
          if (c.y >= 0 && c.y < ROWS && c.x >= 0 && c.x < COLS) {
            next[c.y][c.x] = c.color;
          }
        }
        return next;
      });
    });

    channel.on("broadcast", { event: "score" }, ({ payload }) => {
      const data = payload as { id?: string; score?: number };
      if (typeof data.id !== "string" || typeof data.score !== "number") return;
      if (data.id === playerId) return;
      setPeerScore(data.score);
    });

    channel.on("broadcast", { event: "powerup-spawn" }, ({ payload }) => {
      const data = payload as { powerUp?: PowerUp };
      if (!data.powerUp) return;
      setPowerUps((current) => [...current, data.powerUp!].slice(-5));
    });

    channel.on("broadcast", { event: "powerup-removed" }, ({ payload }) => {
      const data = payload as { id?: string };
      if (typeof data.id !== "string") return;
      setPowerUps((current) => current.filter((p) => p.id !== data.id));
    });

    channel.on("broadcast", { event: "game-over" }, ({ payload }) => {
      const data = payload as {
        winnerId?: string | null;
        winnerName?: string;
      };
      setWinnerId(data.winnerId ?? null);
      setWinnerName(data.winnerName ?? "");
      setPhase("results");
      if (loopRef.current) window.clearTimeout(loopRef.current);
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setIsConnected(true);
        setError("");
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setIsConnected(false);
        setError("Room belum tersambung. Cek konfigurasi Supabase.");
      }
    });

    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoom, playerId, supabase]);

  useEffect(() => {
    if (!isConnected || !activeRoom) return;
    void channelRef.current?.track({
      id: playerId,
      name: playerName.trim() || "Pemain",
      isHost,
      ready: isHost || isReady,
    });
  }, [activeRoom, isConnected, isHost, isReady, playerId, playerName]);

  // ---- Keyboard ----
  useEffect(() => {
    if (phase !== "playing") return;
    const handler = (event: KeyboardEvent) => {
      const dir = directionFromKey(event.key);
      if (!dir) return;
      event.preventDefault();
      pushDir(dir);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase]);

  // ---- Broadcast helper ----
  const broadcastState = (pos: Vec, score: number) => {
    void channelRef.current?.send({
      type: "broadcast",
      event: "player-state",
      payload: {
        id: playerId,
        name: players.find((p) => p.id === playerId)?.name ?? "Pemain",
        x: pos.x,
        y: pos.y,
        color: myColor,
        score,
      } as PlayerState,
    });
  };

  // ---- Game loop ----
  useEffect(() => {
    if (phase !== "playing") return;
    if (!myPos) return;
    if (roundEndsAt === null) return;

    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      if (phaseRef.current !== "playing") return;

      const pos = myPosRef.current;
      if (!pos) return;

      // Ambil arah dari queue
      let dir: Vec | null = null;
      while (dirQueueRef.current.length > 0) {
        const c = dirQueueRef.current.shift()!;
        const nx = pos.x + c.x;
        const ny = pos.y + c.y;
        if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
        dir = c;
        break;
      }

      if (dir) {
        const next = { x: pos.x + dir.x, y: pos.y + dir.y };

        const gridNow = gridRef.current;
        const currentOwner = gridNow[next.y]?.[next.x] ?? null;

        if (currentOwner !== myColor) {
          const change = { x: next.x, y: next.y, color: myColor };

          flushSync(() => {
            updateGrid((current) => {
              const g = current.map((row) => [...row]);
              g[next.y][next.x] = myColor;
              return g;
            });
            setMyPos(next);
          });

          myPosRef.current = next;

          setMyScore((current) => {
            const bonus = activePowerRef.current === "double" ? 2 : 1;
            const newScore = current + bonus;
            broadcastState(next, newScore);
            return newScore;
          });

          void channelRef.current?.send({
            type: "broadcast",
            event: "grid-update",
            payload: { changes: [change] },
          });
        } else {
          setMyPos(next);
          myPosRef.current = next;
        }

        // Cek power-up pickup
        const now = Date.now();
        const picked = powerUpsRef.current.find(
          (p) => p.x === next.x && p.y === next.y && p.expiresAt > now,
        );
        if (picked) {
          setPowerUps((current) => current.filter((p) => p.id !== picked.id));
          void channelRef.current?.send({
            type: "broadcast",
            event: "powerup-removed",
            payload: { id: picked.id },
          });

          if (picked.type === "double") {
            setActivePower("double");
            setActivePowerUntil(now + 5000);
          } else if (picked.type === "speed") {
            setActivePower("speed");
            setActivePowerUntil(now + 5000);
          }
        }
      }

      // Broadcast state
      if (pos) broadcastState(pos, myScoreRef.current);

      // Cek timer
      const now = Date.now();
      if (roundEndsAt && now >= roundEndsAt && isHost) {
        const g = gridRef.current;
        let myCount = 0;
        let peerCount = 0;
        for (let y = 0; y < ROWS; y++) {
          for (let x = 0; x < COLS; x++) {
            if (g[y][x] === P1_COLOR) myCount++;
            else if (g[y][x] === P2_COLOR) peerCount++;
          }
        }
        const hostCount = myCount;
        const guestCount = peerCount;

        let winnerIdFinal: string | null = null;
        let winnerNameFinal = "";
        if (hostCount > guestCount) {
          winnerIdFinal = playerId;
          winnerNameFinal =
            players.find((p) => p.id === playerId)?.name ?? "Kamu";
        } else if (guestCount > hostCount) {
          const other = players.find((p) => p.id !== playerId);
          winnerIdFinal = other?.id ?? null;
          winnerNameFinal = other?.name ?? "Lawan";
        }

        setWinnerId(winnerIdFinal);
        setWinnerName(winnerNameFinal);
        setPhase("results");
        void channelRef.current?.send({
          type: "broadcast",
          event: "game-over",
          payload: { winnerId: winnerIdFinal, winnerName: winnerNameFinal },
        });
        return;
      }

      const tickMs = activePowerRef.current === "speed" ? 55 : TICK_MS;
      loopRef.current = window.setTimeout(tick, tickMs);
    };

    loopRef.current = window.setTimeout(tick, TICK_MS);

    return () => {
      cancelled = true;
      if (loopRef.current) window.clearTimeout(loopRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, myPos, playerId, roundEndsAt, isHost, players]);

  // ---- Host: spawn power-up tiap 8 detik ----
  useEffect(() => {
    if (!isHost) return;
    if (phase !== "playing") return;

    const spawnPowerUp = () => {
      const now = Date.now();
      const types: ("double" | "speed")[] = ["double", "speed"];
      const type = types[Math.floor(Math.random() * types.length)];
      const newPower: PowerUp = {
        id: crypto.randomUUID(),
        type,
        x: Math.floor(Math.random() * COLS),
        y: Math.floor(Math.random() * ROWS),
        spawnedAt: now,
        expiresAt: now + 8000,
      };
      setPowerUps((current) => [...current, newPower].slice(-5));
      void channelRef.current?.send({
        type: "broadcast",
        event: "powerup-spawn",
        payload: { powerUp: newPower },
      });
    };

    const timer = setInterval(spawnPowerUp, 8000);
    return () => clearInterval(timer);
  }, [isHost, phase]);

  // ---- Cleanup expired power-ups ----
  useEffect(() => {
    if (phase !== "playing") return;
    const timer = setInterval(() => {
      const now = Date.now();
      setPowerUps((current) => current.filter((p) => p.expiresAt > now));
    }, 500);
    return () => clearInterval(timer);
  }, [phase]);

  // ---- Timer countdown ----
  useEffect(() => {
    if (phase !== "playing" || roundEndsAt === null) return;
    const timer = setInterval(() => {
      const next = Math.max(0, roundEndsAt - Date.now());
      setRemainingMs(next);
    }, 100);
    return () => clearInterval(timer);
  }, [phase, roundEndsAt]);

  // ---- Active power expire ----
  useEffect(() => {
    if (!activePower) return;
    const timer = setInterval(() => {
      if (Date.now() >= activePowerUntil) {
        setActivePower(null);
      }
    }, 200);
    return () => clearInterval(timer);
  }, [activePower, activePowerUntil]);

  // ---- Touch handler ----
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    touchStartRef.current = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      pushDir({ x: dx > 0 ? 1 : -1, y: 0 });
    } else {
      pushDir({ x: 0, y: dy > 0 ? 1 : -1 });
    }
  };

  // ---- Preflight ----
  const peekRoomPlayerCount = async (roomCode: string): Promise<number> => {
    if (!supabase) return 0;
    const peekKey = "peek-" + crypto.randomUUID();
    const peekChannel = supabase.channel(`color-wars:${roomCode}`, {
      config: { presence: { key: peekKey } },
    });

    let count = 0;
    await new Promise<void>((resolve) => {
      let resolved = false;
      const done = () => {
        if (resolved) return;
        resolved = true;
        resolve();
      };
      peekChannel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setTimeout(() => {
            const state = peekChannel.presenceState<RoomPlayer>();
            count = Object.values(state)
              .flat()
              .filter((p) => p.id && !p.id.startsWith("peek-")).length;
            done();
          }, 450);
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          done();
        }
      });
      setTimeout(done, 2500);
    });

    await supabase.removeChannel(peekChannel);
    return count;
  };

  const enterRoom = async (roomCode: string, host: boolean) => {
    if (!supabase) {
      setError("Supabase belum dikonfigurasi.");
      return;
    }
    const name = playerName.trim();
    if (!name) {
      setError("Isi nama pemain dulu ya.");
      return;
    }
    setError("");
    setJoiningRoom(true);

    try {
      if (!host) {
        const count = await peekRoomPlayerCount(roomCode);
        if (count >= 2) {
          setError("Room sudah penuh (maks 2 pemain).");
          setJoiningRoom(false);
          return;
        }
      }

      const empty = makeEmptyGrid();
      gridRef.current = empty;
      setGrid(empty);
      setPlayerId(crypto.randomUUID());
      setPlayers([]);
      setPhase("lobby");
      setMyPos(null);
      setPeer(null);
      setPowerUps([]);
      setRoundEndsAt(null);
      setMyScore(0);
      setPeerScore(0);
      setActivePower(null);
      setWinnerId(null);
      setWinnerName("");
      setIsReady(host);
      setIsHost(host);
      setActiveRoom(roomCode);
      dirQueueRef.current = [];
    } catch {
      setError("Gagal masuk room. Coba lagi.");
    } finally {
      setJoiningRoom(false);
    }
  };

  const handleJoinRoom = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const roomCode = roomInput
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    if (roomCode.length !== 6) {
      setError("Kode room terdiri dari 6 karakter.");
      return;
    }
    void enterRoom(roomCode, false);
  };

  const startGame = () => {
    if (
      !isHost ||
      players.length !== 2 ||
      !players.every((p) => p.isHost || p.ready)
    )
      return;

    const hostId = playerId;
    const guest = players.find((p) => !p.isHost);
    if (!guest) return;

    const startPositions: Record<string, Vec> = {
      [hostId]: START_POSITIONS[0],
      [guest.id]: START_POSITIONS[1],
    };

    void channelRef.current?.send({
      type: "broadcast",
      event: "game-reset",
      payload: {},
    });

    const empty = makeEmptyGrid();
    gridRef.current = empty;
    setGrid(empty);
    const endsAt = Date.now() + ROUND_TIME_MS;
    setMyPos(START_POSITIONS[0]);
    myPosRef.current = START_POSITIONS[0];
    setPeer(null);
    setPowerUps([]);
    setRoundEndsAt(endsAt);
    setRemainingMs(ROUND_TIME_MS);
    setMyScore(0);
    setPeerScore(0);
    setActivePower(null);
    setWinnerId(null);
    setWinnerName("");
    setPhase("playing");
    dirQueueRef.current = [];

    void channelRef.current?.send({
      type: "broadcast",
      event: "round-start",
      payload: { endsAt, startPositions },
    });
  };

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(activeRoom);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Salin kode room secara manual ya.");
    }
  };

  const leaveRoom = () => {
    const empty = makeEmptyGrid();
    gridRef.current = empty;
    setGrid(empty);
    setActiveRoom("");
    setIsConnected(false);
    setIsHost(false);
    setIsReady(false);
    setPlayers([]);
    setPhase("lobby");
    setMyPos(null);
    setPeer(null);
    setPowerUps([]);
    setRoundEndsAt(null);
    setMyScore(0);
    setPeerScore(0);
    setActivePower(null);
    setWinnerId(null);
    setWinnerName("");
    setError("");
    dirQueueRef.current = [];
  };

  const guestsReady = players.filter((p) => !p.isHost).every((p) => p.ready);
  const canStart =
    isHost &&
    players.length === 2 &&
    guestsReady &&
    isConnected &&
    !joiningRoom;
  const secondsLeft = Math.ceil(remainingMs / 1000);
  const peerScoreFinal = peerScore;

  return (
    <main className="tap-rush-shell">
      <div className="tap-rush-topbar">
        <Link href="/game" className="tap-rush-back">
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Semua game</span>
        </Link>
        <span className="tap-rush-season">ONLINE DUEL / 10</span>
      </div>

      <section className="tap-rush-layout">
        <header className="tap-rush-heading">
          <div className="tap-rush-kicker">
            <Palette size={14} /> REALTIME COLOR WARS
          </div>
          <h1>
            Color Wars<span>!</span>
          </h1>
          <p>
            Rebut wilayah dengan warna! Warnai setiap kotak yang kamu lewati —
            kuasai lebih banyak dari lawan.
          </p>
        </header>

        {!activeRoom ? (
          <section className="tap-rush-lobby">
            <div className="tap-rush-intro">
              <div className="tap-rush-orb" aria-hidden="true">
                <Palette size={30} />
              </div>
              <div>
                <h2>Bikin room, tantang teman</h2>
                <p>
                  Gerak bebas di grid 15×15, warnai setiap kotak yang kamu
                  lewati. Rebut wilayah lawan sebelum waktu habis!
                </p>
              </div>
            </div>

            <label className="tap-rush-label" htmlFor="color-player-name">
              NAMA PEMAIN
            </label>
            <input
              id="color-player-name"
              className="tap-rush-input"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value.slice(0, 18))}
              maxLength={18}
              placeholder="Contoh: Alya"
              autoComplete="nickname"
            />

            <div className="tap-rush-actions">
              <button
                className="tap-rush-primary"
                type="button"
                disabled={!supabase || joiningRoom}
                onClick={() => void enterRoom(makeRoomCode(), true)}
              >
                <Rocket size={17} /> Buat room
              </button>
              <span className="tap-rush-or">ATAU</span>
              <form className="tap-rush-join" onSubmit={handleJoinRoom}>
                <input
                  className="tap-rush-input tap-rush-code-input"
                  value={roomInput}
                  onChange={(e) =>
                    setRoomInput(e.target.value.toUpperCase().slice(0, 6))
                  }
                  maxLength={6}
                  placeholder="KODE ROOM"
                  aria-label="Kode room"
                  autoComplete="off"
                />
                <button
                  className="tap-rush-secondary"
                  type="submit"
                  disabled={!supabase || joiningRoom}
                >
                  {joiningRoom ? "Cek room…" : "Gabung"}
                </button>
              </form>
            </div>

            {!supabase && (
              <div className="tap-rush-setup" role="status">
                <Radio size={17} />
                <span>
                  Room online belum aktif. Isi{" "}
                  <code>NEXT_PUBLIC_SUPABASE_URL</code> dan{" "}
                  <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>.
                </span>
              </div>
            )}
            {error && (
              <p className="tap-rush-error" role="alert">
                {error}
              </p>
            )}
          </section>
        ) : (
          <section className="tap-rush-room">
            <div className="tap-rush-roombar">
              <div>
                <span className="tap-rush-label">KODE ROOM</span>
                <button
                  className="tap-rush-room-code"
                  type="button"
                  onClick={copyRoomCode}
                >
                  {activeRoom}
                  <Copy size={15} aria-hidden="true" />
                </button>
                <span className="tap-rush-copy-note">
                  {copied ? "Kode tersalin!" : "Bagikan kode ini ke teman"}
                </span>
              </div>
              <div
                className={`tap-rush-connection ${isConnected ? "is-online" : ""}`}
              >
                <span /> {isConnected ? "LIVE" : "MENGHUBUNGKAN"}
              </div>
            </div>

            {phase === "lobby" && (
              <div className="tap-rush-lobby-state">
                <div className="tap-rush-player-heading">
                  <h2>
                    <UsersRound size={20} /> Pemain di room
                  </h2>
                  <span>{players.length} / 2</span>
                </div>
                <div className="tap-rush-player-list">
                  {players.length === 0 ? (
                    <div className="tap-rush-empty">Menyambungkan pemain…</div>
                  ) : (
                    players.map((p, i) => (
                      <div className="tap-rush-player" key={p.id}>
                        <span className="tap-rush-player-number">0{i + 1}</span>
                        <span
                          className="tap-rush-player-color-dot"
                          style={{
                            background: p.isHost ? P1_COLOR : P2_COLOR,
                          }}
                        />
                        <span className="tap-rush-player-name">
                          {p.name}
                          {p.id === playerId ? " (kamu)" : ""}
                        </span>
                        {p.isHost ? (
                          <span className="tap-rush-host">HOST</span>
                        ) : p.ready ? (
                          <span className="tap-rush-ready">
                            <Check size={14} /> SIAP
                          </span>
                        ) : (
                          <span className="tap-rush-waiting">MENUNGGU</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
                <div className="tap-rush-lobby-footer">
                  {isHost ? (
                    <button
                      className="tap-rush-primary"
                      type="button"
                      disabled={!canStart}
                      onClick={startGame}
                    >
                      <Rocket size={17} />{" "}
                      {players.length < 2
                        ? "Butuh 1 teman lagi"
                        : guestsReady
                          ? "Mulai duel"
                          : "Menunggu siap"}
                    </button>
                  ) : (
                    <button
                      className={`tap-rush-primary ${isReady ? "is-ready" : ""}`}
                      type="button"
                      disabled={!isConnected}
                      onClick={() => setIsReady((r) => !r)}
                    >
                      <Check size={17} />{" "}
                      {isReady ? "Siap! (ubah)" : "Saya siap"}
                    </button>
                  )}
                  <button
                    className="tap-rush-leave"
                    type="button"
                    onClick={leaveRoom}
                  >
                    <DoorOpen size={16} /> Keluar
                  </button>
                </div>
              </div>
            )}

            {phase === "playing" && myPos && (
              <div className="color-wars-wrap">
                <div className="color-wars-hud">
                  <div
                    className="color-wars-score"
                    style={{ borderColor: myColor }}
                  >
                    <span
                      className="color-wars-score-dot"
                      style={{ background: myColor }}
                    />
                    <span className="color-wars-score-label">KAMU</span>
                    <strong>{myScore}</strong>
                  </div>

                  <div className="color-wars-timer">
                    <span>WAKTU</span>
                    <strong className={secondsLeft <= 10 ? "is-urgent" : ""}>
                      {String(secondsLeft).padStart(2, "0")}s
                    </strong>
                  </div>

                  <div
                    className="color-wars-score"
                    style={{ borderColor: isHost ? P2_COLOR : P1_COLOR }}
                  >
                    <span
                      className="color-wars-score-dot"
                      style={{
                        background: isHost ? P2_COLOR : P1_COLOR,
                      }}
                    />
                    <span className="color-wars-score-label">LAWAN</span>
                    <strong>{peerScoreFinal}</strong>
                  </div>
                </div>

                {activePower && (
                  <div className="color-wars-power-badge">
                    {activePower === "double"
                      ? "✨ 2x Poin Aktif!"
                      : "⚡ Speed Boost Aktif!"}
                  </div>
                )}

                <div
                  className="color-wars-arena"
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                >
                  <div
                    className="color-wars-grid"
                    style={{
                      gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                      gridTemplateRows: `repeat(${ROWS}, 1fr)`,
                    }}
                  >
                    {grid.map((row, y) =>
                      row.map((cell, x) => (
                        <div
                          key={`${x}-${y}`}
                          className="color-wars-cell"
                          style={{
                            background: cell ?? "transparent",
                          }}
                        />
                      )),
                    )}

                    {powerUps.map((p) => (
                      <div
                        key={p.id}
                        className="color-wars-power"
                        style={{
                          gridColumn: p.x + 1,
                          gridRow: p.y + 1,
                        }}
                      >
                        {p.type === "double" ? "✨" : "⚡"}
                      </div>
                    ))}

                    {peer && (
                      <div
                        className="color-wars-player-cell"
                        style={{
                          gridColumn: peer.x + 1,
                          gridRow: peer.y + 1,
                        }}
                      >
                        <div
                          className="color-wars-player"
                          style={{
                            background: isHost ? P2_COLOR : P1_COLOR,
                          }}
                        >
                          <span className="color-wars-player-emoji">🧑</span>
                        </div>
                      </div>
                    )}

                    <div
                      className="color-wars-player-cell"
                      style={{
                        gridColumn: myPos.x + 1,
                        gridRow: myPos.y + 1,
                      }}
                    >
                      <div
                        className="color-wars-player is-me"
                        style={{ background: myColor }}
                      >
                        <span className="color-wars-player-emoji">🧑</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className="color-wars-dpad"
                  role="group"
                  aria-label="Kontrol"
                >
                  <button
                    type="button"
                    className="color-wars-dpad-btn color-wars-dpad-up"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      pushDir({ x: 0, y: -1 });
                    }}
                    aria-label="Atas"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    className="color-wars-dpad-btn color-wars-dpad-left"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      pushDir({ x: -1, y: 0 });
                    }}
                    aria-label="Kiri"
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    className="color-wars-dpad-btn color-wars-dpad-right"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      pushDir({ x: 1, y: 0 });
                    }}
                    aria-label="Kanan"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    className="color-wars-dpad-btn color-wars-dpad-down"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      pushDir({ x: 0, y: 1 });
                    }}
                    aria-label="Bawah"
                  >
                    ▼
                  </button>
                </div>

                <p className="color-wars-hint">
                  WASD / Panah · atau swipe di arena
                </p>
              </div>
            )}

            {phase === "results" && (
              <div className="tap-rush-results">
                <div className="tap-rush-finish-mark">FINISH</div>
                <h2>
                  {winnerId === null
                    ? "Seri!"
                    : winnerId === playerId
                      ? "Kamu menang! 🏆"
                      : `${winnerName} menang!`}
                </h2>
                <div className="color-wars-final-scores">
                  <div
                    className="color-wars-final-score"
                    style={{ borderColor: myColor }}
                  >
                    <span
                      className="color-wars-score-dot"
                      style={{ background: myColor }}
                    />
                    <span>KAMU</span>
                    <strong>{myScore}</strong>
                  </div>
                  <div
                    className="color-wars-final-score"
                    style={{ borderColor: isHost ? P2_COLOR : P1_COLOR }}
                  >
                    <span
                      className="color-wars-score-dot"
                      style={{
                        background: isHost ? P2_COLOR : P1_COLOR,
                      }}
                    />
                    <span>LAWAN</span>
                    <strong>{peerScoreFinal}</strong>
                  </div>
                </div>
                <div className="tap-rush-lobby-footer">
                  {isHost && (
                    <button
                      className="tap-rush-primary"
                      type="button"
                      disabled={!canStart}
                      onClick={startGame}
                    >
                      <Rocket size={17} /> Main lagi
                    </button>
                  )}
                  {!isHost && (
                    <span className="tap-rush-waiting-host">
                      Host yang memulai ronde berikutnya
                    </span>
                  )}
                  <button
                    className="tap-rush-leave"
                    type="button"
                    onClick={leaveRoom}
                  >
                    <DoorOpen size={16} /> Keluar
                  </button>
                </div>
              </div>
            )}
            {error && (
              <p className="tap-rush-error" role="alert">
                {error}
              </p>
            )}
          </section>
        )}

        <footer className="tap-rush-footnote">
          <span>2 PEMAIN</span>
          <span>60 DETIK / RONDE</span>
          <span>REBUT WILAYAH</span>
        </footer>
      </section>

      <style jsx>{`
        .color-wars-wrap {
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: center;
          width: 100%;
        }

        .color-wars-hud {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 10px;
          width: 100%;
          max-width: 640px;
          align-items: center;
        }

        .color-wars-score {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.03);
          border: 2px solid;
          border-radius: 10px;
        }
        .color-wars-score-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
          box-shadow: 0 0 10px currentColor;
        }
        .color-wars-score-label {
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          opacity: 0.7;
        }
        .color-wars-score strong {
          font-family: Impact, "Arial Black", sans-serif;
          font-size: 22px;
          color: #fff;
          margin-left: auto;
          font-variant-numeric: tabular-nums;
        }

        .color-wars-timer {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 8px 14px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(236, 72, 153, 0.2);
          border-radius: 10px;
        }
        .color-wars-timer span {
          font-size: 9px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          opacity: 0.65;
        }
        .color-wars-timer strong {
          font-family: Impact, "Arial Black", sans-serif;
          font-size: 24px;
          color: #ec4899;
          font-variant-numeric: tabular-nums;
        }
        .color-wars-timer strong.is-urgent {
          color: #ef4444;
          animation: pulse 0.8s infinite;
        }
        @keyframes pulse {
          50% {
            opacity: 0.5;
          }
        }

        .color-wars-power-badge {
          padding: 6px 14px;
          border-radius: 999px;
          background: linear-gradient(135deg, #fbbf24, #ec4899);
          color: #fff;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.06em;
          box-shadow: 0 0 20px rgba(251, 191, 36, 0.6);
          animation: pulse 1s infinite;
        }

        .color-wars-arena {
          width: 100%;
          max-width: 640px;
          aspect-ratio: 1 / 1;
          padding: 6px;
          background: #0a0f1a;
          border: 1px solid rgba(236, 72, 153, 0.3);
          border-radius: 12px;
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
          box-shadow: 0 20px 60px rgba(236, 72, 153, 0.15);
        }
        .color-wars-grid {
          position: relative;
          width: 100%;
          height: 100%;
          display: grid;
          gap: 0;
          background: transparent;
        }
        .color-wars-cell {
          border-radius: 0;
          transition: background 100ms ease;
          box-shadow: inset 0 0 0 0.5px rgba(255, 255, 255, 0.03);
        }

        .color-wars-power {
          z-index: 3;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: clamp(10px, 2vw, 16px);
          pointer-events: none;
          animation: floatPower 1.5s ease-in-out infinite;
        }
        @keyframes floatPower {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-3px);
          }
        }

        .color-wars-player-cell {
          z-index: 5;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          width: 100%;
          height: 100%;
        }

        .color-wars-player {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          border-radius: 4px;
          box-shadow: 0 0 15px currentColor;
          pointer-events: none;
          animation: bob 0.6s ease-in-out infinite;
        }
        .color-wars-player.is-me {
          outline: 2px solid #fff;
          outline-offset: -2px;
          z-index: 6;
        }
        @keyframes bob {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.08);
          }
        }
        .color-wars-player-emoji {
          font-size: clamp(12px, 2.4vw, 20px);
        }

        .color-wars-dpad {
          display: grid;
          grid-template-columns: repeat(3, 56px);
          grid-template-rows: repeat(3, 56px);
          gap: 8px;
          justify-content: center;
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
        }
        .color-wars-dpad-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.05);
          color: #ec4899;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        .color-wars-dpad-btn:active {
          background: rgba(236, 72, 153, 0.2);
          transform: scale(0.96);
        }
        .color-wars-dpad-up {
          grid-area: 1 / 2;
        }
        .color-wars-dpad-left {
          grid-area: 2 / 1;
        }
        .color-wars-dpad-right {
          grid-area: 2 / 3;
        }
        .color-wars-dpad-down {
          grid-area: 3 / 2;
        }

        .color-wars-hint {
          font-size: 11px;
          opacity: 0.55;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-align: center;
        }

        .color-wars-final-scores {
          display: flex;
          gap: 14px;
          justify-content: center;
          margin: 16px 0 22px;
          flex-wrap: wrap;
        }
        .color-wars-final-score {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 18px;
          background: rgba(255, 255, 255, 0.03);
          border: 2px solid;
          border-radius: 12px;
        }
        .color-wars-final-score span {
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          opacity: 0.75;
        }
        .color-wars-final-score strong {
          font-family: Impact, "Arial Black", sans-serif;
          font-size: 24px;
        }

        .tap-rush-player-color-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        @media (min-width: 720px) and (hover: hover) {
          .color-wars-dpad {
            display: none;
          }
        }
        @media (max-width: 640px) {
          .color-wars-hud {
            grid-template-columns: 1fr auto 1fr;
            gap: 6px;
          }
          .color-wars-score {
            padding: 8px 10px;
          }
          .color-wars-score strong {
            font-size: 18px;
          }
          .color-wars-timer strong {
            font-size: 20px;
          }
        }
      `}</style>
    </main>
  );
}
