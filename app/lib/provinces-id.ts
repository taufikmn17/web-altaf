// Urutan index 1-38 mengikuti API symbolsofIndonesia
// Sumber: https://github.com/feri-irawan/lambang-daerah-seluruh-indonesia
export const PROVINCES_ID = [
  "Aceh",
  "Sumatera Utara",
  "Sumatera Barat",
  "Riau",
  "Kepulauan Riau",
  "Jambi",
  "Bengkulu",
  "Sumatera Selatan",
  "Kepulauan Bangka Belitung",
  "Lampung",
  "Banten",
  "DKI Jakarta",
  "Jawa Barat",
  "Jawa Tengah",
  "DI Yogyakarta",
  "Jawa Timur",
  "Bali",
  "Nusa Tenggara Barat",
  "Nusa Tenggara Timur",
  "Kalimantan Barat",
  "Kalimantan Tengah",
  "Kalimantan Selatan",
  "Kalimantan Timur",
  "Kalimantan Utara",
  "Sulawesi Utara",
  "Gorontalo",
  "Sulawesi Tengah",
  "Sulawesi Barat",
  "Sulawesi Selatan",
  "Sulawesi Tenggara",
  "Maluku",
  "Maluku Utara",
  "Papua",
  "Papua Barat",
  "Papua Barat Daya",
  "Papua Tengah",
  "Papua Pegunungan",
  "Papua Selatan",
];

// Normalisasi biar "DI Yogyakarta" = "yogyakarta" = "diy"
export function normalizeProvince(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/^(provinsi|daerahistimewa|di|dki|daerahkhususibukota)/, "");
}

export function getProvinceAliases(province: string): string[] {
  const base = province.toLowerCase();
  const aliases = new Set<string>([base]);

  // Tambah alias tanpa prefix "DI"/"DKI"/"Provinsi"
  aliases.add(
    base.replace(
      /^(provinsi|daerah istimewa|di|dki|daerah khusus ibukota)\s+/i,
      "",
    ),
  );

  // Singkatan umum
  if (/yogyakarta/.test(base)) aliases.add("jogja");
  if (/jakarta/.test(base)) aliases.add("jakarta");
  if (/aceh/.test(base)) aliases.add("nad");
  if (/sumatera/.test(base)) aliases.add(base.replace(/sumatera/g, "sumatra"));
  if (/sumatra/.test(base)) aliases.add(base.replace(/sumatra/g, "sumatera"));

  return Array.from(aliases).map(normalizeProvince);
}
