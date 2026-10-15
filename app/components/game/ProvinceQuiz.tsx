"use client";

import {
  ArrowLeft,
  Check,
  Copy,
  DoorOpen,
  Radio,
  Rocket,
  Send,
  Shield,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/app/lib/supabase-browser";
import { PROVINCES_ID, isAnswerCorrect } from "@/app/lib/provinces-id";

type RoomPlayer = {
  id: string;
  name: string;
  isHost: boolean;
  ready: boolean;
};

type GamePhase = "lobby" | "playing" | "results";

type RoundData = {
  round: number;
  index: number;
  imageUrl: string;
  answer: string;
};

const TOTAL_ROUNDS = 5;
const ANSWER_WINDOW_MS = 20_000;
const REVEAL_DURATION_MS = 3_500;
const ROOM_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeRoomCode() {
  const values = new Uint32Array(6);
  crypto.getRandomValues(values);
  return Array.from(
    values,
    (value) => ROOM_CHARACTERS[value % ROOM_CHARACTERS.length],
  ).join("");
}

function pickRandomProvince(exclude: Set<number>): number {
  const pool = Array.from({ length: PROVINCES_ID.length }, (_, i) => i).filter(
    (i) => !exclude.has(i),
  );
  if (pool.length === 0) return Math.floor(Math.random() * PROVINCES_ID.length);
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function ProvinceQuiz() {
  const supabase = getSupabaseBrowserClient();
  const [playerId, setPlayerId] = useState("");
  const channelRef = useRef<RealtimeChannel | null>(null);

  const [playerName, setPlayerName] = useState("");
  const [roomInput, setRoomInput] = useState("");
  const [activeRoom, setActiveRoom] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [isReady, setIsReady] = useState(false);
  const [phase, setPhase] = useState<GamePhase>("lobby");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const [round, setRound] = useState(0);
  const [roundData, setRoundData] = useState<RoundData | null>(null);
  const [answeredBy, setAnsweredBy] = useState<string | null>(null);
  const [answeredByName, setAnsweredByName] = useState("");
  const [myWrongAnswer, setMyWrongAnswer] = useState<string | null>(null);
  const [answerInput, setAnswerInput] = useState("");
  const [revealAt, setRevealAt] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(ANSWER_WINDOW_MS);

  const usedIndicesRef = useRef<Set<number>>(new Set());
  const scoresRef = useRef<Record<string, number>>({});
  const roundRef = useRef(0);
  const answeredByRef = useRef<string | null>(null);

  useEffect(() => {
    scoresRef.current = scores;
  }, [scores]);
  useEffect(() => {
    roundRef.current = round;
  }, [round]);
  useEffect(() => {
    answeredByRef.current = answeredBy;
  }, [answeredBy]);

  // ---- Realtime channel ----
  useEffect(() => {
    if (!activeRoom || !supabase || !playerId) return;

    const channel = supabase.channel(`province-quiz:${activeRoom}`, {
      config: {
        broadcast: { self: false },
        presence: { key: playerId },
      },
    });
    channelRef.current = channel;

    channel.on("presence", { event: "sync" }, () => {
      const connectedPlayers = Object.values(
        channel.presenceState<RoomPlayer>(),
      )
        .flat()
        .sort((left, right) => Number(right.isHost) - Number(left.isHost));
      setPlayers(connectedPlayers);
      setScores((current) => {
        const next: Record<string, number> = {};
        for (const p of connectedPlayers) next[p.id] = current[p.id] ?? 0;
        return next;
      });
    });

    channel.on("broadcast", { event: "new-round" }, ({ payload }) => {
      const data = payload as RoundData;
      if (
        typeof data.round !== "number" ||
        typeof data.index !== "number" ||
        !data.imageUrl ||
        !data.answer
      )
        return;

      setRound(data.round);
      setRoundData(data);
      setAnsweredBy(null);
      setAnsweredByName("");
      setMyWrongAnswer(null);
      setAnswerInput("");
      setRevealAt(null);
      setRemainingMs(ANSWER_WINDOW_MS);
      setPhase("playing");
      setError("");
    });

    channel.on("broadcast", { event: "answered" }, ({ payload }) => {
      const data = payload as { id?: string; name?: string };
      if (typeof data.id !== "string") return;
      const id = data.id;
      const name = data.name ?? "Pemain";
      setAnsweredBy(id);
      setAnsweredByName(name);
      setRevealAt(Date.now());
      setScores((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));
    });

    channel.on("broadcast", { event: "round-end" }, () => {
      setRevealAt(Date.now());
    });

    channel.on("broadcast", { event: "game-over" }, () => {
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

  // ---- Timer jawab ----
  useEffect(() => {
    if (phase !== "playing" || revealAt !== null) return;
    if (answeredBy !== null) return;
    if (!roundData) return;

    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const left = Math.max(0, ANSWER_WINDOW_MS - elapsed);
      setRemainingMs(left);
      if (left === 0 && isHost) {
        void channelRef.current?.send({
          type: "broadcast",
          event: "round-end",
          payload: {},
        });
        setRevealAt(Date.now());
      }
    }, 100);
    return () => clearInterval(timer);
  }, [phase, round, revealAt, answeredBy, isHost, roundData]);

  // ---- Auto-next ----
  useEffect(() => {
    if (phase !== "playing" || revealAt === null) return;
    if (!isHost) return;

    const timer = setTimeout(() => {
      const nextRound = roundRef.current + 1;
      if (nextRound > TOTAL_ROUNDS) {
        void channelRef.current?.send({
          type: "broadcast",
          event: "game-over",
          payload: {},
        });
        setPhase("results");
        return;
      }
      void broadcastNewRound(nextRound);
    }, REVEAL_DURATION_MS);

    return () => clearTimeout(timer);
  }, [phase, revealAt, isHost]);

  // ---- Handlers ----
  const broadcastNewRound = async (roundNumber: number) => {
    const idx = pickRandomProvince(usedIndicesRef.current);
    usedIndicesRef.current.add(idx);
    const province = PROVINCES_ID[idx];
    if (!province) return;

    const data: RoundData = {
      round: roundNumber,
      index: idx,
      imageUrl: province.emblem,
      answer: province.name,
    };

    setRound(roundNumber);
    setRoundData(data);
    setAnsweredBy(null);
    setAnsweredByName("");
    setMyWrongAnswer(null);
    setAnswerInput("");
    setRevealAt(null);
    setRemainingMs(ANSWER_WINDOW_MS);
    setPhase("playing");

    void channelRef.current?.send({
      type: "broadcast",
      event: "new-round",
      payload: data,
    });
  };

  const enterRoom = (roomCode: string, host: boolean) => {
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
    setPlayerId(crypto.randomUUID());
    setPlayers([]);
    setScores({});
    setPhase("lobby");
    setRound(0);
    setRoundData(null);
    setAnsweredBy(null);
    setRevealAt(null);
    usedIndicesRef.current = new Set();
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

  const startGame = () => {
    if (
      !isHost ||
      players.length < 2 ||
      !players.every((p) => p.isHost || p.ready)
    )
      return;

    setScores({});
    usedIndicesRef.current = new Set();
    void broadcastNewRound(1);
  };

  const submitAnswer = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (phase !== "playing") return;
    if (answeredBy !== null) return;
    if (!roundData) return;
    const trimmed = answerInput.trim();
    if (!trimmed) return;

    const isCorrect = isAnswerCorrect(trimmed, roundData.answer);

    if (isCorrect) {
      const myName = players.find((p) => p.id === playerId)?.name ?? "Pemain";
      setAnsweredBy(playerId);
      setAnsweredByName(myName);
      setRevealAt(Date.now());
      setScores((current) => ({
        ...current,
        [playerId]: (current[playerId] ?? 0) + 1,
      }));
      void channelRef.current?.send({
        type: "broadcast",
        event: "answered",
        payload: { id: playerId, name: myName },
      });
      setAnswerInput("");
    } else {
      setMyWrongAnswer(trimmed);
      setAnswerInput("");
      setTimeout(() => setMyWrongAnswer(null), 1500);
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
    setPhase("lobby");
    setRound(0);
    setRoundData(null);
    setAnsweredBy(null);
    setRevealAt(null);
    setError("");
  };

  const orderedPlayers = [...players].sort(
    (left, right) => (scores[right.id] ?? 0) - (scores[left.id] ?? 0),
  );
  const guestsReady = players.filter((p) => !p.isHost).every((p) => p.ready);
  const canStart = isHost && players.length >= 2 && guestsReady && isConnected;
  const secondsLeft = Math.ceil(remainingMs / 1000);
  const showReveal = revealAt !== null;

  return (
    <main className="tap-rush-shell">
      <div className="tap-rush-topbar">
        <Link href="/game" className="tap-rush-back">
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Semua game</span>
        </Link>
        <span className="tap-rush-season">ONLINE QUIZ / 05</span>
      </div>

      <section className="tap-rush-layout">
        <header className="tap-rush-heading">
          <div className="tap-rush-kicker">
            <Shield size={14} /> REALTIME PROVINCE QUIZ
          </div>
          <h1>
            Tebak Lambang Daerah<span>!</span>
          </h1>
          <p>
            Lambang provinsi muncul — tebak namanya paling cepat. Adu
            pengetahuan daerah!
          </p>
        </header>

        {!activeRoom ? (
          <section className="tap-rush-lobby">
            <div className="tap-rush-intro">
              <div className="tap-rush-orb" aria-hidden="true">
                <Shield size={30} />
              </div>
              <div>
                <h2>Bikin room, tantang teman</h2>
                <p>
                  Lambang provinsi Indonesia muncul acak. Ketik nama provinsinya
                  sebelum waktu habis. Yang benar duluan dapat poin!
                </p>
              </div>
            </div>

            <label className="tap-rush-label" htmlFor="province-player-name">
              NAMA PEMAIN
            </label>
            <input
              id="province-player-name"
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
                disabled={!supabase}
                onClick={() => enterRoom(makeRoomCode(), true)}
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
                  <span>{players.length} / 8</span>
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
                        ? "Menunggu teman"
                        : guestsReady
                          ? "Mulai kuis"
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

            {phase === "playing" && roundData && (
              <div className="province-arena">
                <div className="province-topbar">
                  <span className="province-round">
                    RONDE {round} / {TOTAL_ROUNDS}
                  </span>
                  <span
                    className={`province-timer ${secondsLeft <= 5 ? "is-urgent" : ""}`}
                  >
                    {showReveal ? "JAWABAN" : `${secondsLeft}s`}
                  </span>
                </div>

                <div className="province-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={roundData.imageUrl}
                    alt="Lambang provinsi misterius"
                    className="province-image"
                  />
                </div>

                {showReveal ? (
                  <div className="province-reveal">
                    <span className="province-reveal-label">JAWABAN</span>
                    <strong>{roundData.answer}</strong>
                    {answeredBy ? (
                      <span className="province-reveal-by">
                        🎯 {answeredByName || "Pemain"} menebak duluan!
                      </span>
                    ) : (
                      <span className="province-reveal-by">
                        Tidak ada yang benar. Lanjut…
                      </span>
                    )}
                  </div>
                ) : answeredBy ? (
                  <div className="province-reveal">
                    <strong>
                      {answeredByName || "Pemain"} sudah jawab benar!
                    </strong>
                  </div>
                ) : (
                  <form className="province-form" onSubmit={submitAnswer}>
                    <input
                      className="tap-rush-input"
                      value={answerInput}
                      onChange={(e) =>
                        setAnswerInput(e.target.value.slice(0, 40))
                      }
                      placeholder="Contoh: Jawa Barat"
                      maxLength={40}
                      autoComplete="off"
                    />
                    <button className="tap-rush-primary" type="submit">
                      <Send size={16} /> Kirim
                    </button>
                    {myWrongAnswer && (
                      <p className="province-wrong">
                        &quot;{myWrongAnswer}&quot; belum tepat, coba lagi!
                      </p>
                    )}
                  </form>
                )}

                <ol className="tap-rush-scoreboard">
                  {orderedPlayers.map((player, index) => (
                    <li key={player.id}>
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
              </div>
            )}

            {phase === "results" && (
              <div className="tap-rush-results">
                <div className="tap-rush-finish-mark">FINISH</div>
                <h2>
                  {orderedPlayers[0]?.id === playerId
                    ? "Kamu paling jago lambang daerah! 🏆"
                    : `${orderedPlayers[0]?.name ?? "—"} paling jago!`}
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
          <span>38 PROVINSI</span>
          <span>ROOM CODE</span>
          <span>5 ROUNDS</span>
        </footer>
      </section>

      <style jsx>{`
        .province-arena {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .province-topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          opacity: 0.75;
        }
        .province-timer {
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .province-timer.is-urgent {
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.5);
          animation: pulse 0.8s infinite;
        }
        @keyframes pulse {
          50% {
            opacity: 0.5;
          }
        }
        .province-card {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
          border-radius: 16px;
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(251, 191, 36, 0.1),
              transparent 70%
            ),
            #050912;
          border: 1px solid rgba(255, 255, 255, 0.08);
          min-height: 240px;
        }
        .province-image {
          max-width: 240px;
          max-height: 240px;
          width: 100%;
          height: auto;
          object-fit: contain;
          filter: drop-shadow(0 8px 24px rgba(251, 191, 36, 0.25));
        }
        .province-form {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .province-reveal {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 16px;
          border-radius: 12px;
          background: rgba(251, 191, 36, 0.08);
          border: 1px solid rgba(251, 191, 36, 0.35);
        }
        .province-reveal-label {
          font-size: 11px;
          letter-spacing: 0.15em;
          opacity: 0.65;
        }
        .province-reveal strong {
          font-size: 22px;
          color: #fbbf24;
        }
        .province-reveal-by {
          font-size: 13px;
          opacity: 0.75;
        }
        .province-wrong {
          font-size: 13px;
          color: #ef4444;
          margin-top: 4px;
        }
      `}</style>
    </main>
  );
}
