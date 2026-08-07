import { NextResponse } from "next/server";

const SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || "";

// GET: Untuk mengambil data dari Google Sheets
export async function GET() {
  try {
    const response = await fetch(SCRIPT_URL);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Gagal memuat data" }, { status: 500 });
  }
}

// POST: Untuk mengirim data baru ke Google Sheets
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Kirim data ke Google Sheets dari sisi Server (URL aman dari publik)
    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal menyimpan data" },
      { status: 500 }
    );
  }
}
