"use client";

import {
  ArrowLeft,
  Check,
  Copy,
  DoorOpen,
  Puzzle,
  Radio,
  Rocket,
  Send,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/app/lib/supabase-browser";

// =============================================================
// TYPES
// =============================================================
type RoomPlayer = {
  id: string;
  name: string;
  joinedAt: number;
  ready?: boolean;
};

type GamePhase = "lobby" | "playing" | "results";
type RoundRole = "setter" | "guesser";
type SessionStage = "input" | "guess";

type SessionState = {
  session: number;
  setterId: string;
  guesserId: string;
  scrambled: string;
  answerLength: number;
  stage: SessionStage;
  inputEndsAt: number;
  guessEndsAt: number;
};

// =============================================================
// CONSTANTS
// =============================================================
const ROOM_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TOTAL_SESSIONS = 6;
const INPUT_TIME_MS = 30_000;
const GUESS_TIME_MS = 30_000;
const MAX_ATTEMPTS = 3;
const MIN_WORD_LEN = 3;
const MAX_WORD_LEN = 10;
const NEXT_SESSION_DELAY_MS = 1_800;
const WATCHDOG_INTERVAL_MS = 400;
const GUESSER_BACKUP_DELAY_MS = 900;

// =============================================================
// HELPERS
// =============================================================
function makeRoomCode() {
  const values = new Uint32Array(6);
  crypto.getRandomValues(values);
  return Array.from(
    values,
    (v) => ROOM_CHARACTERS[v % ROOM_CHARACTERS.length],
  ).join("");
}

function scrambleWord(word: string): string {
  const chars = word.split("");
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  const result = chars.join("");
  if (result === word && word.length > 1) return scrambleWord(word);
  return result;
}

function cleanLetters(input: string, max = MAX_WORD_LEN) {
  return input
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, max);
}

function buildSession(
  sessionNumber: number,
  playerAId: string,
  playerBId: string,
): SessionState {
  const aIsSetter = sessionNumber % 2 === 1;
  const setterId = aIsSetter ? playerAId : playerBId;
  const guesserId = aIsSetter ? playerBId : playerAId;
  const now = Date.now();
  return {
    session: sessionNumber,
    setterId,
    guesserId,
    scrambled: "",
    answerLength: 0,
    stage: "input",
    inputEndsAt: now + INPUT_TIME_MS,
    guessEndsAt: 0,
  };
}

// =============================================================
// COMPONENT
// =============================================================
export default function ScrambleDuelGame() {
  const supabase = getSupabaseBrowserClient();

  const [playerId, setPlayerId] = useState("");
  const [playerName, setPlayerName] = useState("");

  const [activeRoom, setActiveRoom] = useState("");
  const [roomInput, setRoomInput] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [joiningRoom, setJoiningRoom] = useState(false);

  const [phase, setPhase] = useState<GamePhase>("lobby");
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [remainingMs, setRemainingMs] = useState(INPUT_TIME_MS);
  const [myScore, setMyScore] = useState(0);
  const [peerScore, setPeerScore] = useState(0);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [winnerName, setWinnerName] = useState("");

  const [wordInput, setWordInput] = useState("");
  const [guessInput, setGuessInput] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS);
  const [mySubmitted, setMySubmitted] = useState(false);
  const [sessionLocked, setSessionLocked] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "correct" | "wrong" | "timeout" | "info";
    text: string;
  } | null>(null);

  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // ---------- REFS ----------
  const channelRef = useRef<RealtimeChannel | null>(null);
  const playerIdRef = useRef("");
  const playersRef = useRef<RoomPlayer[]>([]);
  const sessionStateRef = useRef<SessionState | null>(null);
  const answerRef = useRef("");
  const mySubmittedRef = useRef(false);
  const sessionLockedRef = useRef(false);
  const attemptsLeftRef = useRef(MAX_ATTEMPTS);
  const myScoreRef = useRef(0);
  const peerScoreRef = useRef(0);
  const advanceTimeoutRef = useRef<number | null>(null);
  const autoStartTimeoutRef = useRef<number | null>(null);
  const playerOrderRef = useRef<string[]>([]);
  const hasStartedRef = useRef(false);
  const timeoutFiredRef = useRef(false);
  const advanceFiredRef = useRef(false);

  useEffect(() => {
    playerIdRef.current = playerId;
  }, [playerId]);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);
  useEffect(() => {
    sessionStateRef.current = sessionState;
  }, [sessionState]);
  useEffect(() => {
    mySubmittedRef.current = mySubmitted;
  }, [mySubmitted]);
  useEffect(() => {
    sessionLockedRef.current = sessionLocked;
  }, [sessionLocked]);
  useEffect(() => {
    attemptsLeftRef.current = attemptsLeft;
  }, [attemptsLeft]);
  useEffect(() => {
    myScoreRef.current = myScore;
  }, [myScore]);
  useEffect(() => {
    peerScoreRef.current = peerScore;
  }, [peerScore]);

  const myRole: RoundRole | null = useMemo(() => {
    if (!sessionState || !playerId) return null;
    if (sessionState.setterId === playerId) return "setter";
    if (sessionState.guesserId === playerId) return "guesser";
    return null;
  }, [sessionState, playerId]);

  const peer = useMemo(
    () => players.find((p) => p.id !== playerId) ?? null,
    [players, playerId],
  );

  const stage: SessionStage = sessionState?.stage ?? "input";
  const sessionNumber = sessionState?.session ?? 0;
  const secondsLeft = Math.ceil(remainingMs / 1000);
  const scrambledChars = sessionState?.scrambled
    ? sessionState.scrambled.split("")
    : [];
  const answerLen = sessionState?.answerLength ?? 0;

  // ---------- Reset helpers ----------
  const resetSessionLocal = () => {
    setWordInput("");
    setGuessInput("");
    setMySubmitted(false);
    mySubmittedRef.current = false;
    setSessionLocked(false);
    sessionLockedRef.current = false;
    setFeedback(null);
    setAttemptsLeft(MAX_ATTEMPTS);
    attemptsLeftRef.current = MAX_ATTEMPTS;
    answerRef.current = "";
    timeoutFiredRef.current = false;
    advanceFiredRef.current = false;
  };

  const clearTimers = () => {
    if (advanceTimeoutRef.current) {
      window.clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
    if (autoStartTimeoutRef.current) {
      window.clearTimeout(autoStartTimeoutRef.current);
      autoStartTimeoutRef.current = null;
    }
  };

  // =============================================================
  // START SESSION
  // =============================================================
  const startSession = (sessionNumber: number) => {
    const order = playerOrderRef.current;
    if (order.length !== 2) return;

    const state = buildSession(sessionNumber, order[0], order[1]);
    clearTimers();
    resetSessionLocal();
    setSessionState(state);
    sessionStateRef.current = state;
    setRemainingMs(INPUT_TIME_MS);
    setPhase("playing");

    void channelRef.current?.send({
      type: "broadcast",
      event: "session-start",
      payload: state,
    });
  };

  // =============================================================
  // ADVANCE SESSION
  // =============================================================
  const advanceSession = () => {
    if (advanceFiredRef.current) return;
    advanceFiredRef.current = true;

    const current = sessionStateRef.current;
    if (!current) return;

    const next = current.session + 1;

    if (next > TOTAL_SESSIONS) {
      // Game over
      const order = playerOrderRef.current;
      const aId = order[0];
      const bId = order[1];

      const iAmA = aId === playerIdRef.current;
      const aScore = iAmA ? myScoreRef.current : peerScoreRef.current;
      const bScore = iAmA ? peerScoreRef.current : myScoreRef.current;

      let finalWinnerId: string | null = null;
      let finalWinnerName = "";

      const aPlayer = playersRef.current.find((p) => p.id === aId);
      const bPlayer = playersRef.current.find((p) => p.id === bId);

      if (aScore > bScore) {
        finalWinnerId = aId;
        finalWinnerName = aPlayer?.name ?? "Pemain A";
      } else if (bScore > aScore) {
        finalWinnerId = bId;
        finalWinnerName = bPlayer?.name ?? "Pemain B";
      }

      setWinnerId(finalWinnerId);
      setWinnerName(finalWinnerName);
      setPhase("results");

      void channelRef.current?.send({
        type: "broadcast",
        event: "game-over",
        payload: { winnerId: finalWinnerId, winnerName: finalWinnerName },
      });
      return;
    }

    startSession(next);
  };

  // =============================================================
  // SUPABASE CHANNEL
  // =============================================================
  useEffect(() => {
    if (!activeRoom || !supabase || !playerId) return;

    const channel = supabase.channel(`scramble-duel:${activeRoom}`, {
      config: {
        // Echo broadcasts to the sender as well. The setter is the session
        // coordinator and must receive its own session-result/session-skipped
        // events to advance the game; without this, neither client advances.
        broadcast: { self: true },
        presence: { key: playerId },
      },
    });
    channelRef.current = channel;

    const syncFromPresence = () => {
      const state = channel.presenceState<RoomPlayer>();
      const connected = Object.values(state)
        .flat()
        .filter((p) => p.id && !p.id.startsWith("peek-"))
        .sort((a, b) => (a.joinedAt ?? 0) - (b.joinedAt ?? 0));
      setPlayers(connected);
      playerOrderRef.current = connected.map((p) => p.id);
    };

    channel.on("presence", { event: "sync" }, syncFromPresence);
    channel.on("presence", { event: "join" }, syncFromPresence);
    channel.on("presence", { event: "leave" }, syncFromPresence);

    channel.on("broadcast", { event: "game-start" }, ({ payload }) => {
      const data = payload as { starterId: string; session: SessionState };
      if (!data || !data.session) return;
      hasStartedRef.current = true;
      clearTimers();
      resetSessionLocal();
      setSessionState(data.session);
      sessionStateRef.current = data.session;
      setRemainingMs(Math.max(0, data.session.inputEndsAt - Date.now()));
      setMyScore(0);
      setPeerScore(0);
      myScoreRef.current = 0;
      peerScoreRef.current = 0;
      setWinnerId(null);
      setWinnerName("");
      setPhase("playing");
    });

    channel.on("broadcast", { event: "game-reset" }, () => {
      clearTimers();
      resetSessionLocal();
      setSessionState(null);
      sessionStateRef.current = null;
      setMyScore(0);
      setPeerScore(0);
      myScoreRef.current = 0;
      peerScoreRef.current = 0;
      setWinnerId(null);
      setWinnerName("");
      setIsReady(false);
      setPhase("lobby");
      hasStartedRef.current = false;
    });

    channel.on(
      "broadcast",
      { event: "session-start" },
      ({ payload }: { payload: SessionState }) => {
        if (!payload || typeof payload.inputEndsAt !== "number") return;
        clearTimers();
        resetSessionLocal();
        setSessionState(payload);
        sessionStateRef.current = payload;
        setRemainingMs(Math.max(0, payload.inputEndsAt - Date.now()));
        setPhase("playing");
        setError("");
      },
    );

    channel.on("broadcast", { event: "stage-guess" }, ({ payload }) => {
      const data = payload as {
        session: number;
        scrambled: string;
        answer: string;
        answerLength: number;
        guessEndsAt: number;
        setterId: string;
        guesserId: string;
      };
      if (!data) return;
      answerRef.current = data.answer.toUpperCase();

      const prev = sessionStateRef.current;
      if (!prev) return;
      const updated: SessionState = {
        ...prev,
        session: data.session,
        scrambled: data.scrambled,
        answerLength: data.answerLength,
        stage: "guess",
        guessEndsAt: data.guessEndsAt,
        setterId: data.setterId,
        guesserId: data.guesserId,
      };
      setSessionState(updated);
      sessionStateRef.current = updated;
      setGuessInput("");
      setMySubmitted(false);
      mySubmittedRef.current = false;
      setSessionLocked(false);
      sessionLockedRef.current = false;
      setFeedback(null);
      setAttemptsLeft(MAX_ATTEMPTS);
      attemptsLeftRef.current = MAX_ATTEMPTS;
      timeoutFiredRef.current = false;
      advanceFiredRef.current = false;
      setRemainingMs(Math.max(0, data.guessEndsAt - Date.now()));
    });

    channel.on("broadcast", { event: "guess-submitted" }, ({ payload }) => {
      const data = payload as {
        guess: string;
        guesserId: string;
        attemptNumber: number;
      };
      if (!data) return;

      const current = sessionStateRef.current;
      if (!current) return;
      if (current.setterId !== playerIdRef.current) return;
      if (sessionLockedRef.current) return;
      if (current.stage !== "guess") return;

      const correct =
        data.guess.trim().toUpperCase() === answerRef.current.toUpperCase();

      if (correct) {
        void channel.send({
          type: "broadcast",
          event: "session-result",
          payload: {
            guesserId: data.guesserId,
            correct: true,
            answer: answerRef.current,
          },
        });
      } else if (data.attemptNumber >= MAX_ATTEMPTS) {
        void channel.send({
          type: "broadcast",
          event: "session-result",
          payload: {
            guesserId: data.guesserId,
            correct: false,
            answer: answerRef.current,
          },
        });
      } else {
        void channel.send({
          type: "broadcast",
          event: "wrong-guess",
          payload: {
            guesserId: data.guesserId,
            guess: data.guess,
            attemptsLeft: MAX_ATTEMPTS - data.attemptNumber,
          },
        });
      }
    });

    channel.on("broadcast", { event: "wrong-guess" }, ({ payload }) => {
      const data = payload as {
        guesserId: string;
        guess: string;
        attemptsLeft: number;
      };
      if (!data) return;
      if (sessionLockedRef.current) return;

      setAttemptsLeft(data.attemptsLeft);
      attemptsLeftRef.current = data.attemptsLeft;

      if (data.guesserId === playerIdRef.current) {
        setFeedback({
          type: "wrong",
          text: `❌ Salah! Coba lagi (${data.attemptsLeft} kesempatan tersisa)`,
        });
        setGuessInput("");
        setMySubmitted(false);
        mySubmittedRef.current = false;
      } else {
        setFeedback({
          type: "info",
          text: `Lawan salah menebak. Sisa: ${data.attemptsLeft}`,
        });
      }
    });

    channel.on("broadcast", { event: "session-result" }, ({ payload }) => {
      const data = payload as {
        guesserId: string;
        correct: boolean;
        answer: string;
        timeout?: boolean;
      };
      if (!data) return;
      if (sessionLockedRef.current) return;

      setSessionLocked(true);
      sessionLockedRef.current = true;
      timeoutFiredRef.current = true;

      if (data.timeout) {
        setFeedback({
          type: "timeout",
          text: `⏰ Waktu habis! Jawaban: ${data.answer}`,
        });
      } else if (data.correct) {
        setFeedback({
          type: "correct",
          text: `✅ Benar! Jawaban: ${data.answer}`,
        });
      } else {
        setFeedback({
          type: "wrong",
          text: `❌ Kesempatan habis. Jawaban: ${data.answer}`,
        });
      }

      if (data.correct) {
        if (data.guesserId === playerIdRef.current) {
          setMyScore((s) => s + 1);
          myScoreRef.current += 1;
        } else {
          setPeerScore((s) => s + 1);
          peerScoreRef.current += 1;
        }
      }

      const current = sessionStateRef.current;
      if (current && current.setterId === playerIdRef.current) {
        if (advanceTimeoutRef.current) {
          window.clearTimeout(advanceTimeoutRef.current);
        }
        advanceTimeoutRef.current = window.setTimeout(() => {
          advanceSession();
        }, NEXT_SESSION_DELAY_MS);
      }
    });

    channel.on("broadcast", { event: "session-skipped" }, ({ payload }) => {
      const data = payload as { setterId: string };
      if (!data) return;
      if (sessionLockedRef.current) return;

      setSessionLocked(true);
      sessionLockedRef.current = true;
      timeoutFiredRef.current = true;

      if (data.setterId === playerIdRef.current) {
        setFeedback({
          type: "timeout",
          text: "⏰ Kamu tidak input kata. Sesi dilewati.",
        });
      } else {
        setFeedback({
          type: "info",
          text: "⏰ Lawan tidak input kata. Sesi dilewati.",
        });
      }

      const current = sessionStateRef.current;
      if (current && current.setterId === playerIdRef.current) {
        if (advanceTimeoutRef.current) {
          window.clearTimeout(advanceTimeoutRef.current);
        }
        advanceTimeoutRef.current = window.setTimeout(() => {
          advanceSession();
        }, NEXT_SESSION_DELAY_MS);
      }
    });

    channel.on("broadcast", { event: "game-over" }, ({ payload }) => {
      const data = payload as { winnerId?: string | null; winnerName?: string };
      clearTimers();
      setWinnerId(data?.winnerId ?? null);
      setWinnerName(data?.winnerName ?? "");
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
      clearTimers();
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
      joinedAt: playerOrderRef.current.includes(playerId)
        ? (playersRef.current.find((p) => p.id === playerId)?.joinedAt ??
          Date.now())
        : Date.now(),
      ready: isReady,
    });
  }, [activeRoom, isConnected, isReady, playerId, playerName]);

  // =============================================================
  // HOST-ONLY START
  // =============================================================
  const isHost = players.length > 0 && players[0]?.id === playerId;
  const guest = players.find((p) => p.id !== playerId);
  const canStart =
    isHost &&
    players.length === 2 &&
    Boolean(guest?.ready) &&
    isConnected &&
    !joiningRoom &&
    phase === "lobby";

  const handleStartGame = () => {
    const order = playerOrderRef.current;
    if (!isHost || phase !== "lobby" || hasStartedRef.current) return;
    if (order.length !== 2 || playersRef.current.length !== 2) {
      setError("Tunggu sampai 2 pemain bergabung.");
      return;
    }
    const guest = playersRef.current.find((p) => p.id !== playerId);
    if (!guest?.ready) {
      setError("Tunggu sampai pemain lain menekan tombol Siap.");
      return;
    }
    hasStartedRef.current = true;
    const firstSession = buildSession(1, order[0], order[1]);
    resetSessionLocal();
    setSessionState(firstSession);
    sessionStateRef.current = firstSession;
    setRemainingMs(INPUT_TIME_MS);
    setMyScore(0);
    setPeerScore(0);
    myScoreRef.current = 0;
    peerScoreRef.current = 0;
    setWinnerId(null);
    setWinnerName("");
    setPhase("playing");
    void channelRef.current?.send({
      type: "broadcast",
      event: "game-start",
      payload: { starterId: playerId, session: firstSession },
    });
  };

  // =============================================================
  // TIMER — SELALU JALAN (tanpa freeze)
  // =============================================================
  useEffect(() => {
    if (phase !== "playing") return;
    if (!sessionState) return;

    const target =
      sessionState.stage === "input"
        ? sessionState.inputEndsAt
        : sessionState.guessEndsAt;

    // Kalau target 0 (belum ada stage), jangan hitung
    if (!target) return;

    const tick = () => {
      const left = Math.max(0, target - Date.now());
      setRemainingMs(left);
    };
    tick();
    const timer = setInterval(tick, 100);
    return () => clearInterval(timer);
  }, [phase, sessionState]);

  // =============================================================
  // WATCHDOG — kedua pemain, setter prioritas, guesser backup
  // =============================================================
  useEffect(() => {
    if (phase !== "playing") return;
    if (!sessionState) return;

    const interval = setInterval(() => {
      if (sessionLockedRef.current) return;
      if (timeoutFiredRef.current) return;

      const current = sessionStateRef.current;
      if (!current) return;
      if (current.stage !== sessionState.stage) return;

      const target =
        current.stage === "input" ? current.inputEndsAt : current.guessEndsAt;
      if (!target) return;
      if (Date.now() < target) return;

      const isSetterMe = current.setterId === playerIdRef.current;

      if (isSetterMe) {
        timeoutFiredRef.current = true;
        if (current.stage === "input") {
          void channelRef.current?.send({
            type: "broadcast",
            event: "session-skipped",
            payload: { setterId: current.setterId },
          });
        } else {
          void channelRef.current?.send({
            type: "broadcast",
            event: "session-result",
            payload: {
              guesserId: current.guesserId,
              correct: false,
              answer: answerRef.current,
              timeout: true,
            },
          });
        }
      } else {
        timeoutFiredRef.current = true;
        const timedOutSession = current.session;
        const timedOutStage = current.stage;
        window.setTimeout(() => {
          if (sessionLockedRef.current) return;
          const latest = sessionStateRef.current;
          if (!latest) return;
          if (
            latest.session !== timedOutSession ||
            latest.stage !== timedOutStage
          )
            return;
          const latestTarget =
            latest.stage === "input" ? latest.inputEndsAt : latest.guessEndsAt;
          if (!latestTarget) return;
          if (Date.now() < latestTarget + GUESSER_BACKUP_DELAY_MS) return;

          if (latest.stage === "input") {
            void channelRef.current?.send({
              type: "broadcast",
              event: "session-skipped",
              payload: { setterId: latest.setterId },
            });
          } else {
            void channelRef.current?.send({
              type: "broadcast",
              event: "session-result",
              payload: {
                guesserId: latest.guesserId,
                correct: false,
                answer: answerRef.current,
                timeout: true,
              },
            });
          }
        }, GUESSER_BACKUP_DELAY_MS);
      }
    }, WATCHDOG_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [phase, sessionState]);

  // =============================================================
  // SETTER SUBMIT
  // =============================================================
  const handleSetterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionState) return;
    if (sessionState.setterId !== playerId) return;
    if (sessionState.stage !== "input") return;
    if (sessionLocked || Date.now() >= sessionState.inputEndsAt) return;

    const cleaned = cleanLetters(wordInput);
    if (cleaned.length < MIN_WORD_LEN || cleaned.length > MAX_WORD_LEN) {
      setError(`Kata harus ${MIN_WORD_LEN}-${MAX_WORD_LEN} huruf.`);
      return;
    }

    setError("");
    answerRef.current = cleaned;
    const scrambled = scrambleWord(cleaned);
    const guessEndsAt = Date.now() + GUESS_TIME_MS;

    const updated: SessionState = {
      ...sessionState,
      scrambled,
      answerLength: cleaned.length,
      stage: "guess",
      guessEndsAt,
    };
    setSessionState(updated);
    sessionStateRef.current = updated;
    setRemainingMs(GUESS_TIME_MS);

    setMySubmitted(false);
    mySubmittedRef.current = false;
    setAttemptsLeft(MAX_ATTEMPTS);
    attemptsLeftRef.current = MAX_ATTEMPTS;
    timeoutFiredRef.current = false;
    advanceFiredRef.current = false;

    void channelRef.current?.send({
      type: "broadcast",
      event: "stage-guess",
      payload: {
        session: sessionState.session,
        scrambled,
        answer: cleaned,
        answerLength: cleaned.length,
        guessEndsAt,
        setterId: sessionState.setterId,
        guesserId: sessionState.guesserId,
      },
    });
  };

  // =============================================================
  // GUESSER SUBMIT
  // =============================================================
  const handleGuesserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (sessionLocked) return;
    if (mySubmitted) return;
    if (!sessionState) return;
    if (sessionState.guesserId !== playerId) return;
    if (sessionState.stage !== "guess") return;
    if (Date.now() >= sessionState.guessEndsAt) return;

    const guess = cleanLetters(guessInput);
    if (!guess) {
      setError("Ketik jawabanmu dulu.");
      return;
    }

    const attemptNumber = MAX_ATTEMPTS - attemptsLeftRef.current + 1;

    setMySubmitted(true);
    mySubmittedRef.current = true;
    setError("");

    void channelRef.current?.send({
      type: "broadcast",
      event: "guess-submitted",
      payload: { guess, guesserId: playerId, attemptNumber },
    });

    // Unfreeze input setelah 1 detik supaya bisa coba lagi (kalau masih ada kesempatan)
    window.setTimeout(() => {
      if (sessionLockedRef.current) return;
      if (sessionStateRef.current?.stage !== "guess") return;
      setMySubmitted(false);
      mySubmittedRef.current = false;
    }, 1000);
  };

  // =============================================================
  // PLAY AGAIN
  // =============================================================
  const handlePlayAgain = () => {
    if (!isHost || phase !== "results") return;
    const order = playerOrderRef.current;
    if (order.length !== 2 || playersRef.current.length !== 2 || !isConnected) {
      setError("Lawan sudah keluar dari room.");
      return;
    }
    setError("");
    clearTimers();
    hasStartedRef.current = true;
    const firstSession = buildSession(1, order[0], order[1]);
    resetSessionLocal();
    setSessionState(firstSession);
    sessionStateRef.current = firstSession;
    setRemainingMs(INPUT_TIME_MS);
    setMyScore(0);
    setPeerScore(0);
    myScoreRef.current = 0;
    peerScoreRef.current = 0;
    setWinnerId(null);
    setWinnerName("");
    setPhase("playing");
    void channelRef.current?.send({
      type: "broadcast",
      event: "game-start",
      payload: { starterId: playerId, session: firstSession },
    });
  };

  // =============================================================
  // ROOM HANDLING
  // =============================================================
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

  const enterRoom = async (roomCode: string) => {
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
      const count = await peekRoomPlayerCount(roomCode);
      if (count >= 2) {
        setError("Room sudah penuh (maks 2 pemain).");
        setJoiningRoom(false);
        return;
      }

      setPlayerId(crypto.randomUUID());
      setPlayers([]);
      setIsReady(false);
      playerOrderRef.current = [];
      hasStartedRef.current = false;
      setPhase("lobby");
      setSessionState(null);
      sessionStateRef.current = null;
      setMyScore(0);
      setPeerScore(0);
      setWinnerId(null);
      setWinnerName("");
      resetSessionLocal();
      setActiveRoom(roomCode);
    } catch {
      setError("Gagal masuk room. Coba lagi.");
    } finally {
      setJoiningRoom(false);
    }
  };

  const handleJoinRoom = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const code = roomInput
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    if (code.length !== 6) {
      setError("Kode room terdiri dari 6 karakter.");
      return;
    }
    void enterRoom(code);
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
    clearTimers();
    setActiveRoom("");
    setIsConnected(false);
    setPlayers([]);
    setIsReady(false);
    setPhase("lobby");
    setSessionState(null);
    sessionStateRef.current = null;
    setMyScore(0);
    setPeerScore(0);
    setWinnerId(null);
    setWinnerName("");
    resetSessionLocal();
    setError("");
  };

  const submitDisabled =
    mySubmitted ||
    sessionLocked ||
    secondsLeft <= 0 ||
    guessInput.trim().length === 0;

  // =============================================================
  // RENDER
  // =============================================================
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
            <Puzzle size={14} /> REALTIME SCRAMBLE DUEL
          </div>
          <h1>
            Scramble Duel<span>!</span>
          </h1>
          <p>
            6 sesi — 3x kasih kata, 3x menebak. Benar = +1 poin. Siapa paling
            banyak benar, menang!
          </p>
        </header>

        {!activeRoom ? (
          <section className="tap-rush-lobby">
            <div className="tap-rush-intro">
              <div className="tap-rush-orb" aria-hidden="true">
                <Puzzle size={30} />
              </div>
              <div>
                <h2>Bikin room, tantang teman</h2>
                <p>
                  Setiap pemain dapat 3x jadi setter & 3x jadi guesser. Benar =
                  +1 poin. Total 6 sesi!
                </p>
              </div>
            </div>

            <label className="tap-rush-label" htmlFor="sd-name">
              NAMA PEMAIN
            </label>
            <input
              id="sd-name"
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
                onClick={() => void enterRoom(makeRoomCode())}
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
                className={`tap-rush-connection ${
                  isConnected ? "is-online" : ""
                }`}
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
                        {i === 0 ? (
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
                  <p className="tap-rush-waiting-host">
                    {players.length < 2
                      ? "Menunggu 1 pemain lagi…"
                      : isHost
                        ? guest?.ready
                          ? "Pemain siap. Kamu bisa mulai game kapan saja."
                          : "Menunggu pemain lain menekan tombol Siap."
                        : isReady
                          ? "Kamu sudah siap. Tunggu host memulai game."
                          : "Room sudah siap. Tekan Siap saat kamu ingin bermain."}
                  </p>
                  {isHost ? (
                    <button
                      className="tap-rush-primary"
                      type="button"
                      disabled={!canStart}
                      onClick={handleStartGame}
                    >
                      <Rocket size={17} /> Mulai game
                    </button>
                  ) : (
                    <button
                      className={`tap-rush-primary ${isReady ? "is-ready" : ""}`}
                      type="button"
                      disabled={!isConnected || players.length !== 2}
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

            {phase === "playing" && sessionState && (
              <div className="scramble-wrap">
                <div className="scramble-hud">
                  <div className="scramble-score">
                    <span className="scramble-score-label">KAMU</span>
                    <strong>{myScore}</strong>
                  </div>
                  <div className="scramble-round">
                    <span>
                      SESI {sessionNumber} / {TOTAL_SESSIONS}
                    </span>
                    <strong className={secondsLeft <= 5 ? "is-urgent" : ""}>
                      {String(secondsLeft).padStart(2, "0")}s
                    </strong>
                  </div>
                  <div className="scramble-score">
                    <span className="scramble-score-label">
                      {peer?.name?.toUpperCase() ?? "LAWAN"}
                    </span>
                    <strong>{peerScore}</strong>
                  </div>
                </div>

                <div
                  className={`scramble-badge ${
                    myRole === "setter" ? "is-setter" : "is-guesser"
                  }`}
                >
                  {myRole === "setter"
                    ? "KAMU YANG KASIH KATA"
                    : "TEBAK KATA INI!"}
                </div>

                {myRole === "setter" && stage === "input" && (
                  <form
                    className="scramble-setter-form"
                    onSubmit={handleSetterSubmit}
                  >
                    <p className="scramble-help">
                      Tulis satu kata rahasia ({MIN_WORD_LEN}-{MAX_WORD_LEN}{" "}
                      huruf). Lawan harus menebaknya dari huruf yang diacak.
                    </p>
                    <input
                      className="tap-rush-input scramble-word-input"
                      value={wordInput}
                      onChange={(e) =>
                        setWordInput(cleanLetters(e.target.value))
                      }
                      placeholder="KATA RAHASIA"
                      maxLength={MAX_WORD_LEN}
                      autoComplete="off"
                    />
                    <button
                      className="tap-rush-primary"
                      type="submit"
                      disabled={wordInput.trim().length < MIN_WORD_LEN}
                    >
                      <Send size={17} /> Acak & kirim
                    </button>
                    {error && (
                      <p className="tap-rush-error" role="alert">
                        {error}
                      </p>
                    )}
                  </form>
                )}

                {myRole === "setter" && stage !== "input" && (
                  <div className="scramble-setter-wait">
                    <p>
                      Kata yang kamu kirim:{" "}
                      <strong className="scramble-answer-reveal">
                        {answerRef.current}
                      </strong>
                    </p>
                    <div className="scramble-letters scramble-letters-preview">
                      {scrambledChars.map((ch, i) => (
                        <span
                          key={`${ch}-${i}`}
                          className="scramble-letter is-muted"
                        >
                          {ch}
                        </span>
                      ))}
                    </div>
                    <p className="scramble-waiting-text">
                      {feedback
                        ? "Sesi berikutnya sebentar lagi…"
                        : "Menunggu lawan menebak…"}
                    </p>
                    {feedback && (
                      <p
                        className={`scramble-feedback ${
                          feedback.type === "correct"
                            ? "is-correct"
                            : feedback.type === "wrong"
                              ? "is-wrong"
                              : feedback.type === "timeout"
                                ? "is-timeout"
                                : "is-info"
                        }`}
                        role="status"
                      >
                        {feedback.text}
                      </p>
                    )}
                  </div>
                )}

                {myRole === "guesser" && stage === "input" && (
                  <div className="scramble-waiting-opponent">
                    <div className="scramble-waiting-icon">⏳</div>
                    <h3>Menunggu lawan mengirim kata…</h3>
                    <p>
                      Lawan sedang memikirkan kata rahasia. Sabar ya, sebentar
                      lagi kamu bisa menebak!
                    </p>
                    <div className="scramble-waiting-dots">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                )}

                {myRole === "guesser" && stage === "guess" && (
                  <form
                    className="scramble-guesser-form"
                    onSubmit={handleGuesserSubmit}
                  >
                    <p className="scramble-help">
                      Susun ulang huruf di bawah menjadi kata yang benar.
                      {answerLen > 0 && (
                        <>
                          {" "}
                          <span className="scramble-len-hint">
                            ({answerLen} huruf)
                          </span>
                        </>
                      )}
                    </p>

                    <div className="scramble-letters">
                      {scrambledChars.map((ch, i) => (
                        <span key={`${ch}-${i}`} className="scramble-letter">
                          {ch}
                        </span>
                      ))}
                    </div>

                    <div className="scramble-attempts">
                      Kesempatan:{" "}
                      <strong>
                        {attemptsLeft} / {MAX_ATTEMPTS}
                      </strong>
                    </div>

                    <input
                      className="tap-rush-input scramble-guess-input"
                      value={guessInput}
                      onChange={(e) =>
                        setGuessInput(cleanLetters(e.target.value))
                      }
                      placeholder="JAWABANMU"
                      maxLength={MAX_WORD_LEN}
                      autoComplete="off"
                      disabled={sessionLocked}
                    />

                    <button
                      className="tap-rush-primary scramble-submit-btn"
                      type="submit"
                      disabled={submitDisabled}
                    >
                      <Send size={17} />{" "}
                      {sessionLocked
                        ? "Sesi selesai"
                        : mySubmitted
                          ? "Mengirim…"
                          : "Kirim"}
                    </button>

                    {feedback && (
                      <p
                        className={`scramble-feedback ${
                          feedback.type === "correct"
                            ? "is-correct"
                            : feedback.type === "wrong"
                              ? "is-wrong"
                              : feedback.type === "timeout"
                                ? "is-timeout"
                                : "is-info"
                        }`}
                        role="status"
                      >
                        {feedback.text}
                      </p>
                    )}

                    {error && (
                      <p className="tap-rush-error" role="alert">
                        {error}
                      </p>
                    )}
                  </form>
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
                <div className="scramble-final-scores">
                  <div className="scramble-final-score">
                    <span>KAMU</span>
                    <strong>{myScore}</strong>
                  </div>
                  <div className="scramble-final-score">
                    <span>{peer?.name?.toUpperCase() ?? "LAWAN"}</span>
                    <strong>{peerScore}</strong>
                  </div>
                </div>
                <div className="tap-rush-lobby-footer">
                  {isHost ? (
                    <button
                      className="tap-rush-primary"
                      type="button"
                      disabled={players.length < 2 || !isConnected}
                      onClick={handlePlayAgain}
                    >
                      <Rocket size={17} />{" "}
                      {players.length < 2 ? "Lawan keluar" : "Main lagi"}
                    </button>
                  ) : (
                    <p className="scramble-waiting-text">
                      Menunggu host memulai permainan baru…
                    </p>
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

            {error && phase === "lobby" && (
              <p className="tap-rush-error" role="alert">
                {error}
              </p>
            )}
          </section>
        )}

        <footer className="tap-rush-footnote">
          <span>2 PEMAIN</span>
          <span>{TOTAL_SESSIONS} SESI</span>
          <span>INPUT & TEBAK</span>
        </footer>
      </section>

      <style jsx>{`
        .scramble-wrap {
          display: flex;
          flex-direction: column;
          gap: 14px;
          align-items: center;
          width: 100%;
          max-width: 640px;
          margin: 0 auto;
        }
        .scramble-hud {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 10px;
          width: 100%;
          align-items: center;
        }
        .scramble-score {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.03);
          border: 2px solid rgba(236, 72, 153, 0.4);
          border-radius: 10px;
          min-width: 0;
        }
        .scramble-score-label {
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          opacity: 0.7;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 90px;
        }
        .scramble-score strong {
          font-family: Impact, "Arial Black", sans-serif;
          font-size: 22px;
          color: #fff;
          margin-left: auto;
          font-variant-numeric: tabular-nums;
        }
        .scramble-round {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 8px 14px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(236, 72, 153, 0.2);
          border-radius: 10px;
        }
        .scramble-round span {
          font-size: 9px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          opacity: 0.65;
        }
        .scramble-round strong {
          font-family: Impact, "Arial Black", sans-serif;
          font-size: 22px;
          color: #ec4899;
          font-variant-numeric: tabular-nums;
        }
        .scramble-round strong.is-urgent {
          color: #ef4444;
          animation: pulse 0.8s infinite;
        }
        @keyframes pulse {
          50% {
            opacity: 0.5;
          }
        }
        .scramble-badge {
          padding: 8px 18px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .scramble-badge.is-setter {
          background: linear-gradient(135deg, #ec4899, #f472b6);
          color: #fff;
          box-shadow: 0 0 20px rgba(236, 72, 153, 0.5);
        }
        .scramble-badge.is-guesser {
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: #fff;
          box-shadow: 0 0 20px rgba(34, 197, 94, 0.5);
        }
        .scramble-setter-form,
        .scramble-guesser-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
          padding: 18px 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(236, 72, 153, 0.25);
          border-radius: 14px;
        }
        .scramble-help {
          font-size: 13px;
          opacity: 0.75;
          text-align: center;
          line-height: 1.5;
        }
        .scramble-len-hint {
          color: #22c55e;
          font-weight: 700;
        }
        .scramble-word-input,
        .scramble-guess-input {
          text-align: center;
          font-size: 20px;
          letter-spacing: 0.15em;
          font-weight: 700;
          padding: 14px;
        }
        .scramble-guess-input:disabled {
          opacity: 0.5;
        }
        .scramble-letters {
          display: flex;
          flex-wrap: nowrap;
          justify-content: center;
          align-items: center;
          gap: clamp(2px, 0.8vw, 8px);
          padding: 8px 0;
          width: 100%;
          max-width: 100%;
        }
        .scramble-letter {
          display: inline-block;
          color: #fff;
          font-family: Impact, "Arial Black", sans-serif;
          font-size: clamp(16px, calc((100vw - 120px) / 9.5), 40px);
          font-weight: 900;
          line-height: 1.15;
          letter-spacing: 0;
          flex: 0 0 auto;
          text-transform: uppercase;
          text-shadow: 0 2px 14px rgba(236, 72, 153, 0.55);
        }
        .scramble-letter.is-muted {
          opacity: 0.55;
        }
        .scramble-letters-preview {
          margin-top: 6px;
        }
        .scramble-attempts {
          text-align: center;
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          opacity: 0.75;
        }
        .scramble-attempts strong {
          color: #fbbf24;
          font-size: 14px;
        }
        .scramble-submit-btn {
          width: 100%;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }
        .scramble-feedback {
          text-align: center;
          font-size: 13px;
          font-weight: 700;
          padding: 10px 14px;
          border-radius: 8px;
        }
        .scramble-feedback.is-correct {
          background: rgba(34, 197, 94, 0.15);
          color: #22c55e;
          border: 1px solid rgba(34, 197, 94, 0.4);
        }
        .scramble-feedback.is-wrong {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.4);
        }
        .scramble-feedback.is-timeout {
          background: rgba(251, 191, 36, 0.15);
          color: #fbbf24;
          border: 1px solid rgba(251, 191, 36, 0.4);
        }
        .scramble-feedback.is-info {
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
          border: 1px solid rgba(59, 130, 246, 0.4);
        }
        .scramble-setter-wait {
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: center;
          padding: 20px 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(236, 72, 153, 0.25);
          border-radius: 14px;
          text-align: center;
          width: 100%;
        }
        .scramble-answer-reveal {
          color: #fbbf24;
          font-family: Impact, "Arial Black", sans-serif;
          letter-spacing: 0.08em;
          font-size: 18px;
        }
        .scramble-waiting-text {
          font-size: 12px;
          opacity: 0.6;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .scramble-waiting-opponent {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 36px 20px;
          background: rgba(34, 197, 94, 0.06);
          border: 1px solid rgba(34, 197, 94, 0.25);
          border-radius: 14px;
          text-align: center;
          width: 100%;
        }
        .scramble-waiting-icon {
          font-size: 48px;
          animation: spin 2s linear infinite;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .scramble-waiting-opponent h3 {
          font-size: 18px;
          font-weight: 800;
          color: #22c55e;
        }
        .scramble-waiting-opponent p {
          font-size: 13px;
          opacity: 0.7;
          line-height: 1.5;
          max-width: 320px;
        }
        .scramble-waiting-dots {
          display: flex;
          gap: 6px;
          margin-top: 6px;
        }
        .scramble-waiting-dots span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22c55e;
          animation: bounceDot 1.4s infinite ease-in-out;
        }
        .scramble-waiting-dots span:nth-child(2) {
          animation-delay: 0.2s;
        }
        .scramble-waiting-dots span:nth-child(3) {
          animation-delay: 0.4s;
        }
        @keyframes bounceDot {
          0%,
          80%,
          100% {
            transform: scale(0.6);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .scramble-final-scores {
          display: flex;
          gap: 14px;
          justify-content: center;
          margin: 16px 0 22px;
          flex-wrap: wrap;
        }
        .scramble-final-score {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 18px;
          background: rgba(255, 255, 255, 0.03);
          border: 2px solid rgba(236, 72, 153, 0.5);
          border-radius: 12px;
        }
        .scramble-final-score span {
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          opacity: 0.75;
        }
        .scramble-final-score strong {
          font-family: Impact, "Arial Black", sans-serif;
          font-size: 24px;
          color: #ec4899;
        }
        @media (max-width: 640px) {
          .scramble-hud {
            gap: 6px;
          }
          .scramble-score {
            padding: 8px 10px;
          }
          .scramble-score strong {
            font-size: 18px;
          }
          .scramble-score-label {
            max-width: 60px;
          }
          .scramble-round strong {
            font-size: 20px;
          }
        }
      `}</style>
    </main>
  );
}
