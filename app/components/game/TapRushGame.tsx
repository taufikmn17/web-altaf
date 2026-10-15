"use client";

import {
  ArrowLeft,
  Copy,
  DoorOpen,
  Radio,
  Rocket,
  Swords,
  UsersRound,
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

const SCORE_TO_WIN = 20;
const PENALTY_MS = 700; // stun kalau tap salah giliran
const ROOM_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeRoomCode() {
  const values = new Uint32Array(6);
  crypto.getRandomValues(values);
  return Array.from(
    values,
    (value) => ROOM_CHARACTERS[value % ROOM_CHARACTERS.length],
  ).join("");
}

export default function TapRushGame() {
  const supabase = getSupabaseBrowserClient();
  const [playerId, setPlayerId] = useState("");
  const channelRef = useRef<RealtimeChannel | null>(null);

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

  const [scores, setScores] = useState<Record<string, number>>({});
  const [turnId, setTurnId] = useState<string | null>(null);
  const [stunnedUntil, setStunnedUntil] = useState<number>(0);
  const [tick, setTick] = useState(0); // untuk re-render UI stun
  const [lastEvent, setLastEvent] = useState<{
    id: string;
    correct: boolean;
    at: number;
  } | null>(null);
  const [winnerId, setWinnerId] = useState<string | null>(null);

  const scoresRef = useRef<Record<string, number>>({});
  const turnIdRef = useRef<string | null>(null);
  const stunnedUntilRef = useRef<number>(0);

  useEffect(() => {
    scoresRef.current = scores;
  }, [scores]);
  useEffect(() => {
    turnIdRef.current = turnId;
  }, [turnId]);
  useEffect(() => {
    stunnedUntilRef.current = stunnedUntil;
  }, [stunnedUntil]);

  // Force re-render untuk hitung sisa stun
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 100);
    return () => clearInterval(t);
  }, []);

  // ---- Realtime channel ----
  useEffect(() => {
    if (!activeRoom || !supabase || !playerId) return;

    const channel = supabase.channel(`tap-battle:${activeRoom}`, {
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
      setScores((current) => {
        const next: Record<string, number> = {};
        for (const p of connectedPlayers) next[p.id] = current[p.id] ?? 0;
        return next;
      });
    };

    channel.on("presence", { event: "sync" }, syncFromPresence);
    channel.on("presence", { event: "join" }, syncFromPresence);
    channel.on("presence", { event: "leave" }, syncFromPresence);

    channel.on("broadcast", { event: "game-reset" }, () => {
      setScores({});
      setTurnId(null);
      setStunnedUntil(0);
      setWinnerId(null);
      setLastEvent(null);
      setPhase("lobby");
    });

    channel.on("broadcast", { event: "round-start" }, ({ payload }) => {
      const data = payload as { hostId?: string; guestId?: string };
      if (!data.hostId || !data.guestId) return;

      setScores({ [data.hostId]: 0, [data.guestId]: 0 });
      setTurnId(data.hostId);
      setStunnedUntil(0);
      setWinnerId(null);
      setLastEvent(null);
      setPhase("playing");
      setError("");
    });

    channel.on("broadcast", { event: "hit" }, ({ payload }) => {
      const data = payload as {
        id?: string;
        newScore?: number;
        nextTurn?: string;
      };
      if (typeof data.id !== "string") return;
      if (typeof data.newScore !== "number") return;

      setScores((current) => ({
        ...current,
        [data.id as string]: data.newScore as number,
      }));
      if (typeof data.nextTurn === "string") setTurnId(data.nextTurn);
      setLastEvent({ id: data.id, correct: true, at: Date.now() });
    });

    channel.on("broadcast", { event: "miss" }, ({ payload }) => {
      const data = payload as { id?: string; penaltyMs?: number };
      if (typeof data.id !== "string") return;
      const penalty = data.penaltyMs ?? PENALTY_MS;

      // Hanya client yang kena penalty yang apply stun
      if (data.id === playerId) {
        const until = Date.now() + penalty;
        stunnedUntilRef.current = until;
        setStunnedUntil(until);
      }
      setLastEvent({ id: data.id, correct: false, at: Date.now() });
    });

    channel.on("broadcast", { event: "game-over" }, ({ payload }) => {
      const data = payload as { winnerId?: string };
      if (typeof data.winnerId !== "string") return;
      setWinnerId(data.winnerId);
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
    setTurnId(null);
    setStunnedUntil(0);
    setWinnerId(null);
    setLastEvent(null);
    setPhase("lobby");
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
    const hostId = playerId;
    const guest = players.find((p) => !p.isHost);
    if (!guest) return;

    void channelRef.current?.send({
      type: "broadcast",
      event: "game-reset",
      payload: {},
    });

    setScores({ [hostId]: 0, [guest.id]: 0 });
    setTurnId(hostId);
    setStunnedUntil(0);
    setWinnerId(null);
    setLastEvent(null);
    setPhase("playing");
    void channelRef.current?.send({
      type: "broadcast",
      event: "round-start",
      payload: { hostId, guestId: guest.id },
    });
  };

  const handleTap = () => {
    if (phase !== "playing") return;
    if (!turnId) return;

    const now = Date.now();
    if (now < stunnedUntilRef.current) return; // masih stun

    const isMyTurn = turnId === playerId;

    if (!isMyTurn) {
      // Tap saat bukan giliran -> penalty
      const until = now + PENALTY_MS;
      stunnedUntilRef.current = until;
      setStunnedUntil(until);
      setLastEvent({ id: playerId, correct: false, at: now });
      void channelRef.current?.send({
        type: "broadcast",
        event: "miss",
        payload: { id: playerId, penaltyMs: PENALTY_MS },
      });
      return;
    }

    // Tap saat giliran -> +1 poin, giliran pindah ke lawan
    const opponent = players.find((p) => p.id !== playerId);
    if (!opponent) return;

    const newScore = (scoresRef.current[playerId] ?? 0) + 1;
    setScores((current) => ({ ...current, [playerId]: newScore }));
    setTurnId(opponent.id);
    setLastEvent({ id: playerId, correct: true, at: now });

    void channelRef.current?.send({
      type: "broadcast",
      event: "hit",
      payload: { id: playerId, newScore, nextTurn: opponent.id },
    });

    // Cek menang
    if (newScore >= SCORE_TO_WIN) {
      setWinnerId(playerId);
      setPhase("results");
      void channelRef.current?.send({
        type: "broadcast",
        event: "game-over",
        payload: { winnerId: playerId },
      });
    }
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
    setTurnId(null);
    setStunnedUntil(0);
    setWinnerId(null);
    setLastEvent(null);
    setPhase("lobby");
    setError("");
  };

  // ---- Derived ----
  const orderedPlayers = [...players].sort(
    (left, right) => (scores[right.id] ?? 0) - (scores[left.id] ?? 0),
  );
  const guestsReady = players.filter((p) => !p.isHost).every((p) => p.ready);
  const canStart = isHost && players.length === 2 && guestsReady && isConnected;

  const myName = players.find((p) => p.id === playerId)?.name ?? "Kamu";
  const opponent = players.find((p) => p.id !== playerId);
  const opponentName = opponent?.name ?? "Lawan";
  const isMyTurn = turnId === playerId;
  const remainingStunMs = Math.max(0, stunnedUntil - Date.now());
  const isStunned = remainingStunMs > 0;
  const myScore = scores[playerId] ?? 0;
  const opponentScore = opponent ? (scores[opponent.id] ?? 0) : 0;

  const winnerName = winnerId
    ? (players.find((p) => p.id === winnerId)?.name ?? "Pemain")
    : "";

  // Warna tombol: giliranmu (hijau), giliran lawan (abu), stun (merah)
  const buttonClass = isStunned
    ? "is-stunned"
    : isMyTurn
      ? "is-my-turn"
      : "is-waiting";

  const buttonLabel = isStunned
    ? `STUN! ${(remainingStunMs / 1000).toFixed(1)}s`
    : isMyTurn
      ? "TAP!"
      : "TUNGGU GILIRAN";

  const recentEvent =
    lastEvent && Date.now() - lastEvent.at < 900 ? lastEvent : null;
  const eventIsMe = recentEvent?.id === playerId;
  void tick; // prevent unused warning

  return (
    <main className="tap-rush-shell">
      <div className="tap-rush-topbar">
        <Link href="/game" className="tap-rush-back">
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Semua game</span>
        </Link>
        <span className="tap-rush-season">ONLINE DUEL / 01</span>
      </div>

      <section className="tap-rush-layout">
        <header className="tap-rush-heading">
          <div className="tap-rush-kicker">
            <Swords size={14} /> REALTIME TAP BATTLE
          </div>
          <h1>
            Tap Battle<span>!</span>
          </h1>
          <p>
            Tap tombol saat giliranmu. Yang cepat & tidak salah tap, dia menang!
          </p>
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
                  Tombol besar di tengah — gantian giliran tap. Siapa duluan
                  sampai {SCORE_TO_WIN} poin menang. Tap saat bukan giliranmu =
                  stun!
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
                  <span>{players.length} / 2</span>
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
                        ? "Menunggu lawan"
                        : guestsReady
                          ? "Mulai duel"
                          : "Menunggu siap"}
                    </button>
                  ) : (
                    <button
                      className={`tap-rush-primary ${isReady ? "is-ready" : ""}`}
                      type="button"
                      disabled={!isConnected}
                      onClick={() => setIsReady((ready) => !ready)}
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
              <div className="tap-battle-arena">
                <div className="tap-battle-scoreline">
                  <div className="tap-battle-score is-me">
                    <span>KAMU</span>
                    <strong>{myScore}</strong>
                    {isMyTurn && !isStunned && (
                      <span className="tap-battle-turn-badge">GILIRANMU</span>
                    )}
                  </div>
                  <span className="tap-battle-vs">VS</span>
                  <div className="tap-battle-score is-them">
                    <span>{opponentName.toUpperCase()}</span>
                    <strong>{opponentScore}</strong>
                    {!isMyTurn && (
                      <span className="tap-battle-turn-badge is-them">
                        GILIRANNYA
                      </span>
                    )}
                  </div>
                </div>

                <p className="tap-battle-target">Target: {SCORE_TO_WIN} poin</p>

                <button
                  type="button"
                  className={`tap-battle-button ${buttonClass}`}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    handleTap();
                  }}
                  disabled={isStunned}
                >
                  {buttonLabel}
                </button>

                <p className="tap-battle-hint">
                  {isMyTurn && !isStunned
                    ? "Tap sekarang, jangan sampai salah giliran!"
                    : isStunned
                      ? "Kamu kena stun karena tap saat bukan giliran."
                      : "Tunggu giliranmu — jangan tap dulu."}
                </p>

                {recentEvent && (
                  <p
                    className={`tap-battle-event ${recentEvent.correct ? "is-hit" : "is-miss"}`}
                  >
                    {eventIsMe
                      ? recentEvent.correct
                        ? "+1 poin! 🎯"
                        : "❌ Tap saat bukan giliran — stun!"
                      : recentEvent.correct
                        ? "Lawan dapat poin!"
                        : "Lawan salah tap, kena stun!"}
                  </p>
                )}
              </div>
            )}

            {phase === "results" && (
              <div className="tap-rush-results">
                <div className="tap-rush-finish-mark">FINISH</div>
                <h2>
                  {winnerId === playerId
                    ? "Kamu menang! 🏆"
                    : `${winnerName} menang!`}
                </h2>
                <ol className="tap-rush-scoreboard">
                  {orderedPlayers.map((player, index) => (
                    <li
                      className={index === 0 ? "is-winner" : ""}
                      key={player.id}
                    >
                      <span className="tap-rush-rank">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="tap-rush-player-name">
                        {player.name}
                        {player.id === playerId ? " (kamu)" : ""}
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
          <span>TAP 1V1</span>
          <span>{SCORE_TO_WIN} POIN</span>
          <span>SUDDEN DEATH</span>
        </footer>
      </section>

      <style jsx>{`
        .tap-battle-arena {
          display: flex;
          flex-direction: column;
          gap: 14px;
          align-items: center;
        }
        .tap-battle-scoreline {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
        }
        .tap-battle-score {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          flex: 1;
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          opacity: 0.9;
        }
        .tap-battle-score strong {
          font-size: 28px;
          color: #fbbf24;
          line-height: 1;
        }
        .tap-battle-score.is-them strong {
          color: #f97316;
        }
        .tap-battle-vs {
          font-size: 12px;
          opacity: 0.4;
          letter-spacing: 0.15em;
        }
        .tap-battle-turn-badge {
          margin-top: 4px;
          padding: 2px 8px;
          font-size: 10px;
          letter-spacing: 0.1em;
          border-radius: 999px;
          background: rgba(34, 197, 94, 0.2);
          color: #86efac;
          border: 1px solid rgba(34, 197, 94, 0.5);
          animation: pulse 1.2s ease-in-out infinite;
        }
        .tap-battle-turn-badge.is-them {
          background: rgba(249, 115, 22, 0.2);
          color: #fdba74;
          border-color: rgba(249, 115, 22, 0.5);
        }
        @keyframes pulse {
          50% {
            opacity: 0.5;
          }
        }
        .tap-battle-target {
          font-size: 12px;
          opacity: 0.55;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .tap-battle-button {
          width: 100%;
          aspect-ratio: 1 / 1;
          max-width: 360px;
          border-radius: 24px;
          border: 3px solid;
          font-size: 28px;
          font-weight: 800;
          letter-spacing: 0.15em;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          transition:
            transform 80ms ease-out,
            background 120ms ease,
            border-color 120ms ease;
          padding: 0;
        }
        .tap-battle-button.is-my-turn {
          background:
            radial-gradient(
              circle at 50% 30%,
              rgba(34, 197, 94, 0.4),
              rgba(34, 197, 94, 0.15)
            ),
            #061a0c;
          border-color: #22c55e;
          color: #86efac;
          box-shadow: 0 0 40px rgba(34, 197, 94, 0.5);
          animation: pulseGreen 1s ease-in-out infinite;
        }
        @keyframes pulseGreen {
          50% {
            box-shadow: 0 0 60px rgba(34, 197, 94, 0.8);
          }
        }
        .tap-battle-button.is-my-turn:active {
          transform: scale(0.96);
        }
        .tap-battle-button.is-waiting {
          background: rgba(255, 255, 255, 0.03);
          border-color: rgba(255, 255, 255, 0.15);
          color: rgba(255, 255, 255, 0.4);
          cursor: default;
        }
        .tap-battle-button.is-stunned {
          background: rgba(239, 68, 68, 0.15);
          border-color: #ef4444;
          color: #fca5a5;
          cursor: not-allowed;
          animation: shake 0.3s;
        }
        @keyframes shake {
          25% {
            transform: translateX(-4px);
          }
          75% {
            transform: translateX(4px);
          }
        }
        .tap-battle-hint {
          font-size: 12px;
          opacity: 0.65;
          letter-spacing: 0.06em;
          text-align: center;
        }
        .tap-battle-event {
          font-size: 14px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          animation: slideIn 0.2s ease-out;
        }
        .tap-battle-event.is-hit {
          color: #86efac;
        }
        .tap-battle-event.is-miss {
          color: #fca5a5;
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}
