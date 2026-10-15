"use client";

import {
  ArrowLeft,
  Check,
  Copy,
  DoorOpen,
  Grid3x3,
  Radio,
  Rocket,
  UsersRound,
  X,
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

type Puzzle = (number | null)[][];

type SudokuData = {
  puzzle: Puzzle;
  solution: number[][];
};

const ROOM_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SIZE = 9;
const MAX_PLAYERS = 4;

function makeRoomCode() {
  const values = new Uint32Array(6);
  crypto.getRandomValues(values);
  return Array.from(
    values,
    (value) => ROOM_CHARACTERS[value % ROOM_CHARACTERS.length],
  ).join("");
}

function clonePuzzle(p: Puzzle): Puzzle {
  return p.map((row) => [...row]);
}

function isSolved(board: Puzzle, solution: number[][]): boolean {
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      if (board[r][c] !== solution[r][c]) return false;
    }
  }
  return true;
}

function countCorrectCells(
  board: Puzzle | null,
  solution: number[][] | null,
  puzzle: Puzzle | null,
): number {
  if (!board || !solution || !puzzle) return 0;
  let count = 0;
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      if (puzzle[r][c] !== null) continue;
      if (board[r][c] === solution[r][c]) count += 1;
    }
  }
  return count;
}

function countTotalEmpty(puzzle: Puzzle | null): number {
  if (!puzzle) return 0;
  let count = 0;
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      if (puzzle[r][c] === null) count += 1;
    }
  }
  return count;
}

export default function SudokuDuel() {
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
  const [loading, setLoading] = useState(false);
  const [joiningRoom, setJoiningRoom] = useState(false);

  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [solution, setSolution] = useState<number[][] | null>(null);
  const [board, setBoard] = useState<Puzzle | null>(null);
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(
    null,
  );
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [winnerName, setWinnerName] = useState("");
  const [progress, setProgress] = useState<Record<string, number>>({});

  const boardRef = useRef<Puzzle | null>(null);
  const solutionRef = useRef<number[][] | null>(null);
  const puzzleRef = useRef<Puzzle | null>(null);
  const lastBroadcastProgressRef = useRef<number>(-1);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);
  useEffect(() => {
    solutionRef.current = solution;
  }, [solution]);
  useEffect(() => {
    puzzleRef.current = puzzle;
  }, [puzzle]);

  // ---- Realtime channel ----
  useEffect(() => {
    if (!activeRoom || !supabase || !playerId) return;

    const channel = supabase.channel(`sudoku-duel:${activeRoom}`, {
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
      setProgress((current) => {
        const next: Record<string, number> = {};
        for (const p of connectedPlayers) {
          next[p.id] = current[p.id] ?? 0;
        }
        return next;
      });
    };

    channel.on("presence", { event: "sync" }, syncFromPresence);
    channel.on("presence", { event: "join" }, syncFromPresence);
    channel.on("presence", { event: "leave" }, syncFromPresence);

    channel.on("broadcast", { event: "game-reset" }, () => {
      setPuzzle(null);
      setSolution(null);
      setBoard(null);
      setSelected(null);
      setWinnerId(null);
      setWinnerName("");
      setProgress({});
      setPhase("lobby");
      lastBroadcastProgressRef.current = -1;
    });

    channel.on("broadcast", { event: "round-start" }, ({ payload }) => {
      const data = payload as SudokuData;
      if (!data.puzzle || !data.solution) return;
      setPuzzle(data.puzzle);
      setSolution(data.solution);
      setBoard(clonePuzzle(data.puzzle));
      setSelected(null);
      setWinnerId(null);
      setWinnerName("");
      setProgress({});
      setPhase("playing");
      setError("");
      lastBroadcastProgressRef.current = -1;
    });

    channel.on("broadcast", { event: "progress" }, ({ payload }) => {
      const data = payload as { id?: string; count?: number };
      if (typeof data.id !== "string" || typeof data.count !== "number") return;
      const id = data.id;
      const count = data.count;
      setProgress((current) => ({ ...current, [id]: count }));
    });

    channel.on("broadcast", { event: "solved" }, ({ payload }) => {
      const data = payload as { id?: string; name?: string };
      if (typeof data.id !== "string") return;
      const id = data.id;
      const name = data.name ?? "Pemain";
      setWinnerId(id);
      setWinnerName(name);
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

  // ---- Input keyboard untuk Sudoku ----
  useEffect(() => {
    if (phase !== "playing") return;
    const handler = (e: KeyboardEvent) => {
      if (!selected) return;
      if (e.key >= "1" && e.key <= "9") {
        setNumberAt(selected.r, selected.c, Number(e.key));
      } else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
        setNumberAt(selected.r, selected.c, null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, selected]);

  // ---- Broadcast progress setelah board berubah ----
  useEffect(() => {
    if (phase !== "playing") return;
    if (!board || !solution || !puzzle) return;

    const count = countCorrectCells(board, solution, puzzle);
    if (count === lastBroadcastProgressRef.current) return;
    lastBroadcastProgressRef.current = count;

    setProgress((current) => ({ ...current, [playerId]: count }));
    void channelRef.current?.send({
      type: "broadcast",
      event: "progress",
      payload: { id: playerId, count },
    });
  }, [board, solution, puzzle, phase, playerId]);

  // ---- Preflight: cek jumlah pemain di room ----
  const peekRoomPlayerCount = async (roomCode: string): Promise<number> => {
    if (!supabase) return 0;
    const peekKey = "peek-" + crypto.randomUUID();
    const peekChannel = supabase.channel(`sudoku-duel:${roomCode}`, {
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

  // ---- Handlers ----
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
      setPhase("lobby");
      setPuzzle(null);
      setSolution(null);
      setBoard(null);
      setSelected(null);
      setWinnerId(null);
      setProgress({});
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

  const fetchSudoku = async (): Promise<SudokuData | null> => {
    try {
      setLoading(true);
      const res = await fetch("/api/sudoku?difficulty=medium&width=3&height=3");
      const data = (await res.json()) as SudokuData & { error?: string };
      if (data.error || !data.puzzle || !data.solution) {
        setError(data.error ?? "Gagal ambil soal sudoku.");
        return null;
      }
      return { puzzle: data.puzzle, solution: data.solution };
    } catch {
      setError("Kesalahan jaringan saat ambil sudoku.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const startRound = async () => {
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

    setPuzzle(null);
    setSolution(null);
    setBoard(null);
    setSelected(null);
    setWinnerId(null);
    setWinnerName("");
    setProgress({});
    lastBroadcastProgressRef.current = -1;

    const data = await fetchSudoku();
    if (!data) return;

    setPuzzle(data.puzzle);
    setSolution(data.solution);
    setBoard(clonePuzzle(data.puzzle));
    setSelected(null);
    setWinnerId(null);
    setWinnerName("");
    setProgress({});
    setPhase("playing");
    void channelRef.current?.send({
      type: "broadcast",
      event: "round-start",
      payload: data,
    });
  };

  const setNumberAt = (r: number, c: number, value: number | null) => {
    if (phase !== "playing") return;
    if (!puzzle) return;
    if (puzzle[r][c] !== null) return;
    if (winnerId) return;

    setBoard((current) => {
      if (!current) return current;
      const next = current.map((row) => [...row]);
      next[r][c] = value;
      return next;
    });
  };

  // ---- Cek menang ----
  useEffect(() => {
    if (phase !== "playing") return;
    if (!board || !solution) return;
    if (winnerId) return;
    if (isSolved(board, solution)) {
      const myName = players.find((p) => p.id === playerId)?.name ?? "Pemain";
      setWinnerId(playerId);
      setWinnerName(myName);
      setPhase("results");
      void channelRef.current?.send({
        type: "broadcast",
        event: "solved",
        payload: { id: playerId, name: myName },
      });
    }
  }, [board, solution, phase, playerId, players, winnerId]);

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
    setPuzzle(null);
    setSolution(null);
    setBoard(null);
    setSelected(null);
    setWinnerId(null);
    setProgress({});
    setError("");
  };

  // ---- Helpers ----
  const guestsReady = players.filter((p) => !p.isHost).every((p) => p.ready);
  const canStart =
    isHost &&
    players.length >= 2 &&
    players.length <= MAX_PLAYERS &&
    guestsReady &&
    isConnected &&
    !joiningRoom;
  const totalEmpty = countTotalEmpty(puzzle);

  const conflictCells = useMemo(() => {
    const set = new Set<string>();
    if (!board) return set;
    for (let r = 0; r < SIZE; r += 1) {
      const seen = new Map<number, number[]>();
      for (let c = 0; c < SIZE; c += 1) {
        const v = board[r][c];
        if (v === null) continue;
        if (!seen.has(v)) seen.set(v, []);
        seen.get(v)!.push(c);
      }
      for (const [, cols] of seen) {
        if (cols.length > 1) {
          for (const c of cols) set.add(`${r},${c}`);
        }
      }
    }
    for (let c = 0; c < SIZE; c += 1) {
      const seen = new Map<number, number[]>();
      for (let r = 0; r < SIZE; r += 1) {
        const v = board[r][c];
        if (v === null) continue;
        if (!seen.has(v)) seen.set(v, []);
        seen.get(v)!.push(r);
      }
      for (const [, rows] of seen) {
        if (rows.length > 1) {
          for (const r of rows) set.add(`${r},${c}`);
        }
      }
    }
    for (let br = 0; br < 3; br += 1) {
      for (let bc = 0; bc < 3; bc += 1) {
        const seen = new Map<number, string[]>();
        for (let r = 0; r < 3; r += 1) {
          for (let c = 0; c < 3; c += 1) {
            const rr = br * 3 + r;
            const cc = bc * 3 + c;
            const v = board[rr][cc];
            if (v === null) continue;
            if (!seen.has(v)) seen.set(v, []);
            seen.get(v)!.push(`${rr},${cc}`);
          }
        }
        for (const [, cells] of seen) {
          if (cells.length > 1) {
            for (const key of cells) set.add(key);
          }
        }
      }
    }
    return set;
  }, [board]);

  // Progress: HANYA player lain (bukan diri sendiri) — biar anti-curang
  const otherPlayersByProgress = [...players]
    .filter((p) => p.id !== playerId)
    .sort(
      (left, right) => (progress[right.id] ?? 0) - (progress[left.id] ?? 0),
    );

  return (
    <main className="tap-rush-shell">
      <div className="tap-rush-topbar">
        <Link href="/game" className="tap-rush-back">
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Semua game</span>
        </Link>
        <span className="tap-rush-season">ONLINE DUEL / 05</span>
      </div>

      <section className="tap-rush-layout">
        <header className="tap-rush-heading">
          <div className="tap-rush-kicker">
            <Grid3x3 size={14} /> REALTIME SUDOKU DUEL
          </div>
          <h1>
            Sudoku Duel<span>!</span>
          </h1>
          <p>Puzzle yang sama, siapa cepat & benar mengisi, dia menang.</p>
        </header>

        {!activeRoom ? (
          <section className="tap-rush-lobby">
            <div className="tap-rush-intro">
              <div className="tap-rush-orb" aria-hidden="true">
                <Grid3x3 size={30} />
              </div>
              <div>
                <h2>Bikin room, tantang teman sudoku</h2>
                <p>
                  Host generate puzzle dari API, semua pemain dapat puzzle sama.
                  Yang selesai duluan dengan benar menang.
                </p>
              </div>
            </div>

            <label className="tap-rush-label" htmlFor="sudoku-player-name">
              NAMA PEMAIN
            </label>
            <input
              id="sudoku-player-name"
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
                      onClick={startRound}
                    >
                      <Rocket size={17} />{" "}
                      {loading
                        ? "Menyiapkan puzzle…"
                        : players.length < 2
                          ? "Menunggu teman"
                          : players.length > MAX_PLAYERS
                            ? `Room penuh (maks ${MAX_PLAYERS})`
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

            {phase === "playing" && board && puzzle && (
              <div className="sudoku-wrap">
                <p className="sudoku-hint">
                  Tap kotak kosong → pilih angka 1–9. Angka merah = bentrok.
                </p>

                <div className="sudoku-board">
                  {board.map((row, r) =>
                    row.map((value, c) => {
                      const fixed = puzzle[r][c] !== null;
                      const isSelected = selected?.r === r && selected?.c === c;
                      const isConflict = conflictCells.has(`${r},${c}`);
                      const borderRight = (c + 1) % 3 === 0 && c !== SIZE - 1;
                      const borderBottom = (r + 1) % 3 === 0 && r !== SIZE - 1;
                      return (
                        <button
                          key={`${r}-${c}`}
                          type="button"
                          className={[
                            "sudoku-cell",
                            fixed ? "is-fixed" : "is-input",
                            isSelected ? "is-selected" : "",
                            isConflict ? "is-conflict" : "",
                            borderRight ? "br" : "",
                            borderBottom ? "bb" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() => {
                            if (!fixed) setSelected({ r, c });
                          }}
                        >
                          {value ?? ""}
                        </button>
                      );
                    }),
                  )}
                </div>

                <div className="sudoku-pad">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className="sudoku-pad-btn"
                      onClick={() => {
                        if (!selected) return;
                        setNumberAt(selected.r, selected.c, n);
                      }}
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="sudoku-pad-btn is-erase"
                    onClick={() => {
                      if (!selected) return;
                      setNumberAt(selected.r, selected.c, null);
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* ---- DAFTAR PROGRESS PEMAIN LAIN ---- */}
                <div className="sudoku-progress">
                  <h3 className="sudoku-progress-title">
                    <UsersRound size={16} /> Progress pemain lain
                  </h3>
                  {otherPlayersByProgress.length === 0 ? (
                    <p className="sudoku-progress-empty">
                      Belum ada pemain lain di room ini.
                    </p>
                  ) : (
                    <ol className="sudoku-progress-list">
                      {otherPlayersByProgress.map((player) => {
                        const count = progress[player.id] ?? 0;
                        const pct =
                          totalEmpty > 0
                            ? Math.round((count / totalEmpty) * 100)
                            : 0;
                        return (
                          <li key={player.id} className="sudoku-progress-item">
                            <div className="sudoku-progress-row">
                              <span className="sudoku-progress-name">
                                {player.name}
                              </span>
                              <strong className="sudoku-progress-count">
                                {count} / {totalEmpty} petak ({pct}%)
                              </strong>
                            </div>
                            <div className="sudoku-progress-bar">
                              <div
                                className="sudoku-progress-fill"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </div>
              </div>
            )}

            {phase === "results" && (
              <div className="tap-rush-results">
                <div className="tap-rush-finish-mark">FINISH</div>
                <h2>
                  {winnerId === playerId
                    ? "Kamu selesai duluan! 🏆"
                    : `${winnerName} selesai duluan!`}
                </h2>
                <ol className="tap-rush-scoreboard">
                  {[...players]
                    .sort(
                      (left, right) =>
                        (progress[right.id] ?? 0) - (progress[left.id] ?? 0),
                    )
                    .map((player, index) => {
                      const count = progress[player.id] ?? 0;
                      return (
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
                            {count} / {totalEmpty}
                          </strong>
                        </li>
                      );
                    })}
                </ol>
                <div className="tap-rush-lobby-footer">
                  {isHost && (
                    <button
                      className="tap-rush-primary"
                      type="button"
                      disabled={!canStart || loading}
                      onClick={startRound}
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
          <span>SUDOKU API</span>
          <span>MAKS {MAX_PLAYERS} PEMAIN</span>
          <span>9 × 9 PUZZLE</span>
        </footer>
      </section>

      <style jsx>{`
        .sudoku-wrap {
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: center;
        }
        .sudoku-hint {
          font-size: 12px;
          opacity: 0.65;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          text-align: center;
        }
        .sudoku-board {
          display: grid;
          grid-template-columns: repeat(9, 1fr);
          width: min(100%, 480px);
          aspect-ratio: 1 / 1;
          background: #050912;
          border: 2px solid rgba(251, 191, 36, 0.5);
          border-radius: 10px;
          overflow: hidden;
        }
        .sudoku-cell {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: clamp(14px, 3.5vw, 22px);
          font-weight: 600;
          color: #fbbf24;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.06);
          cursor: pointer;
          padding: 0;
          -webkit-tap-highlight-color: transparent;
        }
        .sudoku-cell.is-fixed {
          color: #e5e7eb;
          background: rgba(255, 255, 255, 0.03);
          cursor: default;
        }
        .sudoku-cell.is-input {
          color: #fbbf24;
        }
        .sudoku-cell.is-selected {
          background: rgba(251, 191, 36, 0.22);
          outline: 2px solid #fbbf24;
          outline-offset: -2px;
        }
        .sudoku-cell.is-conflict {
          color: #ef4444;
        }
        .sudoku-cell.br {
          border-right: 2px solid rgba(251, 191, 36, 0.5);
        }
        .sudoku-cell.bb {
          border-bottom: 2px solid rgba(251, 191, 36, 0.5);
        }
        .sudoku-pad {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 6px;
          width: min(100%, 480px);
        }
        .sudoku-pad-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          aspect-ratio: 1 / 1;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.05);
          color: #fbbf24;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .sudoku-pad-btn:active {
          background: rgba(251, 191, 36, 0.25);
          transform: scale(0.95);
        }
        .sudoku-pad-btn.is-erase {
          color: #ef4444;
        }

        .sudoku-progress {
          width: min(100%, 480px);
          margin-top: 8px;
          padding: 14px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .sudoku-progress-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          opacity: 0.75;
          margin-bottom: 10px;
        }
        .sudoku-progress-empty {
          font-size: 12px;
          opacity: 0.55;
          text-align: center;
          padding: 8px 0;
        }
        .sudoku-progress-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .sudoku-progress-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .sudoku-progress-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
        }
        .sudoku-progress-name {
          font-weight: 600;
        }
        .sudoku-progress-count {
          color: #fbbf24;
          font-size: 12px;
        }
        .sudoku-progress-bar {
          height: 6px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          overflow: hidden;
        }
        .sudoku-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #fbbf24, #f97316);
          border-radius: 999px;
          transition: width 200ms ease;
        }
      `}</style>
    </main>
  );
}
