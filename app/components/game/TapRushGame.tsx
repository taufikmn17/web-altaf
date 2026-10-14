"use client";

import {
  ArrowLeft,
  Check,
  Copy,
  DoorOpen,
  Radio,
  Rocket,
  UsersRound,
  Zap,
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

const ROUND_DURATION_MS = 15_000;
const ROOM_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeRoomCode() {
  const values = new Uint32Array(6);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => ROOM_CHARACTERS[value % ROOM_CHARACTERS.length]).join("");
}

export default function TapRushGame() {
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
  const [roundEndsAt, setRoundEndsAt] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(ROUND_DURATION_MS);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!activeRoom || !supabase || !playerId) return;

    const channel = supabase.channel(`tap-rush:${activeRoom}`, {
      config: {
        broadcast: { self: false },
        presence: { key: playerId },
      },
    });
    channelRef.current = channel;

    channel.on("presence", { event: "sync" }, () => {
      const connectedPlayers = Object.values(
        channel.presenceState<RoomPlayer>()
      )
        .flat()
        .sort((left, right) => Number(right.isHost) - Number(left.isHost));

      setPlayers(connectedPlayers);
      setScores((currentScores) => {
        const nextScores: Record<string, number> = {};
        for (const player of connectedPlayers) {
          nextScores[player.id] = currentScores[player.id] ?? 0;
        }
        return nextScores;
      });
    });

    channel.on("broadcast", { event: "round-start" }, ({ payload }) => {
      const data = payload as { endsAt?: unknown };
      const endTime = Number(data.endsAt);
      if (!Number.isFinite(endTime)) return;

      setScores({});
      setRemainingMs(ROUND_DURATION_MS);
      setRoundEndsAt(endTime);
      setPhase("playing");
      setError("");
    });

    channel.on("broadcast", { event: "player-score" }, ({ payload }) => {
      const data = payload as { id?: unknown; score?: unknown };
      if (typeof data.id !== "string" || typeof data.score !== "number") return;
      setScores((currentScores) => ({ ...currentScores, [data.id as string]: data.score as number }));
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setIsConnected(true);
        setError("");
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setIsConnected(false);
        setError("Room belum tersambung. Periksa konfigurasi Supabase lalu coba lagi.");
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
    if (phase !== "playing" || roundEndsAt === null) return;

    const timer = setInterval(() => {
      const nextRemaining = Math.max(0, roundEndsAt - Date.now());
      setRemainingMs(nextRemaining);
      if (nextRemaining === 0) setPhase("results");
    }, 80);

    return () => clearInterval(timer);
  }, [phase, roundEndsAt]);

  const enterRoom = (roomCode: string, host: boolean) => {
    if (!supabase) {
      setError("Supabase belum dikonfigurasi. Tambahkan URL dan anon key untuk mengaktifkan room online.");
      return;
    }

    const name = playerName.trim();
    if (!name) {
      setError("Isi nama pemain dulu ya.");
      return;
    }

    setError("");
    setPlayerId(crypto.randomUUID());
    setPlayers([]);
    setScores({});
    setPhase("lobby");
    setRoundEndsAt(null);
    setIsReady(host);
    setIsHost(host);
    setActiveRoom(roomCode);
  };

  const handleJoinRoom = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const roomCode = roomInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (roomCode.length !== 6) {
      setError("Kode room terdiri dari 6 karakter.");
      return;
    }
    enterRoom(roomCode, false);
  };

  const startRound = () => {
    if (!isHost || players.length < 2 || !players.every((player) => player.isHost || player.ready)) {
      return;
    }

    const endsAt = Date.now() + ROUND_DURATION_MS;
    setScores({});
    setRemainingMs(ROUND_DURATION_MS);
    setRoundEndsAt(endsAt);
    setPhase("playing");
    void channelRef.current?.send({
      type: "broadcast",
      event: "round-start",
      payload: { endsAt },
    });
  };

  const registerTap = () => {
    if (phase !== "playing") return;

    const nextScore = (scores[playerId] ?? 0) + 1;
    setScores((currentScores) => ({ ...currentScores, [playerId]: nextScore }));
    void channelRef.current?.send({
      type: "broadcast",
      event: "player-score",
      payload: { id: playerId, score: nextScore },
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
    setScores({});
    setPhase("lobby");
    setRoundEndsAt(null);
    setError("");
  };

  const orderedPlayers = [...players].sort(
    (left, right) => (scores[right.id] ?? 0) - (scores[left.id] ?? 0)
  );
  const guestsReady = players.filter((player) => !player.isHost).every((player) => player.ready);
  const canStart = isHost && players.length >= 2 && guestsReady && isConnected;
  const secondsLeft = Math.ceil(remainingMs / 1000);

  return (
    <main className="tap-rush-shell">
      <div className="tap-rush-topbar">
        <Link href="/game" className="tap-rush-back">
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Semua game</span>
        </Link>
        <span className="tap-rush-season">ONLINE PARTY / 01</span>
      </div>

      <section className="tap-rush-layout">
        <header className="tap-rush-heading">
          <div className="tap-rush-kicker"><Zap size={14} /> REALTIME ROOM GAME</div>
          <h1>Tap Rush<span>!</span></h1>
          <p>15 detik. Satu tombol. Siapa paling sat-set?</p>
        </header>

        {!activeRoom ? (
          <section className="tap-rush-lobby">
            <div className="tap-rush-intro">
              <div className="tap-rush-orb" aria-hidden="true"><Rocket size={30} /></div>
              <div>
                <h2>Bikin room, ajak teman</h2>
                <p>Host buat kode room, teman masuk dengan kode yang sama. Siap semua? Mulai balapan tap.</p>
              </div>
            </div>

            <label className="tap-rush-label" htmlFor="tap-player-name">NAMA PEMAIN</label>
            <input
              id="tap-player-name"
              className="tap-rush-input"
              value={playerName}
              onChange={(event) => setPlayerName(event.target.value.slice(0, 18))}
              maxLength={18}
              placeholder="Contoh: Alya"
              autoComplete="nickname"
            />

            <div className="tap-rush-actions">
              <button
                className="tap-rush-primary"
                type="button"
                disabled={!supabase}
                onClick={() => enterRoom(makeRoomCode(), true)}
              >
                <Zap size={17} /> Buat room
              </button>
              <span className="tap-rush-or">ATAU</span>
              <form className="tap-rush-join" onSubmit={handleJoinRoom}>
                <input
                  className="tap-rush-input tap-rush-code-input"
                  value={roomInput}
                  onChange={(event) => setRoomInput(event.target.value.toUpperCase().slice(0, 6))}
                  maxLength={6}
                  placeholder="KODE ROOM"
                  aria-label="Kode room"
                  autoComplete="off"
                />
                <button className="tap-rush-secondary" type="submit" disabled={!supabase}>
                  Gabung
                </button>
              </form>
            </div>

            {!supabase && (
              <div className="tap-rush-setup" role="status">
                <Radio size={17} />
                <span>Room online belum aktif. Isi <code>NEXT_PUBLIC_SUPABASE_URL</code> dan <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> di environment lokal dan Vercel.</span>
              </div>
            )}
            {error && <p className="tap-rush-error" role="alert">{error}</p>}
          </section>
        ) : (
          <section className="tap-rush-room">
            <div className="tap-rush-roombar">
              <div>
                <span className="tap-rush-label">KODE ROOM</span>
                <button className="tap-rush-room-code" type="button" onClick={copyRoomCode}>
                  {activeRoom}<Copy size={15} aria-hidden="true" />
                </button>
                <span className="tap-rush-copy-note">{copied ? "Kode tersalin!" : "Bagikan kode ini ke teman"}</span>
              </div>
              <div className={`tap-rush-connection ${isConnected ? "is-online" : ""}`}>
                <span /> {isConnected ? "LIVE" : "MENGHUBUNGKAN"}
              </div>
            </div>

            {phase === "lobby" && (
              <div className="tap-rush-lobby-state">
                <div className="tap-rush-player-heading">
                  <h2><UsersRound size={20} /> Pemain di room</h2>
                  <span>{players.length} / 8</span>
                </div>
                <div className="tap-rush-player-list">
                  {players.length === 0 ? (
                    <div className="tap-rush-empty">Menyambungkan pemain…</div>
                  ) : players.map((player, index) => (
                    <div className="tap-rush-player" key={player.id}>
                      <span className="tap-rush-player-number">0{index + 1}</span>
                      <span className="tap-rush-player-name">{player.name}{player.id === playerId ? " (kamu)" : ""}</span>
                      {player.isHost ? <span className="tap-rush-host">HOST</span> : player.ready ? <span className="tap-rush-ready"><Check size={14} /> SIAP</span> : <span className="tap-rush-waiting">MENUNGGU</span>}
                    </div>
                  ))}
                </div>
                <div className="tap-rush-lobby-footer">
                  {isHost ? (
                    <button className="tap-rush-primary" type="button" disabled={!canStart} onClick={startRound}>
                      <Rocket size={17} /> {players.length < 2 ? "Menunggu teman" : guestsReady ? "Mulai balapan" : "Menunggu semua siap"}
                    </button>
                  ) : (
                    <button className={`tap-rush-primary ${isReady ? "is-ready" : ""}`} type="button" disabled={!isConnected} onClick={() => setIsReady((ready) => !ready)}>
                      <Check size={17} /> {isReady ? "Siap! (ubah)" : "Saya siap"}
                    </button>
                  )}
                  <button className="tap-rush-leave" type="button" onClick={leaveRoom}><DoorOpen size={16} /> Keluar</button>
                </div>
              </div>
            )}

            {phase === "playing" && (
              <div className="tap-rush-arena">
                <div className="tap-rush-timer" aria-live="polite">
                  <span>WAKTU</span>
                  <strong className={secondsLeft <= 5 ? "is-urgent" : ""}>{String(secondsLeft).padStart(2, "0")}</strong>
                </div>
                <p className="tap-rush-arena-prompt">TAP SECEPAT MUNGKIN</p>
                <button className="tap-rush-tap-button" type="button" onClick={registerTap}>
                  <Zap size={43} fill="currentColor" />
                  <span>TAP!</span>
                </button>
                <div className="tap-rush-my-score"><strong>{scores[playerId] ?? 0}</strong><span>tap kamu</span></div>
              </div>
            )}

            {phase === "results" && (
              <div className="tap-rush-results">
                <div className="tap-rush-finish-mark">FINISH</div>
                <h2>Jempol siapa paling kencang?</h2>
                <ol className="tap-rush-scoreboard">
                  {orderedPlayers.map((player, index) => (
                    <li className={index === 0 ? "is-winner" : ""} key={player.id}>
                      <span className="tap-rush-rank">{String(index + 1).padStart(2, "0")}</span>
                      <span className="tap-rush-player-name">{player.name}{player.id === playerId ? " (kamu)" : ""}</span>
                      <strong>{scores[player.id] ?? 0}</strong>
                    </li>
                  ))}
                </ol>
                <div className="tap-rush-lobby-footer">
                  {isHost && <button className="tap-rush-primary" type="button" disabled={!canStart} onClick={startRound}><Rocket size={17} /> Main lagi</button>}
                  {!isHost && <span className="tap-rush-waiting-host">Host yang memulai ronde berikutnya</span>}
                  <button className="tap-rush-leave" type="button" onClick={leaveRoom}><DoorOpen size={16} /> Keluar</button>
                </div>
              </div>
            )}
            {error && <p className="tap-rush-error" role="alert">{error}</p>}
          </section>
        )}

        <footer className="tap-rush-footnote">
          <span>NO DOWNLOAD</span><span>ROOM CODE PARTY</span><span>15 SECOND ROUND</span>
        </footer>
      </section>
    </main>
  );
}
