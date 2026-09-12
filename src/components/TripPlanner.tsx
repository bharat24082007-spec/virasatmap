import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarDays, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HeritageImage } from "@/components/HeritageImage";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  categoryLabel,
  distanceKm,
  formatDayLong,
  occurrenceInRange,
  toDateKey,
  type HeritageItem,
} from "@/lib/heritage";

type DayPlan = {
  date: Date;
  events: HeritageItem[];
  places: HeritageItem[];
};

const PLACES_PER_DAY = 3;

function dayList(start: string, end: string) {
  const from = new Date(`${start}T00:00:00`);
  const to = new Date(`${end}T00:00:00`);
  const days: Date[] = [];
  for (let d = new Date(from); d.getTime() <= to.getTime(); d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
    if (days.length > 30) break;
  }
  return days;
}

export function TripPlanner({ items }: { items: HeritageItem[] }) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [city, setCity] = useState("");

  const cities = useMemo(
    () => Array.from(new Set(items.map((i) => i.city))).sort(),
    [items],
  );

  const valid = Boolean(start && end && end >= start && city);

  const plan = useMemo<DayPlan[]>(() => {
    if (!valid) return [];
    const days = dayList(start, end);
    if (!days.length) return [];

    const anchorItem = items.find((i) => i.city === city);
    const anchor = anchorItem
      ? { latitude: anchorItem.latitude, longitude: anchorItem.longitude }
      : null;

    const inCity = items.filter((i) => i.city === city);
    const nearby = anchor
      ? items
          .filter((i) => i.city !== city && distanceKm(anchor, i) <= 120)
          .sort((a, b) => distanceKm(anchor, a) - distanceKm(anchor, b))
      : [];
    const pool = [...inCity, ...nearby];

    // Dated events land on their own day.
    const eventsByDay = new Map<string, HeritageItem[]>();
    const eventIds = new Set<string>();
    for (const item of pool) {
      const occ = occurrenceInRange(item, start, end);
      if (!occ) continue;
      const key = toDateKey(occ);
      eventsByDay.set(key, [...(eventsByDay.get(key) ?? []), item]);
      eventIds.add(item.id);
    }

    // Undated places fill the days, closest first. A dated festival that falls
    // outside the window is left out — it can't be visited on this trip.
    const queue = pool.filter((i) => !eventIds.has(i.id) && !i.festival_date);
    let cursor = 0;

    return days.map((date) => {
      const key = toDateKey(date);
      const events = eventsByDay.get(key) ?? [];
      const slots = Math.max(1, PLACES_PER_DAY - events.length);
      const places = queue.slice(cursor, cursor + slots);
      cursor += places.length;
      return { date, events, places };
    });
  }, [valid, items, city, start, end]);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 h-14 gap-2 rounded-full px-5 shadow-lift"
        aria-label="Plan a trip"
      >
        <Sparkles className="h-5 w-5" /> Plan a trip
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" /> Plan your heritage trip
            </SheetTitle>
            <SheetDescription>
              Tell me where you're going and when. I'll lay out a day-by-day plan and put each
              festival or performance on the day it actually happens.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-5 grid gap-3">
            <label className="text-xs text-muted-foreground">
              Destination city
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
              >
                <option value="">Choose a city…</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-muted-foreground">
                Arriving
                <Input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="mt-1"
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Leaving
                <Input
                  type="date"
                  value={end}
                  min={start || undefined}
                  onChange={(e) => setEnd(e.target.value)}
                  className="mt-1"
                />
              </label>
            </div>
            {start || end || city ? (
              <Button
                variant="ghost"
                size="sm"
                className="justify-start gap-1.5 px-0 text-muted-foreground"
                onClick={() => {
                  setStart("");
                  setEnd("");
                  setCity("");
                }}
              >
                <X className="h-3.5 w-3.5" /> Start over
              </Button>
            ) : null}
          </div>

          {!valid ? (
            <p className="mt-6 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              Pick a city and both dates to see your plan.
            </p>
          ) : (
            <div className="mt-6 flex flex-col gap-4 pb-10">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {plan.length} day{plan.length === 1 ? "" : "s"} in {city}
              </p>
              {plan.map((day, index) => (
                <section
                  key={toDateKey(day.date)}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-lg text-foreground">Day {index + 1}</h3>
                    <span className="text-xs text-muted-foreground">
                      {formatDayLong(day.date)}
                    </span>
                  </div>

                  {day.events.map((item) => (
                    <Link
                      key={item.id}
                      to="/place/$id"
                      params={{ id: item.id }}
                      className="mt-3 flex gap-3 rounded-lg border border-accent bg-accent/40 p-2 transition-colors hover:bg-accent/60"
                    >
                      <HeritageImage
                        item={item}
                        alt={item.name}
                        width={200}
                        className="h-16 w-24 shrink-0 rounded-md bg-muted object-contain"
                      />
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-wider text-accent-foreground">
                          On this day · {categoryLabel(item.category)}
                        </p>
                        <p className="truncate text-sm text-foreground">{item.name}</p>
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </Link>
                  ))}

                  {day.places.length ? (
                    <ul className="mt-3 flex flex-col gap-2">
                      {day.places.map((item) => (
                        <li key={item.id}>
                          <Link
                            to="/place/$id"
                            params={{ id: item.id }}
                            className="flex gap-3 rounded-lg border border-border p-2 transition-shadow hover:shadow-lift"
                          >
                            <HeritageImage
                              item={item}
                              alt={item.name}
                              width={200}
                              className="h-14 w-[5.6rem] shrink-0 rounded-md bg-muted object-contain"
                            />
                            <div className="min-w-0">
                              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                                {categoryLabel(item.category)} · {item.city}
                              </p>
                              <p className="truncate text-sm text-foreground">{item.name}</p>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : day.events.length === 0 ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      A free day — revisit a favourite or travel onward.
                    </p>
                  ) : null}
                </section>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
