import { NextResponse } from "next/server";

const SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || "";
const SCRIPT_SECRET = process.env.GOOGLE_SCRIPT_SECRET || "";

const MAX_WISH_LENGTH = 150;

function sanitizeWishPayload(rawBody: unknown) {
  if (!rawBody || typeof rawBody !== "object") {
    return null;
  }

  const body = rawBody as Record<string, unknown>;
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const color = body.color === "amber" ? "amber" : "pink";

  if (!text || text.length > MAX_WISH_LENGTH) {
    return null;
  }

  return {
    sheet: typeof body.sheet === "string" ? body.sheet : "lentera",
    text,
    color,
    date: new Date().toISOString(),
    timestamp: new Date().toISOString(),
  };
}

export async function GET() {
  try {
    if (!SCRIPT_URL) {
      return NextResponse.json([], { status: 200 });
    }

    const targetUrl = new URL(SCRIPT_URL);
    targetUrl.searchParams.set("sheet", "lentera");

    const response = await fetch(targetUrl);
    if (!response.ok) {
      return NextResponse.json([], { status: 200 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = sanitizeWishPayload(body);

    if (!payload) {
      return NextResponse.json(
        { error: "Data harapan tidak valid atau terlalu panjang." },
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
        { error: result?.error || "Gagal menyimpan data" },
        { status: response.status || 500 }
      );
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Gagal menyimpan data" },
      { status: 500 }
    );
  }
}
