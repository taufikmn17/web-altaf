"use client";

import {
  ArrowLeft,
  Check,
  Copy,
  DoorOpen,
  PawPrint,
  Radio,
  Snowflake,
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

type Vec = { x: number; y: number };

type PlayerPos = {
  id: string;
  x: number;
  y: number;
};

const COLS = 18;
const ROWS = 18;
const ROUND_TIME_MS = 30_000;
const CAT_TICK_MS = 110;
const MOUSE_TICK_MS = 160;
const TOTAL_ROUNDS = 5;
const FREEZE_DURATION_MS = 2000;
const ROOM_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateMaze(): number[][] {
  const grid: number[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => 1),
  );

  const visited = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => false),
  );

  const stack: Vec[] = [];
  grid[1][1] = 0;
  visited[1][1] = true;
  stack.push({ x: 1, y: 1 });

  const dirs: Vec[] = [
    { x: 0, y: -2 },
    { x: 0, y: 2 },
    { x: -2, y: 0 },
    { x: 2, y: 0 },
  ];

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors = dirs
      .map((d) => ({ x: current.x + d.x, y: current.y + d.y, d }))
      .filter(
        (n) =>
          n.x > 0 &&
          n.y > 0 &&
          n.x < COLS - 1 &&
          n.y < ROWS - 1 &&
          !visited[n.y][n.x],
      );

    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }

    const chosen = neighbors[Math.floor(Math.random() * neighbors.length)];
    const wallX = current.x + chosen.d.x / 2;
    const wallY = current.y + chosen.d.y / 2;
    grid[wallY][wallX] = 0;
    grid[chosen.y][chosen.x] = 0;
    visited[chosen.y][chosen.x] = true;
    stack.push({ x: chosen.x, y: chosen.y });
  }

  // Buka beberapa dinding tambahan biar ada loop
  for (let y = 1; y < ROWS - 1; y += 1) {
    for (let x = 1; x < COLS - 1; x += 1) {
      if (grid[y][x] === 1) {
        const isHorizontalWall =
          grid[y - 1]?.[x] === 0 && grid[y + 1]?.[x] === 0;
        const isVerticalWall = grid[y]?.[x - 1] === 0 && grid[y]?.[x + 1] === 0;
        if ((isHorizontalWall || isVerticalWall) && Math.random() < 0.15) {
          grid[y][x] = 0;
        }
      }
    }
  }

  for (let i = 0; i < COLS; i += 1) {
    grid[0][i] = 1;
    grid[ROWS - 1][i] = 1;
  }
  for (let i = 0; i < ROWS; i += 1) {
    grid[i][0] = 1;
    grid[i][COLS - 1] = 1;
  }

  return grid;
}

function findStartPos(
  maze: number[][],
  prefer: "top-left" | "bottom-right",
): Vec {
  const positions: Vec[] = [];
  for (let y = 1; y < ROWS - 1; y += 1) {
    for (let x = 1; x < COLS - 1; x += 1) {
      if (maze[y][x] === 0) positions.push({ x, y });
    }
  }
  if (positions.length === 0) return { x: 1, y: 1 };

  if (prefer === "top-left") {
    positions.sort((a, b) => a.x + a.y - (b.x + b.y));
  } else {
    positions.sort((a, b) => b.x + b.y - (a.x + a.y));
  }
  return positions[0];
}

function makeRoomCode() {
  const values = new Uint32Array(6);
  crypto.getRandomValues(values);
  return Array.from(
    values,
    (value) => ROOM_CHARACTERS[value % ROOM_CHARACTERS.length],
  ).join("");
}

function isWall(maze: number[][], x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return true;
  return maze[y][x] === 1;
}

function directionFromKey(key: string): Vec | null {
  switch (key.toLowerCase()) {
    case "arrowup":
    case "w":
      return { x: 0, y: -1 };
    case "arrowdown":
    case "s":
      return { x: 0, y: 1 };
    case "arrowleft":
    case "a":
      return { x: -1, y: 0 };
    case "arrowright":
    case "d":
      return { x: 1, y: 0 };
    default:
      return null;
  }
}

export default function CatMouse() {
  const supabase = getSupabaseBrowserClient();
  const [playerId, setPlayerId] = useState("");
  const channelRef = useRef<RealtimeChannel | null>(null);
  const catLoopRef = useRef<number | null>(null);
  const mouseLoopRef = useRef<number | null>(null);

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
  const [maze, setMaze] = useState<number[][]>([]);
  const [myPos, setMyPos] = useState<Vec | null>(null);
  const [peerPos, setPeerPos] = useState<Vec | null>(null);
  const [roundEndsAt, setRoundEndsAt] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(ROUND_TIME_MS);
  const [roundWinner, setRoundWinner] = useState<"cat" | "mouse" | null>(null);
  const [scores, setScores] = useState<{
    catScore: number;
    mouseScore: number;
  }>({ catScore: 0, mouseScore: 0 });

  const [catFrozenUntil, setCatFrozenUntil] = useState<number>(0);
  const [freezeUsedThisRound, setFreezeUsedThisRound] = useState(false);
  const [freezeNoticeUntil, setFreezeNoticeUntil] = useState<number>(0);
  const [now, setNow] = useState(Date.now());

  const myPosRef = useRef<Vec | null>(null);
  const peerPosRef = useRef<Vec | null>(null);
  const mazeRef = useRef<number[][]>([]);
  const dirQueueRef = useRef<Vec[]>([]);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const phaseRef = useRef<GamePhase>("lobby");
  const catFrozenUntilRef = useRef<number>(0);
  const freezeUsedRef = useRef(false);
  const roundWinnerRef = useRef<"cat" | "mouse" | null>(null);

  useEffect(() => {
    myPosRef.current = myPos;
  }, [myPos]);
  useEffect(() => {
    peerPosRef.current = peerPos;
  }, [peerPos]);
  useEffect(() => {
    mazeRef.current = maze;
  }, [maze]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    freezeUsedRef.current = freezeUsedThisRound;
  }, [freezeUsedThisRound]);
  useEffect(() => {
    roundWinnerRef.current = roundWinner;
  }, [roundWinner]);

  // Re-render setiap 100ms buat update freeze timer di UI
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);

  const pushDir = (dir: Vec) => {
    const queue = dirQueueRef.current;
    if (queue.length > 2) return;
    queue.push(dir);
  };

  // ---- Realtime channel ----
  useEffect(() => {
    if (!activeRoom || !supabase || !playerId) return;

    const channel = supabase.channel(`cat-mouse:${activeRoom}`, {
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
    };

    channel.on("presence", { event: "sync" }, syncFromPresence);
    channel.on("presence", { event: "join" }, syncFromPresence);
    channel.on("presence", { event: "leave" }, syncFromPresence);

    channel.on("broadcast", { event: "game-reset" }, () => {
      setRoundIndex(0);
      setMaze([]);
      setMyPos(null);
      setPeerPos(null);
      setRoundEndsAt(null);
      setRoundWinner(null);
      setScores({ catScore: 0, mouseScore: 0 });
      setCatFrozenUntil(0);
      catFrozenUntilRef.current = 0;
      setFreezeUsedThisRound(false);
      freezeUsedRef.current = false;
      setPhase("lobby");
      dirQueueRef.current = [];
    });

    channel.on("broadcast", { event: "round-start" }, ({ payload }) => {
      const data = payload as {
        roundIndex?: number;
        endsAt?: number;
        hostId?: string;
        guestId?: string;
        maze?: number[][];
      };
      if (
        typeof data.roundIndex !== "number" ||
        typeof data.endsAt !== "number" ||
        !data.maze
      )
        return;

      const newMaze = data.maze;
      const catStart = findStartPos(newMaze, "top-left");
      const mouseStart = findStartPos(newMaze, "bottom-right");

      const iAmHost = data.hostId === playerId;
      setMaze(newMaze);
      mazeRef.current = newMaze;
      setRoundIndex(data.roundIndex);
      setMyPos(iAmHost ? { ...catStart } : { ...mouseStart });
      setPeerPos(iAmHost ? { ...mouseStart } : { ...catStart });
      setRoundEndsAt(data.endsAt);
      setRoundWinner(null);
      setRemainingMs(ROUND_TIME_MS);
      setCatFrozenUntil(0);
      catFrozenUntilRef.current = 0;
      setFreezeUsedThisRound(false);
      freezeUsedRef.current = false;
      setPhase("playing");
      setError("");
      dirQueueRef.current = [];
    });

    channel.on("broadcast", { event: "state" }, ({ payload }) => {
      const data = payload as PlayerPos;
      if (!data.id || data.id === playerId) return;
      setPeerPos({ x: data.x, y: data.y });
    });

    channel.on("broadcast", { event: "freeze" }, ({ payload }) => {
      const data = payload as { durationMs?: number };
      const duration = data.durationMs ?? FREEZE_DURATION_MS;
      const until = Date.now() + duration;
      catFrozenUntilRef.current = until;
      setCatFrozenUntil(until);
      setFreezeNoticeUntil(until);
    });

    channel.on("broadcast", { event: "round-end" }, ({ payload }) => {
      const data = payload as {
        winner?: "cat" | "mouse" | null;
        catScore?: number;
        mouseScore?: number;
      };
      setRoundWinner(data.winner ?? null);
      setRoundEndsAt(null);
      if (
        typeof data.catScore === "number" &&
        typeof data.mouseScore === "number"
      ) {
        setScores({ catScore: data.catScore, mouseScore: data.mouseScore });
      }
    });

    channel.on("broadcast", { event: "round-advance" }, ({ payload }) => {
      const data = payload as {
        roundIndex?: number;
        endsAt?: number;
        hostId?: string;
        guestId?: string;
        maze?: number[][];
      };
      if (
        typeof data.roundIndex !== "number" ||
        typeof data.endsAt !== "number" ||
        !data.maze
      )
        return;

      const newMaze = data.maze;
      const catStart = findStartPos(newMaze, "top-left");
      const mouseStart = findStartPos(newMaze, "bottom-right");

      const iAmHost = data.hostId === playerId;
      setMaze(newMaze);
      mazeRef.current = newMaze;
      setRoundIndex(data.roundIndex);
      setMyPos(iAmHost ? { ...catStart } : { ...mouseStart });
      setPeerPos(iAmHost ? { ...mouseStart } : { ...catStart });
      setRoundEndsAt(data.endsAt);
      setRoundWinner(null);
      setRemainingMs(ROUND_TIME_MS);
      setCatFrozenUntil(0);
      catFrozenUntilRef.current = 0;
      setFreezeUsedThisRound(false);
      freezeUsedRef.current = false;
      dirQueueRef.current = [];
    });

    channel.on("broadcast", { event: "game-over" }, () => {
      setPhase("results");
      if (catLoopRef.current) window.clearTimeout(catLoopRef.current);
      if (mouseLoopRef.current) window.clearTimeout(mouseLoopRef.current);
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

  // ---- Keyboard input ----
  useEffect(() => {
    if (phase !== "playing" || roundWinner !== null) return;
    const handler = (event: KeyboardEvent) => {
      const dir = directionFromKey(event.key);
      if (!dir) return;
      event.preventDefault();
      pushDir(dir);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, roundWinner]);

  // ---- Game loop ----
  useEffect(() => {
    if (phase !== "playing") return;
    if (roundWinner !== null) return;
    if (!myPos) return;
    if (maze.length === 0) return;

    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const currentPos = myPosRef.current;
      if (!currentPos) return;
      if (phaseRef.current !== "playing") return;
      if (roundWinnerRef.current !== null) return;

      // Kalau kucing lagi freeze → skip gerak, tapi tetap loop
      if (isHost && Date.now() < catFrozenUntilRef.current) {
        catLoopRef.current = window.setTimeout(tick, 50);
        return;
      }

      let dir: Vec | null = null;
      while (dirQueueRef.current.length > 0) {
        const candidate = dirQueueRef.current.shift()!;
        if (
          isWall(
            mazeRef.current,
            currentPos.x + candidate.x,
            currentPos.y + candidate.y,
          )
        )
          continue;
        dir = candidate;
        break;
      }

      if (dir) {
        const next = {
          x: currentPos.x + dir.x,
          y: currentPos.y + dir.y,
        };
        if (!isWall(mazeRef.current, next.x, next.y)) {
          setMyPos(next);
          myPosRef.current = next;
          void channelRef.current?.send({
            type: "broadcast",
            event: "state",
            payload: { id: playerId, x: next.x, y: next.y },
          });
        }
      }

      const interval = isHost ? CAT_TICK_MS : MOUSE_TICK_MS;
      if (isHost) {
        catLoopRef.current = window.setTimeout(tick, interval);
      } else {
        mouseLoopRef.current = window.setTimeout(tick, interval);
      }
    };

    const interval = isHost ? CAT_TICK_MS : MOUSE_TICK_MS;
    if (isHost) {
      catLoopRef.current = window.setTimeout(tick, interval);
    } else {
      mouseLoopRef.current = window.setTimeout(tick, interval);
    }

    return () => {
      cancelled = true;
      if (catLoopRef.current) window.clearTimeout(catLoopRef.current);
      if (mouseLoopRef.current) window.clearTimeout(mouseLoopRef.current);
    };
  }, [phase, isHost, myPos, roundWinner, playerId, maze]);

  // ---- Cek tabrakan ----
  useEffect(() => {
    if (!isHost) return;
    if (phase !== "playing") return;
    if (roundWinner !== null) return;
    const cat = myPos;
    const mouse = peerPos;
    if (!cat || !mouse) return;

    const dx = Math.abs(cat.x - mouse.x);
    const dy = Math.abs(cat.y - mouse.y);
    if (dx <= 1 && dy <= 1 && dx + dy <= 1) {
      const newCat = scores.catScore + 1;
      const newMouse = scores.mouseScore;
      setScores({ catScore: newCat, mouseScore: newMouse });
      setRoundWinner("cat");
      setRoundEndsAt(null);
      void channelRef.current?.send({
        type: "broadcast",
        event: "round-end",
        payload: {
          winner: "cat",
          catScore: newCat,
          mouseScore: newMouse,
        },
      });
    }
  }, [isHost, phase, myPos, peerPos, roundWinner, scores]);

  // ---- Timer countdown ----
  useEffect(() => {
    if (phase !== "playing" || roundEndsAt === null) return;

    const timer = setInterval(() => {
      const next = Math.max(0, roundEndsAt - Date.now());
      setRemainingMs(next);
      if (next === 0 && isHost) {
        const newCat = scores.catScore;
        const newMouse = scores.mouseScore + 1;
        setScores({ catScore: newCat, mouseScore: newMouse });
        setRoundWinner("mouse");
        setRoundEndsAt(null);
        void channelRef.current?.send({
          type: "broadcast",
          event: "round-end",
          payload: {
            winner: "mouse",
            catScore: newCat,
            mouseScore: newMouse,
          },
        });
      }
    }, 80);

    return () => clearInterval(timer);
  }, [phase, roundEndsAt, isHost, scores]);

  // ---- Auto-advance ----
  useEffect(() => {
    if (!isHost) return;
    if (phase !== "playing") return;
    if (roundWinner === null) return;

    const timer = setTimeout(() => {
      const nextRound = roundIndex + 1;
      if (nextRound > TOTAL_ROUNDS) {
        void channelRef.current?.send({
          type: "broadcast",
          event: "game-over",
          payload: {},
        });
        setPhase("results");
        return;
      }

      const newMaze = generateMaze();
      const catStart = findStartPos(newMaze, "top-left");
      const mouseStart = findStartPos(newMaze, "bottom-right");
      const endsAt = Date.now() + ROUND_TIME_MS;
      const hostId = playerId;
      const guest = players.find((p) => !p.isHost);
      if (!guest) return;

      setMaze(newMaze);
      mazeRef.current = newMaze;
      setRoundIndex(nextRound);
      setMyPos({ ...catStart });
      setPeerPos({ ...mouseStart });
      setRoundEndsAt(endsAt);
      setRoundWinner(null);
      setRemainingMs(ROUND_TIME_MS);
      setCatFrozenUntil(0);
      catFrozenUntilRef.current = 0;
      setFreezeUsedThisRound(false);
      freezeUsedRef.current = false;
      dirQueueRef.current = [];

      void channelRef.current?.send({
        type: "broadcast",
        event: "round-advance",
        payload: {
          roundIndex: nextRound,
          endsAt,
          hostId,
          guestId: guest.id,
          maze: newMaze,
        },
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, [phase, roundWinner, isHost, roundIndex, playerId, players]);

  // ---- Touch ----
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    touchStartRef.current = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      pushDir({ x: dx > 0 ? 1 : -1, y: 0 });
    } else {
      pushDir({ x: 0, y: dy > 0 ? 1 : -1 });
    }
  };

  // ---- Freeze action ----
  const handleFreeze = () => {
    if (isHost) return;
    if (phase !== "playing") return;
    if (roundWinner !== null) return;
    if (freezeUsedRef.current) return;

    setFreezeUsedThisRound(true);
    freezeUsedRef.current = true;

    void channelRef.current?.send({
      type: "broadcast",
      event: "freeze",
      payload: { durationMs: FREEZE_DURATION_MS },
    });
  };

  // ---- Preflight ----
  const peekRoomPlayerCount = async (roomCode: string): Promise<number> => {
    if (!supabase) return 0;
    const peekKey = "peek-" + crypto.randomUUID();
    const peekChannel = supabase.channel(`cat-mouse:${roomCode}`, {
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
        if (count >= 2) {
          setError("Room sudah penuh (maks 2 pemain).");
          setJoiningRoom(false);
          return;
        }
      }

      setPlayerId(crypto.randomUUID());
      setPlayers([]);
      setPhase("lobby");
      setRoundIndex(0);
      setMaze([]);
      setMyPos(null);
      setPeerPos(null);
      setRoundEndsAt(null);
      setRoundWinner(null);
      setScores({ catScore: 0, mouseScore: 0 });
      setCatFrozenUntil(0);
      catFrozenUntilRef.current = 0;
      setFreezeUsedThisRound(false);
      freezeUsedRef.current = false;
      setIsReady(host);
      setIsHost(host);
      setActiveRoom(roomCode);
      dirQueueRef.current = [];
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

    const hostId = playerId;
    const guest = players.find((p) => !p.isHost);
    if (!guest) return;

    void channelRef.current?.send({
      type: "broadcast",
      event: "game-reset",
      payload: {},
    });

    const newMaze = generateMaze();
    const catStart = findStartPos(newMaze, "top-left");
    const mouseStart = findStartPos(newMaze, "bottom-right");
    const endsAt = Date.now() + ROUND_TIME_MS;

    setMaze(newMaze);
    mazeRef.current = newMaze;
    setRoundIndex(1);
    setMyPos({ ...catStart });
    setPeerPos({ ...mouseStart });
    setRoundEndsAt(endsAt);
    setRoundWinner(null);
    setRemainingMs(ROUND_TIME_MS);
    setScores({ catScore: 0, mouseScore: 0 });
    setCatFrozenUntil(0);
    catFrozenUntilRef.current = 0;
    setFreezeUsedThisRound(false);
    freezeUsedRef.current = false;
    setPhase("playing");
    dirQueueRef.current = [];

    void channelRef.current?.send({
      type: "broadcast",
      event: "round-start",
      payload: {
        roundIndex: 1,
        endsAt,
        hostId,
        guestId: guest.id,
        maze: newMaze,
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
    setRoundIndex(0);
    setMaze([]);
    setMyPos(null);
    setPeerPos(null);
    setRoundEndsAt(null);
    setRoundWinner(null);
    setScores({ catScore: 0, mouseScore: 0 });
    setCatFrozenUntil(0);
    catFrozenUntilRef.current = 0;
    setFreezeUsedThisRound(false);
    freezeUsedRef.current = false;
    setError("");
    dirQueueRef.current = [];
  };

  const guestsReady = players.filter((p) => !p.isHost).every((p) => p.ready);
  const canStart =
    isHost &&
    players.length === 2 &&
    guestsReady &&
    isConnected &&
    !joiningRoom;
  const secondsLeft = Math.ceil(remainingMs / 1000);

  const myRole: "cat" | "mouse" = isHost ? "cat" : "mouse";
  const myName = players.find((p) => p.id === playerId)?.name ?? "Kamu";
  const peerName = players.find((p) => p.id !== playerId)?.name ?? "Lawan";

  // Cek freeze pakai `now` biar re-render berkala
  const catIsFrozen = isHost && phase === "playing" && now < catFrozenUntil;
  const freezeNoticeActive = now < freezeNoticeUntil;

  return (
    <main className="tap-rush-shell">
      <div className="tap-rush-topbar">
        <Link href="/game" className="tap-rush-back">
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Semua game</span>
        </Link>
        <span className="tap-rush-season">ONLINE DUEL / 07</span>
      </div>

      <section className="tap-rush-layout">
        <header className="tap-rush-heading">
          <div className="tap-rush-kicker">
            <PawPrint size={14} /> REALTIME CAT & MOUSE
          </div>
          <h1>
            Cat & Mouse<span>!</span>
          </h1>
          <p>
            Satu jadi kucing (kejar), satu jadi tikus (kabur). Peta berubah tiap
            ronde — tikus punya 1x freeze!
          </p>
        </header>

        {!activeRoom ? (
          <section className="tap-rush-lobby">
            <div className="tap-rush-intro">
              <div className="tap-rush-orb" aria-hidden="true">
                <PawPrint size={30} />
              </div>
              <div>
                <h2>Bikin room, tantang teman</h2>
                <p>
                  Host jadi KUCING (pengejar), Guest jadi TIKUS (kabur). Peta
                  berubah tiap ronde + tikus punya 1x freeze!
                </p>
              </div>
            </div>

            <label className="tap-rush-label" htmlFor="cat-mouse-name">
              NAMA PEMAIN
            </label>
            <input
              id="cat-mouse-name"
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
                <PawPrint size={17} /> Buat room (Kucing)
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
                  {joiningRoom ? "Cek room…" : "Gabung (Tikus)"}
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
                        <span
                          className={
                            p.isHost ? "tap-rush-host" : "tap-rush-ready"
                          }
                        >
                          {p.isHost ? "KUCING" : "TIKUS"}
                        </span>
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
                      <PawPrint size={17} />{" "}
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

            {phase === "playing" && myPos && maze.length > 0 && (
              <div className="cat-mouse-wrap">
                <div className="cat-mouse-topbar">
                  <span className="cat-mouse-round">
                    RONDE {roundIndex} / {TOTAL_ROUNDS}
                  </span>
                  <span
                    className={`cat-mouse-timer ${secondsLeft <= 5 ? "is-urgent" : ""}`}
                  >
                    {String(secondsLeft).padStart(2, "0")}s
                  </span>
                </div>

                <div className="cat-mouse-stats">
                  <span className={myRole === "cat" ? "is-me" : ""}>
                    🐱 Kucing: <strong>{scores.catScore}</strong>
                  </span>
                  <span className={myRole === "mouse" ? "is-me" : ""}>
                    🐭 Tikus: <strong>{scores.mouseScore}</strong>
                  </span>
                </div>

                <div className={`cat-mouse-badge is-${myRole}`}>
                  PERAN KAMU:{" "}
                  <strong>{myRole === "cat" ? "KUCING" : "TIKUS"}</strong>
                  {myRole === "mouse" && (
                    <span className="cat-mouse-badge-hint">
                      {" "}
                      ·{" "}
                      {freezeUsedThisRound
                        ? "❄️ sudah pakai"
                        : "❄️ 1x freeze siap"}
                    </span>
                  )}
                </div>

                <div
                  className="cat-mouse-arena"
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                >
                  <svg
                    viewBox={`0 0 ${COLS} ${ROWS}`}
                    preserveAspectRatio="xMidYMid meet"
                    className="cat-mouse-svg"
                  >
                    {maze.map((row, y) =>
                      row.map((cell, x) =>
                        cell === 1 ? (
                          <rect
                            key={`w-${x}-${y}`}
                            x={x}
                            y={y}
                            width={1}
                            height={1}
                            fill="#1e293b"
                            stroke="#334155"
                            strokeWidth={0.05}
                          />
                        ) : null,
                      ),
                    )}

                    {peerPos && (
                      <g
                        transform={`translate(${peerPos.x + 0.5}, ${peerPos.y + 0.5})`}
                      >
                        <text
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={0.85}
                        >
                          {myRole === "cat" ? "🐭" : "🐱"}
                        </text>
                        {((isHost && freezeNoticeActive) ||
                          (!isHost &&
                            catFrozenUntilRef.current > Date.now())) && (
                          <circle
                            r={0.7}
                            fill="none"
                            stroke="#60a5fa"
                            strokeWidth={0.1}
                            opacity={0.8}
                          />
                        )}
                      </g>
                    )}

                    <g
                      transform={`translate(${myPos.x + 0.5}, ${myPos.y + 0.5})`}
                    >
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={0.95}
                      >
                        {myRole === "cat" ? "🐱" : "🐭"}
                      </text>
                      {catIsFrozen && (
                        <circle
                          r={0.7}
                          fill="none"
                          stroke="#60a5fa"
                          strokeWidth={0.1}
                          opacity={0.8}
                        />
                      )}
                    </g>
                  </svg>

                  {roundWinner !== null && (
                    <div className="cat-mouse-overlay">
                      <strong>
                        {roundWinner === "cat"
                          ? "🐱 Kucing menang!"
                          : "🐭 Tikus menang!"}
                      </strong>
                      <span>Ronde berikutnya…</span>
                    </div>
                  )}

                  {catIsFrozen && (
                    <div className="cat-mouse-freeze-notice is-cat">
                      ❄️ Kamu di-freeze! Tunggu…
                    </div>
                  )}
                </div>

                {myRole === "mouse" && (
                  <button
                    type="button"
                    className={`cat-mouse-freeze-btn ${freezeUsedThisRound ? "is-used" : ""}`}
                    onClick={handleFreeze}
                    disabled={
                      freezeUsedThisRound ||
                      roundWinner !== null ||
                      !isConnected
                    }
                  >
                    <Snowflake size={18} />
                    {freezeUsedThisRound
                      ? "Freeze sudah dipakai"
                      : "Freeze Kucing!"}
                  </button>
                )}

                <div
                  className="cat-mouse-dpad"
                  role="group"
                  aria-label="Kontrol"
                >
                  <button
                    type="button"
                    className="cat-mouse-dpad-btn cat-mouse-dpad-up"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      pushDir({ x: 0, y: -1 });
                    }}
                    aria-label="Atas"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    className="cat-mouse-dpad-btn cat-mouse-dpad-left"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      pushDir({ x: -1, y: 0 });
                    }}
                    aria-label="Kiri"
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    className="cat-mouse-dpad-btn cat-mouse-dpad-right"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      pushDir({ x: 1, y: 0 });
                    }}
                    aria-label="Kanan"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    className="cat-mouse-dpad-btn cat-mouse-dpad-down"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      pushDir({ x: 0, y: 1 });
                    }}
                    aria-label="Bawah"
                  >
                    ▼
                  </button>
                </div>

                <p className="cat-mouse-hint">
                  WASD / Panah · atau swipe di arena
                </p>
              </div>
            )}

            {phase === "results" && (
              <div className="tap-rush-results">
                <div className="tap-rush-finish-mark">FINISH</div>
                <h2>
                  {scores.catScore > scores.mouseScore
                    ? "🐱 Kucing menang!"
                    : scores.mouseScore > scores.catScore
                      ? "🐭 Tikus menang!"
                      : "Seri!"}
                </h2>
                <p className="tap-rush-arena-prompt">
                  Skor akhir — Kucing: <strong>{scores.catScore}</strong> ·
                  Tikus: <strong>{scores.mouseScore}</strong>
                </p>
                <div className="tap-rush-lobby-footer">
                  {isHost && (
                    <button
                      className="tap-rush-primary"
                      type="button"
                      disabled={!canStart}
                      onClick={startGame}
                    >
                      <PawPrint size={17} /> Main lagi
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
          <span>2 PEMAIN</span>
          <span>30 DETIK / RONDE</span>
          <span>MAPS BERGANTI + FREEZE</span>
        </footer>
      </section>

      <style jsx>{`
        .cat-mouse-wrap {
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: center;
          width: 100%;
        }
        .cat-mouse-topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          font-size: 12px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          opacity: 0.8;
        }
        .cat-mouse-timer {
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .cat-mouse-timer.is-urgent {
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.5);
          animation: pulse 0.8s infinite;
        }
        @keyframes pulse {
          50% {
            opacity: 0.5;
          }
        }
        .cat-mouse-stats {
          display: flex;
          gap: 20px;
          font-size: 14px;
          letter-spacing: 0.06em;
        }
        .cat-mouse-stats strong {
          color: #fbbf24;
          font-size: 16px;
        }
        .cat-mouse-stats .is-me {
          text-shadow: 0 0 10px rgba(251, 191, 36, 0.5);
        }
        .cat-mouse-badge {
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          border: 1px solid;
        }
        .cat-mouse-badge.is-cat {
          background: rgba(251, 146, 60, 0.12);
          border-color: rgba(251, 146, 60, 0.5);
          color: #fb923c;
        }
        .cat-mouse-badge.is-mouse {
          background: rgba(96, 165, 250, 0.12);
          border-color: rgba(96, 165, 250, 0.5);
          color: #60a5fa;
        }
        .cat-mouse-badge-hint {
          opacity: 0.8;
          font-size: 11px;
        }
        .cat-mouse-arena {
          position: relative;
          width: 100%;
          max-width: 480px;
          aspect-ratio: 1 / 1;
          border-radius: 12px;
          overflow: hidden;
          background: #0a0f1a;
          border: 1px solid rgba(255, 255, 255, 0.08);
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
        }
        .cat-mouse-svg {
          width: 100%;
          height: 100%;
          display: block;
        }
        .cat-mouse-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.7);
          color: #fff;
          font-size: 18px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .cat-mouse-overlay span {
          font-size: 12px;
          opacity: 0.7;
        }
        .cat-mouse-freeze-notice {
          position: absolute;
          top: 8px;
          left: 50%;
          transform: translateX(-50%);
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 700;
          background: rgba(96, 165, 250, 0.9);
          color: #fff;
          animation: pulse 1s infinite;
        }
        .cat-mouse-freeze-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 24px;
          border-radius: 12px;
          border: 1px solid rgba(96, 165, 250, 0.5);
          background: rgba(96, 165, 250, 0.15);
          color: #93c5fd;
          font-size: 14px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          font-weight: 700;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          transition: all 120ms ease;
        }
        .cat-mouse-freeze-btn:active:not(:disabled) {
          background: rgba(96, 165, 250, 0.3);
          transform: scale(0.96);
        }
        .cat-mouse-freeze-btn.is-used {
          background: rgba(255, 255, 255, 0.03);
          border-color: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.3);
          cursor: not-allowed;
        }
        .cat-mouse-dpad {
          display: grid;
          grid-template-columns: repeat(3, 56px);
          grid-template-rows: repeat(3, 56px);
          gap: 8px;
          justify-content: center;
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
        }
        .cat-mouse-dpad-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.05);
          color: #fbbf24;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        .cat-mouse-dpad-btn:active {
          background: rgba(251, 191, 36, 0.2);
          transform: scale(0.96);
        }
        .cat-mouse-dpad-up {
          grid-area: 1 / 2;
        }
        .cat-mouse-dpad-left {
          grid-area: 2 / 1;
        }
        .cat-mouse-dpad-right {
          grid-area: 2 / 3;
        }
        .cat-mouse-dpad-down {
          grid-area: 3 / 2;
        }
        .cat-mouse-hint {
          font-size: 11px;
          opacity: 0.55;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-align: center;
        }
        @media (min-width: 720px) and (hover: hover) {
          .cat-mouse-dpad {
            display: none;
          }
        }
      `}</style>
    </main>
  );
}
