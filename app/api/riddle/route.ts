import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.API_NINJAS_KEY;
  if (!key) {
    return NextResponse.json({ error: "API key belum diset" }, { status: 500 });
  }
  try {
    const res = await fetch("https://api.api-ninjas.com/v1/riddles?limit=1", {
      headers: { "X-Api-Key": key },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Gagal ambil teka-teki" },
        { status: res.status },
      );
    }
    const data = (await res.json()) as Array<{
      title: string;
      question: string;
      answer: string;
    }>;
    if (!data.length) {
      return NextResponse.json(
        { error: "Tidak ada teka-teki" },
        { status: 404 },
      );
    }
    return NextResponse.json(data[0]);
  } catch {
    return NextResponse.json({ error: "Kesalahan jaringan" }, { status: 500 });
  }
}
