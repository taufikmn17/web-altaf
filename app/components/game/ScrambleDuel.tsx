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

type RoomPlayer = {
  id: string;
  name: string;
  isHost: boolean;
  ready: boolean;
};

type GamePhase = "lobby" | "playing" | "results";
type RoundRole = "setter" | "guesser";
type RoundStage = "input" | "guess" | "resolved";

type RoundState = {
  round: number;
  setterId: string;
  guesserId: string;
  scrambled: string;
  answerLength: number;
  stage: RoundStage;
  inputEndsAt: number;
  guessEndsAt: number;
  startedAt: number;
};

const ROOM_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TOTAL_ROUNDS = 5;
const INPUT_TIME_MS = 15_000;
const GUESS_TIME_MS = 15_000;
const MIN_WORD_LEN = 3;
const MAX_WORD_LEN = 7;
const NEXT_ROUND_DELAY_MS = 1800;

function makeRoomCode() {
  const values = new Uint32Array(6);
  crypto.getRandomValues(values);
  return Array.from(
    values,
    (value) => ROOM_CHARACTERS[value % ROOM_CHARACTERS.length],
  ).join("");
}

function scrambleWord(word: string): string {
  const chars = word.split("");
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  const result = chars.join("");
  if (result === word && word.length > 1) {
    return scrambleWord(word);
  }
  return result;
}

export default function ScrambleDuel() {
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
  const [joiningRoom, setJoiningRoom] = useState(false);

  const [round, setRound] = useState(0);
  const [roundState, setRoundState] = useState<RoundState | null>(null);
  const [myScore, setMyScore] = useState(0);
  const [peerScore, setPeerScore] = useState(0);
  const [remainingMs, setRemainingMs] = useState(INPUT_TIME_MS);

  const [wordInput, setWordInput] = useState("");
  const [guessInput, setGuessInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "correct" | "wrong" | "timeout";
    text: string;
  } | null>(null);
  const [roundLocked, setRoundLocked] = useState(false);
  // ✅ NEW: freeze timer segera saat player submit (sebelum hasil diterima)
  const [mySubmitted, setMySubmitted] = useState(false);

  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [winnerName, setWinnerName] = useState("");

  // Refs
  const isHostRef = useRef(false);
  const playerIdRef = useRef("");
  const playersRef = useRef<RoomPlayer[]>([]);
  const roundStateRef = useRef<RoundState | null>(null);
  const myScoreRef = useRef(0);
  const peerScoreRef = useRef(0);
  const answerRef = useRef("");
  const roundLockedRef = useRef(false);
  // ✅ NEW: ref untuk freeze timer segera
  const mySubmittedRef = useRef(false);
  const nextRoundTimeoutRef = useRef<number | null>(null);
  const resolveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);
  useEffect(() => {
    playerIdRef.current = playerId;
  }, [playerId]);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);
  useEffect(() => {
    roundStateRef.current = roundState;
  }, [roundState]);
  useEffect(() => {
    myScoreRef.current = myScore;
  }, [myScore]);
  useEffect(() => {
    peerScoreRef.current = peerScore;
  }, [peerScore]);
  useEffect(() => {
    roundLockedRef.current = roundLocked;
  }, [roundLocked]);
  useEffect(() => {
    mySubmittedRef.current = mySubmitted;
  }, [mySubmitted]);

  const myRole: RoundRole | null = useMemo(() => {
    if (!roundState || !playerId) return null;
    if (roundState.setterId === playerId) return "setter";
    if (roundState.guesserId === playerId) return "guesser";
    return null;
  }, [roundState, playerId]);

  const peer = useMemo(
    () => players.find((p) => p.id !== playerId) ?? null,
    [players, playerId],
  );

  const stage = roundState?.stage ?? "input";

  // =========================================================
  // REALTIME CHANNEL
  // =========================================================
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

    channel.on("broadcast", { event: "game-reset" }, () => {
      setRound(0);
      setRoundState(null);
      setMyScore(0);
      setPeerScore(0);
      setWinnerId(null);
      setWinnerName("");
      setWordInput("");
      setGuessInput("");
      setFeedback(null);
      setRoundLocked(false);
      setMySubmitted(false);
      answerRef.current = "";
      mySubmittedRef.current = false;
      if (nextRoundTimeoutRef.current) {
        window.clearTimeout(nextRoundTimeoutRef.current);
        nextRoundTimeoutRef.current = null;
      }
      setPhase("lobby");
    });

    // HOST memulai ronde (stage: input)
    channel.on(
      "broadcast",
      { event: "round-start" },
      ({ payload }: { payload: RoundState }) => {
        if (!payload || typeof payload.inputEndsAt !== "number") return;
        setRound(payload.round);
        setRoundState(payload);
        roundStateRef.current = payload;
        setGuessInput("");
        setFeedback(null);
        setRoundLocked(false);
        setMySubmitted(false);
        roundLockedRef.current = false;
        mySubmittedRef.current = false;
        setPhase("playing");
        setError("");
      },
    );

    // SETTER broadcast kata + stage guess (dengan answer untuk host)
    channel.on(
      "broadcast",
      { event: "stage-guess" },
      ({
        payload,
      }: {
        payload: {
          round: number;
          scrambled: string;
          answer: string;
          answerLength: number;
          guessEndsAt: number;
          setterId: string;
          guesserId: string;
        };
      }) => {
        if (!payload) return;
        answerRef.current = payload.answer.toUpperCase();

        const prev = roundStateRef.current;
        if (!prev) return;
        const updated: RoundState = {
          ...prev,
          round: payload.round,
          scrambled: payload.scrambled,
          answerLength: payload.answerLength,
          stage: "guess",
          guessEndsAt: payload.guessEndsAt,
          setterId: payload.setterId,
          guesserId: payload.guesserId,
        };
        setRoundState(updated);
        roundStateRef.current = updated;
        setFeedback(null);
        setRoundLocked(false);
        setMySubmitted(false);
        roundLockedRef.current = false;
        mySubmittedRef.current = false;
      },
    );

    // GUESSER kirim jawaban → HOST verifikasi
    channel.on(
      "broadcast",
      { event: "guess-submitted" },
      ({ payload }: { payload: { guess: string; guesserId: string } }) => {
        if (!payload) return;
        if (!isHostRef.current) return;
        if (roundLockedRef.current) return;

        const currentRound = roundStateRef.current;
        if (!currentRound) return;
        if (currentRound.stage !== "guess") return;

        const correct =
          payload.guess.trim().toUpperCase() ===
          answerRef.current.toUpperCase();

        void channel.send({
          type: "broadcast",
          event: "round-result",
          payload: {
            guesserId: payload.guesserId,
            correct,
            guess: payload.guess,
            answer: answerRef.current,
          },
        });
      },
    );

    // Semua pemain terima hasil
    channel.on(
      "broadcast",
      { event: "round-result" },
      ({
        payload,
      }: {
        payload: {
          guesserId: string;
          correct: boolean;
          guess: string;
          answer: string;
        };
      }) => {
        if (!payload) return;
        if (roundLockedRef.current) return;

        setRoundLocked(true);
        roundLockedRef.current = true;
        setMySubmitted(false);
        mySubmittedRef.current = false;
        setFeedback({
          type: payload.correct ? "correct" : "wrong",
          text: payload.correct
            ? `Benar! Jawaban: ${payload.answer}`
            : `Salah. Jawaban: ${payload.answer}`,
        });

        if (payload.correct) {
          if (payload.guesserId === playerIdRef.current) {
            setMyScore((s) => s + 1);
          } else {
            setPeerScore((s) => s + 1);
          }
        }

        if (isHostRef.current) {
          if (nextRoundTimeoutRef.current) {
            window.clearTimeout(nextRoundTimeoutRef.current);
          }
          nextRoundTimeoutRef.current = window.setTimeout(() => {
            advanceRound();
          }, NEXT_ROUND_DELAY_MS);
        }
      },
    );

    // Setter timeout input → skip ronde
    channel.on(
      "broadcast",
      { event: "round-skipped" },
      ({ payload }: { payload: { reason: string; round: number } }) => {
        if (!payload) return;
        if (roundLockedRef.current) return;
        setRoundLocked(true);
        roundLockedRef.current = true;
        setMySubmitted(false);
        mySubmittedRef.current = false;
        setFeedback({
          type: "timeout",
          text:
            payload.reason === "input-timeout"
              ? "Setter kehabisan waktu. Ronde dilewati."
              : "Waktu habis. Ronde dilewati.",
        });
        if (isHostRef.current) {
          if (nextRoundTimeoutRef.current) {
            window.clearTimeout(nextRoundTimeoutRef.current);
          }
          nextRoundTimeoutRef.current = window.setTimeout(() => {
            advanceRound();
          }, NEXT_ROUND_DELAY_MS);
        }
      },
    );

    channel.on(
      "broadcast",
      { event: "game-over" },
      ({
        payload,
      }: {
        payload: { winnerId?: string | null; winnerName?: string };
      }) => {
        setWinnerId(payload?.winnerId ?? null);
        setWinnerName(payload?.winnerName ?? "");
        setPhase("results");
        if (nextRoundTimeoutRef.current) {
          window.clearTimeout(nextRoundTimeoutRef.current);
          nextRoundTimeoutRef.current = null;
        }
      },
    );

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
      if (nextRoundTimeoutRef.current) {
        window.clearTimeout(nextRoundTimeoutRef.current);
        nextRoundTimeoutRef.current = null;
      }
      if (resolveTimeoutRef.current) {
        window.clearTimeout(resolveTimeoutRef.current);
        resolveTimeoutRef.current = null;
      }
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

  // =========================================================
  // TIMER (freeze di player yang submit & saat roundLocked)
  // =========================================================
  useEffect(() => {
    if (phase !== "playing" || !roundState) return;
    // ✅ FIX: freeze kalau ronde sudah dikunci ATAU player sudah submit
    if (roundLocked) return;
    if (mySubmitted) return;

    const target =
      roundState.stage === "input"
        ? roundState.inputEndsAt
        : roundState.guessEndsAt;

    const tick = () => {
      const next = Math.max(0, target - Date.now());
      setRemainingMs(next);
    };
    tick();
    const timer = setInterval(tick, 100);
    return () => clearInterval(timer);
  }, [phase, roundState, roundLocked, mySubmitted]);

  // =========================================================
  // HOST WATCHDOG
  // =========================================================
  useEffect(() => {
    if (!isHost) return;
    if (phase !== "playing") return;
    if (!roundState) return;
    if (roundLocked) return;

    const target =
      roundState.stage === "input"
        ? roundState.inputEndsAt
        : roundState.guessEndsAt;
    const msLeft = Math.max(0, target - Date.now());

    if (resolveTimeoutRef.current) {
      window.clearTimeout(resolveTimeoutRef.current);
    }

    resolveTimeoutRef.current = window.setTimeout(() => {
      if (roundLockedRef.current) return;
      const current = roundStateRef.current;
      if (!current) return;

      if (current.stage === "input") {
        void channelRef.current?.send({
          type: "broadcast",
          event: "round-skipped",
          payload: { reason: "input-timeout", round: current.round },
        });
      } else if (current.stage === "guess") {
        void channelRef.current?.send({
          type: "broadcast",
          event: "round-result",
          payload: {
            guesserId: current.guesserId,
            correct: false,
            guess: "",
            answer: answerRef.current,
          },
        });
      }
    }, msLeft + 200);

    return () => {
      if (resolveTimeoutRef.current) {
        window.clearTimeout(resolveTimeoutRef.current);
        resolveTimeoutRef.current = null;
      }
    };
  }, [isHost, phase, roundState, roundLocked]);

  // =========================================================
  // HOST: mulai ronde baru
  // =========================================================
  const startRound = (roundNumber: number) => {
    if (!isHostRef.current) return;
    const guest = playersRef.current.find((p) => !p.isHost);
    if (!guest) return;

    const hostIsSetter = roundNumber % 2 === 1;
    const setterId = hostIsSetter ? playerIdRef.current : guest.id;
    const guesserId = hostIsSetter ? guest.id : playerIdRef.current;

    const now = Date.now();
    const state: RoundState = {
      round: roundNumber,
      setterId,
      guesserId,
      scrambled: "",
      answerLength: 0,
      stage: "input",
      inputEndsAt: now + INPUT_TIME_MS,
      guessEndsAt: 0,
      startedAt: now,
    };

    answerRef.current = "";
    setRound(roundNumber);
    setRoundState(state);
    roundStateRef.current = state;
    setWordInput("");
    setGuessInput("");
    setFeedback(null);
    setRoundLocked(false);
    setMySubmitted(false);
    roundLockedRef.current = false;
    mySubmittedRef.current = false;
    setRemainingMs(INPUT_TIME_MS);
    setPhase("playing");

    void channelRef.current?.send({
      type: "broadcast",
      event: "round-start",
      payload: state,
    });
  };

  // =========================================================
  // HOST: advance ronde / selesai
  // =========================================================
  const advanceRound = () => {
    if (!isHostRef.current) return;
    const currentRound = roundStateRef.current;
    if (!currentRound) return;

    const nextRound = currentRound.round + 1;

    if (nextRound > TOTAL_ROUNDS) {
      const hostScoreNow = myScoreRef.current;
      const guestScoreNow = peerScoreRef.current;

      let winnerIdFinal: string | null = null;
      let winnerNameFinal = "";
      const guest = playersRef.current.find((p) => !p.isHost);
      const hostPlayer = playersRef.current.find((p) => p.isHost);

      if (hostScoreNow > guestScoreNow) {
        winnerIdFinal = hostPlayer?.id ?? null;
        winnerNameFinal = hostPlayer?.name ?? "Host";
      } else if (guestScoreNow > hostScoreNow) {
        winnerIdFinal = guest?.id ?? null;
        winnerNameFinal = guest?.name ?? "Lawan";
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

    startRound(nextRound);
  };

  // =========================================================
  // SETTER: submit kata
  // =========================================================
  const handleSetterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roundState) return;
    if (roundState.setterId !== playerId) return;
    if (roundState.stage !== "input") return;
    if (roundLocked) return;

    const cleaned = wordInput
      .trim()
      .toUpperCase()
      .replace(/[^A-Z]/g, "");
    if (cleaned.length < MIN_WORD_LEN || cleaned.length > MAX_WORD_LEN) {
      setError(`Kata harus ${MIN_WORD_LEN}-${MAX_WORD_LEN} huruf (A-Z saja).`);
      return;
    }

    setError("");
    answerRef.current = cleaned;
    const scrambled = scrambleWord(cleaned);
    const guessEndsAt = Date.now() + GUESS_TIME_MS;

    const updated: RoundState = {
      ...roundState,
      scrambled,
      answerLength: cleaned.length,
      stage: "guess",
      guessEndsAt,
    };
    setRoundState(updated);
    roundStateRef.current = updated;
    setRemainingMs(GUESS_TIME_MS);
    // reset mySubmitted untuk stage guess baru
    setMySubmitted(false);
    mySubmittedRef.current = false;

    void channelRef.current?.send({
      type: "broadcast",
      event: "stage-guess",
      payload: {
        round: roundState.round,
        scrambled,
        answer: cleaned,
        answerLength: cleaned.length,
        guessEndsAt,
        setterId: roundState.setterId,
        guesserId: roundState.guesserId,
      },
    });
  };

  // =========================================================
  // GUESSER: submit jawaban — ✅ FIX: freeze timer segera
  // =========================================================
  const handleGuesserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (submitting) return;
    if (roundLocked) return;
    if (mySubmitted) return;
    if (!roundState) return;
    if (roundState.guesserId !== playerId) return;
    if (roundState.stage !== "guess") return;

    const guess = guessInput
      .trim()
      .toUpperCase()
      .replace(/[^A-Z]/g, "");
    if (!guess) {
      setError("Ketik jawabanmu dulu.");
      return;
    }

    // ✅ FREEZE TIMER DI SISI PLAYER INI SEGERA
    setMySubmitted(true);
    mySubmittedRef.current = true;
    setSubmitting(true);
    setError("");

    void channelRef.current?.send({
      type: "broadcast",
      event: "guess-submitted",
      payload: { guess, guesserId: playerId },
    });

    setTimeout(() => setSubmitting(false), 400);
  };

  // =========================================================
  // ROOM ENTER / LEAVE
  // =========================================================
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
      setRoundState(null);
      setMyScore(0);
      setPeerScore(0);
      setWinnerId(null);
      setWinnerName("");
      setWordInput("");
      setGuessInput("");
      setFeedback(null);
      setRoundLocked(false);
      setMySubmitted(false);
      answerRef.current = "";
      mySubmittedRef.current = false;
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

    void channelRef.current?.send({
      type: "broadcast",
      event: "game-reset",
      payload: {},
    });

    setMyScore(0);
    setPeerScore(0);
    setWinnerId(null);
    setWinnerName("");
    setWordInput("");
    setGuessInput("");
    setFeedback(null);
    setRoundLocked(false);
    setMySubmitted(false);
    answerRef.current = "";
    myScoreRef.current = 0;
    peerScoreRef.current = 0;
    mySubmittedRef.current = false;

    startRound(1);
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
    if (nextRoundTimeoutRef.current) {
      window.clearTimeout(nextRoundTimeoutRef.current);
      nextRoundTimeoutRef.current = null;
    }
    if (resolveTimeoutRef.current) {
      window.clearTimeout(resolveTimeoutRef.current);
      resolveTimeoutRef.current = null;
    }
    setActiveRoom("");
    setIsConnected(false);
    setIsHost(false);
    setIsReady(false);
    setPlayers([]);
    setPhase("lobby");
    setRound(0);
    setRoundState(null);
    setMyScore(0);
    setPeerScore(0);
    setWinnerId(null);
    setWinnerName("");
    setWordInput("");
    setGuessInput("");
    setFeedback(null);
    setRoundLocked(false);
    setMySubmitted(false);
    answerRef.current = "";
    mySubmittedRef.current = false;
    setError("");
  };

  const guestsReady = players.filter((p) => !p.isHost).every((p) => p.ready);
  const canStart =
    isHost &&
    players.length === 2 &&
    guestsReady &&
    isConnected &&
    !joiningRoom;
  const secondsLeft = Math.ceil(remainingMs / 1000);

  const scrambledChars = roundState?.scrambled
    ? roundState.scrambled.split("")
    : [];
  const answerLen = roundState?.answerLength ?? 0;

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
            Input kata (maks 7 huruf), acak hurufnya, lawan harus menebak.
            Gantian — siapa paling banyak benar, menang!
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
                  {TOTAL_ROUNDS} ronde bergantian. Satu ronde kamu yang kasih
                  kata, ronde berikutnya lawan. Adu cepat & tepat!
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
                      className={`tap-rush-primary ${
                        isReady ? "is-ready" : ""
                      }`}
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

            {phase === "playing" && roundState && (
              <div className="scramble-wrap">
                <div className="scramble-hud">
                  <div className="scramble-score">
                    <span className="scramble-score-label">KAMU</span>
                    <strong>{myScore}</strong>
                  </div>
                  <div className="scramble-round">
                    <span>
                      RONDE {round} / {TOTAL_ROUNDS}
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

                {/* ============ SETTER ============ */}
                {myRole === "setter" && stage === "input" && (
                  <form
                    className="scramble-setter-form"
                    onSubmit={handleSetterSubmit}
                  >
                    <p className="scramble-help">
                      Tulis satu kata rahasia (maks {MAX_WORD_LEN} huruf). Lawan
                      harus menebaknya dari huruf yang diacak.
                    </p>
                    <input
                      className="tap-rush-input scramble-word-input"
                      value={wordInput}
                      onChange={(e) =>
                        setWordInput(
                          e.target.value
                            .toUpperCase()
                            .replace(/[^A-Z]/g, "")
                            .slice(0, MAX_WORD_LEN),
                        )
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
                        ? "Ronde berikutnya sebentar lagi…"
                        : "Menunggu lawan menebak…"}
                    </p>
                    {feedback && (
                      <p
                        className={`scramble-feedback ${
                          feedback.type === "correct"
                            ? "is-correct"
                            : feedback.type === "wrong"
                              ? "is-wrong"
                              : "is-timeout"
                        }`}
                        role="status"
                      >
                        {feedback.text}
                      </p>
                    )}
                  </div>
                )}

                {/* ============ GUESSER ============ */}
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

                    <input
                      className="tap-rush-input scramble-guess-input"
                      value={guessInput}
                      onChange={(e) =>
                        setGuessInput(
                          e.target.value
                            .toUpperCase()
                            .replace(/[^A-Z]/g, "")
                            .slice(0, MAX_WORD_LEN),
                        )
                      }
                      placeholder="JAWABANMU"
                      maxLength={MAX_WORD_LEN}
                      autoComplete="off"
                      disabled={roundLocked || mySubmitted}
                    />

                    <button
                      className="tap-rush-primary scramble-submit-btn"
                      type="submit"
                      disabled={
                        submitting ||
                        roundLocked ||
                        mySubmitted ||
                        !guessInput.trim()
                      }
                    >
                      <Send size={17} />{" "}
                      {mySubmitted
                        ? "Menunggu hasil…"
                        : submitting
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
                              : "is-timeout"
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

            {error && phase === "lobby" && (
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
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;
          gap: 6px;
          padding: 8px 4px;
          width: 100%;
          max-width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .scramble-letter {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: clamp(36px, 10vw, 56px);
          height: clamp(36px, 10vw, 56px);
          border-radius: 10px;
          background: linear-gradient(135deg, #f472b6, #ec4899);
          color: #fff;
          font-family: Impact, "Arial Black", sans-serif;
          font-size: clamp(18px, 5vw, 26px);
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(236, 72, 153, 0.4);
          flex-shrink: 0;
          text-transform: uppercase;
        }
        .scramble-letter.is-muted {
          opacity: 0.55;
        }
        .scramble-letters-preview {
          margin-top: 6px;
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
          letter-spacing: 0.02em;
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
          .scramble-letter {
            width: clamp(32px, 9vw, 46px);
            height: clamp(32px, 9vw, 46px);
            font-size: clamp(16px, 4.5vw, 22px);
          }
        }
      `}</style>
    </main>
  );
}
