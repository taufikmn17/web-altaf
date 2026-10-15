import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const amount = searchParams.get("amount") ?? "10";
  const difficulty = searchParams.get("difficulty") ?? "medium";

  try {
    const url = new URL("https://the-trivia-api.com/v2/questions");
    url.searchParams.set("limit", amount);
    url.searchParams.set("difficulties", difficulty);
    url.searchParams.set("types", "text_choice");

    const res = await fetch(url.toString(), {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[trivia] API error:", res.status, errText);
      return NextResponse.json(
        { error: `Trivia API menolak (status ${res.status}).` },
        { status: res.status },
      );
    }

    const data = (await res.json()) as Array<{
      category: string;
      id: string;
      correctAnswer: string;
      incorrectAnswers: string[];
      question: { text: string };
      difficulty: string;
    }>;

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada soal dari API." },
        { status: 404 },
      );
    }

    // Normalisasi jadi format yang konsisten
    const questions = data.map((q) => {
      const options = [...q.incorrectAnswers, q.correctAnswer].sort(
        () => Math.random() - 0.5,
      );
      return {
        id: q.id,
        category: q.category,
        difficulty: q.difficulty,
        question: q.question.text,
        options,
        correct: q.correctAnswer,
      };
    });

    return NextResponse.json({ questions });
  } catch (err) {
    console.error("[trivia] Fetch error:", err);
    return NextResponse.json(
      { error: "Kesalahan jaringan saat hubungi API." },
      { status: 500 },
    );
  }
}
