"use client";

import {
  ArrowLeft,
  Copy,
  DoorOpen,
  Globe2,
  Loader2,
  Radio,
  RefreshCw,
  Rocket,
  Trophy,
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

type Question = {
  flag: string;
  answer: string;
  options: string[];
};

type CountryData = {
  name: { common: string };
  translations?: { ind?: { common: string } };
  flags: { png: string; emoji: string };
};

const ROOM_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TOTAL_QUESTIONS = 5;
const ROUND_SECONDS = 10;
const MAX_PLAYERS = 4;

const FALLBACK_COUNTRIES: CountryData[] = [
  {
    name: { common: "Indonesia" },
    translations: { ind: { common: "Indonesia" } },
    flags: { emoji: "🇮🇩", png: "" },
  },
  {
    name: { common: "Japan" },
    translations: { ind: { common: "Jepang" } },
    flags: { emoji: "🇯🇵", png: "" },
  },
  {
    name: { common: "South Korea" },
    translations: { ind: { common: "Korea Selatan" } },
    flags: { emoji: "🇰🇷", png: "" },
  },
  {
    name: { common: "China" },
    translations: { ind: { common: "China" } },
    flags: { emoji: "🇨🇳", png: "" },
  },
  {
    name: { common: "India" },
    translations: { ind: { common: "India" } },
    flags: { emoji: "🇮🇳", png: "" },
  },
  {
    name: { common: "Saudi Arabia" },
    translations: { ind: { common: "Arab Saudi" } },
    flags: { emoji: "🇸🇦", png: "" },
  },
  {
    name: { common: "Thailand" },
    translations: { ind: { common: "Thailand" } },
    flags: { emoji: "🇹🇭", png: "" },
  },
  {
    name: { common: "Vietnam" },
    translations: { ind: { common: "Vietnam" } },
    flags: { emoji: "🇻🇳", png: "" },
  },
  {
    name: { common: "Philippines" },
    translations: { ind: { common: "Filipina" } },
    flags: { emoji: "🇵🇭", png: "" },
  },
  {
    name: { common: "Malaysia" },
    translations: { ind: { common: "Malaysia" } },
    flags: { emoji: "🇲🇾", png: "" },
  },
  {
    name: { common: "Singapore" },
    translations: { ind: { common: "Singapura" } },
    flags: { emoji: "🇸🇬", png: "" },
  },
  {
    name: { common: "United States" },
    translations: { ind: { common: "Amerika Serikat" } },
    flags: { emoji: "🇺🇸", png: "" },
  },
  {
    name: { common: "United Kingdom" },
    translations: { ind: { common: "Inggris" } },
    flags: { emoji: "🇬🇧", png: "" },
  },
  {
    name: { common: "France" },
    translations: { ind: { common: "Prancis" } },
    flags: { emoji: "🇫🇷", png: "" },
  },
  {
    name: { common: "Germany" },
    translations: { ind: { common: "Jerman" } },
    flags: { emoji: "🇩🇪", png: "" },
  },
  {
    name: { common: "Italy" },
    translations: { ind: { common: "Italia" } },
    flags: { emoji: "🇮🇹", png: "" },
  },
  {
    name: { common: "Spain" },
    translations: { ind: { common: "Spanyol" } },
    flags: { emoji: "🇪🇸", png: "" },
  },
  {
    name: { common: "Portugal" },
    translations: { ind: { common: "Portugal" } },
    flags: { emoji: "🇵🇹", png: "" },
  },
  {
    name: { common: "Brazil" },
    translations: { ind: { common: "Brasil" } },
    flags: { emoji: "🇧🇷", png: "" },
  },
  {
    name: { common: "Argentina" },
    translations: { ind: { common: "Argentina" } },
    flags: { emoji: "🇦🇷", png: "" },
  },
  {
    name: { common: "Mexico" },
    translations: { ind: { common: "Meksiko" } },
    flags: { emoji: "🇲🇽", png: "" },
  },
  {
    name: { common: "Canada" },
    translations: { ind: { common: "Kanada" } },
    flags: { emoji: "🇨🇦", png: "" },
  },
  {
    name: { common: "Australia" },
    translations: { ind: { common: "Australia" } },
    flags: { emoji: "🇦🇺", png: "" },
  },
  {
    name: { common: "New Zealand" },
    translations: { ind: { common: "Selandia Baru" } },
    flags: { emoji: "🇳🇿", png: "" },
  },
  {
    name: { common: "Egypt" },
    translations: { ind: { common: "Mesir" } },
    flags: { emoji: "🇪🇬", png: "" },
  },
  {
    name: { common: "South Africa" },
    translations: { ind: { common: "Afrika Selatan" } },
    flags: { emoji: "🇿🇦", png: "" },
  },
  {
    name: { common: "Nigeria" },
    translations: { ind: { common: "Nigeria" } },
    flags: { emoji: "🇳🇬", png: "" },
  },
  {
    name: { common: "Turkey" },
    translations: { ind: { common: "Turki" } },
    flags: { emoji: "🇹🇷", png: "" },
  },
  {
    name: { common: "Russia" },
    translations: { ind: { common: "Rusia" } },
    flags: { emoji: "🇷🇺", png: "" },
  },
  {
    name: { common: "Netherlands" },
    translations: { ind: { common: "Belanda" } },
    flags: { emoji: "🇳🇱", png: "" },
  },
  {
    name: { common: "Sweden" },
    translations: { ind: { common: "Swedia" } },
    flags: { emoji: "🇸🇪", png: "" },
  },
  {
    name: { common: "Norway" },
    translations: { ind: { common: "Norwegia" } },
    flags: { emoji: "🇳🇴", png: "" },
  },
  {
    name: { common: "Switzerland" },
    translations: { ind: { common: "Swiss" } },
    flags: { emoji: "🇨🇭", png: "" },
  },
  {
    name: { common: "Greece" },
    translations: { ind: { common: "Yunani" } },
    flags: { emoji: "🇬🇷", png: "" },
  },
  {
    name: { common: "Poland" },
    translations: { ind: { common: "Polandia" } },
    flags: { emoji: "🇵🇱", png: "" },
  },
  {
    name: { common: "Ukraine" },
    translations: { ind: { common: "Ukraina" } },
    flags: { emoji: "🇺🇦", png: "" },
  },
  {
    name: { common: "Ireland" },
    translations: { ind: { common: "Irlandia" } },
    flags: { emoji: "🇮🇪", png: "" },
  },
  {
    name: { common: "Belgium" },
    translations: { ind: { common: "Belgia" } },
    flags: { emoji: "🇧🇪", png: "" },
  },
  {
    name: { common: "Austria" },
    translations: { ind: { common: "Austria" } },
    flags: { emoji: "🇦🇹", png: "" },
  },
  {
    name: { common: "Denmark" },
    translations: { ind: { common: "Denmark" } },
    flags: { emoji: "🇩🇰", png: "" },
  },
];

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

function pickCountryName(country: CountryData): string {
  return country.translations?.ind?.common ?? country.name.common;
}

export default function FlagQuiz() {
  const supabase = getSupabaseBrowserClient();
  const [playerId, setPlayerId] = useState("");
  const channelRef = useRef<RealtimeChannel | null>(null);
  const timerRef = useRef<number | null>(null);

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

  const [countryPool, setCountryPool] = useState<CountryData[]>([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);
  const [countrySource, setCountrySource] = useState<"api" | "fallback" | "">(
    "",
  );

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [correctCount, setCorrectCount] = useState<Record<string, number>>({});
  const [myAnswer, setMyAnswer] = useState<string | null>(null);
  const [notices, setNotices] = useState<string[]>([]);

  const loadCountries = async () => {
    setIsLoadingCountries(true);
    setError("");
    try {
      const res = await fetch("/api/countries");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: CountryData[] = await res.json();

      const filtered = data.filter(
        (c) =>
          c.flags?.emoji &&
          c.flags.emoji.trim() !== "" &&
          pickCountryName(c).trim() !== "",
      );

      if (filtered.length < 4) throw new Error("Data tidak cukup");

      setCountryPool(filtered);
      setCountrySource("api");
    } catch (err) {
      console.error(err);
      setCountryPool(FALLBACK_COUNTRIES);
      setCountrySource("fallback");
      setError(
        "Data negara dari API gagal dimuat. Menggunakan daftar cadangan.",
      );
    } finally {
      setIsLoadingCountries(false);
    }
  };

  useEffect(() => {
    void loadCountries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pushNotice = (message: string) => {
    setNotices((current) => [...current, message].slice(-4));
    window.setTimeout(() => {
      setNotices((current) => current.slice(1));
    }, 3200);
  };

  useEffect(() => {
    if (!activeRoom || !supabase || !playerId) return;

    const channel = supabase.channel(`flag-quiz:${activeRoom}`, {
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
      setCorrectCount((current) => {
        const next: Record<string, number> = {};
        for (const p of connectedPlayers) next[p.id] = current[p.id] ?? 0;
        return next;
      });
    };

    channel.on("presence", { event: "sync" }, syncFromPresence);
    channel.on("presence", { event: "join" }, syncFromPresence);
    channel.on("presence", { event: "leave" }, syncFromPresence);

    channel.on("broadcast", { event: "game-reset" }, () => {
      setQuestions([]);
      setCurrentIndex(0);
      setTimeLeft(ROUND_SECONDS);
      setScores({});
      setCorrectCount({});
      setMyAnswer(null);
      setNotices([]);
      setPhase("lobby");
    });

    channel.on("broadcast", { event: "quiz-start" }, ({ payload }) => {
      const data = payload as { questions?: Question[] };
      if (!data.questions) return;
      setQuestions(data.questions);
      setCurrentIndex(0);
      setScores({});
      setCorrectCount({});
      setMyAnswer(null);
      setTimeLeft(ROUND_SECONDS);
      setNotices([]);
      setPhase("playing");
      setError("");
    });

    channel.on("broadcast", { event: "answer" }, ({ payload }) => {
      const data = payload as {
        id?: string;
        answer?: string;
        correct?: boolean;
        name?: string;
      };
      if (!data.id || typeof data.correct !== "boolean") return;
      if (data.id === playerId) return;

      if (data.correct) {
        pushNotice(`${data.name ?? "Teman"} menebak dengan benar!`);
        setScores((current) => ({
          ...current,
          [data.id as string]: (current[data.id as string] ?? 0) + 1,
        }));
        setCorrectCount((current) => ({
          ...current,
          [data.id as string]: (current[data.id as string] ?? 0) + 1,
        }));
      } else {
        pushNotice(`${data.name ?? "Teman"} salah menebak!`);
      }
    });

    channel.on("broadcast", { event: "next-question" }, ({ payload }) => {
      const data = payload as { index?: number };
      if (typeof data.index !== "number") return;
      setCurrentIndex(data.index);
      setMyAnswer(null);
      setTimeLeft(ROUND_SECONDS);
      setPhase("playing");
    });

    channel.on("broadcast", { event: "quiz-end" }, () => {
      setPhase("results");
      if (timerRef.current) window.clearInterval(timerRef.current);
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

  useEffect(() => {
    if (phase !== "playing") return;
    if (!isHost) return;
    if (timerRef.current) window.clearInterval(timerRef.current);

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          goNextQuestion();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentIndex, isHost]);

  const goNextQuestion = () => {
    const next = currentIndex + 1;
    if (next >= TOTAL_QUESTIONS) {
      setPhase("results");
      void channelRef.current?.send({
        type: "broadcast",
        event: "quiz-end",
        payload: {},
      });
      return;
    }
    setCurrentIndex(next);
    setMyAnswer(null);
    setTimeLeft(ROUND_SECONDS);
    void channelRef.current?.send({
      type: "broadcast",
      event: "next-question",
      payload: { index: next },
    });
  };

  const buildQuestions = (): Question[] => {
    if (countryPool.length < 4) return [];
    const picked = shuffle(countryPool).slice(0, TOTAL_QUESTIONS);
    return picked.map((country) => {
      const answer = pickCountryName(country);
      const distractors = shuffle(
        countryPool.filter((c) => pickCountryName(c) !== answer),
      )
        .slice(0, 3)
        .map((c) => pickCountryName(c));
      const options = shuffle([answer, ...distractors]);
      return {
        flag: country.flags.png,
        answer,
        options,
      };
    });
  };

  // ---- Preflight: cek jumlah pemain di room ----
  const peekRoomPlayerCount = async (roomCode: string): Promise<number> => {
    if (!supabase) return 0;
    const peekKey = "peek-" + crypto.randomUUID();
    const peekChannel = supabase.channel(`flag-quiz:${roomCode}`, {
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
      setScores({});
      setCorrectCount({});
      setMyAnswer(null);
      setNotices([]);
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

  const startQuiz = () => {
    if (
      !isHost ||
      players.length < 2 ||
      players.length > MAX_PLAYERS ||
      isLoadingCountries ||
      countryPool.length < 4
    )
      return;

    void channelRef.current?.send({
      type: "broadcast",
      event: "game-reset",
      payload: {},
    });

    setScores({});
    setCorrectCount({});
    setMyAnswer(null);
    setNotices([]);
    setCurrentIndex(0);
    setTimeLeft(ROUND_SECONDS);

    const q = buildQuestions();
    if (q.length === 0) return;
    setQuestions(q);
    setPhase("playing");
    void channelRef.current?.send({
      type: "broadcast",
      event: "quiz-start",
      payload: { questions: q },
    });
  };

  const answer = (option: string) => {
    if (phase !== "playing" || myAnswer) return;
    const q = questions[currentIndex];
    if (!q) return;
    const correct = option === q.answer;
    setMyAnswer(option);
    if (correct) {
      setScores((current) => ({
        ...current,
        [playerId]: (current[playerId] ?? 0) + 1,
      }));
      setCorrectCount((current) => ({
        ...current,
        [playerId]: (current[playerId] ?? 0) + 1,
      }));
    }
    void channelRef.current?.send({
      type: "broadcast",
      event: "answer",
      payload: {
        id: playerId,
        name: playerName.trim() || "Pemain",
        answer: option,
        correct,
      },
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
    setScores({});
    setCorrectCount({});
    setQuestions([]);
    setMyAnswer(null);
    setNotices([]);
    setError("");
    if (timerRef.current) window.clearInterval(timerRef.current);
  };

  const guestsReady = players.filter((p) => !p.isHost).every((p) => p.ready);
  const canStart =
    isHost &&
    players.length >= 2 &&
    players.length <= MAX_PLAYERS &&
    guestsReady &&
    isConnected &&
    !isLoadingCountries &&
    countryPool.length >= 4 &&
    !joiningRoom;

  const currentQuestion = questions[currentIndex];
  const orderedPlayers = [...players].sort(
    (left, right) => (scores[right.id] ?? 0) - (scores[left.id] ?? 0),
  );

  return (
    <main className="tap-rush-shell">
      <div className="tap-rush-topbar">
        <Link href="/game" className="tap-rush-back">
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Semua game</span>
        </Link>
        <span className="tap-rush-season">ONLINE QUIZ / 03</span>
      </div>

      <section className="tap-rush-layout">
        <header className="tap-rush-heading">
          <div className="tap-rush-kicker">
            <Globe2 size={14} /> REALTIME FLAG QUIZ
          </div>
          <h1>
            Tebak Negara<span>!</span>
          </h1>
          <p>5 soal. 10 detik per soal. Siapa paling cepat dan tepat?</p>
        </header>

        {!activeRoom ? (
          <section className="tap-rush-lobby">
            <div className="tap-rush-intro">
              <div className="tap-rush-orb" aria-hidden="true">
                <Globe2 size={30} />
              </div>
              <div>
                <h2>Kumpulkan teman, adu pengetahuan</h2>
                <p>
                  Host buat room, semua pemain dapat soal yang sama. Jawab
                  secepat mungkin sebelum waktu habis.
                </p>
              </div>
            </div>

            {isLoadingCountries ? (
              <div className="tap-rush-setup" role="status">
                <Loader2 size={17} className="flag-quiz-spin" />
                <span>Memuat data negara dari API…</span>
              </div>
            ) : countrySource === "api" ? (
              <div className="tap-rush-setup" role="status">
                <Globe2 size={17} />
                <span>{countryPool.length} negara siap dimainkan.</span>
              </div>
            ) : countrySource === "fallback" ? (
              <div className="tap-rush-setup" role="status">
                <RefreshCw size={17} />
                <span>
                  Menggunakan daftar cadangan ({countryPool.length} negara).
                </span>
              </div>
            ) : null}

            <label className="tap-rush-label" htmlFor="quiz-player-name">
              NAMA PEMAIN
            </label>
            <input
              id="quiz-player-name"
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
                disabled={
                  !supabase ||
                  isLoadingCountries ||
                  countryPool.length < 4 ||
                  joiningRoom
                }
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
              <div className="tap-rush-setup" role="alert">
                <Radio size={17} />
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => void loadCountries()}
                  className="tap-rush-secondary"
                  style={{ marginTop: 8 }}
                >
                  Coba lagi
                </button>
              </div>
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
                        <span className="tap-rush-player-number">
                          {String(i + 1).padStart(2, "0")}
                        </span>
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
                      onClick={startQuiz}
                    >
                      <Rocket size={17} />{" "}
                      {players.length < 2
                        ? "Butuh minimal 2 pemain"
                        : players.length > MAX_PLAYERS
                          ? `Room penuh (maks ${MAX_PLAYERS})`
                          : isLoadingCountries
                            ? "Memuat negara…"
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

            {phase === "playing" && currentQuestion && (
              <div className="flag-quiz-wrap">
                <div className="flag-quiz-progress">
                  <span>
                    SOAL {currentIndex + 1} / {TOTAL_QUESTIONS}
                  </span>
                  <span
                    className={`flag-quiz-timer ${
                      timeLeft <= 3 ? "is-urgent" : ""
                    }`}
                  >
                    {String(timeLeft).padStart(2, "0")}s
                  </span>
                </div>

                <div className="flag-quiz-card">
                  <img
                    src={currentQuestion.flag}
                    alt="Bendera negara misterius"
                    className="flag-quiz-flag-img"
                    loading="eager"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display =
                        "none";
                    }}
                  />
                  <p className="flag-quiz-prompt">Negara apa ini?</p>
                </div>

                <div className="flag-quiz-options">
                  {currentQuestion.options.map((option) => {
                    const isMine = myAnswer === option;
                    const isCorrect = option === currentQuestion.answer;
                    const showCorrect = myAnswer !== null && isCorrect;
                    const showWrong = isMine && !isCorrect;
                    return (
                      <button
                        key={option}
                        type="button"
                        className={`flag-quiz-option ${
                          showCorrect ? "is-correct" : ""
                        } ${showWrong ? "is-wrong" : ""} ${
                          isMine ? "is-mine" : ""
                        }`}
                        disabled={myAnswer !== null}
                        onClick={() => answer(option)}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>

                <div className="flag-quiz-scoreline">
                  <span>
                    Skor kamu: <strong>{scores[playerId] ?? 0}</strong>
                  </span>
                  <span>{players.length} pemain</span>
                </div>

                {notices.length > 0 && (
                  <div className="flag-quiz-notices" role="status">
                    {notices.map((notice, i) => (
                      <div className="flag-quiz-notice" key={i}>
                        {notice}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {phase === "results" && (
              <div className="tap-rush-results">
                <div className="tap-rush-finish-mark">FINISH</div>
                <h2>
                  <Trophy size={22} /> Papan skor akhir
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
                      <strong>
                        {correctCount[player.id] ?? 0} / {TOTAL_QUESTIONS}
                      </strong>
                    </li>
                  ))}
                </ol>
                <div className="tap-rush-lobby-footer">
                  {isHost && (
                    <button
                      className="tap-rush-primary"
                      type="button"
                      disabled={!canStart}
                      onClick={startQuiz}
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
          <span>5 SOAL</span>
          <span>10 DETIK / SOAL</span>
          <span>MAKS {MAX_PLAYERS} PEMAIN</span>
        </footer>
      </section>

      <style jsx>{`
        .flag-quiz-wrap {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .flag-quiz-progress {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          opacity: 0.75;
        }
        .flag-quiz-timer {
          font-weight: 700;
          color: #fbbf24;
        }
        .flag-quiz-timer.is-urgent {
          color: #ef4444;
          animation: flagPulse 0.7s ease-in-out infinite;
        }
        @keyframes flagPulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        .flag-quiz-card {
          background: rgba(251, 191, 36, 0.05);
          border: 1px solid rgba(251, 191, 36, 0.25);
          border-radius: 18px;
          padding: 28px 20px;
          text-align: center;
        }
        .flag-quiz-flag-img {
          max-width: 220px;
          width: 100%;
          height: auto;
          max-height: 140px;
          object-fit: contain;
          border-radius: 6px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
        }
        .flag-quiz-prompt {
          margin-top: 14px;
          font-size: 13px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          opacity: 0.7;
        }
        .flag-quiz-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .flag-quiz-option {
          padding: 16px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.03);
          color: inherit;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .flag-quiz-option:hover:not(:disabled) {
          border-color: #fbbf24;
          background: rgba(251, 191, 36, 0.08);
        }
        .flag-quiz-option:disabled {
          cursor: default;
        }
        .flag-quiz-option.is-correct {
          border-color: #22c55e;
          background: rgba(34, 197, 94, 0.15);
          color: #86efac;
        }
        .flag-quiz-option.is-wrong {
          border-color: #ef4444;
          background: rgba(239, 68, 68, 0.15);
          color: #fca5a5;
        }
        .flag-quiz-option.is-mine {
          outline: 2px solid rgba(251, 191, 36, 0.4);
          outline-offset: 2px;
        }
        .flag-quiz-scoreline {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          opacity: 0.75;
        }
        .flag-quiz-scoreline strong {
          color: #fbbf24;
        }
        .flag-quiz-notices {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .flag-quiz-notice {
          padding: 10px 14px;
          background: rgba(251, 191, 36, 0.08);
          border-left: 3px solid #fbbf24;
          border-radius: 8px;
          font-size: 13px;
          animation: slideIn 0.25s ease-out;
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .flag-quiz-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </main>
  );
}
