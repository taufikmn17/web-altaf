import { timingSafeEqual } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

type SheetName = "destinasi" | "kuliner";

export async function POST(request: Request) {
  const expectedSecret = process.env.SHEETS_REVALIDATE_SECRET;
  if (!expectedSecret) {
    return NextResponse.json(
      { error: "Revalidation is not configured" },
      { status: 503 }
    );
  }

  const authorization = request.headers.get("authorization") ?? "";
  const providedSecret = authorization.match(/^Bearer\s+(.+)$/i)?.[1] ?? "";
  const expectedBytes = Buffer.from(expectedSecret);
  const providedBytes = Buffer.from(providedSecret);

  if (
    expectedBytes.length !== providedBytes.length ||
    !timingSafeEqual(expectedBytes, providedBytes)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sheet =
    body && typeof body === "object" && "sheet" in body
      ? body.sheet
      : undefined;

  if (sheet !== "destinasi" && sheet !== "kuliner") {
    return NextResponse.json({ error: "Unsupported sheet" }, { status: 400 });
  }

  const sheetName: SheetName = sheet;
  revalidateTag(`google-sheet:${sheetName}`, { expire: 0 });
  revalidatePath("/", "page");
  revalidatePath(sheetName === "destinasi" ? "/destinasi" : "/kuliner", "page");

  return NextResponse.json({ revalidated: true, sheet: sheetName });
}