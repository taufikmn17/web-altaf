"use client";

import {
  ArrowLeft,
  Check,
  Copy,
  DoorOpen,
  Flag,
  Radio,
  Rocket,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/app/lib/supabase-browser";
import { TRIVIA_INDONESIA } from "@/app/lib/trivia-indonesia";

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
const MAX_PLAYERS = 4;
const ROOM_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeRoomCode() {
  const values = new Uint32Array(6);
  crypto.getRandomValues(values);
  return Array.from(
    values,
    (value) => ROOM_CHARACTERS[value % ROOM_CHARACTERS.length],
  ).join("");
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function TriviaIndonesia() {
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
  const [joiningRoom, setJoiningRoom] = useState(false);

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

    const channel = supabase.channel(`trivia-indonesia:${activeRoom}`, {
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
      setScores((current) => {
        const next: Record<string, number> = {};
        for (const p of connectedPlayers) next[p.id] = current[p.id] ?? 0;
        return next;
      });
      setAnsweredIds((current) => {
        const next: Record<string, string> = {};
        for (const p of connectedPlayers) {
          if (current[p.id]) next[p.id] = current[p.id];
        }
        return next;
      });
    };

    channel.on("presence", { event: "sync" }, syncFromPresence);
    channel.on("presence", { event: "join" }, syncFromPresence);
    channel.on("presence", { event: "leave" }, syncFromPresence);

    channel.on("broadcast", { event: "game-reset" }, () => {
      setScores({});
      setAnsweredIds({});
      setMyAnswer(null);
      setRevealAt(null);
      setRound(0);
      setRoundData(null);
    });

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
  const buildQuestions = (): TriviaQuestion[] => {
    const shuffled = shuffle(TRIVIA_INDONESIA);
    return shuffled.slice(0, TOTAL_ROUNDS).map((q) => ({
      id: q.id,
      category: q.category,
      difficulty: q.difficulty,
      question: q.question,
      options: shuffle(q.options),
      correct: q.correct,
    }));
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

  // ---- Preflight: cek jumlah pemain di room ----
  const peekRoomPlayerCount = async (roomCode: string): Promise<number> => {
    if (!supabase) return 0;
    const peekKey = "peek-" + crypto.randomUUID();
    const peekChannel = supabase.channel(`trivia-indonesia:${roomCode}`, {
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
        if (count >= MAX_PLAYERS) {
          setError(`Room sudah penuh (maks ${MAX_PLAYERS} pemain).`);
          setJoiningRoom(false);
          return;
        }
      }

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

  const startGame = async () => {
    if (
      !isHost ||
      players.length < 2 ||
      players.length > MAX_PLAYERS ||
      !players.every((p) => p.isHost || p.ready)
    )
      return;

    void channelRef.current?.send({
      type: "broadcast",
      event: "game-reset",
      payload: {},
    });

    setScores({});
    setAnsweredIds({});
    setMyAnswer(null);
    setRevealAt(null);
    setLoading(true);

    // Small delay biar tombol keliatan loading
    await new Promise((r) => setTimeout(r, 300));

    const questions = buildQuestions();
    setLoading(false);

    if (questions.length === 0) {
      setError("Bank soal kosong.");
      return;
    }

    setQuestionBank(questions);
    bankRef.current = questions;
    void channelRef.current?.send({
      type: "broadcast",
      event: "question-bank",
      payload: { questions },
    });

    broadcastNewRound(1);
  };

  const pickAnswer = (option: string) => {
    if (phase !== "playing") return;
    if (myAnswer !== null) return;
    if (revealAt !== null) return;
    if (!roundData) return;

    setMyAnswer(option);
    const isCorrect = option === roundData.question.correct;

    void channelRef.current?.send({
      type: "broadcast",
      event: "answered",
      payload: {
        id: playerId,
        answer: option,
        correct: isCorrect,
      },
    });

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
  const canStart =
    isHost &&
    players.length >= 2 &&
    players.length <= MAX_PLAYERS &&
    guestsReady &&
    isConnected &&
    !joiningRoom;
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
        <span className="tap-rush-season">ONLINE QUIZ / 06</span>
      </div>

      <section className="tap-rush-layout">
        <header className="tap-rush-heading">
          <div className="tap-rush-kicker">
            <Flag size={14} /> KUIS PENGETAHUAN INDONESIA
          </div>
          <h1>
            Trivia Indonesia<span>!</span>
          </h1>
          <p>
            Uji wawasan tentang Indonesia — sejarah, budaya, geografi, dan
            lainnya. Adu cepat & tepat!
          </p>
        </header>

        {!activeRoom ? (
          <section className="tap-rush-lobby">
            <div className="tap-rush-intro">
              <div className="tap-rush-orb" aria-hidden="true">
                <Flag size={30} />
              </div>
              <div>
                <h2>Bikin room, tantang teman</h2>
                <p>
                  Soal pengetahuan umum Indonesia — sejarah, budaya, geografi,
                  bahasa, olahraga. Jawab paling cepat & tepat!
                </p>
              </div>
            </div>

            <label className="tap-rush-label" htmlFor="trivia-id-name">
              NAMA PEMAIN
            </label>
            <input
              id="trivia-id-name"
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
                        ? "Menyiapkan soal…"
                        : players.length < 2
                          ? "Menunggu teman"
                          : players.length > MAX_PLAYERS
                            ? `Room penuh (maks ${MAX_PLAYERS})`
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
                    ? "Kamu jagoan Trivia Indonesia! 🏆"
                    : `${orderedPlayers[0]?.name ?? "—"} jagoan Trivia Indonesia!`}
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
          <span>100 SOAL LOKAL</span>
          <span>MAKS {MAX_PLAYERS} PEMAIN</span>
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
