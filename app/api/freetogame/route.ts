import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") ?? "";
  const platform = searchParams.get("platform") ?? "";
  const sortBy = searchParams.get("sort-by") ?? "";

  try {
    const url = new URL("https://www.freetogame.com/api/games");
    if (category) url.searchParams.set("category", category);
    if (platform) url.searchParams.set("platform", platform);
    if (sortBy) url.searchParams.set("sort-by", sortBy);

    const res = await fetch(url.toString(), {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[freetogame] API error:", res.status, errText);
      return NextResponse.json(
        { error: `FreeToGame API menolak (status ${res.status}).` },
        { status: res.status },
      );
    }

    const data = (await res.json()) as Array<{
      id: number;
      title: string;
      thumbnail: string;
      short_description: string;
      game_url: string;
      genre: string;
      platform: string;
      publisher: string;
      developer: string;
      release_date: string;
      freetogame_profile_url: string;
    }>;

    // Filter hanya game multiplayer/online
    const multiplayerGenres = [
      "MMORPG",
      "MMO",
      "Shooter",
      "MMOFPS",
      "MMOTPS",
      "MOBA",
      "Battle Royale",
      "PvP",
      "Social",
      "MMORTS",
      "Fantasy",
      "Action RPG",
      "Strategy",
    ];

    const filtered = data.filter((g) =>
      multiplayerGenres.some((mg) =>
        g.genre.toLowerCase().includes(mg.toLowerCase()),
      ),
    );

    return NextResponse.json({ games: filtered });
  } catch (err) {
    console.error("[freetogame] Fetch error:", err);
    return NextResponse.json(
      { error: "Kesalahan jaringan saat hubungi API." },
      { status: 500 },
    );
  }
}
