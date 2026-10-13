// "epic" -> "epic Egg": adds the missing "Egg" suffix (same style as the seeded names, e.g. "common Egg").
// Names that already end with the word "egg" (any case) are left as they are, only trimmed.
export function normalizeEggName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  return /(^|\s)egg$/i.test(trimmed) ? trimmed : `${trimmed} Egg`;
}

// The first word of the egg name decides the rarity: "epic Egg" -> "epic".
// `rarities` is the list of rarity names the admin has created; returns null when the first word isn't one of them.
export function rarityFromEggName(eggName: string, rarities: string[]): string | null {
  const first = eggName.trim().split(/\s+/)[0]?.toLowerCase();
  return rarities.find((r) => r.toLowerCase() === first) ?? null;
}
