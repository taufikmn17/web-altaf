interface SheetRow {
  [key: string]: unknown;
}

export interface DestinationItem {
  id: string;
  src: string;
  title: string;
  tag: string;
  desc: string;
  geo: string;
}

export interface CulinaryItem {
  id: string;
  src: string;
  title: string;
  rating: string;
  tag: string;
  desc: string;
  geo: string;
  status: string;
}

const SHEETS_REVALIDATE_SECONDS = 3600;

async function fetchSheetRows(sheet: "destinasi" | "kuliner"): Promise<SheetRow[]> {
  const scriptUrl = process.env.GOOGLE_SCRIPT_URL?.trim();
  if (!scriptUrl) {
    throw new Error("GOOGLE_SCRIPT_URL is not configured");
  }

  const targetUrl = new URL(scriptUrl);
  targetUrl.searchParams.set("sheet", sheet);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(targetUrl, {
        next: {
          revalidate: SHEETS_REVALIDATE_SECONDS,
          tags: [`google-sheet:${sheet}`],
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        throw new Error(`Google Sheets returned HTTP ${response.status}`);
      }

      const data: unknown = await response.json();
      if (
        !Array.isArray(data) ||
        (typeof data === "object" && data !== null && "error" in data)
      ) {
        throw new Error(`Google Sheets returned invalid data for ${sheet}`);
      }

      return data.filter(
        (row): row is SheetRow =>
          typeof row === "object" && row !== null && !Array.isArray(row)
      );
    } catch (error) {
      if (attempt === 1) {
        console.error(`Failed to load Google Sheets data for ${sheet}:`, error);
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  return [];
}

function readString(row: SheetRow, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = row[key];
    if (value !== null && value !== undefined && String(value).trim()) {
      return String(value);
    }
  }

  return fallback;
}

function formatDriveImage(url: string) {
  const cleanUrl = url.trim();
  if (!cleanUrl.includes("drive.google.com")) return cleanUrl;

  const fileId =
    cleanUrl.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] ??
    cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1];

  return fileId ? `https://lh3.googleusercontent.com/d/${fileId}` : cleanUrl;
}

export async function getDestinations(): Promise<DestinationItem[]> {
  const rows = await fetchSheetRows("destinasi");

  return rows
    .map((row, index) => ({
      id: index.toString(),
      src: formatDriveImage(readString(row, ["src", "image", "foto", "gambar"])),
      title: readString(row, ["title", "nama", "judul"], "Tanpa Judul"),
      tag: readString(row, ["tag", "category", "kategori"], "Destinasi"),
      desc: readString(row, ["desc", "description", "deskripsi"]),
      geo: readString(row, ["geo", "location", "lokasi"]),
    }))
    .reverse();
}

export async function getCulinaries(): Promise<CulinaryItem[]> {
  const rows = await fetchSheetRows("kuliner");

  return rows
    .map((row, index) => ({
      id: index.toString(),
      src: formatDriveImage(readString(row, ["src", "image", "foto", "gambar"])),
      title: readString(row, ["title", "nama", "judul"], "Tanpa Judul"),
      rating: readString(row, ["rating", "skor"], "5.0"),
      tag: readString(row, ["tag", "category", "kategori"], "Kuliner"),
      desc: readString(row, ["desc", "description", "deskripsi"]),
      geo: readString(row, ["geo", "location", "lokasi"]),
      status: readString(row, ["status", "state"], "Favorite"),
    }))
    .reverse();
}