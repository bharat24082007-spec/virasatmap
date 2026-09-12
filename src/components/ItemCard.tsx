import { Link } from "@tanstack/react-router";

import { HeritageImage } from "@/components/HeritageImage";
import {
  categoryLabel,
  categoryMeta,
  festivalDateLabel,
  formatDistance,
  isHappeningNow,
  type HeritageItem,
} from "@/lib/heritage";

export function ItemCard({
  item,
  distance,
  onHover,
}: {
  item: HeritageItem;
  distance?: number | null;
  onHover?: (item: HeritageItem) => void;
}) {
  const meta = categoryMeta(item.category);
  const dateLabel = festivalDateLabel(item);

  return (
    <Link
      to="/place/$id"
      params={{ id: item.id }}
      onMouseEnter={() => onHover?.(item)}
      className="group flex gap-3 rounded-lg border border-border bg-card p-3 transition-shadow hover:shadow-lift"
    >
      <HeritageImage
        item={item}
        alt={item.name}
        width={200}
        className="h-20 w-32 shrink-0 rounded-md bg-muted object-contain"
      />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: meta.colorVar }}
            aria-hidden
          />
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {categoryLabel(item.category)} · {item.city}
          </span>
        </div>
        <h3 className="mt-0.5 truncate text-base text-foreground group-hover:text-primary">
          {item.name}
        </h3>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {item.description}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
          {typeof distance === "number" ? (
            <span className="text-primary">{formatDistance(distance)}</span>
          ) : null}
          {dateLabel ? (
            <span className="rounded-full border border-border px-2 py-0.5 text-muted-foreground">
              📅 {dateLabel}
            </span>
          ) : null}
          {isHappeningNow(item) ? (
            <span className="rounded-full bg-accent px-2 py-0.5 text-accent-foreground">
              Happening now
            </span>
          ) : null}
          {item.is_hidden_gem ? (
            <span className="rounded-full border border-story-border bg-story px-2 py-0.5 text-story-foreground">
              ⭐ Hidden heritage
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
