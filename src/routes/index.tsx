import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useRef } from "react";
import { LocateFixed, Search, Map as MapIcon, List } from "lucide-react";
import { toast } from "sonner";
import { useVirtualizer } from "@tanstack/react-virtual";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapCanvas } from "@/components/MapCanvas";
import { ItemCard } from "@/components/ItemCard";
import { TripPlanner } from "@/components/TripPlanner";
import { IntroCover } from "@/components/IntroCover";
import {
  CATEGORIES,
  INDIA_CENTER,
  distanceKm,
  happeningLabel,
  isHappeningNow,
  type Category,
  type HeritageItem,
} from "@/lib/heritage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Virasat Map — Explore India's living heritage" },
      {
        name: "description",
        content:
          "A map-first guide to India's monuments, art forms, festivals and crafts, including lesser-known local traditions and the stories communities tell about them.",
      },
      { property: "og:title", content: "Virasat Map — Explore India's living heritage" },
      {
        property: "og:description",
        content:
          "Find heritage near you or search any city, and read the local stories behind each place.",
      },
    ],
  }),
  component: HomePage,
});

type Coords = { latitude: number; longitude: number };

function HomePage() {
  const navigate = useNavigate();
  const [active, setActive] = useState<Category[]>([]);
  const [center, setCenter] = useState<[number, number]>(INDIA_CENTER);
  const [zoom, setZoom] = useState(5);
  const [userLocation, setUserLocation] = useState<Coords | null>(null);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"map" | "list">("map");

  const itemsQuery = useQuery({
    queryKey: ["heritage-items"],
    queryFn: async () => {
      // Optimization: Only select needed fields
      const { data, error } = await supabase
        .from("heritage_items")
        .select("id, name, category, city, region, latitude, longitude, description, image_url, festival_date, status, is_hidden_gem")
        .eq("status", "verified")
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as HeritageItem[];
    },
  });

  const items = itemsQuery.data ?? [];

  const filtered = useMemo(() => {
    let base = active.length ? items.filter((i) => active.includes(i.category)) : items;
    const anchor = userLocation ?? { latitude: center[0], longitude: center[1] };
    return base
      .map((item) => ({ item, distance: distanceKm(anchor, item) }))
      .sort((a, b) => a.distance - b.distance);
  }, [items, active, userLocation, center]);

  const happening = useMemo(() => {
    const near = filtered.filter((row) => isHappeningNow(row.item));
    return near[0] ?? null;
  }, [filtered]);

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 110, // Approximate height of ItemCard
    overscan: 5,
  });

  function toggleCategory(value: Category) {
    setActive((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value],
    );
  }

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      toast.error("Your browser can't share a location.");
      return;
    }
    toast.info("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setUserLocation(coords);
        setCenter([coords.latitude, coords.longitude]);
        setZoom(9);
        toast.success("Showing heritage nearest to you.");
      },
      () => toast.error("Location permission was declined."),
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }

  async function searchPlace(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(
          query.trim(),
        )}`,
        { headers: { Accept: "application/json" } },
      );
      const results = (await res.json()) as { lat: string; lon: string; display_name: string }[];
      const hit = results[0];
      if (!hit) {
        toast.error(`Couldn't find "${query}".`);
        return;
      }
      setCenter([Number(hit.lat), Number(hit.lon)]);
      setZoom(9);
      setUserLocation(null);
      toast.success(`Showing ${hit.display_name.split(",")[0]}`);
    } catch {
      toast.error("Search is unavailable right now.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 py-4">
      <IntroCover />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <form onSubmit={searchPlace} className="flex w-full gap-2 lg:max-w-md">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a city or region — Puri, Ladakh, Kutch…"
              className="pl-9"
              aria-label="Search a city or region"
            />
          </div>
          <Button type="submit" variant="secondary" disabled={searching}>
            {searching ? "…" : "Go"}
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={useMyLocation} className="gap-2">
            <LocateFixed className="h-4 w-4" /> Use my location
          </Button>
          <div className="flex rounded-md border border-border p-0.5">
            <Button
              size="sm"
              variant={view === "map" ? "secondary" : "ghost"}
              onClick={() => setView("map")}
              className="gap-1.5"
            >
              <MapIcon className="h-4 w-4" /> Map
            </Button>
            <Button
              size="sm"
              variant={view === "list" ? "secondary" : "ghost"}
              onClick={() => setView("list")}
              className="gap-1.5"
            >
              <List className="h-4 w-4" /> List
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:ml-auto">
          {CATEGORIES.map((cat) => {
            const on = active.includes(cat.value);
            return (
              <button
                key={cat.value}
                onClick={() => toggleCategory(cat.value)}
                aria-pressed={on}
                className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors"
                style={
                  on
                    ? { background: cat.colorVar, color: "var(--primary-foreground)", borderColor: cat.colorVar }
                    : { borderColor: "var(--border)" }
                }
              >
                <span aria-hidden>{cat.glyph}</span>
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>


      {happening ? (
        <Link
          to="/place/$id"
          params={{ id: happening.item.id }}
          className="mt-3 flex items-center gap-3 rounded-lg border border-accent bg-accent/40 px-4 py-3 transition-colors hover:bg-accent/60"
        >
          <span className="heritage-pin heritage-pin-glow" style={{ background: "var(--festival)" }}>
            <span aria-hidden>✺</span>
          </span>
          <span className="text-sm text-accent-foreground">
            <strong className="font-medium">Happening now:</strong>{" "}
            {happeningLabel(happening.item)} — tap to read what it means locally.
          </span>
        </Link>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-[380px_1fr]">
        <section
          ref={parentRef}
          className={`${view === "list" ? "" : "hidden lg:block"} max-h-[calc(100vh-13rem)] overflow-y-auto pr-1`}
          aria-label="Heritage list"
        >
          <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
            {filtered.length} places {userLocation ? "nearest you" : "in view"}
          </p>
          <div 
            className="flex flex-col gap-2 relative"
            style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
          >
            {itemsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading heritage…</p>
            ) : null}
            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
              const row = filtered[virtualItem.index];
              if (!row) return null;
              const { item, distance } = row;
              return (
                <div
                  key={item.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <ItemCard
                    item={item}
                    distance={userLocation ? distance : null}
                    onHover={(i) => setSelectedId(i.id)}
                  />
                </div>
              );
            })}
            {!itemsQuery.isLoading && filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing here yet. Be the first to{" "}
                <Link to="/contribute" className="text-primary underline">
                  add a place
                </Link>
                .
              </p>
            ) : null}
          </div>
        </section>

        <section
          className={`${view === "map" ? "" : "hidden lg:block"} h-[calc(100vh-13rem)] overflow-hidden rounded-xl border border-border shadow-lift`}
          aria-label="Heritage map"
        >
          <MapCanvas
            items={filtered.map((f) => f.item)}
            center={center}
            zoom={zoom}
            selectedId={selectedId}
            userLocation={userLocation}
            onSelect={(item) => navigate({ to: "/place/$id", params: { id: item.id } })}
          />
        </section>
      </div>

      <TripPlanner items={items} />
    </main>
  );
}
