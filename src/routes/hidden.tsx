import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { ItemCard } from "@/components/ItemCard";
import { MapCanvas } from "@/components/MapCanvas";
import { CATEGORIES, INDIA_CENTER, type Category, type HeritageItem } from "@/lib/heritage";

export const Route = createFileRoute("/hidden")({
  head: () => ({
    meta: [
      { title: "Hidden Heritage — lesser-known traditions of India" },
      {
        name: "description",
        content:
          "Village weaving techniques, rare folk performances and traditional pottery methods — the cultural knowledge that rarely appears on tourist maps.",
      },
      { property: "og:title", content: "Hidden Heritage — lesser-known traditions of India" },
      {
        property: "og:description",
        content:
          "Not 'where can I go?' but 'what cultural knowledge exists here?' — a map of India's quieter living traditions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HiddenPage,
});

function HiddenPage() {
  const [active, setActive] = useState<Category[]>([]);

  const query = useQuery({
    queryKey: ["hidden-heritage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("heritage_items")
        .select("*")
        .eq("status", "verified")
        .eq("is_hidden_gem", true)
        .order("region");
      if (error) throw error;
      return (data ?? []) as unknown as HeritageItem[];
    },
  });

  const items = query.data ?? [];
  const filtered = useMemo(
    () => (active.length ? items.filter((i) => active.includes(i.category)) : items),
    [items, active],
  );

  const byRegion = useMemo(() => {
    const map = new Map<string, HeritageItem[]>();
    for (const item of filtered) {
      const list = map.get(item.region) ?? [];
      list.push(item);
      map.set(item.region, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 py-8">
      <header className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">⭐ Hidden Heritage</p>
        <h1 className="mt-2 text-4xl">What cultural knowledge exists here?</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Famous monuments are easy to find. These are the quieter ones — a weaving technique kept
          alive in one village, a folk performance danced only at night, a pottery method passed
          down without a single written record. Each entry carries the local story behind it.
        </p>
      </header>

      <div className="mt-6 flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => {
          const on = active.includes(cat.value);
          return (
            <button
              key={cat.value}
              onClick={() =>
                setActive((prev) =>
                  prev.includes(cat.value)
                    ? prev.filter((c) => c !== cat.value)
                    : [...prev, cat.value],
                )
              }
              aria-pressed={on}
              className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors"
              style={
                on
                  ? {
                      background: cat.colorVar,
                      color: "var(--primary-foreground)",
                      borderColor: cat.colorVar,
                    }
                  : { borderColor: "var(--border)" }
              }
            >
              <span aria-hidden>{cat.glyph}</span>
              {cat.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_460px]">
        <div className="flex flex-col gap-8">
          {query.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading hidden heritage…</p>
          ) : null}
          {byRegion.map(([region, list]) => (
            <section key={region}>
              <h2 className="mb-3 border-b border-border pb-1 text-lg text-foreground">
                {region}{" "}
                <span className="text-xs text-muted-foreground">
                  · {list.length} {list.length === 1 ? "tradition" : "traditions"}
                </span>
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {list.map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          ))}
          {!query.isLoading && filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing marked yet.{" "}
              <Link to="/contribute" className="text-primary underline">
                Add a tradition you know
              </Link>
              .
            </p>
          ) : null}
        </div>

        <aside className="hidden h-[calc(100vh-10rem)] overflow-hidden rounded-xl border border-border shadow-lift lg:block lg:sticky lg:top-20">
          <MapCanvas items={filtered} center={INDIA_CENTER} zoom={5} />
        </aside>
      </div>
    </main>
  );
}
