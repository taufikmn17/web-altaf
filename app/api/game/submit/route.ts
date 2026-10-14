import { NextResponse } from "next/server";

const SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || "";
const SCRIPT_SECRET = process.env.GOOGLE_SCRIPT_SECRET || "";

function sanitizeScorePayload(rawBody: unknown) {
  if (!rawBody || typeof rawBody !== "object") {
    return null;
  }

  const body = rawBody as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const score = Number(body.score);

  if (!name || name.length > 30 || !Number.isFinite(score) || score < 0) {
    return null;
  }

  return {
    sheet: typeof body.sheet === "string" ? body.sheet : "gamekicau",
    name,
    score,
    timestamp: new Date().toISOString(),
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = sanitizeScorePayload(body);

    if (!payload) {
      return NextResponse.json(
        { error: "Data leaderboard tidak valid." },
        { status: 400 }
      );
    }

    if (!SCRIPT_URL) {
      return NextResponse.json(
        { error: "Google Script URL belum dikonfigurasi." },
        { status: 500 }
      );
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (SCRIPT_SECRET) {
      headers["x-api-key"] = SCRIPT_SECRET;
    }

    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { error: result?.error || "Gagal menyimpan skor" },
        { status: response.status || 500 }
      );
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Gagal menyimpan skor" },
      { status: 500 }
    );
  }
}
