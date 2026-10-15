// Nama 38 provinsi Indonesia + URL lambang dari Wikimedia Commons
// Sumber: Wikipedia Indonesia
export type ProvinceData = {
  name: string;
  aliases: string[];
  emblem: string; // URL gambar Wikimedia
};

export const PROVINCES_ID: ProvinceData[] = [
  {
    name: "Aceh",
    aliases: ["aceh", "nad", "serambimekkah"],
    emblem:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Coat_of_arms_of_Aceh.svg/240px-Coat_of_arms_of_Aceh.svg.png",
  },
  {
    name: "Sumatera Utara",
    aliases: ["sumut", "sumaterautara", "sumatrautara"],
    emblem:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Coat_of_arms_of_North_Sumatra.svg/240px-Coat_of_arms_of_North_Sumatra.svg.png",
  },
  {
    name: "Sumatera Barat",
    aliases: ["sumbar", "sumaterabarat", "sumatrabarat"],
    emblem:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Coat_of_arms_of_West_Sumatra.svg/240px-Coat_of_arms_of_West_Sumatra.svg.png",
  },
  {
    name: "Riau",
    aliases: ["riau"],
    emblem:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Coat_of_arms_of_Riau.svg/240px-Coat_of_arms_of_Riau.svg.png",
  },
  {
    name: "Kepulauan Riau",
    aliases: ["kepri", "kepulauanriau"],
    emblem:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Coat_of_arms_of_Riau_Islands.svg/240px-Coat_of_arms_of_Riau_Islands.svg.png",
  },
  {
    name: "Jambi",
    aliases: ["jambi"],
    emblem:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Coat_of_arms_of_Jambi.svg/240px-Coat_of_arms_of_Jambi.svg.png",
  },
  {
    name: "Bengkulu",
    aliases: ["bengkulu"],
    emblem:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Coat_of_arms_of_Bengkulu.svg/240px-Coat_of_arms_of_Bengkulu.svg.png",
  },
  {
    name: "Sumatera Selatan",
    aliases: ["sumsel", "sumateraselatan", "sumatraselatan"],
    emblem:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Coat_of_arms_of_South_Sumatra.svg/240px-Coat_of_arms_of_South_Sumatra.svg.png",
  },
  {
    name: "Kepulauan Bangka Belitung",
    aliases: ["babel", "bangkabelitung", "kepulauanbangkabelitung"],
    emblem:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Coat_of_arms_of_Bangka_Belitung_Islands.svg/240px-Coat_of_arms_of_Bangka_Belitung_Islands.svg.png",
  },
  {
    name: "Lampung",
    aliases: ["lampung"],
    emblem:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Coat_of_arms_of_Lampung.svg/240px-Coat_of_arms_of_Lampung.svg.png",
  },
  {
    name: "Banten",
    aliases: ["banten"],
    emblem:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Coat_of_arms_of_Banten.svg/240px-Coat_of_arms_of_Banten.svg.png",
  },
  {
    name: "DKI Jakarta",
    aliases: ["jakarta", "dki", "dkijakarta"],
    emblem:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Coat_of_arms_of_Jakarta.svg/240px-Coat_of_arms_of_Jakarta.svg.png",
  },
  {
    name: "Jawa Barat",
    aliases: ["jabar", "jawabarat"],
    emblem:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Coat_of_arms_of_West_Java.svg/240px-Coat_of_arms_of_West_Java.svg.png",
  },
  {
    name: "Jawa Tengah",
    aliases: ["jateng", "jawatengah"],
    emblem:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Coat_of_arms_of_Central_Java.svg/240px-Coat_of_arms_of_Central_Java.svg.png",
  },
  {
    name: "DI Yogyakarta",
    aliases: ["yogyakarta", "jogja", "jogjakarta", "diy"],
    emblem:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Coat_of_arms_of_Yogyakarta.svg/240px-Coat_of_arms_of_Yogyakarta.svg.png",
  },
  {
    name: "Jawa Timur",
    aliases: ["jatim", "jawatimur"],
    emblem:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Coat_of_arms_of_East_Java.svg/240px-Coat_of_arms_of_East_Java.svg.png",
  },
  {
    name: "Bali",
    aliases: ["bali"],
    emblem:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Coat_of_arms_of_Bali.svg/240px-Coat_of_arms_of_Bali.svg.png",
  },
  {
    name: "Nusa Tenggara Barat",
    aliases: ["ntb", "nusatenggarabarat"],
    emblem:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Coat_of_arms_of_West_Nusa_Tenggara.svg/240px-Coat_of_arms_of_West_Nusa_Tenggara.svg.png",
  },
  {
    name: "Nusa Tenggara Timur",
    aliases: ["ntt", "nusatenggaratimur"],
    emblem:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Coat_of_arms_of_East_Nusa_Tenggara.svg/240px-Coat_of_arms_of_East_Nusa_Tenggara.svg.png",
  },
  {
    name: "Kalimantan Barat",
    aliases: ["kalbar", "kalimantanbarat"],
    emblem:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Coat_of_arms_of_West_Kalimantan.svg/240px-Coat_of_arms_of_West_Kalimantan.svg.png",
  },
  {
    name: "Kalimantan Tengah",
    aliases: ["kalteng", "kalimantantengah"],
    emblem:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Coat_of_arms_of_Central_Kalimantan.svg/240px-Coat_of_arms_of_Central_Kalimantan.svg.png",
  },
  {
    name: "Kalimantan Selatan",
    aliases: ["kalsel", "kalimantanselatan"],
    emblem:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Coat_of_arms_of_South_Kalimantan.svg/240px-Coat_of_arms_of_South_Kalimantan.svg.png",
  },
  {
    name: "Kalimantan Timur",
    aliases: ["kaltim", "kalimantantimur"],
    emblem:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Coat_of_arms_of_East_Kalimantan.svg/240px-Coat_of_arms_of_East_Kalimantan.svg.png",
  },
  {
    name: "Kalimantan Utara",
    aliases: ["kaltara", "kalimantanutara"],
    emblem:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Coat_of_arms_of_North_Kalimantan.svg/240px-Coat_of_arms_of_North_Kalimantan.svg.png",
  },
  {
    name: "Sulawesi Utara",
    aliases: ["sulut", "sulawesiutara"],
    emblem:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Coat_of_arms_of_North_Sulawesi.svg/240px-Coat_of_arms_of_North_Sulawesi.svg.png",
  },
  {
    name: "Gorontalo",
    aliases: ["gorontalo"],
    emblem:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Coat_of_arms_of_Gorontalo.svg/240px-Coat_of_arms_of_Gorontalo.svg.png",
  },
  {
    name: "Sulawesi Tengah",
    aliases: ["sulteng", "sulawesitengah"],
    emblem:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Coat_of_arms_of_Central_Sulawesi.svg/240px-Coat_of_arms_of_Central_Sulawesi.svg.png",
  },
  {
    name: "Sulawesi Barat",
    aliases: ["sulbar", "sulawesibarat"],
    emblem:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Coat_of_arms_of_West_Sulawesi.svg/240px-Coat_of_arms_of_West_Sulawesi.svg.png",
  },
  {
    name: "Sulawesi Selatan",
    aliases: ["sulsel", "sulawesiselatan"],
    emblem:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Coat_of_arms_of_South_Sulawesi.svg/240px-Coat_of_arms_of_South_Sulawesi.svg.png",
  },
  {
    name: "Sulawesi Tenggara",
    aliases: ["sultra", "sulawesitenggara"],
    emblem:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Coat_of_arms_of_Southeast_Sulawesi.svg/240px-Coat_of_arms_of_Southeast_Sulawesi.svg.png",
  },
  {
    name: "Maluku",
    aliases: ["maluku"],
    emblem:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Coat_of_arms_of_Maluku.svg/240px-Coat_of_arms_of_Maluku.svg.png",
  },
  {
    name: "Maluku Utara",
    aliases: ["malut", "malukuutara"],
    emblem:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Coat_of_arms_of_North_Maluku.svg/240px-Coat_of_arms_of_North_Maluku.svg.png",
  },
  {
    name: "Papua",
    aliases: ["papua"],
    emblem:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Coat_of_arms_of_Papua_%28Indonesia%29.svg/240px-Coat_of_arms_of_Papua_%28Indonesia%29.svg.png",
  },
  {
    name: "Papua Barat",
    aliases: ["papuabarat", "pabar"],
    emblem:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Coat_of_arms_of_West_Papua.svg/240px-Coat_of_arms_of_West_Papua.svg.png",
  },
  {
    name: "Papua Barat Daya",
    aliases: ["papuabaratdaya"],
    emblem:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Coat_of_arms_of_Southwest_Papua.svg/240px-Coat_of_arms_of_Southwest_Papua.svg.png",
  },
  {
    name: "Papua Tengah",
    aliases: ["papuatengah"],
    emblem:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Coat_of_arms_of_Central_Papua.svg/240px-Coat_of_arms_of_Central_Papua.svg.png",
  },
  {
    name: "Papua Pegunungan",
    aliases: ["papuapegunungan"],
    emblem:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Coat_of_arms_of_Highland_Papua.svg/240px-Coat_of_arms_of_Highland_Papua.svg.png",
  },
  {
    name: "Papua Selatan",
    aliases: ["papuaselatan"],
    emblem:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Coat_of_arms_of_South_Papua.svg/240px-Coat_of_arms_of_South_Papua.svg.png",
  },
];

export function normalizeProvince(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/^(provinsi|daerahistimewa|di|dki|daerahkhususibukota)/, "");
}

export function isAnswerCorrect(input: string, answer: string): boolean {
  const normalized = normalizeProvince(input);
  const province = PROVINCES_ID.find((p) => p.name === answer);
  if (!province) return false;
  return province.aliases.some(
    (alias) => normalizeProvince(alias) === normalized,
  );
}
