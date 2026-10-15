"use client";

import {
  ArrowLeft,
  Check,
  Copy,
  DoorOpen,
  Key,
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

type HeadType =
  | "circle"
  | "square"
  | "triangle"
  | "diamond"
  | "star"
  | "hexagon"
  | "pentagon"
  | "octagon";

type PartColor =
  | "#fbbf24"
  | "#f59e0b"
  | "#22d3ee"
  | "#06b6d4"
  | "#a3e635"
  | "#84cc16"
  | "#f472b6"
  | "#ec4899";

type ToothSize = "short" | "long";

type GameObject = {
  id: number;
  head: HeadType;
  teeth: boolean[];
  toothSize: ToothSize;
  headColor: PartColor;
  bodyColor: PartColor;
  teethColor: PartColor;
  innerColor: PartColor;
  rotation: number;
};

type RoundPhase = "phase1" | "phase2";

type Round = {
  index: number;
  objectForHost: GameObject;
  objectForGuest: GameObject;
  guessOptionsForHost: GameObject[];
  guessOptionsForGuest: GameObject[];
};

const TOTAL_ROUNDS = 5;
const PHASE_TIME_MS = 15_000;
const START_LIVES = 3;
const ROOM_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const ALL_COLORS: PartColor[] = [
  "#fbbf24",
  "#f59e0b",
  "#22d3ee",
  "#06b6d4",
  "#a3e635",
  "#84cc16",
  "#f472b6",
  "#ec4899",
];

const HEAD_TYPES: HeadType[] = [
  "circle",
  "square",
  "triangle",
  "diamond",
  "star",
  "hexagon",
  "pentagon",
  "octagon",
];

function makeRoomCode() {
  const values = new Uint32Array(6);
  crypto.getRandomValues(values);
  return Array.from(
    values,
    (value) => ROOM_CHARACTERS[value % ROOM_CHARACTERS.length],
  ).join("");
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomTeeth6(): boolean[] {
  const count = 1 + Math.floor(Math.random() * 4);
  const arr = [false, false, false, false, false, false];
  const positions = [0, 1, 2, 3, 4, 5]
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
  for (const p of positions) arr[p] = true;
  return arr;
}

function makeGameObject(id: number): GameObject {
  const colors = [...ALL_COLORS].sort(() => Math.random() - 0.5);
  return {
    id,
    head: pick(HEAD_TYPES),
    teeth: randomTeeth6(),
    toothSize: Math.random() < 0.5 ? "short" : "long",
    headColor: colors[0],
    bodyColor: colors[1],
    teethColor: colors[2],
    innerColor: colors[3],
    rotation: Math.floor(Math.random() * 8),
  };
}

function objectsEqual(a: GameObject, b: GameObject): boolean {
  if (a.head !== b.head) return false;
  if (a.toothSize !== b.toothSize) return false;
  if (a.rotation !== b.rotation) return false;
  if (a.headColor !== b.headColor) return false;
  if (a.bodyColor !== b.bodyColor) return false;
  if (a.teethColor !== b.teethColor) return false;
  if (a.innerColor !== b.innerColor) return false;
  for (let i = 0; i < 6; i += 1) {
    if (a.teeth[i] !== b.teeth[i]) return false;
  }
  return true;
}

function makeDistinctObject(exclude: GameObject[]): GameObject {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const candidate = makeGameObject(0);
    if (exclude.some((e) => objectsEqual(e, candidate))) continue;
    return candidate;
  }
  return makeGameObject(0);
}

function buildRound(roundIndex: number): Round {
  const objectForHost = makeGameObject(0);
  const objectForGuest = makeDistinctObject([objectForHost]);

  const guessOptionsForGuest: GameObject[] = [objectForHost];
  while (guessOptionsForGuest.length < 4) {
    const candidate = makeGameObject(guessOptionsForGuest.length);
    if (objectsEqual(candidate, objectForHost)) continue;
    if (guessOptionsForGuest.some((o) => objectsEqual(o, candidate))) continue;
    guessOptionsForGuest.push(candidate);
  }
  guessOptionsForGuest.sort(() => Math.random() - 0.5);
  guessOptionsForGuest.forEach((o, i) => (o.id = i));

  const guessOptionsForHost: GameObject[] = [objectForGuest];
  while (guessOptionsForHost.length < 4) {
    const candidate = makeGameObject(guessOptionsForHost.length);
    if (objectsEqual(candidate, objectForGuest)) continue;
    if (guessOptionsForHost.some((o) => objectsEqual(o, candidate))) continue;
    guessOptionsForHost.push(candidate);
  }
  guessOptionsForHost.sort(() => Math.random() - 0.5);
  guessOptionsForHost.forEach((o, i) => (o.id = i));

  return {
    index: roundIndex,
    objectForHost,
    objectForGuest,
    guessOptionsForHost,
    guessOptionsForGuest,
  };
}

function findCorrectId(options: GameObject[], target: GameObject): number {
  return options.find((o) => objectsEqual(o, target))?.id ?? -1;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function rotationDeg(rotation: number): number {
  return rotation * 45;
}

function ObjectPreview({ obj, size = 96 }: { obj: GameObject; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const bodyR = size * 0.13;
  const innerR = size * 0.09;
  const toothBaseLen = size * 0.14;
  const toothLen = obj.toothSize === "long" ? toothBaseLen * 1.5 : toothBaseLen;
  const toothW = size * 0.085;
  const headSize = size * 0.18;

  const headStroke = obj.headColor;
  const bodyStroke = obj.bodyColor;
  const teethStroke = obj.teethColor;
  const innerStroke = obj.innerColor;

  const headFill = hexToRgba(obj.headColor, 0.18);
  const bodyFill = hexToRgba(obj.bodyColor, 0.2);
  const innerFill = hexToRgba(obj.innerColor, 0.15);

  const renderHead = () => {
    const common = {
      fill: headFill,
      stroke: headStroke,
      strokeWidth: 3,
    };
    if (obj.head === "circle") {
      return <circle cx={cx} cy={cy} r={headSize} {...common} />;
    }
    if (obj.head === "square") {
      return (
        <rect
          x={cx - headSize}
          y={cy - headSize}
          width={headSize * 2}
          height={headSize * 2}
          rx={4}
          {...common}
        />
      );
    }
    if (obj.head === "triangle") {
      const p = `${cx},${cy - headSize} ${cx + headSize},${cy + headSize * 0.8} ${cx - headSize},${cy + headSize * 0.8}`;
      return <polygon points={p} {...common} />;
    }
    if (obj.head === "diamond") {
      const p = `${cx},${cy - headSize} ${cx + headSize},${cy} ${cx},${cy + headSize} ${cx - headSize},${cy}`;
      return <polygon points={p} {...common} />;
    }
    if (obj.head === "star") {
      const points: string[] = [];
      const outerR = headSize * 1.15;
      const innerR = headSize * 0.5;
      for (let i = 0; i < 10; i += 1) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
      }
      return <polygon points={points.join(" ")} {...common} />;
    }
    if (obj.head === "hexagon") {
      const points: string[] = [];
      for (let i = 0; i < 6; i += 1) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        points.push(
          `${cx + headSize * Math.cos(angle)},${cy + headSize * Math.sin(angle)}`,
        );
      }
      return <polygon points={points.join(" ")} {...common} />;
    }
    if (obj.head === "pentagon") {
      const points: string[] = [];
      for (let i = 0; i < 5; i += 1) {
        const angle = ((2 * Math.PI) / 5) * i - Math.PI / 2;
        points.push(
          `${cx + headSize * Math.cos(angle)},${cy + headSize * Math.sin(angle)}`,
        );
      }
      return <polygon points={points.join(" ")} {...common} />;
    }
    const points: string[] = [];
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI / 4) * i - Math.PI / 2 + Math.PI / 8;
      points.push(
        `${cx + headSize * Math.cos(angle)},${cy + headSize * Math.sin(angle)}`,
      );
    }
    return <polygon points={points.join(" ")} {...common} />;
  };

  const toothAngle = (dir: number): number => {
    return -Math.PI / 2 + (dir * Math.PI) / 3;
  };

  const renderTooth = (dir: number, has: boolean) => {
    if (!has) return null;
    const angle = toothAngle(dir);
    const x1 = cx + Math.cos(angle) * bodyR;
    const y1 = cy + Math.sin(angle) * bodyR;
    const x2 = cx + Math.cos(angle) * (bodyR + toothLen);
    const y2 = cy + Math.sin(angle) * (bodyR + toothLen);
    return (
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={teethStroke}
        strokeWidth={toothW}
        strokeLinecap="round"
      />
    );
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(${rotationDeg(obj.rotation)} ${cx} ${cy})`}>
        <circle
          cx={cx}
          cy={cy}
          r={bodyR}
          fill={bodyFill}
          stroke={bodyStroke}
          strokeWidth={2.5}
        />
        <circle
          cx={cx}
          cy={cy}
          r={innerR}
          fill={innerFill}
          stroke={innerStroke}
          strokeWidth={2}
        />
        {obj.teeth.map((has, i) => (
          <g key={i}>{renderTooth(i, has)}</g>
        ))}
        {renderHead()}
      </g>
    </svg>
  );
}

function describeObject(obj: GameObject): string {
  const headId: Record<HeadType, string> = {
    circle: "Bulat",
    square: "Kotak",
    triangle: "Segitiga",
    diamond: "Belah ketupat",
    star: "Bintang",
    hexagon: "Segi enam",
    pentagon: "Segi lima",
    octagon: "Segi delapan",
  };
  const colorId: Record<PartColor, string> = {
    "#fbbf24": "kuning muda",
    "#f59e0b": "kuning tua",
    "#22d3ee": "cyan muda",
    "#06b6d4": "cyan tua",
    "#a3e635": "hijau muda",
    "#84cc16": "hijau tua",
    "#f472b6": "pink muda",
    "#ec4899": "pink tua",
  };
  const teethDir = [
    "atas",
    "kanan atas",
    "kanan",
    "bawah",
    "kiri bawah",
    "kiri",
  ];
  const teethText = obj.teeth
    .map((has, i) => (has ? teethDir[i] : null))
    .filter(Boolean)
    .join(", ");
  const rotationDegValue = rotationDeg(obj.rotation);
  return [
    `Kepala ${headId[obj.head]} (${colorId[obj.headColor]}).`,
    `Badan (${colorId[obj.bodyColor]}).`,
    `Cincin dalam (${colorId[obj.innerColor]}).`,
    `Gerigi ${obj.toothSize === "long" ? "panjang" : "pendek"} (${colorId[obj.teethColor]}): ${teethText || "tidak ada"}.`,
    `Rotasi ${rotationDegValue}°.`,
  ].join(" ");
}

export default function TwoSides() {
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

  const [roundIndex, setRoundIndex] = useState(0);
  const [roundData, setRoundData] = useState<Round | null>(null);
  const [phaseStep, setPhaseStep] = useState<RoundPhase>("phase1");
  const [myGuess, setMyGuess] = useState<number | null>(null);
  const [peerGuess, setPeerGuess] = useState<number | null>(null);
  const [phaseEndsAt, setPhaseEndsAt] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(PHASE_TIME_MS);
  const [phaseResult, setPhaseResult] = useState<
    "correct" | "wrong" | "timeout" | null
  >(null);
  const [sharedLives, setSharedLives] = useState(START_LIVES);
  const [sharedScore, setSharedScore] = useState(0);
  const [finalStatus, setFinalStatus] = useState<"win" | "lose" | null>(null);
  const [abortReason, setAbortReason] = useState<string | null>(null);

  const myGuessRef = useRef<number | null>(null);
  const roundDataRef = useRef<Round | null>(null);
  const phaseStepRef = useRef<RoundPhase>("phase1");
  const roundIndexRef = useRef(0);
  const phaseRef = useRef<GamePhase>("lobby");

  useEffect(() => {
    myGuessRef.current = myGuess;
  }, [myGuess]);
  useEffect(() => {
    roundDataRef.current = roundData;
  }, [roundData]);
  useEffect(() => {
    phaseStepRef.current = phaseStep;
  }, [phaseStep]);
  useEffect(() => {
    roundIndexRef.current = roundIndex;
  }, [roundIndex]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // ---- Realtime channel ----
  useEffect(() => {
    if (!activeRoom || !supabase || !playerId) return;

    const channel = supabase.channel(`two-sides:${activeRoom}`, {
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
        .sort((left, right) => Number(right.isHost) - Number(left.isHost));
      setPlayers(connected);

      if (phaseRef.current === "playing" && connected.length < 2) {
        setAbortReason("Lawan keluar dari game.");
        setPhase("results");
        setFinalStatus(null);
        setPhaseEndsAt(null);
        void channelRef.current?.send({
          type: "broadcast",
          event: "abort",
          payload: { reason: "Lawan keluar dari game." },
        });
      }
    };

    channel.on("presence", { event: "sync" }, syncFromPresence);
    channel.on("presence", { event: "join" }, syncFromPresence);
    channel.on("presence", { event: "leave" }, syncFromPresence);

    channel.on("broadcast", { event: "game-reset" }, () => {
      setRoundIndex(0);
      setRoundData(null);
      setPhaseStep("phase1");
      setMyGuess(null);
      setPeerGuess(null);
      setPhaseEndsAt(null);
      setPhaseResult(null);
      setSharedLives(START_LIVES);
      setSharedScore(0);
      setFinalStatus(null);
      setAbortReason(null);
      setPhase("lobby");
    });

    channel.on("broadcast", { event: "round-start" }, ({ payload }) => {
      const data = payload as {
        round?: Round;
        roundIndex?: number;
        endsAt?: number;
      };
      if (!data.round || typeof data.roundIndex !== "number") return;
      if (typeof data.endsAt !== "number") return;

      setRoundIndex(data.roundIndex);
      setRoundData(data.round);
      setPhaseStep("phase1");
      setMyGuess(null);
      setPeerGuess(null);
      setPhaseEndsAt(data.endsAt);
      setPhaseResult(null);
      setRemainingMs(PHASE_TIME_MS);
      setPhase("playing");
      setError("");
    });

    channel.on("broadcast", { event: "guess" }, ({ payload }) => {
      const data = payload as { id?: string; choice?: number };
      if (typeof data.id !== "string" || typeof data.choice !== "number")
        return;
      if (data.id === playerId) return;
      setPeerGuess(data.choice);
    });

    channel.on("broadcast", { event: "phase-end" }, ({ payload }) => {
      const data = payload as {
        result?: "correct" | "wrong" | "timeout";
        newScore?: number;
        newLives?: number;
      };
      if (!data.result) return;
      setPhaseResult(data.result);
      if (typeof data.newScore === "number") setSharedScore(data.newScore);
      if (typeof data.newLives === "number") setSharedLives(data.newLives);
      setPhaseEndsAt(null);
    });

    channel.on("broadcast", { event: "phase-advance" }, ({ payload }) => {
      const data = payload as { phase?: RoundPhase; endsAt?: number };
      if (!data.phase || typeof data.endsAt !== "number") return;
      setPhaseStep(data.phase);
      setMyGuess(null);
      setPeerGuess(null);
      setPhaseResult(null);
      setPhaseEndsAt(data.endsAt);
      setRemainingMs(PHASE_TIME_MS);
    });

    channel.on("broadcast", { event: "game-over" }, ({ payload }) => {
      const data = payload as { status?: "win" | "lose" };
      if (!data.status) return;
      setFinalStatus(data.status);
      setPhase("results");
      if (timerRef.current) window.clearInterval(timerRef.current);
    });

    channel.on("broadcast", { event: "abort" }, ({ payload }) => {
      const data = payload as { reason?: string };
      setAbortReason(data.reason ?? "Game dihentikan.");
      setPhase("results");
      setFinalStatus(null);
      setPhaseEndsAt(null);
      if (timerRef.current) window.clearInterval(timerRef.current);
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
    if (phase !== "playing" || phaseEndsAt === null) return;

    const timer = setInterval(() => {
      const next = Math.max(0, phaseEndsAt - Date.now());
      setRemainingMs(next);
      if (next === 0 && isHost) {
        resolvePhase("timeout");
      }
    }, 80);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, phaseEndsAt, isHost]);

  // ---- Host resolve when guess is in ----
  useEffect(() => {
    if (!isHost) return;
    if (phase !== "playing") return;
    if (phaseResult !== null) return;
    const round = roundDataRef.current;
    if (!round) return;

    if (phaseStepRef.current === "phase1") {
      if (peerGuess === null) return;
      const correctId = findCorrectId(
        round.guessOptionsForGuest,
        round.objectForHost,
      );
      const correct = peerGuess === correctId;
      resolvePhase(correct ? "correct" : "wrong");
    } else {
      if (myGuess === null) return;
      const correctId = findCorrectId(
        round.guessOptionsForHost,
        round.objectForGuest,
      );
      const correct = myGuess === correctId;
      resolvePhase(correct ? "correct" : "wrong");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, myGuess, peerGuess, phase, phaseResult, phaseStep]);

  // ---- Auto advance ----
  useEffect(() => {
    if (!isHost) return;
    if (phase !== "playing") return;
    if (phaseResult === null) return;

    const timer = setTimeout(() => {
      if (sharedLives <= 0) {
        setFinalStatus("lose");
        setPhase("results");
        void channelRef.current?.send({
          type: "broadcast",
          event: "game-over",
          payload: { status: "lose" },
        });
        return;
      }

      if (phaseStepRef.current === "phase1") {
        const endsAt = Date.now() + PHASE_TIME_MS;
        setPhaseStep("phase2");
        setMyGuess(null);
        setPeerGuess(null);
        setPhaseResult(null);
        setPhaseEndsAt(endsAt);
        setRemainingMs(PHASE_TIME_MS);
        void channelRef.current?.send({
          type: "broadcast",
          event: "phase-advance",
          payload: { phase: "phase2", endsAt },
        });
        return;
      }

      const nextIndex = roundIndexRef.current + 1;
      if (nextIndex >= TOTAL_ROUNDS) {
        setFinalStatus("win");
        setPhase("results");
        void channelRef.current?.send({
          type: "broadcast",
          event: "game-over",
          payload: { status: "win" },
        });
        return;
      }
      broadcastNewRound(nextIndex);
    }, 1800);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseResult, isHost, phase, sharedLives]);

  const broadcastNewRound = (index: number) => {
    const round = buildRound(index);
    const endsAt = Date.now() + PHASE_TIME_MS;

    setRoundIndex(index);
    setRoundData(round);
    setPhaseStep("phase1");
    setMyGuess(null);
    setPeerGuess(null);
    setPhaseEndsAt(endsAt);
    setPhaseResult(null);
    setRemainingMs(PHASE_TIME_MS);
    setPhase("playing");

    void channelRef.current?.send({
      type: "broadcast",
      event: "round-start",
      payload: { round, roundIndex: index, endsAt },
    });
  };

  const resolvePhase = (result: "correct" | "wrong" | "timeout") => {
    if (!isHost) return;
    if (phaseResult !== null) return;

    let newScore = sharedScore;
    let newLives = sharedLives;

    if (result === "correct") {
      newScore = sharedScore + 1;
    } else {
      newLives = sharedLives - 1;
    }

    setPhaseResult(result);
    setSharedScore(newScore);
    setSharedLives(newLives);
    setPhaseEndsAt(null);

    void channelRef.current?.send({
      type: "broadcast",
      event: "phase-end",
      payload: { result, newScore, newLives },
    });
  };

  // ---- Preflight: cek jumlah pemain di room ----
  const peekRoomPlayerCount = async (roomCode: string): Promise<number> => {
    if (!supabase) return 0;
    const peekKey = "peek-" + crypto.randomUUID();
    const peekChannel = supabase.channel(`two-sides:${roomCode}`, {
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
      // Safety timeout
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
        if (count >= 2) {
          setError("Room sudah penuh (maks 2 pemain).");
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
      setRoundIndex(0);
      setRoundData(null);
      setPhaseStep("phase1");
      setMyGuess(null);
      setPeerGuess(null);
      setPhaseResult(null);
      setSharedLives(START_LIVES);
      setSharedScore(0);
      setFinalStatus(null);
      setAbortReason(null);
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

    setRoundIndex(0);
    setRoundData(null);
    setPhaseStep("phase1");
    setMyGuess(null);
    setPeerGuess(null);
    setPhaseResult(null);
    setSharedLives(START_LIVES);
    setSharedScore(0);
    setFinalStatus(null);
    setAbortReason(null);
    broadcastNewRound(0);
  };

  const pickGuess = (id: number) => {
    if (phase !== "playing") return;
    if (myGuessRef.current !== null) return;
    if (!roundData) return;
    if (phaseResult !== null) return;

    setMyGuess(id);
    void channelRef.current?.send({
      type: "broadcast",
      event: "guess",
      payload: { id: playerId, choice: id },
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
    setRoundIndex(0);
    setRoundData(null);
    setPhaseStep("phase1");
    setMyGuess(null);
    setPeerGuess(null);
    setPhaseResult(null);
    setSharedLives(START_LIVES);
    setSharedScore(0);
    setFinalStatus(null);
    setAbortReason(null);
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

  const iAmDescriber =
    (phaseStep === "phase1" && isHost) || (phaseStep === "phase2" && !isHost);

  const mySecretObject = isHost
    ? roundData?.objectForHost
    : roundData?.objectForGuest;

  const myGuessOptions = isHost
    ? roundData?.guessOptionsForHost
    : roundData?.guessOptionsForGuest;

  return (
    <main className="tap-rush-shell">
      <div className="tap-rush-topbar">
        <Link href="/game" className="tap-rush-back">
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Semua game</span>
        </Link>
        <span className="tap-rush-season">CO-OP / 01</span>
      </div>

      <section className="tap-rush-layout">
        <header className="tap-rush-heading">
          <div className="tap-rush-kicker">
            <Key size={14} /> REALTIME CO-OP PUZZLE
          </div>
          <h1>
            Two Sides<span>!</span>
          </h1>
          <p>
            Gantian! Satu orang deskripsikan objek, satu orang tebak. Lalu tukar
            peran.
          </p>
        </header>

        {!activeRoom ? (
          <section className="tap-rush-lobby">
            <div className="tap-rush-intro">
              <div className="tap-rush-orb" aria-hidden="true">
                <Key size={30} />
              </div>
              <div>
                <h2>Butuh 2 pemain, kerja sama wajib</h2>
                <p>
                  Gantian: kamu deskripsikan objekmu, teman menebak. Lalu tukar
                  — teman deskripsikan, kamu menebak.
                </p>
              </div>
            </div>

            <label className="tap-rush-label" htmlFor="two-sides-name">
              NAMA PEMAIN
            </label>
            <input
              id="two-sides-name"
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

            <p className="two-sides-role-note">
              Fase 1: Host deskripsikan, Guest tebak · Fase 2: gantian
            </p>

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
                        : players.length > 2
                          ? "Room penuh (maks 2)"
                          : guestsReady
                            ? "Mulai co-op"
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

            {phase === "playing" &&
              roundData &&
              (iAmDescriber ? mySecretObject : myGuessOptions) && (
                <div className="two-sides-wrap">
                  <div className="two-sides-topbar">
                    <span className="two-sides-round">
                      RONDE {roundIndex + 1} / {TOTAL_ROUNDS} ·{" "}
                      {phaseStep === "phase1" ? "FASE 1" : "FASE 2"}
                    </span>
                    <span
                      className={`two-sides-timer ${secondsLeft <= 5 ? "is-urgent" : ""}`}
                    >
                      {String(secondsLeft).padStart(2, "0")}s
                    </span>
                  </div>

                  <div className="two-sides-stats">
                    <span>
                      ❤️ <strong>{sharedLives}</strong> nyawa
                    </span>
                    <span>
                      ⭐ <strong>{sharedScore}</strong> poin
                    </span>
                  </div>

                  <div
                    className={`two-sides-badge ${iAmDescriber ? "is-describer" : "is-guesser"}`}
                  >
                    {iAmDescriber
                      ? "PERAN KAMU: DESKRIPSIKAN"
                      : "PERAN KAMU: TEBAK"}
                  </div>

                  <p className="two-sides-hint">
                    {iAmDescriber
                      ? "Lihat objek rahasia kamu, deskripsikan ke teman — sebutkan bentuk kepala, warna tiap bagian, posisi & ukuran gerigi, dan rotasi."
                      : "Dengarkan deskripsi temanmu dengan teliti, lalu pilih salah satu dari 4 objek di bawah."}
                  </p>

                  {iAmDescriber && mySecretObject && (
                    <div className="two-sides-preview">
                      <span className="two-sides-preview-label">
                        OBJEK RAHASIA KAMU
                      </span>
                      <ObjectPreview obj={mySecretObject} size={180} />
                      <span className="two-sides-preview-desc">
                        {describeObject(mySecretObject)}
                      </span>
                    </div>
                  )}

                  {!iAmDescriber && myGuessOptions && (
                    <>
                      <p className="two-sides-pick-label">PILIH JAWABANMU</p>
                      <div className="two-sides-options-grid">
                        {myGuessOptions.map((opt) => {
                          const isMyPick = myGuess === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              className={`two-sides-option ${isMyPick ? "is-picked" : ""}`}
                              disabled={
                                myGuess !== null || phaseResult !== null
                              }
                              onClick={() => pickGuess(opt.id)}
                            >
                              <ObjectPreview obj={opt} size={86} />
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {phaseResult && (
                    <div
                      className={`two-sides-result ${phaseResult === "correct" ? "is-correct" : "is-wrong"}`}
                    >
                      {phaseResult === "correct"
                        ? "✅ Benar! +1 poin"
                        : phaseResult === "wrong"
                          ? "❌ Salah! -1 nyawa"
                          : "⏱️ Waktu habis! -1 nyawa"}
                    </div>
                  )}
                </div>
              )}

            {phase === "results" && (
              <div className="tap-rush-results">
                <div className="tap-rush-finish-mark">FINISH</div>
                <h2>
                  {abortReason
                    ? "Game dihentikan"
                    : finalStatus === "win"
                      ? "Kalian berhasil! 🏆"
                      : "Kalah… coba lagi!"}
                </h2>
                {abortReason && (
                  <p className="tap-rush-arena-prompt">{abortReason}</p>
                )}
                {!abortReason && (
                  <>
                    <p className="tap-rush-arena-prompt">
                      Skor akhir: <strong>{sharedScore}</strong> /{" "}
                      {TOTAL_ROUNDS}
                    </p>
                    <p className="tap-rush-arena-prompt">
                      Nyawa tersisa: <strong>{sharedLives}</strong>
                    </p>
                  </>
                )}
                <div className="tap-rush-lobby-footer">
                  {isHost && !abortReason && (
                    <button
                      className="tap-rush-primary"
                      type="button"
                      disabled={!canStart}
                      onClick={startGame}
                    >
                      <Rocket size={17} /> Main lagi
                    </button>
                  )}
                  {!isHost && !abortReason && (
                    <span className="tap-rush-waiting-host">
                      Host yang memulai ronde berikutnya
                    </span>
                  )}
                  {abortReason && (
                    <span className="tap-rush-waiting-host">
                      Tunggu host atau keluar untuk cari teman baru
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
          <span>CO-OP 2 PEMAIN</span>
          <span>3 NYAWA</span>
          <span>KOMUNIKASI WAJIB</span>
        </footer>
      </section>

      <style jsx>{`
        .two-sides-role-note {
          font-size: 12px;
          opacity: 0.6;
          text-align: center;
          letter-spacing: 0.04em;
          line-height: 1.5;
          margin-top: 4px;
        }
        .two-sides-wrap {
          display: flex;
          flex-direction: column;
          gap: 14px;
          align-items: center;
          width: 100%;
        }
        .two-sides-topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          font-size: 12px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          opacity: 0.8;
        }
        .two-sides-timer {
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .two-sides-timer.is-urgent {
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.5);
          animation: pulse 0.8s infinite;
        }
        @keyframes pulse {
          50% {
            opacity: 0.5;
          }
        }
        .two-sides-stats {
          display: flex;
          gap: 16px;
          font-size: 13px;
          letter-spacing: 0.06em;
        }
        .two-sides-stats strong {
          color: #fbbf24;
          font-size: 15px;
        }
        .two-sides-badge {
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          border: 1px solid;
        }
        .two-sides-badge.is-describer {
          background: rgba(251, 191, 36, 0.12);
          border-color: rgba(251, 191, 36, 0.5);
          color: #fbbf24;
        }
        .two-sides-badge.is-guesser {
          background: rgba(34, 197, 94, 0.12);
          border-color: rgba(34, 197, 94, 0.5);
          color: #86efac;
        }
        .two-sides-hint {
          font-size: 12px;
          opacity: 0.65;
          text-align: center;
          letter-spacing: 0.04em;
          max-width: 340px;
          line-height: 1.5;
        }
        .two-sides-pick-label {
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          opacity: 0.7;
          margin-top: 4px;
        }
        .two-sides-preview {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 18px 24px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          width: 100%;
          max-width: 360px;
        }
        .two-sides-preview-label {
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          opacity: 0.65;
          text-align: center;
        }
        .two-sides-preview-desc {
          font-size: 12px;
          opacity: 0.8;
          max-width: 320px;
          text-align: center;
          line-height: 1.5;
        }
        .two-sides-options-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          width: 100%;
          max-width: 360px;
        }
        .two-sides-option {
          padding: 12px;
          border-radius: 14px;
          border: 2px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.03);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          aspect-ratio: 1 / 1;
          transition: all 120ms ease;
          -webkit-tap-highlight-color: transparent;
        }
        .two-sides-option:active:not(:disabled) {
          transform: scale(0.96);
        }
        .two-sides-option:disabled {
          cursor: default;
        }
        .two-sides-option.is-picked {
          border-color: #fbbf24;
          background: rgba(251, 191, 36, 0.15);
          box-shadow: 0 0 20px rgba(251, 191, 36, 0.3);
        }
        .two-sides-result {
          padding: 10px 18px;
          border-radius: 12px;
          font-size: 14px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 700;
        }
        .two-sides-result.is-correct {
          background: rgba(34, 197, 94, 0.15);
          border: 1px solid rgba(34, 197, 94, 0.5);
          color: #86efac;
        }
        .two-sides-result.is-wrong {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.5);
          color: #fca5a5;
        }
      `}</style>
    </main>
  );
}
