import monumentImg from "@/assets/cat-monument.jpg";
import artFormImg from "@/assets/cat-art-form.jpg";
import festivalImg from "@/assets/cat-festival.jpg";
import craftImg from "@/assets/cat-craft.jpg";

export type Category = "monument" | "art_form" | "festival" | "craft";
export type BeliefType =
  | "local_belief"
  | "traditional_story"
  | "cultural_practice"
  | "community_perspective";
export type ItemStatus = "pending" | "verified" | "rejected";

export type HeritageItem = {
  id: string;
  name: string;
  category: Category;
  city: string;
  region: string;
  latitude: number;
  longitude: number;
  description: string;
  significance: string | null;
  image_url: string | null;
  festival_date: string | null;
  status: ItemStatus;
  is_hidden_gem: boolean;
  contributor_name: string | null;
  created_at: string;
};

export type LocalStory = {
  id: string;
  heritage_item_id: string;
  story_text: string;
  belief_type: BeliefType;
  contributor_name: string | null;
  status: ItemStatus;
  created_at: string;
};

export const CATEGORIES: {
  value: Category;
  label: string;
  glyph: string;
  image: string;
  colorVar: string;
}[] = [
  {
    value: "monument",
    label: "Monuments",
    glyph: "◈",
    image: monumentImg,
    colorVar: "var(--monument)",
  },
  {
    value: "art_form",
    label: "Art Forms",
    glyph: "❧",
    image: artFormImg,
    colorVar: "var(--art-form)",
  },
  {
    value: "festival",
    label: "Festivals",
    glyph: "✺",
    image: festivalImg,
    colorVar: "var(--festival)",
  },
  { value: "craft", label: "Crafts", glyph: "✻", image: craftImg, colorVar: "var(--craft)" },
];

export const BELIEF_LABELS: Record<BeliefType, string> = {
  local_belief: "Local belief",
  traditional_story: "Traditional story",
  cultural_practice: "Cultural practice",
  community_perspective: "Community perspective",
};

export function categoryMeta(category: Category) {
  return CATEGORIES.find((c) => c.value === category) ?? CATEGORIES[0]!;
}

export function categoryLabel(category: Category) {
  return categoryMeta(category).label.replace(/s$/, "");
}

export function itemImage(item: Pick<HeritageItem, "image_url" | "category">) {
  return item.image_url || categoryMeta(item.category).image;
}

/** Haversine great-circle distance in kilometres. */
export function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  if (km < 100) return `${km.toFixed(1)} km away`;
  return `${Math.round(km)} km away`;
}

/** Days until the festival date, ignoring the stored year. */
export function daysUntilFestival(festivalDate: string | null, today = new Date()) {
  if (!festivalDate) return null;
  const parts = festivalDate.split("-").map(Number);
  const month = parts[1];
  const day = parts[2];
  if (!month || !day) return null;
  const base = new Date(today.getFullYear(), month - 1, day);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let diff = Math.round((base.getTime() - start.getTime()) / 86400000);
  if (diff < -14) {
    const next = new Date(today.getFullYear() + 1, month - 1, day);
    diff = Math.round((next.getTime() - start.getTime()) / 86400000);
  }
  return diff;
}

export function isHappeningNow(item: HeritageItem, today = new Date()) {
  const days = daysUntilFestival(item.festival_date, today);
  return days !== null && days >= -3 && days <= 10;
}

export function happeningLabel(item: HeritageItem, today = new Date()) {
  const days = daysUntilFestival(item.festival_date, today);
  if (days === null) return null;
  if (days < 0) return `${item.name} is happening right now in ${item.city}`;
  if (days === 0) return `${item.name} is happening today in ${item.city}`;
  if (days === 1) return `${item.name} begins tomorrow in ${item.city}`;
  return `${item.name} is happening in ${days} days in ${item.city}`;
}

export const INDIA_CENTER: [number, number] = [22.5, 79.5];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** The next calendar date this festival falls on, from `from` onwards. */
export function nextOccurrence(festivalDate: string | null, from = new Date()) {
  if (!festivalDate) return null;
  const parts = festivalDate.split("-").map(Number);
  const month = parts[1];
  const day = parts[2];
  if (!month || !day) return null;
  const base = startOfDay(from);
  let next = new Date(base.getFullYear(), month - 1, day);
  if (next.getTime() < base.getTime()) {
    next = new Date(base.getFullYear() + 1, month - 1, day);
  }
  return next;
}

export function formatDay(date: Date) {
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "14 Sep 2026 · in 12 days" — null when no date is known. */
export function festivalDateLabel(item: HeritageItem, from = new Date()) {
  const next = nextOccurrence(item.festival_date, from);
  if (!next) return null;
  const days = Math.round((next.getTime() - startOfDay(from).getTime()) / 86400000);
  if (days === 0) return `${formatDay(next)} · today`;
  if (days === 1) return `${formatDay(next)} · tomorrow`;
  return `${formatDay(next)} · in ${days} days`;
}

/** Does this item's date fall inside the traveller's chosen window? */
/** The exact date this item falls on inside the window, or null. */
export function occurrenceInRange(item: HeritageItem, start: string, end: string) {
  if (!item.festival_date || !start || !end) return null;
  const parts = item.festival_date.split("-").map(Number);
  const month = parts[1];
  const day = parts[2];
  if (!month || !day) return null;
  const from = new Date(`${start}T00:00:00`);
  const to = new Date(`${end}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  for (let year = from.getFullYear(); year <= to.getFullYear() + 1; year += 1) {
    const occ = new Date(year, month - 1, day);
    if (occ.getTime() >= from.getTime() && occ.getTime() <= to.getTime()) return occ;
  }
  return null;
}

export function occursBetween(item: HeritageItem, start: string, end: string) {
  return occurrenceInRange(item, start, end) !== null;
}

export function toDateKey(date: Date) {
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

export function formatDayLong(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
