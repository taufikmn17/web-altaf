"use client";

import {
  ArrowLeft,
  Check,
  Copy,
  DoorOpen,
  HelpCircle,
  Radio,
  Rocket,
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

type TriviaQuestion = {
  id: string;
  category: string;
  difficulty: string;
  question: string;
  options: string[];
  correct: string;
};

type RoundData = {
  round: number;
  question: TriviaQuestion;
};

const TOTAL_ROUNDS = 7;
const ANSWER_WINDOW_MS = 15_000;
const REVEAL_DURATION_MS = 3_000;
const ROOM_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeRoomCode() {
  const values = new Uint32Array(6);
  crypto.getRandomValues(values);
  return Array.from(
    values,
    (value) => ROOM_CHARACTERS[value % ROOM_CHARACTERS.length],
  ).join("");
}

export default function TriviaBlitz() {
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
  const [myAnswer, setMyAnswer] = useState<string | null>(null);
  const [answeredIds, setAnsweredIds] = useState<Record<string, string>>({});
  const [revealAt, setRevealAt] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(ANSWER_WINDOW_MS);
  const [questionBank, setQuestionBank] = useState<TriviaQuestion[]>([]);
  const [loading, setLoading] = useState(false);

  const scoresRef = useRef<Record<string, number>>({});
  const roundRef = useRef(0);
  const bankRef = useRef<TriviaQuestion[]>([]);

  useEffect(() => {
    scoresRef.current = scores;
  }, [scores]);
  useEffect(() => {
    roundRef.current = round;
  }, [round]);
  useEffect(() => {
    bankRef.current = questionBank;
  }, [questionBank]);

  // ---- Realtime channel ----
  useEffect(() => {
    if (!activeRoom || !supabase || !playerId) return;

    const channel = supabase.channel(`trivia-blitz:${activeRoom}`, {
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

    // RESET: dipanggil host sebelum game baru -> semua client reset state
    channel.on("broadcast", { event: "game-reset" }, () => {
      setScores({});
      setAnsweredIds({});
      setMyAnswer(null);
      setRevealAt(null);
      setRound(0);
      setRoundData(null);
    });

    // Host broadcast bank soal biar guest punya backup
    channel.on("broadcast", { event: "question-bank" }, ({ payload }) => {
      const data = payload as { questions?: TriviaQuestion[] };
      if (!Array.isArray(data.questions)) return;
      setQuestionBank(data.questions);
      bankRef.current = data.questions;
    });

    channel.on("broadcast", { event: "new-round" }, ({ payload }) => {
      const data = payload as RoundData;
      if (!data || typeof data.round !== "number" || !data.question) return;

      setRound(data.round);
      setRoundData(data);
      setMyAnswer(null);
      setAnsweredIds({});
      setRevealAt(null);
      setRemainingMs(ANSWER_WINDOW_MS);
      setPhase("playing");
      setError("");
    });

    channel.on("broadcast", { event: "answered" }, ({ payload }) => {
      const data = payload as {
        id?: string;
        name?: string;
        answer?: string;
        correct?: boolean;
      };
      if (typeof data.id !== "string") return;
      const id = data.id;
      const answer = data.answer ?? "";
      setAnsweredIds((current) => ({ ...current, [id]: answer }));
      if (data.correct) {
        setScores((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));
      }
    });

    channel.on("broadcast", { event: "reveal" }, () => {
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

  // ---- Timer ----
  useEffect(() => {
    if (phase !== "playing" || revealAt !== null) return;
    if (!roundData) return;

    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const left = Math.max(0, ANSWER_WINDOW_MS - elapsed);
      setRemainingMs(left);
      if (left === 0 && isHost) {
        void channelRef.current?.send({
          type: "broadcast",
          event: "reveal",
          payload: {},
        });
        setRevealAt(Date.now());
      }
    }, 100);
    return () => clearInterval(timer);
  }, [phase, round, revealAt, isHost, roundData]);

  // ---- Auto-next setelah reveal ----
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
      broadcastNewRound(nextRound);
    }, REVEAL_DURATION_MS);

    return () => clearTimeout(timer);
  }, [phase, revealAt, isHost]);

  // ---- Handlers ----
  const fetchQuestions = async (): Promise<TriviaQuestion[]> => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/trivia?amount=${TOTAL_ROUNDS}&difficulty=medium`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as {
        questions?: TriviaQuestion[];
        error?: string;
      };
      if (data.error || !data.questions) {
        setError(data.error ?? "Gagal ambil soal.");
        return [];
      }
      return data.questions;
    } catch {
      setError("Kesalahan jaringan saat ambil soal.");
      return [];
    } finally {
      setLoading(false);
    }
  };

  const broadcastNewRound = (roundNumber: number) => {
    const bank = bankRef.current;
    const question = bank[roundNumber - 1];
    if (!question) return;

    const data: RoundData = { round: roundNumber, question };
    setRound(roundNumber);
    setRoundData(data);
    setMyAnswer(null);
    setAnsweredIds({});
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
    setAnsweredIds({});
    setRevealAt(null);
    setQuestionBank([]);
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

  const startGame = async () => {
    if (
      !isHost ||
      players.length < 2 ||
      !players.every((p) => p.isHost || p.ready)
    )
      return;

    // 1. Beritahu semua client untuk reset skor & state
    void channelRef.current?.send({
      type: "broadcast",
      event: "game-reset",
      payload: {},
    });

    // 2. Reset lokal host
    setScores({});
    setAnsweredIds({});
    setMyAnswer(null);
    setRevealAt(null);

    // 3. Fetch soal baru
    const questions = await fetchQuestions();
    if (questions.length === 0) return;

    // 4. Simpan & broadcast bank soal
    setQuestionBank(questions);
    bankRef.current = questions;
    void channelRef.current?.send({
      type: "broadcast",
      event: "question-bank",
      payload: { questions },
    });

    // 5. Mulai ronde 1
    broadcastNewRound(1);
  };

  const pickAnswer = (option: string) => {
    if (phase !== "playing") return;
    if (myAnswer !== null) return;
    if (revealAt !== null) return;
    if (!roundData) return;

    setMyAnswer(option);
    const isCorrect = option === roundData.question.correct;
    const myName = players.find((p) => p.id === playerId)?.name ?? "Pemain";

    void channelRef.current?.send({
      type: "broadcast",
      event: "answered",
      payload: {
        id: playerId,
        name: myName,
        answer: option,
        correct: isCorrect,
      },
    });

    // Update skor lokal langsung
    setAnsweredIds((current) => ({ ...current, [playerId]: option }));
    if (isCorrect) {
      setScores((current) => ({
        ...current,
        [playerId]: (current[playerId] ?? 0) + 1,
      }));
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
    setAnsweredIds({});
    setRevealAt(null);
    setQuestionBank([]);
    setError("");
  };

  const orderedPlayers = [...players].sort(
    (left, right) => (scores[right.id] ?? 0) - (scores[left.id] ?? 0),
  );
  const guestsReady = players.filter((p) => !p.isHost).every((p) => p.ready);
  const canStart = isHost && players.length >= 2 && guestsReady && isConnected;
  const secondsLeft = Math.ceil(remainingMs / 1000);
  const showReveal = revealAt !== null;

  const optionClass = (option: string) => {
    if (!roundData) return "";
    const isCorrect = option === roundData.question.correct;
    const isMine = myAnswer === option;
    if (showReveal) {
      if (isCorrect) return "is-correct";
      if (isMine) return "is-wrong";
      return "is-dim";
    }
    if (isMine) return "is-picked";
    return "";
  };

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
            <HelpCircle size={14} /> REALTIME TRIVIA QUIZ
          </div>
          <h1>
            Trivia Blitz<span>!</span>
          </h1>
          <p>
            Kuis pilihan ganda umum. Jawab paling cepat & tepat — kalahkan
            teman!
          </p>
        </header>

        {!activeRoom ? (
          <section className="tap-rush-lobby">
            <div className="tap-rush-intro">
              <div className="tap-rush-orb" aria-hidden="true">
                <HelpCircle size={30} />
              </div>
              <div>
                <h2>Bikin room, tantang teman</h2>
                <p>
                  Soal kuis muncul acak (sains, sejarah, geografi, hiburan). Tap
                  jawaban yang benar sebelum waktu habis!
                </p>
              </div>
            </div>

            <label className="tap-rush-label" htmlFor="trivia-player-name">
              NAMA PEMAIN
            </label>
            <input
              id="trivia-player-name"
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
                      disabled={!canStart || loading}
                      onClick={startGame}
                    >
                      <Rocket size={17} />{" "}
                      {loading
                        ? "Memuat soal…"
                        : players.length < 2
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
              <div className="trivia-arena">
                <div className="trivia-topbar">
                  <span className="trivia-round">
                    RONDE {round} / {TOTAL_ROUNDS}
                  </span>
                  <span
                    className={`trivia-timer ${secondsLeft <= 5 ? "is-urgent" : ""}`}
                  >
                    {showReveal ? "JAWABAN" : `${secondsLeft}s`}
                  </span>
                </div>

                <div className="trivia-card">
                  <span className="trivia-category">
                    {roundData.question.category}
                  </span>
                  <p className="trivia-question">
                    {roundData.question.question}
                  </p>
                </div>

                <div className="trivia-options">
                  {roundData.question.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`trivia-option ${optionClass(option)}`}
                      onClick={() => pickAnswer(option)}
                      disabled={myAnswer !== null || showReveal}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                {showReveal && (
                  <div className="trivia-reveal">
                    <span className="trivia-reveal-label">JAWABAN BENAR</span>
                    <strong>{roundData.question.correct}</strong>
                  </div>
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
                        {answeredIds[player.id] ? " ✓" : ""}
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
                    ? "Kamu jagoan trivia! 🏆"
                    : `${orderedPlayers[0]?.name ?? "—"} jagoan trivia!`}
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
                      disabled={!canStart || loading}
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
          <span>TRIVIA API</span>
          <span>ROOM CODE</span>
          <span>{TOTAL_ROUNDS} ROUNDS</span>
        </footer>
      </section>

      <style jsx>{`
        .trivia-arena {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .trivia-topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          opacity: 0.75;
        }
        .trivia-timer {
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .trivia-timer.is-urgent {
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.5);
          animation: pulse 0.8s infinite;
        }
        @keyframes pulse {
          50% {
            opacity: 0.5;
          }
        }
        .trivia-card {
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
        }
        .trivia-category {
          display: inline-block;
          font-size: 11px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          padding: 3px 10px;
          border-radius: 999px;
          background: rgba(251, 191, 36, 0.15);
          color: #fbbf24;
          margin-bottom: 12px;
        }
        .trivia-question {
          font-size: 18px;
          line-height: 1.5;
        }
        .trivia-options {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }
        .trivia-option {
          padding: 14px 16px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          color: inherit;
          font-size: 15px;
          text-align: left;
          cursor: pointer;
          transition: all 120ms ease;
          -webkit-tap-highlight-color: transparent;
        }
        .trivia-option:active {
          transform: scale(0.98);
        }
        .trivia-option.is-picked {
          border-color: #fbbf24;
          background: rgba(251, 191, 36, 0.15);
        }
        .trivia-option.is-correct {
          border-color: #22c55e;
          background: rgba(34, 197, 94, 0.2);
          color: #86efac;
        }
        .trivia-option.is-wrong {
          border-color: #ef4444;
          background: rgba(239, 68, 68, 0.2);
          color: #fca5a5;
        }
        .trivia-option.is-dim {
          opacity: 0.4;
        }
        .trivia-option:disabled {
          cursor: default;
        }
        .trivia-reveal {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 16px;
          border-radius: 12px;
          background: rgba(34, 197, 94, 0.08);
          border: 1px solid rgba(34, 197, 94, 0.35);
        }
        .trivia-reveal-label {
          font-size: 11px;
          letter-spacing: 0.15em;
          opacity: 0.75;
        }
        .trivia-reveal strong {
          font-size: 20px;
          color: #86efac;
        }
      `}</style>
    </main>
  );
}
