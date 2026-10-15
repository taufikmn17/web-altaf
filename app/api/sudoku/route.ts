import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const key = process.env.API_NINJAS_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "API key belum diset di environment." },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(req.url);
  const difficulty = searchParams.get("difficulty") ?? "medium";
  const width = searchParams.get("width") ?? "3";
  const height = searchParams.get("height") ?? "3";

  try {
    const url = new URL("https://api.api-ninjas.com/v1/sudokugenerate");
    url.searchParams.set("difficulty", difficulty);
    url.searchParams.set("width", width);
    url.searchParams.set("height", height);

    const res = await fetch(url.toString(), {
      headers: { "X-Api-Key": key },
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[sudoku] API Ninjas error:", res.status, errText);
      return NextResponse.json(
        {
          error: `API Ninjas menolak (status ${res.status}).`,
          detail: errText.slice(0, 300),
        },
        { status: res.status },
      );
    }

    const data = (await res.json()) as {
      puzzle: (number | null)[][];
      solution: number[][];
    };

    if (!data.puzzle || !data.solution) {
      return NextResponse.json(
        { error: "Format respons API tidak sesuai." },
        { status: 502 },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[sudoku] Fetch error:", err);
    return NextResponse.json(
      {
        error: "Kesalahan jaringan saat hubungi API.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
