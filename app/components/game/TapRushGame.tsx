"use client";

import {
  ArrowLeft,
  Check,
  Copy,
  DoorOpen,
  Radio,
  Rocket,
  UsersRound,
  X,
  Zap,
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

type Spawn = {
  id: string;
  kind: "target" | "trap";
  x: number;
  y: number;
  bornAt: number;
  lifetimeMs: number;
};

const ROUND_DURATION_MS = 30_000;
const SPAWN_INTERVAL_MS = 900;
const TARGET_LIFETIME_MS = 1400;
const TRAP_LIFETIME_MS = 1800;
const TRAP_CHANCE = 0.35;
const MAX_ACTIVE_SPAWNS = 4;
const ROOM_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeRoomCode() {
  const values = new Uint32Array(6);
  crypto.getRandomValues(values);
  return Array.from(
    values,
    (value) => ROOM_CHARACTERS[value % ROOM_CHARACTERS.length],
  ).join("");
}

function makeSpawn(): Spawn {
  const isTrap = Math.random() < TRAP_CHANCE;
  return {
    id: crypto.randomUUID(),
    kind: isTrap ? "trap" : "target",
    x: 8 + Math.random() * 84,
    y: 8 + Math.random() * 84,
    bornAt: Date.now(),
    lifetimeMs: isTrap ? TRAP_LIFETIME_MS : TARGET_LIFETIME_MS,
  };
}

export default function TapRushGame() {
  const supabase = getSupabaseBrowserClient();
  const [playerId, setPlayerId] = useState("");
  const channelRef = useRef<RealtimeChannel | null>(null);
  const spawnTimerRef = useRef<number | null>(null);
  const cleanupTimerRef = useRef<number | null>(null);

  const [playerName, setPlayerName] = useState("");
  const [roomInput, setRoomInput] = useState("");
  const [activeRoom, setActiveRoom] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [eliminated, setEliminated] = useState<Record<string, boolean>>({});
  const [spawns, setSpawns] = useState<Spawn[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [phase, setPhase] = useState<GamePhase>("lobby");
  const [roundEndsAt, setRoundEndsAt] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(ROUND_DURATION_MS);
  const [loserId, setLoserId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const scoresRef = useRef<Record<string, number>>({});
  const eliminatedRef = useRef<Record<string, boolean>>({});
  const spawnsRef = useRef<Spawn[]>([]);
  const phaseRef = useRef<GamePhase>("lobby");
  const playersRef = useRef<RoomPlayer[]>([]);

  useEffect(() => {
    scoresRef.current = scores;
  }, [scores]);
  useEffect(() => {
    eliminatedRef.current = eliminated;
  }, [eliminated]);
  useEffect(() => {
    spawnsRef.current = spawns;
  }, [spawns]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  // ---- Realtime channel ----
  useEffect(() => {
    if (!activeRoom || !supabase || !playerId) return;

    const channel = supabase.channel(`tap-rush:${activeRoom}`, {
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
        .sort((left, right) => Number(right.isHost) - Number(left.isHost));
      setPlayers(connectedPlayers);
      // Bersihkan skor/eliminasi player yang sudah tidak ada
      setScores((current) => {
        const next: Record<string, number> = {};
        for (const p of connectedPlayers) next[p.id] = current[p.id] ?? 0;
        return next;
      });
      setEliminated((current) => {
        const next: Record<string, boolean> = {};
        for (const p of connectedPlayers) next[p.id] = current[p.id] ?? false;
        return next;
      });
    };

    channel.on("presence", { event: "sync" }, syncFromPresence);
    channel.on("presence", { event: "join" }, syncFromPresence);
    // Player keluar: cukup update daftar player, TIDAK menghentikan game
    channel.on("presence", { event: "leave" }, syncFromPresence);

    // RESET: semua client reset saat host mulai ronde baru
    channel.on("broadcast", { event: "game-reset" }, () => {
      setScores({});
      setEliminated({});
      setSpawns([]);
      setLoserId(null);
      setRemainingMs(ROUND_DURATION_MS);
      setRoundEndsAt(null);
      setPhase("lobby");
    });

    channel.on("broadcast", { event: "round-start" }, ({ payload }) => {
      const data = payload as { endsAt?: unknown };
      const endTime = Number(data.endsAt);
      if (!Number.isFinite(endTime)) return;

      setScores({});
      setEliminated({});
      setSpawns([]);
      setLoserId(null);
      setRemainingMs(ROUND_DURATION_MS);
      setRoundEndsAt(endTime);
      setPhase("playing");
      setError("");
    });

    channel.on("broadcast", { event: "spawn" }, ({ payload }) => {
      const data = payload as { spawn?: Spawn };
      if (!data.spawn) return;
      if (phaseRef.current !== "playing") return;
      const incoming = data.spawn;
      setSpawns((current) => {
        if (current.some((s) => s.id === incoming.id)) return current;
        return [...current, incoming].slice(-MAX_ACTIVE_SPAWNS * 2);
      });
    });

    channel.on("broadcast", { event: "spawn-removed" }, ({ payload }) => {
      const data = payload as { id?: string };
      if (typeof data.id !== "string") return;
      const removedId = data.id;
      setSpawns((current) => current.filter((s) => s.id !== removedId));
    });

    channel.on("broadcast", { event: "score" }, ({ payload }) => {
      const data = payload as { id?: string; score?: number };
      if (typeof data.id !== "string" || typeof data.score !== "number") return;
      const id = data.id;
      const score = data.score;
      setScores((current) => ({ ...current, [id]: score }));
    });

    channel.on("broadcast", { event: "eliminated" }, ({ payload }) => {
      const data = payload as { id?: string };
      if (typeof data.id !== "string") return;
      const eliminatedId = data.id;
      setEliminated((current) => ({ ...current, [eliminatedId]: true }));
      setLoserId(eliminatedId);
      setRoundEndsAt(null);
      setSpawns([]);
      setPhase("results");
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setIsConnected(true);
        setError("");
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setIsConnected(false);
        setError(
          "Room belum tersambung. Periksa konfigurasi Supabase lalu coba lagi.",
        );
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

  // ---- Countdown timer ----
  useEffect(() => {
    if (phase !== "playing" || roundEndsAt === null) return;

    const timer = setInterval(() => {
      const next = Math.max(0, roundEndsAt - Date.now());
      setRemainingMs(next);
      if (next === 0) {
        setSpawns([]);
        setPhase("results");
      }
    }, 80);

    return () => clearInterval(timer);
  }, [phase, roundEndsAt]);

  // ---- Spawn & cleanup spawns ----
  useEffect(() => {
    if (phase !== "playing") {
      if (spawnTimerRef.current) window.clearInterval(spawnTimerRef.current);
      if (cleanupTimerRef.current)
        window.clearInterval(cleanupTimerRef.current);
      spawnTimerRef.current = null;
      cleanupTimerRef.current = null;
      return;
    }

    if (isHost) {
      spawnTimerRef.current = window.setInterval(() => {
        if (phaseRef.current !== "playing") return;
        if (spawnsRef.current.length >= MAX_ACTIVE_SPAWNS) return;
        const spawn = makeSpawn();
        setSpawns((current) => [...current, spawn]);
        void channelRef.current?.send({
          type: "broadcast",
          event: "spawn",
          payload: { spawn },
        });
      }, SPAWN_INTERVAL_MS);
    }

    cleanupTimerRef.current = window.setInterval(() => {
      const now = Date.now();
      setSpawns((current) =>
        current.filter((s) => now - s.bornAt < s.lifetimeMs),
      );
    }, 120);

    return () => {
      if (spawnTimerRef.current) window.clearInterval(spawnTimerRef.current);
      if (cleanupTimerRef.current)
        window.clearInterval(cleanupTimerRef.current);
      spawnTimerRef.current = null;
      cleanupTimerRef.current = null;
    };
  }, [phase, isHost]);

  // ---- Handlers ----
  const enterRoom = (roomCode: string, host: boolean) => {
    if (!supabase) {
      setError(
        "Supabase belum dikonfigurasi. Tambahkan URL dan anon key untuk mengaktifkan room online.",
      );
      return;
    }
    const name = playerName.trim();
    if (!name) {
      setError("Isi nama pemain dulu ya.");
      return;
    }

    setError("");
    setPlayerId(crypto.randomUUID());
    setPlayers([]);
    setScores({});
    setEliminated({});
    setSpawns([]);
    setLoserId(null);
    setPhase("lobby");
    setRoundEndsAt(null);
    setIsReady(host);
    setIsHost(host);
    setActiveRoom(roomCode);
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
    enterRoom(roomCode, false);
  };

  const startRound = () => {
    if (
      !isHost ||
      players.length < 2 ||
      !players.every((p) => p.isHost || p.ready)
    )
      return;

    void channelRef.current?.send({
      type: "broadcast",
      event: "game-reset",
      payload: {},
    });

    setScores({});
    setEliminated({});
    setSpawns([]);
    setLoserId(null);

    const endsAt = Date.now() + ROUND_DURATION_MS;
    setRemainingMs(ROUND_DURATION_MS);
    setRoundEndsAt(endsAt);
    setPhase("playing");
    void channelRef.current?.send({
      type: "broadcast",
      event: "round-start",
      payload: { endsAt },
    });
  };

  const handleSpawnTap = (spawn: Spawn) => {
    if (phase !== "playing") return;
    if (eliminatedRef.current[playerId]) return;
    const now = Date.now();
    if (now - spawn.bornAt >= spawn.lifetimeMs) return;

    setSpawns((current) => current.filter((s) => s.id !== spawn.id));
    void channelRef.current?.send({
      type: "broadcast",
      event: "spawn-removed",
      payload: { id: spawn.id },
    });

    if (spawn.kind === "trap") {
      setEliminated((current) => ({ ...current, [playerId]: true }));
      setLoserId(playerId);
      setRoundEndsAt(null);
      setSpawns([]);
      setPhase("results");
      void channelRef.current?.send({
        type: "broadcast",
        event: "eliminated",
        payload: { id: playerId },
      });
      return;
    }

    const nextScore = (scoresRef.current[playerId] ?? 0) + 1;
    setScores((current) => ({ ...current, [playerId]: nextScore }));
    void channelRef.current?.send({
      type: "broadcast",
      event: "score",
      payload: { id: playerId, score: nextScore },
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
    setScores({});
    setEliminated({});
    setSpawns([]);
    setLoserId(null);
    setPhase("lobby");
    setRoundEndsAt(null);
    setError("");
  };

  const orderedPlayers = [...players].sort(
    (left, right) => (scores[right.id] ?? 0) - (scores[left.id] ?? 0),
  );
  const guestsReady = players.filter((p) => !p.isHost).every((p) => p.ready);
  const canStart = isHost && players.length >= 2 && guestsReady && isConnected;
  const secondsLeft = Math.ceil(remainingMs / 1000);

  const survivors = orderedPlayers.filter((p) => !eliminated[p.id]);
  const winner =
    survivors.length > 0 && players.length >= 2 ? survivors[0] : null;
  const isDraw = !winner && players.length >= 2 && survivors.length === 0;

  const resultTitle = (() => {
    if (!winner) {
      return isDraw ? "Seri! Semua gugur." : "Ronde selesai.";
    }
    if (winner.id === playerId) return "Kamu menang! 🏆";
    return `${winner.name} menang!`;
  })();

  const loserName =
    loserId && loserId !== winner?.id
      ? (players.find((p) => p.id === loserId)?.name ?? null)
      : null;

  const iAmLoser = loserId === playerId;

  return (
    <main className="tap-rush-shell">
      <div className="tap-rush-topbar">
        <Link href="/game" className="tap-rush-back">
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Semua game</span>
        </Link>
        <span className="tap-rush-season">ONLINE PARTY / 01</span>
      </div>

      <section className="tap-rush-layout">
        <header className="tap-rush-heading">
          <div className="tap-rush-kicker">
            <Zap size={14} /> REALTIME ROOM GAME
          </div>
          <h1>
            Tap Rush<span>!</span>
          </h1>
          <p>Tap target, hindari jebakan. Sekali kena — langsung kalah!</p>
        </header>

        {!activeRoom ? (
          <section className="tap-rush-lobby">
            <div className="tap-rush-intro">
              <div className="tap-rush-orb" aria-hidden="true">
                <Rocket size={30} />
              </div>
              <div>
                <h2>Bikin room, ajak teman</h2>
                <p>
                  Target muncul acak — tap dapat poin. Tapi ada jebakan yang
                  bikin langsung gugur dan mengakhiri ronde!
                </p>
              </div>
            </div>

            <label className="tap-rush-label" htmlFor="tap-player-name">
              NAMA PEMAIN
            </label>
            <input
              id="tap-player-name"
              className="tap-rush-input"
              value={playerName}
              onChange={(event) =>
                setPlayerName(event.target.value.slice(0, 18))
              }
              maxLength={18}
              placeholder="Contoh: Alya"
              autoComplete="nickname"
            />

            <div className="tap-rush-actions">
              <button
                className="tap-rush-primary"
                type="button"
                disabled={!supabase}
                onClick={() => enterRoom(makeRoomCode(), true)}
              >
                <Zap size={17} /> Buat room
              </button>
              <span className="tap-rush-or">ATAU</span>
              <form className="tap-rush-join" onSubmit={handleJoinRoom}>
                <input
                  className="tap-rush-input tap-rush-code-input"
                  value={roomInput}
                  onChange={(event) =>
                    setRoomInput(event.target.value.toUpperCase().slice(0, 6))
                  }
                  maxLength={6}
                  placeholder="KODE ROOM"
                  aria-label="Kode room"
                  autoComplete="off"
                />
                <button
                  className="tap-rush-secondary"
                  type="submit"
                  disabled={!supabase}
                >
                  Gabung
                </button>
              </form>
            </div>

            {!supabase && (
              <div className="tap-rush-setup" role="status">
                <Radio size={17} />
                <span>
                  Room online belum aktif. Isi{" "}
                  <code>NEXT_PUBLIC_SUPABASE_URL</code> dan{" "}
                  <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> di
                  environment lokal dan Vercel.
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
                  <span>{players.length} / 8</span>
                </div>
                <div className="tap-rush-player-list">
                  {players.length === 0 ? (
                    <div className="tap-rush-empty">Menyambungkan pemain…</div>
                  ) : (
                    players.map((player, index) => (
                      <div className="tap-rush-player" key={player.id}>
                        <span className="tap-rush-player-number">
                          0{index + 1}
                        </span>
                        <span className="tap-rush-player-name">
                          {player.name}
                          {player.id === playerId ? " (kamu)" : ""}
                        </span>
                        {player.isHost ? (
                          <span className="tap-rush-host">HOST</span>
                        ) : player.ready ? (
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
                      onClick={startRound}
                    >
                      <Rocket size={17} />{" "}
                      {players.length < 2
                        ? "Menunggu teman"
                        : guestsReady
                          ? "Mulai ronde"
                          : "Menunggu semua siap"}
                    </button>
                  ) : (
                    <button
                      className={`tap-rush-primary ${isReady ? "is-ready" : ""}`}
                      type="button"
                      disabled={!isConnected}
                      onClick={() => setIsReady((ready) => !ready)}
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

            {phase === "playing" && (
              <div className="tap-rush-arena">
                <div className="tap-rush-arena-header">
                  <div className="tap-rush-timer" aria-live="polite">
                    <span>WAKTU</span>
                    <strong className={secondsLeft <= 5 ? "is-urgent" : ""}>
                      {String(secondsLeft).padStart(2, "0")}
                    </strong>
                  </div>
                  <div className="tap-rush-my-score">
                    <strong>{scores[playerId] ?? 0}</strong>
                    <span>poin kamu</span>
                  </div>
                </div>

                <p className="tap-rush-arena-prompt">
                  TAP TARGET, HINDARI JEBAKAN
                </p>

                <div className="tap-rush-playfield">
                  {spawns.map((spawn) => {
                    const age = Date.now() - spawn.bornAt;
                    if (age >= spawn.lifetimeMs) return null;
                    const lifeRatio = 1 - age / spawn.lifetimeMs;
                    const isTarget = spawn.kind === "target";
                    return (
                      <button
                        key={spawn.id}
                        type="button"
                        className={`tap-rush-spawn ${isTarget ? "is-target" : "is-trap"}`}
                        style={{
                          left: `${spawn.x}%`,
                          top: `${spawn.y}%`,
                          opacity: 0.4 + lifeRatio * 0.6,
                          transform: `translate(-50%, -50%) scale(${0.85 + lifeRatio * 0.15})`,
                        }}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          handleSpawnTap(spawn);
                        }}
                        aria-label={isTarget ? "Target" : "Jebakan"}
                      >
                        {isTarget ? (
                          <Zap size={22} fill="currentColor" />
                        ) : (
                          <X size={22} />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="tap-rush-alive-list">
                  {players.map((p) => (
                    <span key={p.id} className="tap-rush-alive-chip">
                      {p.name}
                      {p.id === playerId ? " (kamu)" : ""} · {scores[p.id] ?? 0}{" "}
                      poin
                    </span>
                  ))}
                </div>
              </div>
            )}

            {phase === "results" && (
              <div className="tap-rush-results">
                <div className="tap-rush-finish-mark">FINISH</div>
                <h2>{resultTitle}</h2>
                {loserName && (
                  <p className="tap-rush-arena-prompt">
                    {iAmLoser
                      ? "Kamu kena jebakan!"
                      : `${loserName} kena jebakan!`}
                  </p>
                )}
                <ol className="tap-rush-scoreboard">
                  {orderedPlayers.map((player, index) => (
                    <li
                      className={
                        winner && player.id === winner.id ? "is-winner" : ""
                      }
                      key={player.id}
                    >
                      <span className="tap-rush-rank">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="tap-rush-player-name">
                        {player.name}
                        {player.id === playerId ? " (kamu)" : ""}
                        {eliminated[player.id] ? " · GUGUR" : ""}
                      </span>
                      <strong>{scores[player.id] ?? 0}</strong>
                    </li>
                  ))}
                </ol>
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
          <span>NO DOWNLOAD</span>
          <span>ROOM CODE PARTY</span>
          <span>SUDDEN DEATH</span>
        </footer>
      </section>

      <style jsx>{`
        .tap-rush-arena-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }
        .tap-rush-my-score {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }
        .tap-rush-playfield {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;
          border-radius: 16px;
          background:
            radial-gradient(
              circle at 50% 50%,
              rgba(251, 191, 36, 0.08),
              transparent 70%
            ),
            #050912;
          border: 1px solid rgba(255, 255, 255, 0.08);
          overflow: hidden;
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
        }
        .tap-rush-spawn {
          position: absolute;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid;
          cursor: pointer;
          transition:
            transform 80ms ease-out,
            opacity 80ms linear;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          padding: 0;
        }
        .tap-rush-spawn.is-target {
          background: rgba(251, 191, 36, 0.18);
          border-color: #fbbf24;
          color: #fbbf24;
          box-shadow: 0 0 20px rgba(251, 191, 36, 0.5);
        }
        .tap-rush-spawn.is-trap {
          background: rgba(239, 68, 68, 0.22);
          border-color: #ef4444;
          color: #ef4444;
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.5);
        }
        .tap-rush-spawn:active {
          transform: translate(-50%, -50%) scale(0.9) !important;
        }
        .tap-rush-alive-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .tap-rush-alive-chip {
          padding: 4px 10px;
          font-size: 11px;
          letter-spacing: 0.06em;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          text-transform: uppercase;
        }
      `}</style>
    </main>
  );
}
