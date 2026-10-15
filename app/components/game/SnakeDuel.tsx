"use client";

import {
  ArrowLeft,
  Copy,
  DoorOpen,
  Radio,
  Rocket,
  Swords,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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

type SnakeState = {
  id: string;
  body: Vec[];
  dir: Vec;
  alive: boolean;
  color: string;
};

const ROOM_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const COLS = 24;
const ROWS = 24;
const MAX_PLAYERS = 2;

// Kecepatan bertahap: lambat di awal, makin cepat tiap makan buah
const BASE_TICK_MS = 220;
const MIN_TICK_MS = 110;
const SPEED_STEP = 6;

// Warna selaras tema arcade oranye/amber
const P1_COLOR = "#fbbf24"; // amber — host
const P2_COLOR = "#f97316"; // orange — guest

function makeRoomCode() {
  const values = new Uint32Array(6);
  crypto.getRandomValues(values);
  return Array.from(
    values,
    (value) => ROOM_CHARACTERS[value % ROOM_CHARACTERS.length],
  ).join("");
}

function randomFood(snakes: SnakeState[]): Vec {
  const occupied = new Set<string>();
  for (const snake of snakes) {
    for (const segment of snake.body) {
      occupied.add(`${segment.x},${segment.y}`);
    }
  }
  for (let attempt = 0; attempt < 500; attempt += 1) {
    const candidate = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
    if (!occupied.has(`${candidate.x},${candidate.y}`)) return candidate;
  }
  return { x: 0, y: 0 };
}

function initialSnake(
  id: string,
  color: string,
  horizontal: boolean,
): SnakeState {
  const body: Vec[] = horizontal
    ? [
        { x: 5, y: 12 },
        { x: 4, y: 12 },
        { x: 3, y: 12 },
      ]
    : [
        { x: 18, y: 12 },
        { x: 19, y: 12 },
        { x: 20, y: 12 },
      ];
  return {
    id,
    body,
    dir: horizontal ? { x: 1, y: 0 } : { x: -1, y: 0 },
    alive: true,
    color,
  };
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

export default function SnakeDuel() {
  const supabase = getSupabaseBrowserClient();
  const [playerId, setPlayerId] = useState("");
  const channelRef = useRef<RealtimeChannel | null>(null);
  const gameLoopRef = useRef<number | null>(null);

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

  const [mySnake, setMySnake] = useState<SnakeState | null>(null);
  const [peerSnake, setPeerSnake] = useState<SnakeState | null>(null);
  const [food, setFood] = useState<Vec>({ x: 12, y: 12 });
  const [winner, setWinner] = useState<string | null>(null);

  const mySnakeRef = useRef<SnakeState | null>(null);
  const peerSnakeRef = useRef<SnakeState | null>(null);
  const foodRef = useRef<Vec>({ x: 12, y: 12 });
  const dirQueueRef = useRef<Vec[]>([]);
  const tickMsRef = useRef(BASE_TICK_MS);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    mySnakeRef.current = mySnake;
  }, [mySnake]);
  useEffect(() => {
    peerSnakeRef.current = peerSnake;
  }, [peerSnake]);
  useEffect(() => {
    foodRef.current = food;
  }, [food]);

  // Helper untuk memasukkan arah (dipakai keyboard & tombol HP)
  const pushDir = (dir: Vec) => {
    const queue = dirQueueRef.current;
    const last = queue[queue.length - 1] ?? mySnakeRef.current?.dir;
    if (last && dir.x === -last.x && dir.y === -last.y) return;
    queue.push(dir);
    if (queue.length > 2) queue.shift();
  };

  // ---- Realtime channel ----
  useEffect(() => {
    if (!activeRoom || !supabase || !playerId) return;

    const channel = supabase.channel(`snake-duel:${activeRoom}`, {
      config: {
        broadcast: { self: false },
        presence: { key: playerId },
      },
    });
    channelRef.current = channel;

    const syncFromPresence = () => {
      const state = channel.presenceState<RoomPlayer>();
      const connectedPlayers = Object.values(state)
        .flat()
        .filter((p) => p.id && !p.id.startsWith("peek-"))
        .sort((left, right) => Number(right.isHost) - Number(left.isHost));
      setPlayers(connectedPlayers);
    };

    channel.on("presence", { event: "sync" }, syncFromPresence);
    channel.on("presence", { event: "join" }, syncFromPresence);
    channel.on("presence", { event: "leave" }, syncFromPresence);

    // RESET: semua client reset saat host mulai ronde baru
    channel.on("broadcast", { event: "game-reset" }, () => {
      setMySnake(null);
      setPeerSnake(null);
      setFood({ x: 12, y: 12 });
      setWinner(null);
      setPhase("lobby");
      dirQueueRef.current = [];
      tickMsRef.current = BASE_TICK_MS;
    });

    channel.on("broadcast", { event: "round-start" }, ({ payload }) => {
      const data = payload as { food?: Vec; hostId?: string; guestId?: string };
      if (!data.food) return;
      const isMeHost = data.hostId === playerId;
      const peerId = isMeHost ? data.guestId : data.hostId;
      if (!peerId) return;

      const myStart = initialSnake(
        playerId,
        isMeHost ? P1_COLOR : P2_COLOR,
        isMeHost,
      );
      const peerStart = initialSnake(
        peerId,
        isMeHost ? P2_COLOR : P1_COLOR,
        !isMeHost,
      );

      dirQueueRef.current = [];
      tickMsRef.current = BASE_TICK_MS;
      setMySnake(myStart);
      setPeerSnake(peerStart);
      setFood(data.food);
      setWinner(null);
      setPhase("playing");
      setError("");
    });

    channel.on("broadcast", { event: "state" }, ({ payload }) => {
      const data = payload as { id?: string; snake?: SnakeState };
      if (!data.id || !data.snake) return;
      if (data.id === playerId) return;
      setPeerSnake(data.snake);
    });

    channel.on("broadcast", { event: "food" }, ({ payload }) => {
      const data = payload as { food?: Vec };
      if (!data.food) return;
      setFood(data.food);
    });

    channel.on("broadcast", { event: "game-over" }, ({ payload }) => {
      const data = payload as { winner?: string | null };
      setWinner(data.winner ?? null);
      setPhase("results");
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

  // ---- Keyboard input ----
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

  // ---- Game loop (setTimeout rekursif agar kecepatan dinamis) ----
  useEffect(() => {
    if (phase !== "playing") return;

    let cancelled = false;

    const step = () => {
      if (cancelled) return;

      const me = mySnakeRef.current;
      const peer = peerSnakeRef.current;
      if (!me || !peer || !me.alive || !peer.alive) {
        gameLoopRef.current = window.setTimeout(step, tickMsRef.current);
        return;
      }

      let nextDir = me.dir;
      while (dirQueueRef.current.length > 0) {
        const candidate = dirQueueRef.current.shift()!;
        if (candidate.x === -me.dir.x && candidate.y === -me.dir.y) continue;
        nextDir = candidate;
        break;
      }

      const head = me.body[0];
      const newHead = { x: head.x + nextDir.x, y: head.y + nextDir.y };

      const killMe = () => {
        const dead = { ...me, alive: false };
        setMySnake(dead);
        mySnakeRef.current = dead;
        void channelRef.current?.send({
          type: "broadcast",
          event: "state",
          payload: { id: playerId, snake: dead },
        });
        void channelRef.current?.send({
          type: "broadcast",
          event: "game-over",
          payload: { winner: peer.id },
        });
        setWinner(peer.id);
        setPhase("results");
      };

      const tieGame = () => {
        const dead = { ...me, alive: false };
        setMySnake(dead);
        mySnakeRef.current = dead;
        void channelRef.current?.send({
          type: "broadcast",
          event: "state",
          payload: { id: playerId, snake: dead },
        });
        void channelRef.current?.send({
          type: "broadcast",
          event: "game-over",
          payload: { winner: null },
        });
        setWinner(null);
        setPhase("results");
      };

      if (
        newHead.x < 0 ||
        newHead.y < 0 ||
        newHead.x >= COLS ||
        newHead.y >= ROWS
      ) {
        killMe();
        return;
      }

      if (me.body.some((s) => s.x === newHead.x && s.y === newHead.y)) {
        killMe();
        return;
      }

      if (
        peer.alive &&
        peer.body.some((s) => s.x === newHead.x && s.y === newHead.y)
      ) {
        killMe();
        return;
      }

      if (
        peer.alive &&
        peer.body[0].x === newHead.x &&
        peer.body[0].y === newHead.y
      ) {
        tieGame();
        return;
      }

      const ate =
        newHead.x === foodRef.current.x && newHead.y === foodRef.current.y;
      const newBody = ate
        ? [newHead, ...me.body]
        : [newHead, ...me.body.slice(0, -1)];
      const updated: SnakeState = { ...me, body: newBody, dir: nextDir };
      setMySnake(updated);
      mySnakeRef.current = updated;
      void channelRef.current?.send({
        type: "broadcast",
        event: "state",
        payload: { id: playerId, snake: updated },
      });

      if (ate) {
        const nextFood = randomFood(
          [updated, peer].filter((s) => s.alive) as SnakeState[],
        );
        setFood(nextFood);
        foodRef.current = nextFood;
        void channelRef.current?.send({
          type: "broadcast",
          event: "food",
          payload: { food: nextFood },
        });

        // Percepat permainan tiap makan buah
        const faster = Math.max(MIN_TICK_MS, tickMsRef.current - SPEED_STEP);
        tickMsRef.current = faster;
      }

      gameLoopRef.current = window.setTimeout(step, tickMsRef.current);
    };

    gameLoopRef.current = window.setTimeout(step, tickMsRef.current);

    return () => {
      cancelled = true;
      if (gameLoopRef.current) window.clearTimeout(gameLoopRef.current);
    };
  }, [phase, playerId]);

  // ---- Touch / Swipe handlers ----
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
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    touchStartRef.current = null;
    if (Math.max(absX, absY) < 24) return;
    if (absX > absY) {
      pushDir({ x: dx > 0 ? 1 : -1, y: 0 });
    } else {
      pushDir({ x: 0, y: dy > 0 ? 1 : -1 });
    }
  };

  // ---- Preflight: cek jumlah pemain di room ----
  const peekRoomPlayerCount = async (roomCode: string): Promise<number> => {
    if (!supabase) return 0;
    const peekKey = "peek-" + crypto.randomUUID();
    const peekChannel = supabase.channel(`snake-duel:${roomCode}`, {
      config: { presence: { key: peekKey } },
    });

    let playerCount = 0;
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
            const all = Object.values(state).flat();
            playerCount = all.filter(
              (p) => p.id && !p.id.startsWith("peek-"),
            ).length;
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
    return playerCount;
  };

  // ---- Handlers ----
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
      // Kalau guest: cek dulu apakah room sudah penuh
      if (!host) {
        const count = await peekRoomPlayerCount(roomCode);
        if (count >= MAX_PLAYERS) {
          setError(`Room sudah penuh (maks ${MAX_PLAYERS} pemain).`);
          setJoiningRoom(false);
          return;
        }
      }

      setPlayerId(crypto.randomUUID());
      setPlayers([]);
      setPhase("lobby");
      setIsReady(host);
      setIsHost(host);
      setActiveRoom(roomCode);
      setMySnake(null);
      setPeerSnake(null);
      setWinner(null);
      dirQueueRef.current = [];
      tickMsRef.current = BASE_TICK_MS;
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

  const startRound = () => {
    if (
      !isHost ||
      players.length < 2 ||
      players.length > MAX_PLAYERS ||
      !players.every((p) => p.isHost || p.ready)
    )
      return;
    const hostId = playerId;
    const guest = players.find((p) => !p.isHost);
    if (!guest) return;

    // 1. Beritahu semua client untuk reset state
    void channelRef.current?.send({
      type: "broadcast",
      event: "game-reset",
      payload: {},
    });

    // 2. Reset lokal host
    setMySnake(null);
    setPeerSnake(null);
    setWinner(null);

    // 3. Setup ronde baru & broadcast
    const startFood = randomFood([
      initialSnake(hostId, P1_COLOR, true),
      initialSnake(guest.id, P2_COLOR, false),
    ]);
    dirQueueRef.current = [];
    tickMsRef.current = BASE_TICK_MS;
    setMySnake(initialSnake(hostId, P1_COLOR, true));
    setPeerSnake(initialSnake(guest.id, P2_COLOR, false));
    setFood(startFood);
    setPhase("playing");
    void channelRef.current?.send({
      type: "broadcast",
      event: "round-start",
      payload: { food: startFood, hostId, guestId: guest.id },
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
    setActiveRoom("");
    setIsConnected(false);
    setIsHost(false);
    setIsReady(false);
    setPlayers([]);
    setPhase("lobby");
    setMySnake(null);
    setPeerSnake(null);
    setWinner(null);
    setError("");
    dirQueueRef.current = [];
    tickMsRef.current = BASE_TICK_MS;
  };

  const guestsReady = players.filter((p) => !p.isHost).every((p) => p.ready);
  const canStart =
    isHost &&
    players.length >= 2 &&
    players.length <= MAX_PLAYERS &&
    guestsReady &&
    isConnected &&
    !joiningRoom;

  const myName = players.find((p) => p.id === playerId)?.name ?? "Kamu";
  const peerName = players.find((p) => p.id !== playerId)?.name ?? "Lawan";

  return (
    <main className="tap-rush-shell">
      <div className="tap-rush-topbar">
        <Link href="/game" className="tap-rush-back">
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Semua game</span>
        </Link>
        <span className="tap-rush-season">ONLINE DUEL / 02</span>
      </div>

      <section className="tap-rush-layout">
        <header className="tap-rush-heading">
          <div className="tap-rush-kicker">
            <Swords size={14} /> REALTIME SNAKE DUEL
          </div>
          <h1>
            Snake Duel<span>!</span>
          </h1>
          <p>Dua ular. Satu arena. Jangan nabrak — dan rebut buahnya.</p>
        </header>

        {!activeRoom ? (
          <section className="tap-rush-lobby">
            <div className="tap-rush-intro">
              <div className="tap-rush-orb" aria-hidden="true">
                <Swords size={30} />
              </div>
              <div>
                <h2>Bikin room, tantang satu teman</h2>
                <p>
                  Host buat room, teman masuk dengan kode. Adu strategi ular —
                  siapa yang bertahan paling lama menang.
                </p>
              </div>
            </div>

            <label className="tap-rush-label" htmlFor="snake-player-name">
              NAMA PEMAIN
            </label>
            <input
              id="snake-player-name"
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
                  <span>
                    {players.length} / {MAX_PLAYERS}
                  </span>
                </div>
                <div className="tap-rush-player-list">
                  {players.length === 0 ? (
                    <div className="tap-rush-empty">Menyambungkan pemain…</div>
                  ) : (
                    players.map((p, i) => (
                      <div className="tap-rush-player" key={p.id}>
                        <span className="tap-rush-player-number">0{i + 1}</span>
                        <span className="tap-rush-player-name">
                          {p.name}
                          {p.id === playerId ? " (kamu)" : ""}
                        </span>
                        {p.isHost ? (
                          <span className="tap-rush-host">HOST</span>
                        ) : p.ready ? (
                          <span className="tap-rush-ready">SIAP</span>
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
                      onClick={startRound}
                    >
                      <Rocket size={17} />{" "}
                      {players.length < 2
                        ? "Menunggu teman"
                        : players.length > MAX_PLAYERS
                          ? `Room penuh (maks ${MAX_PLAYERS})`
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

            {phase === "playing" && (
              <div className="snake-arena-wrap">
                <div className="snake-hud">
                  <div className="snake-hud-item">
                    <span
                      className="snake-dot"
                      style={{ background: mySnake?.color ?? P1_COLOR }}
                    />
                    <span>{myName}</span>
                  </div>
                  <span className="snake-hud-vs">VS</span>
                  <div className="snake-hud-item">
                    <span
                      className="snake-dot"
                      style={{ background: peerSnake?.color ?? P2_COLOR }}
                    />
                    <span>{peerName}</span>
                  </div>
                </div>

                <div
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  style={{ touchAction: "none" }}
                >
                  <SnakeBoard
                    mySnake={mySnake}
                    peerSnake={peerSnake}
                    food={food}
                  />
                </div>

                <div
                  className="snake-dpad"
                  role="group"
                  aria-label="Kontrol ular"
                >
                  <button
                    type="button"
                    className="snake-dpad-btn snake-dpad-up"
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
                    className="snake-dpad-btn snake-dpad-left"
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
                    className="snake-dpad-btn snake-dpad-right"
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
                    className="snake-dpad-btn snake-dpad-down"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      pushDir({ x: 0, y: 1 });
                    }}
                    aria-label="Bawah"
                  >
                    ▼
                  </button>
                </div>

                <p className="snake-controls-hint">
                  Tombol panah / WASD, geser di arena, atau tombol di layar.
                </p>
              </div>
            )}

            {phase === "results" && (
              <div className="tap-rush-results">
                <div className="tap-rush-finish-mark">FINISH</div>
                <h2>
                  {winner === null
                    ? "Seri! Dua-duanya tumbang."
                    : winner === playerId
                      ? "Kamu menang! 🏆"
                      : `${peerName} menang!`}
                </h2>
                <div className="tap-rush-lobby-footer">
                  {isHost && (
                    <button
                      className="tap-rush-primary"
                      type="button"
                      disabled={!canStart}
                      onClick={startRound}
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
          <span>ARROW KEYS / WASD / TOUCH</span>
          <span>MAKS {MAX_PLAYERS} PEMAIN</span>
          <span>DUEL 1V1</span>
        </footer>
      </section>

      <style jsx>{`
        .snake-arena-wrap {
          display: flex;
          flex-direction: column;
          gap: 12px;
          touch-action: none;
        }
        .snake-hud {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          font-size: 13px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .snake-hud-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .snake-hud-vs {
          opacity: 0.5;
          font-weight: 700;
        }
        .snake-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          box-shadow: 0 0 10px currentColor;
        }
        .snake-controls-hint {
          text-align: center;
          font-size: 12px;
          opacity: 0.55;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .snake-dpad {
          display: grid;
          grid-template-columns: repeat(3, 56px);
          grid-template-rows: repeat(3, 56px);
          gap: 8px;
          justify-content: center;
          margin-top: 4px;
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
        }
        .snake-dpad-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.05);
          color: #fbbf24;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        .snake-dpad-btn:active {
          background: rgba(251, 191, 36, 0.2);
          transform: scale(0.96);
        }
        .snake-dpad-up {
          grid-area: 1 / 2;
        }
        .snake-dpad-left {
          grid-area: 2 / 1;
        }
        .snake-dpad-right {
          grid-area: 2 / 3;
        }
        .snake-dpad-down {
          grid-area: 3 / 2;
        }
        @media (min-width: 720px) and (hover: hover) {
          .snake-dpad {
            display: none;
          }
        }
      `}</style>
    </main>
  );
}

function SnakeBoard({
  mySnake,
  peerSnake,
  food,
}: {
  mySnake: SnakeState | null;
  peerSnake: SnakeState | null;
  food: Vec;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "1 / 1",
        background:
          "radial-gradient(circle at 50% 30%, rgba(251,191,36,0.06), transparent 60%), #050912",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      <svg
        viewBox={`0 0 ${COLS} ${ROWS}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        {Array.from({ length: COLS + 1 }).map((_, i) => (
          <line
            key={`v${i}`}
            x1={i}
            y1={0}
            x2={i}
            y2={ROWS}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={0.02}
          />
        ))}
        {Array.from({ length: ROWS + 1 }).map((_, i) => (
          <line
            key={`h${i}`}
            x1={0}
            y1={i}
            x2={COLS}
            y2={i}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={0.02}
          />
        ))}

        <g>
          <circle cx={food.x + 0.5} cy={food.y + 0.5} r={0.5} fill="#facc15" />
          <circle
            cx={food.x + 0.5}
            cy={food.y + 0.5}
            r={0.85}
            fill="#facc15"
            opacity={0.18}
          />
        </g>

        {peerSnake && <SnakeBody snake={peerSnake} />}
        {mySnake && <SnakeBody snake={mySnake} />}
      </svg>
    </div>
  );
}

function SnakeBody({ snake }: { snake: SnakeState }) {
  return (
    <g opacity={snake.alive ? 1 : 0.35}>
      {snake.body.map((segment, i) => (
        <rect
          key={i}
          x={segment.x + 0.06}
          y={segment.y + 0.06}
          width={0.88}
          height={0.88}
          rx={0.18}
          fill={i === 0 ? "#ffffff" : snake.color}
          stroke={snake.color}
          strokeWidth={0.05}
        />
      ))}
    </g>
  );
}
