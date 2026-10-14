import { NextResponse } from "next/server";

const SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || "";

export async function GET() {
  try {
    if (!SCRIPT_URL) {
      return NextResponse.json([], { status: 200 });
    }

    const response = await fetch(`${SCRIPT_URL}?sheet=gamekicau`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json([], { status: 200 });
    }

    const data = await response.json().catch(() => []);
    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
