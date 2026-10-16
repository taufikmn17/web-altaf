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

type StationKind = "fish" | "chicken" | "cut" | "stove" | "plate" | "box";

type Station = {
  id: string;
  kind: StationKind;
  x: number;
  y: number;
  label: string;
};

type Ingredient = "fish" | "chicken";
type Cut = "fish-cut" | "chicken-cut";
type Cooked = "fish-cooked" | "chicken-cooked";
type Item = Ingredient | Cut | Cooked;

type OrderType = "dine-in" | "take-away";

type PlayerState = {
  id: string;
  name: string;
  x: number;
  y: number;
  holding: Item | null;
  color: string;
};

type Order = {
  id: string;
  type: OrderType;
  ingredient: Ingredient;
  expiresAt: number;
  reward: number;
};

const COLS = 10;
const ROWS = 7;
const TICK_MS = 130;
const CUT_TIME_MS = 2000;
const COOK_TIME_MS = 3500;
const ROUND_TIME_MS = 90_000;
const ROOM_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const COLORS = ["#ec4899", "#fbbf24", "#22d3ee", "#a3e635"];

const STATIONS: Station[] = [
  { id: "fish1", kind: "fish", x: 1, y: 1, label: "Ambil Ikan" },
  { id: "fish2", kind: "fish", x: 2, y: 1, label: "Ambil Ikan" },
  { id: "chicken1", kind: "chicken", x: 3, y: 1, label: "Ambil Ayam" },
  { id: "chicken2", kind: "chicken", x: 4, y: 1, label: "Ambil Ayam" },
  { id: "cut1", kind: "cut", x: 5, y: 1, label: "Potong" },
  { id: "cut2", kind: "cut", x: 6, y: 1, label: "Potong" },
  { id: "stove1", kind: "stove", x: 7, y: 1, label: "Masak" },
  { id: "stove2", kind: "stove", x: 8, y: 1, label: "Masak" },
  { id: "plate", kind: "plate", x: 2, y: 5, label: "Dine In" },
  { id: "box", kind: "box", x: 7, y: 5, label: "Take Away" },
];

const STATION_EMOJI: Record<StationKind, string> = {
  fish: "🐟",
  chicken: "🐔",
  cut: "🔪",
  stove: "🔥",
  plate: "🍽️",
  box: "📦",
};

const ITEM_EMOJI: Record<Item, string> = {
  fish: "🐟",
  chicken: "🐔",
  "fish-cut": "🔪🐟",
  "chicken-cut": "🔪🐔",
  "fish-cooked": "🍣",
  "chicken-cooked": "🍗",
};

const START_POSITIONS: Vec[] = [
  { x: 3, y: 3 },
  { x: 6, y: 3 },
  { x: 3, y: 4 },
  { x: 6, y: 4 },
];

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

function findStation(x: number, y: number): Station | undefined {
  return STATIONS.find((s) => s.x === x && s.y === y);
}

// Type guards yang terima Item | null biar tidak error TS
function isCooked(item: Item | null): item is Cooked {
  return item === "fish-cooked" || item === "chicken-cooked";
}

function isCut(item: Item | null): item is Cut {
  return item === "fish-cut" || item === "chicken-cut";
}

function isRaw(item: Item | null): item is Ingredient {
  return item === "fish" || item === "chicken";
}

function getItemEmoji(item: Item | null): string {
  if (!item) return "—";
  return ITEM_EMOJI[item];
}

function getNextStep(
  holding: Item | null,
  activeOrder: Order | null,
): { instruction: string; emoji: string } {
  if (holding === null) {
    if (!activeOrder) {
      return { instruction: "Ambil bahan dari 🐟 atau 🐔", emoji: "🧺" };
    }
    const ing = activeOrder.ingredient;
    return {
      instruction: `Ambil ${ing === "fish" ? "ikan 🐟" : "ayam 🐔"}`,
      emoji: ing === "fish" ? "🐟" : "🐔",
    };
  }
  if (isRaw(holding)) {
    return { instruction: "Potong dulu di 🔪", emoji: "🔪" };
  }
  if (isCut(holding)) {
    return { instruction: "Masak di 🔥 kompor", emoji: "🔥" };
  }
  if (isCooked(holding)) {
    if (!activeOrder) {
      return { instruction: "Tunggu pesanan…", emoji: "⏳" };
    }
    if (activeOrder.type === "dine-in") {
      return { instruction: "Antar ke 🍽️ PIRING (Dine In)", emoji: "🍽️" };
    }
    return { instruction: "Antar ke 📦 KARDUS (Take Away)", emoji: "📦" };
  }
  return { instruction: "Mulai dari stasiun bahan", emoji: "🧺" };
}

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

  const [myPos, setMyPos] = useState<Vec | null>(null);
  const [myHolding, setMyHolding] = useState<Item | null>(null);
  const [peers, setPeers] = useState<Record<string, PlayerState>>({});
  const [cookingStation, setCookingStation] = useState<{
    stationId: string;
    progress: number;
    result: Item;
  } | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [score, setScore] = useState(0);
  const [roundEndsAt, setRoundEndsAt] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(ROUND_TIME_MS);
  const [roundIndex, setRoundIndex] = useState(0);
  const [bigNotice, setBigNotice] = useState<string | null>(null);

  const myPosRef = useRef<Vec | null>(null);
  const myHoldingRef = useRef<Item | null>(null);
  const dirQueueRef = useRef<Vec[]>([]);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const phaseRef = useRef<GamePhase>("lobby");
  const lastStationRef = useRef<string | null>(null);

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

  const showNotice = (msg: string) => {
    setBigNotice(msg);
    setTimeout(() => setBigNotice(null), 1800);
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
      setCookingStation(null);
      setOrders([]);
      setScore(0);
      setRoundEndsAt(null);
      setPhase("lobby");
      dirQueueRef.current = [];
      lastStationRef.current = null;
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
      setMyPos(myStart ?? { x: 4, y: 3 });
      setMyHolding(null);
      setPeers({});
      setCookingStation(null);
      setOrders([]);
      setScore(0);
      setRoundIndex(data.roundIndex);
      setRoundEndsAt(data.endsAt);
      setRemainingMs(ROUND_TIME_MS);
      setPhase("playing");
      setError("");
      dirQueueRef.current = [];
      lastStationRef.current = null;
      showNotice("🏁 Mulai! Lihat pesanan di atas");
    });

    channel.on("broadcast", { event: "player-state" }, ({ payload }) => {
      const data = payload as PlayerState;
      if (!data.id || data.id === playerId) return;
      setPeers((current) => ({ ...current, [data.id]: data }));
    });

    channel.on("broadcast", { event: "cooking-start" }, ({ payload }) => {
      const data = payload as {
        stationId?: string;
        result?: Item;
      };
      if (!data.stationId || !data.result) return;
      setCookingStation({
        stationId: data.stationId,
        progress: 0,
        result: data.result,
      });
    });

    channel.on("broadcast", { event: "cooking-done" }, () => {
      setCookingStation(null);
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

  const broadcastMyState = (pos: Vec, holding: Item | null) => {
    const myIndex = players.findIndex((p) => p.id === playerId);
    const me = players.find((p) => p.id === playerId);
    void channelRef.current?.send({
      type: "broadcast",
      event: "player-state",
      payload: {
        id: playerId,
        name: me?.name ?? "Pemain",
        x: pos.x,
        y: pos.y,
        holding,
        color: COLORS[myIndex >= 0 ? myIndex % COLORS.length : 0],
      } as PlayerState,
    });
  };

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

        const st = findStation(next.x, next.y);
        if (!st) lastStationRef.current = null;
      }

      loopRef.current = window.setTimeout(tick, TICK_MS);
    };

    loopRef.current = window.setTimeout(tick, TICK_MS);

    return () => {
      cancelled = true;
      if (loopRef.current) window.clearTimeout(loopRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, myPos, playerId, peers]);

  useEffect(() => {
    if (phase !== "playing") return;
    if (!myPos) return;
    if (cookingStation) return;

    const station = findStation(myPos.x, myPos.y);
    if (!station) return;
    if (lastStationRef.current === station.id) return;
    lastStationRef.current = station.id;

    handleInteraction(station);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myPos, phase, cookingStation]);

  const startCookingProcess = (
    stationId: string,
    result: Item,
    durationMs: number,
    afterDone: () => void,
  ) => {
    void channelRef.current?.send({
      type: "broadcast",
      event: "cooking-start",
      payload: { stationId, result },
    });
    setCookingStation({ stationId, progress: 0, result });

    const start = Date.now();
    const step = () => {
      if (phaseRef.current !== "playing") return;
      const elapsed = Date.now() - start;
      const progress = Math.min(1, elapsed / durationMs);
      setCookingStation({ stationId, progress, result });
      if (progress >= 1) {
        setCookingStation(null);
        void channelRef.current?.send({
          type: "broadcast",
          event: "cooking-done",
          payload: {},
        });
        afterDone();
        return;
      }
      cookTimerRef.current = window.setTimeout(step, 100);
    };
    cookTimerRef.current = window.setTimeout(step, 100);
  };

  const handleInteraction = (station: Station) => {
    const holding = myHoldingRef.current;

    // FISH: ambil ikan (selalu reset ke ikan mentah)
    if (station.kind === "fish") {
      if (holding) {
        showNotice("♻️ Bahan lama dibuang, ambil ikan baru");
      }
      setMyHolding("fish");
      myHoldingRef.current = "fish";
      broadcastMyState(myPosRef.current!, "fish");
      showNotice("🐟 Ikan mentah diambil! Potong dulu di 🔪");
      return;
    }

    // CHICKEN: ambil ayam (selalu reset ke ayam mentah)
    if (station.kind === "chicken") {
      if (holding) {
        showNotice("♻️ Bahan lama dibuang, ambil ayam baru");
      }
      setMyHolding("chicken");
      myHoldingRef.current = "chicken";
      broadcastMyState(myPosRef.current!, "chicken");
      showNotice("🐔 Ayam mentah diambil! Potong dulu di 🔪");
      return;
    }

    // CUT: HANYA bisa potong bahan MENTAH
    if (station.kind === "cut") {
      if (isRaw(holding)) {
        const ingredient: Ingredient = holding;
        const cutItem: Item =
          ingredient === "fish" ? "fish-cut" : "chicken-cut";

        setMyHolding(null);
        myHoldingRef.current = null;
        broadcastMyState(myPosRef.current!, null);

        startCookingProcess(station.id, cutItem, CUT_TIME_MS, () => {
          setMyHolding(cutItem);
          myHoldingRef.current = cutItem;
          broadcastMyState(myPosRef.current!, cutItem);
          showNotice(
            `${ingredient === "fish" ? "🐟 Ikan" : "🐔 Ayam"} dipotong! Masak di 🔥`,
          );
        });
      } else if (isCut(holding) || isCooked(holding)) {
        showNotice("❌ Ini sudah dipotong/masak!");
      } else if (holding) {
        showNotice("❌ Hanya bisa potong ikan/ayam mentah");
      }
      return;
    }

    // STOVE: HANYA bisa masak bahan yang SUDAH DIPOTONG
    if (station.kind === "stove") {
      if (isCut(holding)) {
        const isFish = holding === "fish-cut";
        const cooked: Cooked = isFish ? "fish-cooked" : "chicken-cooked";

        setMyHolding(null);
        myHoldingRef.current = null;
        broadcastMyState(myPosRef.current!, null);

        startCookingProcess(station.id, cooked, COOK_TIME_MS, () => {
          setMyHolding(cooked);
          myHoldingRef.current = cooked;
          broadcastMyState(myPosRef.current!, cooked);
          showNotice(
            `${isFish ? "🍣 Ikan" : "🍗 Ayam"} matang! Antar sesuai pesanan`,
          );
        });
      } else if (isRaw(holding)) {
        showNotice("❌ Potong dulu di 🔪 sebelum dimasak!");
      } else if (isCooked(holding)) {
        showNotice("❌ Ini sudah matang!");
      } else if (holding) {
        showNotice("❌ Butuh bahan yang sudah dipotong");
      }
      return;
    }

    // PLATE: Dine In (HANYA terima makanan matang)
    if (station.kind === "plate") {
      if (isCooked(holding)) {
        const dineInOrder = orders.find(
          (o) =>
            o.type === "dine-in" &&
            ((o.ingredient === "fish" && holding === "fish-cooked") ||
              (o.ingredient === "chicken" && holding === "chicken-cooked")),
        );
        if (!dineInOrder) {
          showNotice("⚠️ Tidak ada pesanan Dine In yang cocok");
          return;
        }
        const newScore = score + dineInOrder.reward;
        setScore(newScore);
        void channelRef.current?.send({
          type: "broadcast",
          event: "score",
          payload: { score: newScore },
        });

        const nextOrders = orders.filter((o) => o.id !== dineInOrder.id);
        setOrders(nextOrders);
        void channelRef.current?.send({
          type: "broadcast",
          event: "orders",
          payload: { orders: nextOrders },
        });

        setMyHolding(null);
        myHoldingRef.current = null;
        broadcastMyState(myPosRef.current!, null);
        showNotice(`🍽️ +${dineInOrder.reward} Dine In!`);
      } else if (isRaw(holding)) {
        showNotice("❌ Bahan mentah! Potong & masak dulu");
      } else if (isCut(holding)) {
        showNotice("❌ Masak dulu di 🔥 sebelum diantar");
      } else if (holding) {
        showNotice("❌ Butuh makanan matang 🍣/🍗");
      }
      return;
    }

    // BOX: Take Away (HANYA terima makanan matang)
    if (station.kind === "box") {
      if (isCooked(holding)) {
        const takeAwayOrder = orders.find(
          (o) =>
            o.type === "take-away" &&
            ((o.ingredient === "fish" && holding === "fish-cooked") ||
              (o.ingredient === "chicken" && holding === "chicken-cooked")),
        );
        if (!takeAwayOrder) {
          showNotice("⚠️ Tidak ada pesanan Take Away yang cocok");
          return;
        }
        const newScore = score + takeAwayOrder.reward;
        setScore(newScore);
        void channelRef.current?.send({
          type: "broadcast",
          event: "score",
          payload: { score: newScore },
        });

        const nextOrders = orders.filter((o) => o.id !== takeAwayOrder.id);
        setOrders(nextOrders);
        void channelRef.current?.send({
          type: "broadcast",
          event: "orders",
          payload: { orders: nextOrders },
        });

        setMyHolding(null);
        myHoldingRef.current = null;
        broadcastMyState(myPosRef.current!, null);
        showNotice(`📦 +${takeAwayOrder.reward} Take Away!`);
      } else if (isRaw(holding)) {
        showNotice("❌ Bahan mentah! Potong & masak dulu");
      } else if (isCut(holding)) {
        showNotice("❌ Masak dulu di 🔥 sebelum diantar");
      } else if (holding) {
        showNotice("❌ Butuh makanan matang 🍣/🍗");
      }
      return;
    }
  };

  useEffect(() => {
    if (!isHost) return;
    if (phase !== "playing") return;

    const spawnOrder = () => {
      const now = Date.now();
      const type: OrderType = Math.random() < 0.5 ? "dine-in" : "take-away";
      const ingredient: Ingredient = Math.random() < 0.5 ? "fish" : "chicken";
      const newOrder: Order = {
        id: crypto.randomUUID(),
        type,
        ingredient,
        expiresAt: now + 30_000,
        reward: type === "dine-in" ? 100 : 120,
      };
      setOrders((current) => {
        const next = [...current, newOrder].slice(-4);
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
      setCookingStation(null);
      setOrders([]);
      setScore(0);
      setRoundEndsAt(null);
      setIsReady(host);
      setIsHost(host);
      setActiveRoom(roomCode);
      dirQueueRef.current = [];
      lastStationRef.current = null;
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
    setMyPos(startPositions[playerId] ?? { x: 4, y: 3 });
    setMyHolding(null);
    setPeers({});
    setCookingStation(null);
    setOrders([]);
    setScore(0);
    setRoundEndsAt(endsAt);
    setRemainingMs(ROUND_TIME_MS);
    setPhase("playing");
    dirQueueRef.current = [];
    lastStationRef.current = null;

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
    setCookingStation(null);
    setOrders([]);
    setScore(0);
    setRoundEndsAt(null);
    setError("");
    dirQueueRef.current = [];
    lastStationRef.current = null;
  };

  const guestsReady = players.filter((p) => !p.isHost).every((p) => p.ready);
  const canStart =
    isHost && players.length >= 2 && guestsReady && isConnected && !joiningRoom;
  const secondsLeft = Math.ceil(remainingMs / 1000);

  const peerList = Object.values(peers);
  const activeOrder = orders[0] ?? null;
  const nextStep = getNextStep(myHolding, activeOrder);

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
          <p>Ambil → Potong → Masak → Antar. Dine In ke 🍽️, Take Away ke 📦.</p>
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
                  🐟/🐔 Ambil bahan → 🔪 Potong → 🔥 Masak → antar ke 🍽️ Dine In
                  atau 📦 Take Away.
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

                <div className="kitchen-orders">
                  {orders.length === 0 ? (
                    <div className="kitchen-orders-empty">
                      Menunggu pesanan…
                    </div>
                  ) : (
                    orders.map((o) => {
                      const timeLeft = Math.max(0, o.expiresAt - Date.now());
                      const urgent = timeLeft < 8000;
                      const orderEmoji = o.ingredient === "fish" ? "🍣" : "🍗";
                      const orderTypeEmoji = o.type === "dine-in" ? "🍽️" : "📦";
                      const orderLabel =
                        o.type === "dine-in" ? "Dine In" : "Take Away";
                      return (
                        <div
                          key={o.id}
                          className={`kitchen-order ${urgent ? "is-urgent" : ""} ${
                            o.type === "dine-in" ? "is-dine" : "is-take"
                          }`}
                        >
                          <span className="kitchen-order-emoji">
                            {orderEmoji}
                          </span>
                          <div className="kitchen-order-info">
                            <span className="kitchen-order-type">
                              {orderTypeEmoji} {orderLabel}
                            </span>
                            <span className="kitchen-order-ing">
                              {o.ingredient === "fish" ? "Ikan" : "Ayam"}
                            </span>
                          </div>
                          <span className="kitchen-order-time">
                            {Math.ceil(timeLeft / 1000)}s
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="kitchen-guide">
                  <span className="kitchen-guide-icon">{nextStep.emoji}</span>
                  <div className="kitchen-guide-text">
                    <span className="kitchen-guide-label">
                      LANGKAH BERIKUTNYA
                    </span>
                    <strong>{nextStep.instruction}</strong>
                  </div>
                  <div className="kitchen-guide-holding">
                    <span className="kitchen-guide-label">DI TANGAN</span>
                    <strong>{getItemEmoji(myHolding)}</strong>
                  </div>
                </div>

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
                    {STATIONS.map((s) => {
                      const isCooking = cookingStation?.stationId === s.id;
                      return (
                        <div
                          key={s.id}
                          className={`kitchen-station kitchen-station-${s.kind} ${
                            isCooking ? "is-cooking" : ""
                          }`}
                          style={{
                            gridColumn: s.x + 1,
                            gridRow: s.y + 1,
                          }}
                        >
                          <span className="kitchen-station-emoji">
                            {STATION_EMOJI[s.kind]}
                          </span>
                          <span className="kitchen-station-label">
                            {s.label}
                          </span>
                          {isCooking && cookingStation && (
                            <div className="kitchen-station-progress">
                              <div
                                className="kitchen-station-progress-fill"
                                style={{
                                  width: `${cookingStation.progress * 100}%`,
                                }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}

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
                            {getItemEmoji(p.holding)}
                          </span>
                        )}
                        <span className="kitchen-player-name">{p.name}</span>
                      </div>
                    ))}

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
                          {getItemEmoji(myHolding)}
                        </span>
                      )}
                      <span className="kitchen-player-name">Kamu</span>
                    </div>
                  </div>

                  {bigNotice && (
                    <div className="kitchen-big-notice">{bigNotice}</div>
                  )}
                </div>

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
          <span>DINE IN & TAKE AWAY</span>
        </footer>
      </section>

      <style jsx>{`
        .kitchen-wrap {
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: center;
          width: 100%;
        }

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

        .kitchen-orders {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: center;
          width: 100%;
          max-width: 640px;
          min-height: 56px;
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
          gap: 10px;
          padding: 8px 12px;
          border-radius: 10px;
          border: 2px solid;
          animation: slideIn 0.25s ease-out;
        }
        .kitchen-order.is-dine {
          background: rgba(96, 165, 250, 0.12);
          border-color: rgba(96, 165, 250, 0.5);
        }
        .kitchen-order.is-take {
          background: rgba(251, 191, 36, 0.12);
          border-color: rgba(251, 191, 36, 0.55);
        }
        .kitchen-order.is-urgent {
          border-color: #ef4444 !important;
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
          font-size: 22px;
        }
        .kitchen-order-info {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .kitchen-order-type {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .kitchen-order-ing {
          font-size: 10px;
          opacity: 0.75;
        }
        .kitchen-order-time {
          font-family: Impact, "Arial Black", sans-serif;
          font-size: 14px;
          color: #fbbf24;
          margin-left: 4px;
        }

        .kitchen-guide {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          max-width: 640px;
          padding: 12px 16px;
          background: linear-gradient(
            135deg,
            rgba(236, 72, 153, 0.15),
            rgba(251, 191, 36, 0.08)
          );
          border: 1px solid rgba(236, 72, 153, 0.4);
          border-radius: 12px;
        }
        .kitchen-guide-icon {
          font-size: 32px;
          line-height: 1;
        }
        .kitchen-guide-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          min-width: 0;
        }
        .kitchen-guide-label {
          font-size: 9px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          opacity: 0.6;
        }
        .kitchen-guide-text strong {
          font-size: 14px;
          color: #fff;
        }
        .kitchen-guide-holding {
          display: flex;
          flex-direction: column;
          gap: 2px;
          align-items: center;
          min-width: 60px;
        }
        .kitchen-guide-holding strong {
          font-size: 22px;
        }

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

        .kitchen-station {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1px;
          border-radius: 8px;
          position: relative;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          transform: translateZ(6px);
          transition: all 150ms ease;
          box-shadow: 0 4px 0 rgba(0, 0, 0, 0.4);
          padding: 2px;
          overflow: hidden;
        }
        .kitchen-station-fish {
          background: rgba(96, 165, 250, 0.15);
          border-color: rgba(96, 165, 250, 0.5);
        }
        .kitchen-station-chicken {
          background: rgba(251, 146, 60, 0.15);
          border-color: rgba(251, 146, 60, 0.5);
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
          background: rgba(34, 197, 94, 0.15);
          border-color: rgba(34, 197, 94, 0.5);
        }
        .kitchen-station-box {
          background: rgba(251, 191, 36, 0.15);
          border-color: rgba(251, 191, 36, 0.5);
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
          font-size: clamp(14px, 3vw, 20px);
          line-height: 1;
        }
        .kitchen-station-label {
          font-size: 7px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          opacity: 0.7;
          text-align: center;
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

        .kitchen-big-notice {
          position: absolute;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 10px 20px;
          border-radius: 12px;
          background: rgba(236, 72, 153, 0.95);
          color: #fff;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.04em;
          box-shadow: 0 10px 30px rgba(236, 72, 153, 0.5);
          animation: noticeIn 0.3s ease-out;
          z-index: 10;
          white-space: nowrap;
        }
        @keyframes noticeIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

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
          .kitchen-station-label {
            display: none;
          }
          .kitchen-order-info {
            display: none;
          }
        }
      `}</style>
    </main>
  );
}
