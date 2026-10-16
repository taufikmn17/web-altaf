"use client";

import {
  ArrowLeft,
  Check,
  ChefHat,
  Copy,
  DoorOpen,
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

type Vec = { x: number; y: number };

type StationKind = "raw" | "cut" | "stove" | "plate" | "delivery";

type Station = {
  id: string;
  kind: StationKind;
  x: number;
  y: number;
};

type Ingredient = "tomato" | "cheese" | "onion" | "lettuce" | "meat";
type Item = Ingredient | "plate" | "dish";

type CookingState = {
  stationId: string;
  progress: number; // 0..1
  result: Item;
};

type PlayerState = {
  id: string;
  name: string;
  x: number;
  y: number;
  holding: Item | null;
  color: string;
  score: number;
};

type Order = {
  id: string;
  dish: "soup" | "salad" | "burger";
  expiresAt: number;
  reward: number;
};

const COLS = 10;
const ROWS = 8;
const TICK_MS = 130;
const COOK_TIME_MS = 4000;
const CUT_TIME_MS = 2500;
const ROUND_TIME_MS = 90_000;
const ROOM_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const COLORS = ["#ec4899", "#fbbf24", "#22d3ee", "#a3e635"];

// Layout stasiun (fixed)
const STATIONS: Station[] = [
  { id: "raw1", kind: "raw", x: 1, y: 1 },
  { id: "raw2", kind: "raw", x: 2, y: 1 },
  { id: "raw3", kind: "raw", x: 3, y: 1 },
  { id: "raw4", kind: "raw", x: 4, y: 1 },
  { id: "cut1", kind: "cut", x: 6, y: 1 },
  { id: "stove1", kind: "stove", x: 7, y: 1 },
  { id: "stove2", kind: "stove", x: 8, y: 1 },
  { id: "plate1", kind: "plate", x: 1, y: 6 },
  { id: "plate2", kind: "plate", x: 2, y: 6 },
  { id: "delivery", kind: "delivery", x: 8, y: 6 },
];

const STATION_EMOJI: Record<StationKind, string> = {
  raw: "🧺",
  cut: "🔪",
  stove: "🔥",
  plate: "🍽️",
  delivery: "📦",
};

const INGREDIENT_EMOJI: Record<Ingredient, string> = {
  tomato: "🍅",
  cheese: "🧀",
  onion: "🧅",
  lettuce: "🥬",
  meat: "🥩",
};

const ITEM_EMOJI: Record<Item, string> = {
  tomato: "🍅",
  cheese: "🧀",
  onion: "🧅",
  lettuce: "🥬",
  meat: "🥩",
  plate: "🍽️",
  dish: "🍲",
};

function makeRoomCode() {
  const values = new Uint32Array(6);
  crypto.getRandomValues(values);
  return Array.from(
    values,
    (value) => ROOM_CHARACTERS[value % ROOM_CHARACTERS.length],
  ).join("");
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

// Cari station di posisi (x, y)
function findStation(x: number, y: number): Station | undefined {
  return STATIONS.find((s) => s.x === x && s.y === y);
}

// Player start positions (4 sudut tengah arena)
const START_POSITIONS: Vec[] = [
  { x: 3, y: 3 },
  { x: 6, y: 3 },
  { x: 3, y: 4 },
  { x: 6, y: 4 },
];

export default function KitchenRush() {
  const supabase = getSupabaseBrowserClient();
  const [playerId, setPlayerId] = useState("");
  const channelRef = useRef<RealtimeChannel | null>(null);
  const loopRef = useRef<number | null>(null);
  const cookTimerRef = useRef<number | null>(null);

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

  // Game state
  const [myPos, setMyPos] = useState<Vec | null>(null);
  const [myHolding, setMyHolding] = useState<Item | null>(null);
  const [peers, setPeers] = useState<Record<string, PlayerState>>({});
  const [stationItems, setStationItems] = useState<Record<string, Item | null>>(
    {},
  );
  const [cooking, setCooking] = useState<CookingState | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [score, setScore] = useState(0);
  const [roundEndsAt, setRoundEndsAt] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(ROUND_TIME_MS);
  const [roundIndex, setRoundIndex] = useState(0);

  const myPosRef = useRef<Vec | null>(null);
  const myHoldingRef = useRef<Item | null>(null);
  const dirQueueRef = useRef<Vec[]>([]);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const phaseRef = useRef<GamePhase>("lobby");

  useEffect(() => {
    myPosRef.current = myPos;
  }, [myPos]);
  useEffect(() => {
    myHoldingRef.current = myHolding;
  }, [myHolding]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const pushDir = (dir: Vec) => {
    const q = dirQueueRef.current;
    if (q.length > 2) return;
    q.push(dir);
  };

  // ---- Realtime channel ----
  useEffect(() => {
    if (!activeRoom || !supabase || !playerId) return;

    const channel = supabase.channel(`kitchen-rush:${activeRoom}`, {
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
      setMyPos(null);
      setMyHolding(null);
      setPeers({});
      setStationItems({});
      setCooking(null);
      setOrders([]);
      setScore(0);
      setRoundEndsAt(null);
      setPhase("lobby");
      dirQueueRef.current = [];
    });

    channel.on("broadcast", { event: "round-start" }, ({ payload }) => {
      const data = payload as {
        roundIndex?: number;
        endsAt?: number;
        startPositions?: Record<string, Vec>;
      };
      if (
        typeof data.roundIndex !== "number" ||
        typeof data.endsAt !== "number" ||
        !data.startPositions
      )
        return;

      const myStart = data.startPositions[playerId];
      setMyPos(myStart ?? { x: 4, y: 4 });
      setMyHolding(null);
      setPeers({});
      setStationItems({});
      setCooking(null);
      setOrders([]);
      setScore(0);
      setRoundIndex(data.roundIndex);
      setRoundEndsAt(data.endsAt);
      setRemainingMs(ROUND_TIME_MS);
      setPhase("playing");
      setError("");
      dirQueueRef.current = [];
    });

    channel.on("broadcast", { event: "player-state" }, ({ payload }) => {
      const data = payload as PlayerState;
      if (!data.id || data.id === playerId) return;
      setPeers((current) => ({ ...current, [data.id]: data }));
    });

    channel.on("broadcast", { event: "station-set" }, ({ payload }) => {
      const data = payload as { stationId?: string; item?: Item | null };
      if (typeof data.stationId !== "string") return;
      setStationItems((current) => ({
        ...current,
        [data.stationId as string]: data.item ?? null,
      }));
    });

    channel.on("broadcast", { event: "cooking-start" }, ({ payload }) => {
      const data = payload as {
        stationId?: string;
        result?: Item;
        durationMs?: number;
      };
      if (!data.stationId || !data.result) return;
      setCooking({
        stationId: data.stationId,
        progress: 0,
        result: data.result,
      });
    });

    channel.on("broadcast", { event: "cooking-done" }, ({ payload }) => {
      const data = payload as { stationId?: string; item?: Item };
      if (!data.stationId || !data.item) return;
      setCooking(null);
      setStationItems((current) => ({
        ...current,
        [data.stationId as string]: data.item as Item,
      }));
    });

    channel.on("broadcast", { event: "orders" }, ({ payload }) => {
      const data = payload as { orders?: Order[] };
      if (!Array.isArray(data.orders)) return;
      setOrders(data.orders);
    });

    channel.on("broadcast", { event: "score" }, ({ payload }) => {
      const data = payload as { score?: number };
      if (typeof data.score !== "number") return;
      setScore(data.score);
    });

    channel.on("broadcast", { event: "game-over" }, () => {
      setPhase("results");
      if (loopRef.current) window.clearTimeout(loopRef.current);
      if (cookTimerRef.current) window.clearTimeout(cookTimerRef.current);
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

  // ---- Keyboard ----
  useEffect(() => {
    if (phase !== "playing") return;
    const handler = (event: KeyboardEvent) => {
      const dir = directionFromKey(event.key);
      if (!dir) return;
      event.preventDefault();
      pushDir(dir);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase]);

  // ---- Game loop ----
  useEffect(() => {
    if (phase !== "playing") return;
    if (!myPos) return;

    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      if (phaseRef.current !== "playing") return;

      const pos = myPosRef.current;
      if (!pos) return;

      let dir: Vec | null = null;
      while (dirQueueRef.current.length > 0) {
        const c = dirQueueRef.current.shift()!;
        const nx = pos.x + c.x;
        const ny = pos.y + c.y;
        if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
        // Cek collision dengan player lain (tidak bisa masuk kotak yang ada player)
        const blocked = Object.values(peers).some(
          (p) => p.x === nx && p.y === ny,
        );
        if (blocked) continue;
        dir = c;
        break;
      }

      if (dir) {
        const next = { x: pos.x + dir.x, y: pos.y + dir.y };
        setMyPos(next);
        myPosRef.current = next;
        broadcastMyState(next, myHoldingRef.current);
      }

      loopRef.current = window.setTimeout(tick, TICK_MS);
    };

    loopRef.current = window.setTimeout(tick, TICK_MS);

    return () => {
      cancelled = true;
      if (loopRef.current) window.clearTimeout(loopRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, myPos, playerId]);

  const broadcastMyState = (pos: Vec, holding: Item | null) => {
    const me = players.find((p) => p.id === playerId);
    const myIndex = players.findIndex((p) => p.id === playerId);
    void channelRef.current?.send({
      type: "broadcast",
      event: "player-state",
      payload: {
        id: playerId,
        name: me?.name ?? "Pemain",
        x: pos.x,
        y: pos.y,
        holding,
        color: COLORS[myIndex >= 0 ? myIndex : 0],
        score: 0,
      } as PlayerState,
    });
  };

  // ---- Auto pickup / interact saat masuk kotak station ----
  useEffect(() => {
    if (phase !== "playing") return;
    if (!myPos) return;

    const station = findStation(myPos.x, myPos.y);
    if (!station) return;

    // Handle automatic interactions
    handleInteraction(station);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myPos, phase]);

  const handleInteraction = (station: Station) => {
    const holding = myHoldingRef.current;
    const stationItem = stationItems[station.id] ?? null;

    // RAW: ambil bahan mentah
    if (station.kind === "raw" && !holding && !stationItem) {
      const ingredients: Ingredient[] = [
        "tomato",
        "cheese",
        "onion",
        "lettuce",
        "meat",
      ];
      const ing = ingredients[Math.floor(Math.random() * ingredients.length)];
      setMyHolding(ing);
      myHoldingRef.current = ing;
      broadcastMyState(myPosRef.current!, ing);
      return;
    }

    // CUT: potong bahan
    if (station.kind === "cut") {
      if (holding && !stationItem && isIngredient(holding)) {
        // Taruh bahan untuk dipotong
        setMyHolding(null);
        myHoldingRef.current = null;
        broadcastMyState(myPosRef.current!, null);
        // Mulai proses potong
        void channelRef.current?.send({
          type: "broadcast",
          event: "cooking-start",
          payload: {
            stationId: station.id,
            result: holding,
            durationMs: CUT_TIME_MS,
          },
        });
        startCooking(station.id, holding, CUT_TIME_MS, true);
        return;
      }
      if (!holding && stationItem) {
        setMyHolding(stationItem);
        myHoldingRef.current = stationItem;
        broadcastMyState(myPosRef.current!, stationItem);
        void channelRef.current?.send({
          type: "broadcast",
          event: "station-set",
          payload: { stationId: station.id, item: null },
        });
        setStationItems((c) => ({ ...c, [station.id]: null }));
        return;
      }
    }

    // STOVE: masak
    if (station.kind === "stove") {
      if (holding && !stationItem && isIngredient(holding)) {
        setMyHolding(null);
        myHoldingRef.current = null;
        broadcastMyState(myPosRef.current!, null);
        void channelRef.current?.send({
          type: "broadcast",
          event: "cooking-start",
          payload: {
            stationId: station.id,
            result: "dish",
            durationMs: COOK_TIME_MS,
          },
        });
        startCooking(station.id, "dish", COOK_TIME_MS, false);
        return;
      }
      if (!holding && stationItem) {
        setMyHolding(stationItem);
        myHoldingRef.current = stationItem;
        broadcastMyState(myPosRef.current!, stationItem);
        void channelRef.current?.send({
          type: "broadcast",
          event: "station-set",
          payload: { stationId: station.id, item: null },
        });
        setStationItems((c) => ({ ...c, [station.id]: null }));
        return;
      }
    }

    // PLATE: ambil plate kosong
    if (station.kind === "plate" && !holding && !stationItem) {
      setMyHolding("plate");
      myHoldingRef.current = "plate";
      broadcastMyState(myPosRef.current!, "plate");
      return;
    }

    // DELIVERY: setor dish (auto selesai order)
    if (station.kind === "delivery" && holding === "dish") {
      setMyHolding(null);
      myHoldingRef.current = null;
      broadcastMyState(myPosRef.current!, null);
      // Selesaikan order yang paling cepat expired
      if (orders.length > 0) {
        const sorted = [...orders].sort((a, b) => a.expiresAt - b.expiresAt);
        const done = sorted[0];
        const newScore = score + done.reward;
        setScore(newScore);
        void channelRef.current?.send({
          type: "broadcast",
          event: "score",
          payload: { score: newScore },
        });
      }
      return;
    }
  };

  const startCooking = (
    stationId: string,
    result: Item,
    durationMs: number,
    isCut: boolean,
  ) => {
    setCooking({ stationId, progress: 0, result });
    const startTime = Date.now();
    const step = () => {
      if (phaseRef.current !== "playing") return;
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      setCooking({ stationId, progress, result });
      if (progress >= 1) {
        setCooking(null);
        void channelRef.current?.send({
          type: "broadcast",
          event: "cooking-done",
          payload: { stationId, item: result },
        });
        setStationItems((c) => ({ ...c, [stationId]: result }));
        return;
      }
      cookTimerRef.current = window.setTimeout(step, 100);
    };
    cookTimerRef.current = window.setTimeout(step, 100);
    void isCut; // unused
  };

  // ---- Host: spawn order tiap 8 detik ----
  useEffect(() => {
    if (!isHost) return;
    if (phase !== "playing") return;

    const spawnOrder = () => {
      const now = Date.now();
      const newOrder: Order = {
        id: crypto.randomUUID(),
        dish: "soup",
        expiresAt: now + 25_000,
        reward: 100,
      };
      setOrders((current) => {
        const next = [...current, newOrder].slice(-3);
        void channelRef.current?.send({
          type: "broadcast",
          event: "orders",
          payload: { orders: next },
        });
        return next;
      });
    };

    spawnOrder();
    const timer = setInterval(spawnOrder, 8000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, phase]);

  // ---- Host: cleanup expired orders ----
  useEffect(() => {
    if (!isHost) return;
    if (phase !== "playing") return;

    const timer = setInterval(() => {
      const now = Date.now();
      setOrders((current) => {
        const filtered = current.filter((o) => o.expiresAt > now);
        if (filtered.length !== current.length) {
          void channelRef.current?.send({
            type: "broadcast",
            event: "orders",
            payload: { orders: filtered },
          });
        }
        return filtered;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isHost, phase]);

  // ---- Timer ronde ----
  useEffect(() => {
    if (phase !== "playing" || roundEndsAt === null) return;

    const timer = setInterval(() => {
      const next = Math.max(0, roundEndsAt - Date.now());
      setRemainingMs(next);
      if (next === 0 && isHost) {
        void channelRef.current?.send({
          type: "broadcast",
          event: "game-over",
          payload: {},
        });
        setPhase("results");
      }
    }, 100);
    return () => clearInterval(timer);
  }, [phase, roundEndsAt, isHost]);

  // ---- Touch handler ----
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

  // ---- Helpers ----
  function isIngredient(item: Item): item is Ingredient {
    return ["tomato", "cheese", "onion", "lettuce", "meat"].includes(item);
  }

  // ---- Preflight ----
  const peekRoomPlayerCount = async (roomCode: string): Promise<number> => {
    if (!supabase) return 0;
    const peekKey = "peek-" + crypto.randomUUID();
    const peekChannel = supabase.channel(`kitchen-rush:${roomCode}`, {
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
        if (count >= 4) {
          setError("Room sudah penuh (maks 4 pemain).");
          setJoiningRoom(false);
          return;
        }
      }

      setPlayerId(crypto.randomUUID());
      setPlayers([]);
      setPhase("lobby");
      setMyPos(null);
      setMyHolding(null);
      setPeers({});
      setStationItems({});
      setCooking(null);
      setOrders([]);
      setScore(0);
      setRoundEndsAt(null);
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
      players.length < 2 ||
      !players.every((p) => p.isHost || p.ready)
    )
      return;

    const hostId = playerId;
    const guests = players.filter((p) => !p.isHost);
    const allPlayers = [hostId, ...guests.map((p) => p.id)];

    const startPositions: Record<string, Vec> = {};
    allPlayers.forEach((id, i) => {
      startPositions[id] = START_POSITIONS[i % START_POSITIONS.length];
    });

    void channelRef.current?.send({
      type: "broadcast",
      event: "game-reset",
      payload: {},
    });

    const endsAt = Date.now() + ROUND_TIME_MS;
    setRoundIndex(1);
    setMyPos(startPositions[playerId] ?? { x: 4, y: 4 });
    setMyHolding(null);
    setPeers({});
    setStationItems({});
    setCooking(null);
    setOrders([]);
    setScore(0);
    setRoundEndsAt(endsAt);
    setRemainingMs(ROUND_TIME_MS);
    setPhase("playing");
    dirQueueRef.current = [];

    void channelRef.current?.send({
      type: "broadcast",
      event: "round-start",
      payload: { roundIndex: 1, endsAt, startPositions },
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
    setMyPos(null);
    setMyHolding(null);
    setPeers({});
    setStationItems({});
    setCooking(null);
    setOrders([]);
    setScore(0);
    setRoundEndsAt(null);
    setError("");
    dirQueueRef.current = [];
  };

  const guestsReady = players.filter((p) => !p.isHost).every((p) => p.ready);
  const canStart =
    isHost && players.length >= 2 && guestsReady && isConnected && !joiningRoom;
  const secondsLeft = Math.ceil(remainingMs / 1000);

  const peerList = Object.values(peers);

  return (
    <main className="tap-rush-shell">
      <div className="tap-rush-topbar">
        <Link href="/game" className="tap-rush-back">
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Semua game</span>
        </Link>
        <span className="tap-rush-season">ONLINE PARTY / 09</span>
      </div>

      <section className="tap-rush-layout">
        <header className="tap-rush-heading">
          <div className="tap-rush-kicker">
            <ChefHat size={14} /> REALTIME CO-OP COOKING
          </div>
          <h1>
            Kitchen Rush<span>!</span>
          </h1>
          <p>
            Kerja sama masak pesanan sebelum waktu habis. Ambil bahan, masak,
            antar!
          </p>
        </header>

        {!activeRoom ? (
          <section className="tap-rush-lobby">
            <div className="tap-rush-intro">
              <div className="tap-rush-orb" aria-hidden="true">
                <ChefHat size={30} />
              </div>
              <div>
                <h2>Bikin room, kumpulkan koki</h2>
                <p>
                  Kerja sama tim untuk penuhi pesanan. Makin banyak pemain,
                  makin seru!
                </p>
              </div>
            </div>

            <label className="tap-rush-label" htmlFor="kitchen-name">
              NAMA PEMAIN
            </label>
            <input
              id="kitchen-name"
              className="tap-rush-input"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value.slice(0, 18))}
              maxLength={18}
              placeholder="Contoh: Chef Alya"
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
                    <UsersRound size={20} /> Koki di dapur
                  </h2>
                  <span>{players.length} / 4</span>
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
                          ? "Mulai masak"
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

            {phase === "playing" && myPos && (
              <div className="kitchen-wrap">
                {/* HUD */}
                <div className="kitchen-hud">
                  <div className="kitchen-hud-item">
                    <span>WAKTU</span>
                    <strong className={secondsLeft <= 15 ? "is-urgent" : ""}>
                      {String(secondsLeft).padStart(2, "0")}s
                    </strong>
                  </div>
                  <div className="kitchen-hud-item">
                    <span>SKOR TIM</span>
                    <strong>{score}</strong>
                  </div>
                  <div className="kitchen-hud-item">
                    <span>PESANAN</span>
                    <strong>{orders.length}</strong>
                  </div>
                </div>

                {/* Orders */}
                <div className="kitchen-orders">
                  {orders.length === 0 ? (
                    <div className="kitchen-orders-empty">
                      Menunggu pesanan…
                    </div>
                  ) : (
                    orders.map((o) => {
                      const timeLeft = Math.max(0, o.expiresAt - Date.now());
                      const urgent = timeLeft < 8000;
                      return (
                        <div
                          key={o.id}
                          className={`kitchen-order ${urgent ? "is-urgent" : ""}`}
                        >
                          <span className="kitchen-order-emoji">🍲</span>
                          <span className="kitchen-order-text">Sup Tomat</span>
                          <span className="kitchen-order-time">
                            {Math.ceil(timeLeft / 1000)}s
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Arena isometric */}
                <div
                  className="kitchen-arena"
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                >
                  <div
                    className="kitchen-grid"
                    style={{
                      gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                      gridTemplateRows: `repeat(${ROWS}, 1fr)`,
                    }}
                  >
                    {/* Stations */}
                    {STATIONS.map((s) => {
                      const item = stationItems[s.id] ?? null;
                      const isCooking = cooking?.stationId === s.id;
                      return (
                        <div
                          key={s.id}
                          className={`kitchen-station kitchen-station-${s.kind} ${isCooking ? "is-cooking" : ""}`}
                          style={{
                            gridColumn: s.x + 1,
                            gridRow: s.y + 1,
                          }}
                        >
                          <span className="kitchen-station-emoji">
                            {item ? ITEM_EMOJI[item] : STATION_EMOJI[s.kind]}
                          </span>
                          {isCooking && cooking && (
                            <div className="kitchen-station-progress">
                              <div
                                className="kitchen-station-progress-fill"
                                style={{ width: `${cooking.progress * 100}%` }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Peers */}
                    {peerList.map((p) => (
                      <div
                        key={p.id}
                        className="kitchen-player"
                        style={{
                          gridColumn: p.x + 1,
                          gridRow: p.y + 1,
                        }}
                      >
                        <div
                          className="kitchen-player-body"
                          style={{ background: p.color }}
                        >
                          🧑‍🍳
                        </div>
                        {p.holding && (
                          <span className="kitchen-player-holding">
                            {ITEM_EMOJI[p.holding]}
                          </span>
                        )}
                        <span className="kitchen-player-name">{p.name}</span>
                      </div>
                    ))}

                    {/* Me */}
                    <div
                      className="kitchen-player is-me"
                      style={{
                        gridColumn: myPos.x + 1,
                        gridRow: myPos.y + 1,
                      }}
                    >
                      <div className="kitchen-player-body is-me">🧑‍🍳</div>
                      {myHolding && (
                        <span className="kitchen-player-holding">
                          {ITEM_EMOJI[myHolding]}
                        </span>
                      )}
                      <span className="kitchen-player-name">Kamu</span>
                    </div>
                  </div>
                </div>

                {/* D-pad */}
                <div className="kitchen-dpad" role="group" aria-label="Kontrol">
                  <button
                    type="button"
                    className="kitchen-dpad-btn kitchen-dpad-up"
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
                    className="kitchen-dpad-btn kitchen-dpad-left"
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
                    className="kitchen-dpad-btn kitchen-dpad-right"
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
                    className="kitchen-dpad-btn kitchen-dpad-down"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      pushDir({ x: 0, y: 1 });
                    }}
                    aria-label="Bawah"
                  >
                    ▼
                  </button>
                </div>

                <p className="kitchen-hint">
                  Masuk ke kotak stasiun untuk auto-interaksi · WASD / Panah
                </p>
              </div>
            )}

            {phase === "results" && (
              <div className="tap-rush-results">
                <div className="tap-rush-finish-mark">FINISH</div>
                <h2>
                  {score >= 500
                    ? "Kerja sama mantap! 🏆"
                    : score >= 200
                      ? "Lumayan! 🍲"
                      : "Coba lagi ya! 🥲"}
                </h2>
                <p className="tap-rush-arena-prompt">
                  Skor tim: <strong>{score}</strong>
                </p>
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
          <span>2—4 PEMAIN</span>
          <span>90 DETIK / RONDE</span>
          <span>CO-OP COOKING</span>
        </footer>
      </section>

      <style jsx>{`
        .kitchen-wrap {
          display: flex;
          flex-direction: column;
          gap: 14px;
          align-items: center;
          width: 100%;
        }

        /* HUD */
        .kitchen-hud {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          width: 100%;
          max-width: 640px;
        }
        .kitchen-hud-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(236, 72, 153, 0.2);
          border-radius: 10px;
        }
        .kitchen-hud-item span {
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          opacity: 0.65;
        }
        .kitchen-hud-item strong {
          font-family: Impact, "Arial Black", sans-serif;
          font-size: 22px;
          color: #ec4899;
          font-variant-numeric: tabular-nums;
        }
        .kitchen-hud-item strong.is-urgent {
          color: #fca5a5;
          animation: pulse 0.8s infinite;
        }
        @keyframes pulse {
          50% {
            opacity: 0.5;
          }
        }

        /* Orders */
        .kitchen-orders {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: center;
          width: 100%;
          max-width: 640px;
          min-height: 48px;
        }
        .kitchen-orders-empty {
          color: #9d7a8c;
          font-size: 12px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 14px;
        }
        .kitchen-order {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(236, 72, 153, 0.4);
          border-radius: 10px;
          animation: slideIn 0.25s ease-out;
        }
        .kitchen-order.is-urgent {
          border-color: #ef4444;
          background: rgba(239, 68, 68, 0.12);
          animation: pulse 0.8s infinite;
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
        .kitchen-order-emoji {
          font-size: 20px;
        }
        .kitchen-order-text {
          font-size: 12px;
          font-weight: 700;
        }
        .kitchen-order-time {
          font-family: Impact, "Arial Black", sans-serif;
          font-size: 14px;
          color: #fbbf24;
        }

        /* Arena isometric */
        .kitchen-arena {
          width: 100%;
          max-width: 640px;
          aspect-ratio: 4 / 3;
          position: relative;
          perspective: 1400px;
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
        }
        .kitchen-grid {
          position: absolute;
          inset: 0;
          display: grid;
          gap: 2px;
          padding: 8px;
          background:
            radial-gradient(
              circle at 50% 30%,
              rgba(251, 191, 36, 0.05),
              transparent 60%
            ),
            #1a0e16;
          border: 1px solid rgba(236, 72, 153, 0.25);
          border-radius: 12px;
          transform: rotateX(35deg) rotateZ(-12deg) scale(0.98);
          transform-style: preserve-3d;
          box-shadow: 0 20px 60px rgba(236, 72, 153, 0.2);
        }

        /* Station */
        .kitchen-station {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          position: relative;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          transform: translateZ(6px);
          transition: all 150ms ease;
          box-shadow: 0 4px 0 rgba(0, 0, 0, 0.4);
        }
        .kitchen-station-raw {
          background: rgba(163, 230, 53, 0.15);
          border-color: rgba(163, 230, 53, 0.5);
        }
        .kitchen-station-cut {
          background: rgba(148, 163, 184, 0.15);
          border-color: rgba(148, 163, 184, 0.5);
        }
        .kitchen-station-stove {
          background: rgba(249, 115, 22, 0.18);
          border-color: rgba(249, 115, 22, 0.55);
        }
        .kitchen-station-plate {
          background: rgba(96, 165, 250, 0.15);
          border-color: rgba(96, 165, 250, 0.5);
        }
        .kitchen-station-delivery {
          background: rgba(236, 72, 153, 0.2);
          border-color: rgba(236, 72, 153, 0.6);
        }
        .kitchen-station.is-cooking {
          animation: cookShake 0.4s infinite;
        }
        @keyframes cookShake {
          0%,
          100% {
            transform: translateZ(6px) translateX(0);
          }
          50% {
            transform: translateZ(6px) translateX(2px);
          }
        }
        .kitchen-station-emoji {
          font-size: clamp(16px, 3.5vw, 24px);
          line-height: 1;
        }
        .kitchen-station-progress {
          position: absolute;
          bottom: 2px;
          left: 4px;
          right: 4px;
          height: 3px;
          background: rgba(0, 0, 0, 0.4);
          border-radius: 999px;
          overflow: hidden;
        }
        .kitchen-station-progress-fill {
          height: 100%;
          background: #fbbf24;
          transition: width 100ms linear;
        }

        /* Player */
        .kitchen-player {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          position: relative;
          transform: translateZ(14px) translateY(-8px);
          pointer-events: none;
        }
        .kitchen-player.is-me {
          transform: translateZ(20px) translateY(-10px);
          z-index: 5;
        }
        .kitchen-player-body {
          width: 80%;
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ec4899;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.3);
          font-size: clamp(14px, 3vw, 20px);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.4);
          animation: bob 1.2s ease-in-out infinite;
        }
        .kitchen-player-body.is-me {
          border-color: #fbbf24;
          box-shadow:
            0 0 0 2px rgba(251, 191, 36, 0.5),
            0 6px 12px rgba(0, 0, 0, 0.5);
        }
        @keyframes bob {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-2px);
          }
        }
        .kitchen-player-holding {
          position: absolute;
          top: -8px;
          right: -4px;
          font-size: clamp(14px, 3vw, 20px);
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
        }
        .kitchen-player-name {
          position: absolute;
          bottom: -14px;
          font-size: 8px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          background: rgba(0, 0, 0, 0.7);
          padding: 1px 4px;
          border-radius: 3px;
          color: #fff;
          white-space: nowrap;
        }

        /* D-pad */
        .kitchen-dpad {
          display: grid;
          grid-template-columns: repeat(3, 56px);
          grid-template-rows: repeat(3, 56px);
          gap: 8px;
          justify-content: center;
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
        }
        .kitchen-dpad-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.05);
          color: #ec4899;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        .kitchen-dpad-btn:active {
          background: rgba(236, 72, 153, 0.2);
          transform: scale(0.96);
        }
        .kitchen-dpad-up {
          grid-area: 1 / 2;
        }
        .kitchen-dpad-left {
          grid-area: 2 / 1;
        }
        .kitchen-dpad-right {
          grid-area: 2 / 3;
        }
        .kitchen-dpad-down {
          grid-area: 3 / 2;
        }

        .kitchen-hint {
          font-size: 11px;
          opacity: 0.55;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-align: center;
        }

        @media (min-width: 720px) and (hover: hover) {
          .kitchen-dpad {
            display: none;
          }
        }
        @media (max-width: 640px) {
          .kitchen-arena {
            aspect-ratio: 5 / 4;
          }
          .kitchen-grid {
            transform: rotateX(30deg) rotateZ(-10deg) scale(0.98);
          }
        }
      `}</style>
    </main>
  );
}
