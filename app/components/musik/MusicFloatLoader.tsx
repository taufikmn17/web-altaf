import MusicFloat from "./MusicFloat";
import { getDestinations } from "@/app/lib/google-sheets";

export default async function MusicFloatLoader() {
  let photos: string[] = [];

  try {
    const destinations = await getDestinations();

    photos = destinations
      .map((d) => d.src)
      .filter(Boolean)
      .slice(0, 14); // batasi agar overlay tetap ringan
  } catch (err) {
    console.error("Gagal memuat foto musik:", err);
    photos = [];
  }

  return <MusicFloat photos={photos} />;
}
