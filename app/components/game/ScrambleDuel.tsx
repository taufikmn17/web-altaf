"use client";

import {
  ArrowLeft,
  Check,
  Copy,
  DoorOpen,
  Lightbulb,
  Radio,
  Rocket,
  Send,
  Shuffle,
  UsersRound,
  X,
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

type RoundPhase = "input" | "guess" | "reveal";

const TOTAL_ROUNDS = 5;
const GUESS_TIME_MS = 30_000;
const REVEAL_DURATION_MS = 4000;
const ROOM_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeRoomCode() {
  const values = new Uint32Array(6);
  crypto.getRandomValues(values);
  return Array.from(
    values,
    (value) => ROOM_CHARACTERS[value % ROOM_CHARACTERS.length],
  ).join("");
}

function scrambleWord(word: string): string {
  const letters = word.toUpperCase().split("");
  // Fisher-Yates shuffle sampai beda dengan aslinya
  for (let attempt = 0; attempt < 20; attempt += 1) {
    for (let i = letters.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    const result = letters.join("");
    if (result !== word.toUpperCase()) return result;
  }
  return letters.join("");
}

function normalizeGuess(value: string): string {
  return value.toUpperCase().replace(/[^A-Z]/g, "");
}

function validateInputWord(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Isi kata dulu";
  if (/\s/.test(trimmed)) return "Tidak boleh pakai spasi";
  if (!/^[a-zA-Z]+$/.test(trimmed)) return "Hanya huruf A-Z";
  if (trimmed.length < 3) return "Minimal 3 huruf";
  if (trimmed.length > 15) return "Maksimal 15 huruf";
  return null;
}

export default function ScrambleDuel() {
  const supabase = getSupabaseBrowserClient();
  const [playerId, setPlayerId] = useState("");
  const channelRef = useRef<RealtimeChannel | null>(null);
  const timerRef = useRef<number | null>(null);
  const revealTimerRef = useRef<number | null>(null);

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

  const [round, setRound] = useState(0);
  const [roundPhase, setRoundPhase] = useState<RoundPhase>("input");
  const [inputWord, setInputWord] = useState("");
  const [scrambledWord, setScrambledWord] = useState("");
  const [originalWord, setOriginalWord] = useState("");
  const [guesserInput, setGuesserInput] = useState("");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [inputPlayerId, setInputPlayerId] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState(GUESS_TIME_MS);
  const [lastResult, setLastResult] = useState<{
    guess: string;
    correct: boolean;
    answer: string;
  } | null>(null);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [winnerName, setWinnerName] = useState("");

  const scoresRef = useRef<Record<string, number>>({});
  const inputPlayerIdRef = useRef<string | null>(null);
  const phaseRef = useRef<GamePhase>("lobby");
  const roundRef = useRef(0);

  useEffect(() => {
    scoresRef.current = scores;
  }, [scores]);
  useEffect(() => {
    inputPlayerIdRef.current = inputPlayerId;
  }, [inputPlayerId]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    roundRef.current = round;
  }, [round]);

  // ---- Realtime channel ----
  useEffect(() => {
    if (!activeRoom || !supabase || !playerId) return;

    const channel = supabase.channel(`scramble-duel:${activeRoom}`, {
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

    // Round start
    channel.on("broadcast", { event: "round-start" }, ({ payload }) => {
      const data = payload as {
        round?: number;
        inputPlayerId?: string;
      };
      if (
        typeof data.round !== "number" ||
        typeof data.inputPlayerId !== "string"
      )
        return;

      setRound(data.round);
      setInputPlayerId(data.inputPlayerId);
      setInputWord("");
      setScrambledWord("");
      setOriginalWord("");
      setGuesserInput("");
      setLastResult(null);
      setRoundPhase("input");
      setRemainingMs(GUESS_TIME_MS);
      setPhase("playing");
      setError("");
    });

    // Kata sudah di-submit oleh input player → broadcast scrambled ke guesser
    channel.on("broadcast", { event: "word-submitted" }, ({ payload }) => {
      const data = payload as {
        scrambled?: string;
        original?: string;
        endsAt?: number;
      };
      if (!data.scrambled || !data.original) return;
      setScrambledWord(data.scrambled);
      setOriginalWord(data.original);
      setRoundPhase("guess");
      setRemainingMs(
        typeof data.endsAt === "number"
          ? Math.max(0, data.endsAt - Date.now())
          : GUESS_TIME_MS,
      );
    });

    // Reveal hasil
    channel.on("broadcast", { event: "round-end" }, ({ payload }) => {
      const data = payload as {
        guess?: string;
        correct?: boolean;
        answer?: string;
        scores?: Record<string, number>;
        round?: number;
      };
      if (typeof data.correct !== "boolean") return;
      setLastResult({
        guess: data.guess ?? "",
        correct: data.correct,
        answer: data.answer ?? "",
      });
      if (data.scores) setScores(data.scores);
      setRoundPhase("reveal");
      setRemainingMs(0);
    });

    // Game over
    channel.on("broadcast", { event: "game-over" }, ({ payload }) => {
      const data = payload as {
        winnerId?: string | null;
        winnerName?: string;
      };
      setWinnerId(data.winnerId ?? null);
      setWinnerName(data.winnerName ?? "");
      setPhase("results");
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (revealTimerRef.current) window.clearTimeout(revealTimerRef.current);
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

  // ---- Timer untuk fase guess ----
  useEffect(() => {
    if (phase !== "playing" || roundPhase !== "guess") return;
    if (!scrambledWord) return;

    const start = Date.now();
    timerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const left = Math.max(0, GUESS_TIME_MS - elapsed);
      setRemainingMs(left);
      if (left === 0) {
        // Timeout → host yang trigger round-end
        if (isHost) {
          endRound("", false);
        }
      }
    }, 100);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, roundPhase, scrambledWord, isHost]);

  // ---- Handlers ----
  const submitWord = () => {
    if (phase !== "playing" || roundPhase !== "input") return;
    if (inputPlayerId !== playerId) return;

    const err = validateInputWord(inputWord);
    if (err) {
      setError(err);
      return;
    }
    setError("");

    const word = inputWord.trim().toUpperCase();
    const scrambled = scrambleWord(word);

    // Update lokal
    setScrambledWord(scrambled);
    setOriginalWord(word);
    setRoundPhase("guess");
    setRemainingMs(GUESS_TIME_MS);

    const endsAt = Date.now() + GUESS_TIME_MS;
    void channelRef.current?.send({
      type: "broadcast",
      event: "word-submitted",
      payload: { scrambled, original: word, endsAt },
    });
  };

  const submitGuess = () => {
    if (phase !== "playing" || roundPhase !== "guess") return;
    if (!scrambledWord) return;
    if (inputPlayerId === playerId) return; // input player tidak boleh nebak

    const guess = normalizeGuess(guesserInput);
    const correct = guess === originalWord;

    void channelRef.current?.send({
      type: "broadcast",
      event: "guess-submitted",
      payload: { guess, correct },
    });

    // Host yang resolve
    if (isHost) {
      endRound(guess, correct);
    }
  };

  const endRound = (guess: string, correct: boolean) => {
    if (roundPhase === "reveal") return;
    const inputPid = inputPlayerIdRef.current;
    if (!inputPid) return;

    // Guesser = lawan dari inputPlayer
    const opponent = players.find((p) => p.id !== inputPid);
    const guesserId = opponent?.id ?? null;

    const newScores = { ...scoresRef.current };
    if (correct && guesserId) {
      newScores[guesserId] = (newScores[guesserId] ?? 0) + 1;
    }
    setScores(newScores);

    setLastResult({
      guess,
      correct,
      answer: originalWord,
    });
    setRoundPhase("reveal");

    void channelRef.current?.send({
      type: "broadcast",
      event: "round-end",
      payload: {
        guess,
        correct,
        answer: originalWord,
        scores: newScores,
        round: roundRef.current,
      },
    });

    // Auto next round setelah 4 detik
    if (revealTimerRef.current) window.clearTimeout(revealTimerRef.current);
    revealTimerRef.current = window.setTimeout(() => {
      if (phaseRef.current !== "playing") return;
      const nextRound = roundRef.current + 1;
      if (nextRound > TOTAL_ROUNDS) {
        // Game over
        const sorted = players
          .map((p) => ({ ...p, score: newScores[p.id] ?? 0 }))
          .sort((a, b) => b.score - a.score);
        const top = sorted[0];
        const second = sorted[1];
        let winnerIdFinal: string | null = null;
        let winnerNameFinal = "";
        if (top && second && top.score > second.score) {
          winnerIdFinal = top.id;
          winnerNameFinal = top.name;
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

      // Gantian input player
      const nextInputPid =
        inputPlayerIdRef.current === playerId
          ? (players.find((p) => p.id !== playerId)?.id ?? playerId)
          : playerId;

      setRound(nextRound);
      setInputPlayerId(nextInputPid);
      setInputWord("");
      setScrambledWord("");
      setOriginalWord("");
      setGuesserInput("");
      setLastResult(null);
      setRoundPhase("input");
      setRemainingMs(GUESS_TIME_MS);

      void channelRef.current?.send({
        type: "broadcast",
        event: "round-start",
        payload: { round: nextRound, inputPlayerId: nextInputPid },
      });
    }, REVEAL_DURATION_MS);
  };

  // ---- Preflight ----
  const peekRoomPlayerCount = async (roomCode: string): Promise<number> => {
    if (!supabase) return 0;
    const peekKey = "peek-" + crypto.randomUUID();
    const peekChannel = supabase.channel(`scramble-duel:${roomCode}`, {
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

      setPlayerId(crypto.randomUUID());
      setPlayers([]);
      setPhase("lobby");
      setRound(0);
      setRoundPhase("input");
      setInputWord("");
      setScrambledWord("");
      setOriginalWord("");
      setGuesserInput("");
      setScores({});
      setInputPlayerId(null);
      setLastResult(null);
      setWinnerId(null);
      setWinnerName("");
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

  const startGame = () => {
    if (
      !isHost ||
      players.length !== 2 ||
      !players.every((p) => p.isHost || p.ready)
    )
      return;

    // Host jadi input player pertama
    setRound(1);
    setInputPlayerId(playerId);
    setInputWord("");
    setScrambledWord("");
    setOriginalWord("");
    setGuesserInput("");
    setScores({});
    setLastResult(null);
    setRoundPhase("input");
    setRemainingMs(GUESS_TIME_MS);
    setPhase("playing");
    setWinnerId(null);
    setWinnerName("");

    void channelRef.current?.send({
      type: "broadcast",
      event: "round-start",
      payload: { round: 1, inputPlayerId: playerId },
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
    setRound(0);
    setRoundPhase("input");
    setInputWord("");
    setScrambledWord("");
    setOriginalWord("");
    setGuesserInput("");
    setScores({});
    setInputPlayerId(null);
    setLastResult(null);
    setWinnerId(null);
    setWinnerName("");
    setError("");
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (revealTimerRef.current) window.clearTimeout(revealTimerRef.current);
  };

  const guestsReady = players.filter((p) => !p.isHost).every((p) => p.ready);
  const canStart =
    isHost &&
    players.length === 2 &&
    guestsReady &&
    isConnected &&
    !joiningRoom;
  const secondsLeft = Math.ceil(remainingMs / 1000);

  const isMyTurnToInput = inputPlayerId === playerId;
  const isMyTurnToGuess = inputPlayerId !== null && inputPlayerId !== playerId;

  const myScore = scores[playerId] ?? 0;
  const opponent = players.find((p) => p.id !== playerId);
  const opponentScore = opponent ? (scores[opponent.id] ?? 0) : 0;

  return (
    <main className="tap-rush-shell">
      <div className="tap-rush-topbar">
        <Link href="/game" className="tap-rush-back">
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Semua game</span>
        </Link>
        <span className="tap-rush-season">ONLINE DUEL / 11</span>
      </div>

      <section className="tap-rush-layout">
        <header className="tap-rush-heading">
          <div className="tap-rush-kicker">
            <Shuffle size={14} /> REALTIME WORD SCRAMBLE
          </div>
          <h1>
            Scramble Duel<span>!</span>
          </h1>
          <p>
            Input kata, acak hurufnya, lawan harus menebak. Gantian — siapa
            paling banyak benar, menang!
          </p>
        </header>

        {!activeRoom ? (
          <section className="tap-rush-lobby">
            <div className="tap-rush-intro">
              <div className="tap-rush-orb" aria-hidden="true">
                <Shuffle size={30} />
              </div>
              <div>
                <h2>Bikin room, tantang teman</h2>
                <p>
                  Gantian input kata → otomatis diacak → lawan menebak dalam 30
                  detik. 5 ronde per pemain!
                </p>
              </div>
            </div>

            <label className="tap-rush-label" htmlFor="scramble-player-name">
              NAMA PEMAIN
            </label>
            <input
              id="scramble-player-name"
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

            {phase === "playing" && (
              <div className="scramble-wrap">
                {/* Header info */}
                <div className="scramble-topbar">
                  <span className="scramble-round">
                    RONDE {round} / {TOTAL_ROUNDS}
                  </span>
                  {roundPhase === "guess" && (
                    <span
                      className={`scramble-timer ${secondsLeft <= 10 ? "is-urgent" : ""}`}
                    >
                      {String(secondsLeft).padStart(2, "0")}s
                    </span>
                  )}
                  {roundPhase === "input" && (
                    <span className="scramble-timer">INPUT</span>
                  )}
                  {roundPhase === "reveal" && (
                    <span className="scramble-timer">HASIL</span>
                  )}
                </div>

                {/* Skor */}
                <div className="scramble-scores">
                  <div className="scramble-score-item">
                    <span className="scramble-score-label">KAMU</span>
                    <strong>{myScore}</strong>
                  </div>
                  <span className="scramble-vs">VS</span>
                  <div className="scramble-score-item">
                    <span className="scramble-score-label">
                      {opponent?.name ?? "LAWAN"}
                    </span>
                    <strong>{opponentScore}</strong>
                  </div>
                </div>

                {/* Fase INPUT */}
                {roundPhase === "input" && (
                  <div className="scramble-card">
                    {isMyTurnToInput ? (
                      <>
                        <div className="scramble-badge is-input">
                          GILIRANMU: INPUT KATA
                        </div>
                        <p className="scramble-hint">
                          Ketik 1 kata (tanpa spasi/simbol). Hurufnya akan
                          diacak untuk lawanmu tebak.
                        </p>
                        <form
                          className="scramble-form"
                          onSubmit={(e) => {
                            e.preventDefault();
                            submitWord();
                          }}
                        >
                          <input
                            className="tap-rush-input scramble-input"
                            value={inputWord}
                            onChange={(e) =>
                              setInputWord(e.target.value.slice(0, 15))
                            }
                            placeholder="Ketik 1 kata…"
                            maxLength={15}
                            autoComplete="off"
                            autoCapitalize="characters"
                          />
                          <button className="tap-rush-primary" type="submit">
                            <Shuffle size={16} /> Acak & Kirim
                          </button>
                        </form>
                        {error && <p className="scramble-error">{error}</p>}
                      </>
                    ) : (
                      <>
                        <div className="scramble-badge is-wait">
                          MENUNGGU LAWAN INPUT KATA
                        </div>
                        <p className="scramble-hint">
                          Lawan sedang memikirkan kata… Bersiaplah menebak!
                        </p>
                        <div className="scramble-loader">
                          <span />
                          <span />
                          <span />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Fase GUESS */}
                {roundPhase === "guess" && (
                  <div className="scramble-card">
                    {isMyTurnToGuess ? (
                      <>
                        <div className="scramble-badge is-guess">
                          TEBAK KATA INI!
                        </div>
                        <p className="scramble-hint">
                          Susun ulang huruf di bawah menjadi kata yang benar.
                        </p>
                        <div className="scramble-word">
                          {scrambledWord.split("").map((ch, i) => (
                            <span key={i} className="scramble-letter">
                              {ch}
                            </span>
                          ))}
                        </div>
                        <form
                          className="scramble-form"
                          onSubmit={(e) => {
                            e.preventDefault();
                            submitGuess();
                          }}
                        >
                          <input
                            className="tap-rush-input scramble-input"
                            value={guesserInput}
                            onChange={(e) =>
                              setGuesserInput(e.target.value.slice(0, 15))
                            }
                            placeholder="Jawabanmu…"
                            maxLength={15}
                            autoComplete="off"
                            autoCapitalize="characters"
                            autoFocus
                          />
                          <button className="tap-rush-primary" type="submit">
                            <Send size={16} /> Kirim
                          </button>
                        </form>
                        {error && <p className="scramble-error">{error}</p>}
                      </>
                    ) : (
                      <>
                        <div className="scramble-badge is-wait">
                          LAWAN SEDANG MENEBAK…
                        </div>
                        <p className="scramble-hint">
                          Kata yang kamu kirim: <strong>{originalWord}</strong>
                        </p>
                        <div className="scramble-word">
                          {scrambledWord.split("").map((ch, i) => (
                            <span key={i} className="scramble-letter">
                              {ch}
                            </span>
                          ))}
                        </div>
                        <div className="scramble-loader">
                          <span />
                          <span />
                          <span />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Fase REVEAL */}
                {roundPhase === "reveal" && lastResult && (
                  <div className="scramble-card">
                    <div
                      className={`scramble-badge ${lastResult.correct ? "is-correct" : "is-wrong"}`}
                    >
                      {lastResult.correct ? "✅ BENAR!" : "❌ SALAH"}
                    </div>
                    <div className="scramble-reveal">
                      <div className="scramble-reveal-row">
                        <span>Jawaban benar:</span>
                        <strong className="scramble-answer">
                          {lastResult.answer}
                        </strong>
                      </div>
                      {lastResult.guess && (
                        <div className="scramble-reveal-row">
                          <span>Tebakan:</span>
                          <strong
                            className={
                              lastResult.correct
                                ? "scramble-answer"
                                : "scramble-answer is-wrong"
                            }
                          >
                            {lastResult.guess}
                          </strong>
                        </div>
                      )}
                    </div>
                    <p className="scramble-hint">
                      {lastResult.correct
                        ? isMyTurnToGuess
                          ? "Kamu dapat +1 poin!"
                          : "Lawan dapat +1 poin"
                        : isMyTurnToGuess
                          ? "Tidak ada poin untuk kamu"
                          : "Lawan tidak dapat poin"}
                    </p>
                  </div>
                )}
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
                <ol className="tap-rush-scoreboard">
                  {players
                    .map((p) => ({ ...p, score: scores[p.id] ?? 0 }))
                    .sort((a, b) => b.score - a.score)
                    .map((p, i) => (
                      <li className={i === 0 ? "is-winner" : ""} key={p.id}>
                        <span className="tap-rush-rank">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="tap-rush-player-name">
                          {p.name}
                          {p.id === playerId ? " (kamu)" : ""}
                        </span>
                        <strong>{p.score}</strong>
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
            {error && phase !== "playing" && (
              <p className="tap-rush-error" role="alert">
                {error}
              </p>
            )}
          </section>
        )}

        <footer className="tap-rush-footnote">
          <span>2 PEMAIN</span>
          <span>{TOTAL_ROUNDS} RONDE</span>
          <span>INPUT & TEBAK</span>
        </footer>
      </section>

      <style jsx>{`
        .scramble-wrap {
          display: flex;
          flex-direction: column;
          gap: 14px;
          width: 100%;
          align-items: center;
        }

        .scramble-topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          max-width: 520px;
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          opacity: 0.8;
        }
        .scramble-timer {
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .scramble-timer.is-urgent {
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.5);
          animation: pulse 0.8s infinite;
        }
        @keyframes pulse {
          50% {
            opacity: 0.5;
          }
        }

        .scramble-scores {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 12px;
          align-items: center;
          width: 100%;
          max-width: 520px;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(236, 72, 153, 0.25);
          border-radius: 12px;
        }
        .scramble-score-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }
        .scramble-score-label {
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          opacity: 0.7;
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .scramble-score-item strong {
          font-family: Impact, "Arial Black", sans-serif;
          font-size: 28px;
          color: #ec4899;
          font-variant-numeric: tabular-nums;
        }
        .scramble-vs {
          font-size: 11px;
          opacity: 0.4;
          letter-spacing: 0.15em;
        }

        .scramble-card {
          width: 100%;
          max-width: 520px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          padding: 24px;
          background: linear-gradient(
            145deg,
            rgba(32, 14, 24, 0.85),
            rgba(18, 10, 15, 0.95)
          );
          border: 1px solid rgba(236, 72, 153, 0.25);
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(236, 72, 153, 0.15);
        }

        .scramble-badge {
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          border: 1px solid;
        }
        .scramble-badge.is-input {
          background: rgba(236, 72, 153, 0.15);
          border-color: rgba(236, 72, 153, 0.5);
          color: #f9a8d4;
        }
        .scramble-badge.is-guess {
          background: rgba(34, 197, 94, 0.15);
          border-color: rgba(34, 197, 94, 0.5);
          color: #86efac;
        }
        .scramble-badge.is-wait {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.15);
          color: #c4a0b5;
        }
        .scramble-badge.is-correct {
          background: rgba(34, 197, 94, 0.15);
          border-color: rgba(34, 197, 94, 0.5);
          color: #86efac;
        }
        .scramble-badge.is-wrong {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.5);
          color: #fca5a5;
        }

        .scramble-hint {
          font-size: 12px;
          opacity: 0.7;
          letter-spacing: 0.04em;
          text-align: center;
          max-width: 380px;
          line-height: 1.5;
          margin: 0;
        }
        .scramble-hint strong {
          color: #fbbf24;
          font-weight: 800;
        }

        .scramble-form {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
          margin-top: 4px;
        }
        .scramble-input {
          text-align: center;
          font-size: 20px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          height: 56px;
        }

        .scramble-word {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          justify-content: center;
          margin: 8px 0;
        }
        .scramble-letter {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 52px;
          border-radius: 10px;
          background: linear-gradient(145deg, #fce7f3, #ec4899);
          color: #120a0f;
          font-family: Impact, "Arial Black", sans-serif;
          font-size: 24px;
          box-shadow: 0 4px 0 rgba(0, 0, 0, 0.4);
        }

        .scramble-loader {
          display: flex;
          gap: 8px;
          margin-top: 8px;
        }
        .scramble-loader span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ec4899;
          animation: scrambleDot 0.8s ease-in-out infinite alternate;
        }
        .scramble-loader span:nth-child(2) {
          animation-delay: 0.15s;
        }
        .scramble-loader span:nth-child(3) {
          animation-delay: 0.3s;
        }
        @keyframes scrambleDot {
          to {
            opacity: 0.3;
            transform: translateY(-4px);
          }
        }

        .scramble-reveal {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
          padding: 14px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .scramble-reveal-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          font-size: 13px;
        }
        .scramble-reveal-row span {
          opacity: 0.7;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          font-size: 11px;
        }
        .scramble-answer {
          font-family: Impact, "Arial Black", sans-serif;
          font-size: 20px;
          color: #86efac;
          letter-spacing: 0.06em;
        }
        .scramble-answer.is-wrong {
          color: #fca5a5;
        }

        .scramble-error {
          font-size: 12px;
          color: #fca5a5;
          margin: 0;
        }
      `}</style>
    </main>
  );
}
