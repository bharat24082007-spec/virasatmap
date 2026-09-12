import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, CalendarDays, MapPin } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { MapCanvas } from "@/components/MapCanvas";
import { StoryCard } from "@/components/StoryCard";
import { HeritageImage } from "@/components/HeritageImage";
import { ItemCard } from "@/components/ItemCard";
import { Button } from "@/components/ui/button";
import {
  categoryLabel,
  categoryMeta,
  distanceKm,
  festivalDateLabel,
  happeningLabel,
  isHappeningNow,
  type HeritageItem,
  type LocalStory,
} from "@/lib/heritage";

export const Route = createFileRoute("/place/$id")({
  head: () => ({
    meta: [
      { title: "Heritage place — Virasat Map" },
      {
        name: "description",
        content:
          "History, significance and community stories behind a heritage place, art form, festival or craft in India.",
      },
      { property: "og:title", content: "Heritage place — Virasat Map" },
      {
        property: "og:description",
        content: "Read the history and the local stories communities tell about this heritage.",
      },
    ],
  }),
  component: PlacePage,
});

function PlacePage() {
  const { id } = Route.useParams();

  const itemQuery = useQuery({
    queryKey: ["heritage-item", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("heritage_items")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as HeritageItem | null;
    },
  });

  const storiesQuery = useQuery({
    queryKey: ["heritage-stories", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("local_stories")
        .select("*")
        .eq("heritage_item_id", id)
        .eq("status", "verified")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as LocalStory[];
    },
  });

  const nearbyQuery = useQuery({
    queryKey: ["heritage-items"],
    queryFn: async () => {
      // Consistently select fields used by list/map to benefit from cache
      const { data, error } = await supabase
        .from("heritage_items")
        .select("id, name, category, city, region, latitude, longitude, description, image_url, festival_date, status, is_hidden_gem")
        .eq("status", "verified");
      if (error) throw error;
      return (data ?? []) as unknown as HeritageItem[];
    },
  });

  const item = itemQuery.data;

  if (itemQuery.isLoading) {
    return <p className="p-8 text-sm text-muted-foreground">Loading…</p>;
  }

  if (!item) {
    return (
      <div className="mx-auto max-w-md p-10 text-center">
        <h1 className="text-2xl">This place isn't available</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          It may still be waiting for review, or the link is wrong.
        </p>
        <Button asChild className="mt-4">
          <Link to="/">Back to the map</Link>
        </Button>
      </div>
    );
  }

  const meta = categoryMeta(item.category);
  const nearby = (nearbyQuery.data ?? [])
    .filter((other) => other.id !== item.id)
    .map((other) => ({ item: other, distance: distanceKm(item, other) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 4);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back to the map
      </Link>

      <div className="mt-4 overflow-hidden rounded-xl border border-border">
        <HeritageImage
          item={item}
          alt={item.name}
          eager
          width={1200}
          aspect={0}
          className="max-h-[28rem] w-full bg-muted object-contain"
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span
          className="rounded-full px-2.5 py-1 text-[11px] uppercase tracking-wider text-primary-foreground"
          style={{ background: meta.colorVar }}
        >
          {categoryLabel(item.category)}
        </span>
        {item.status === "verified" ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] text-verified">
            <BadgeCheck className="h-3.5 w-3.5" /> Verified
          </span>
        ) : (
          <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">
            Pending review
          </span>
        )}
        {isHappeningNow(item) ? (
          <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] text-accent-foreground">
            {happeningLabel(item)}
          </span>
        ) : null}
      </div>

      <h1 className="mt-2 text-4xl">{item.name}</h1>
      <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <MapPin className="h-4 w-4" /> {item.city}, {item.region}
      </p>
      {item.festival_date ? (
        <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" /> Next date: {festivalDateLabel(item)}
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <section>
            <h2 className="text-xl">About</h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground/90">{item.description}</p>
          </section>

          {item.significance ? (
            <section className="mt-6">
              <h2 className="text-xl">History &amp; significance</h2>
              <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                {item.significance}
              </p>
            </section>
          ) : null}

          <section className="mt-8">
            <h2 className="text-xl">Local stories &amp; beliefs</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Shared by the community. These are traditional beliefs and oral accounts, not
              verified historical fact.
            </p>
            <div className="mt-3 flex flex-col gap-3">
              {storiesQuery.data?.length ? (
                storiesQuery.data.map((story) => <StoryCard key={story.id} story={story} />)
              ) : (
                <p className="rounded-lg border border-dashed border-story-border bg-story p-4 text-sm text-story-foreground">
                  No community stories yet.{" "}
                  <Link to="/contribute" className="underline">
                    Share one you grew up with.
                  </Link>
                </p>
              )}
            </div>
          </section>
        </div>

        <aside>
          <div className="h-56 overflow-hidden rounded-xl border border-border">
            <MapCanvas items={[item]} center={[item.latitude, item.longitude]} zoom={11} />
          </div>
          <h2 className="mt-5 text-lg">Related nearby</h2>
          <div className="mt-2 flex flex-col gap-2">
            {nearby.map(({ item: other, distance }) => (
              <ItemCard key={other.id} item={other} distance={distance} />
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
