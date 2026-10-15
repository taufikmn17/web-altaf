import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_BASE = "https://api.restcountries.com/countries/v5";

export async function GET() {
  const apiKey = process.env.REST_COUNTRIES_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "REST_COUNTRIES_API_KEY belum diset di environment" },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(`${API_BASE}?limit=100`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Upstream ${res.status}`, detail: text.slice(0, 400) },
        { status: 502 },
      );
    }

    const json = await res.json();
    const list = json?.data?.objects ?? [];

    if (!Array.isArray(list) || list.length === 0) {
      return NextResponse.json(
        { error: "Upstream returned empty data" },
        { status: 502 },
      );
    }

    const normalized = list
      .map((c: any) => {
        const common = c?.names?.common ?? "";
        const indonesian = c?.names?.translations?.ind?.common ?? "";

        // Kode ISO 2 huruf, coba beberapa kemungkinan field
        const code = (
          c?.codes?.alpha_2 ??
          c?.codes?.alpha2 ??
          c?.cca2 ??
          c?.code ??
          ""
        )
          .toString()
          .toLowerCase();

        // Pakai flagcdn kalau kode tersedia, fallback ke emoji
        const png = code
          ? `https://flagcdn.com/w320/${code}.png`
          : (c?.flag?.url_png ?? "");
        const emoji = c?.flag?.emoji ?? "";

        return {
          name: { common: String(common) },
          translations: indonesian
            ? { ind: { common: String(indonesian) } }
            : undefined,
          flags: { emoji: String(emoji), png: String(png) },
        };
      })
      .filter(
        (c: any) => c.name.common.trim() !== "" && c.flags.png.trim() !== "",
      );

    return NextResponse.json(normalized);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch countries", detail: String(err) },
      { status: 500 },
    );
  }
}
