import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  Circle,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";

import { HeritageImage } from "@/components/HeritageImage";
import {
  categoryLabel,
  categoryMeta,
  festivalDateLabel,
  happeningLabel,
  isHappeningNow,
  type HeritageItem,
} from "@/lib/heritage";

type Props = {
  items: HeritageItem[];
  center: [number, number];
  zoom?: number;
  selectedId?: string | null;
  userLocation?: { latitude: number; longitude: number } | null;
  onSelect?: (item: HeritageItem) => void;
  onPick?: (coords: { latitude: number; longitude: number }) => void;
  pickedLocation?: { latitude: number; longitude: number } | null;
};

function pinIcon(item: HeritageItem, active: boolean) {
  const meta = categoryMeta(item.category);
  const glow = isHappeningNow(item) ? " heritage-pin-glow" : "";
  return L.divIcon({
    className: "bg-transparent",
    html: `<div class="heritage-pin${glow}" style="background:${meta.colorVar};${
      active ? "outline:3px solid var(--primary);outline-offset:2px;" : ""
    }"><span>${meta.glyph}</span></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
  });
}

const INDIA_BOUNDS = L.latLngBounds([5.5, 66.5], [37.5, 98.5]);

const dotIcon = L.divIcon({
  className: "bg-transparent",
  html: `<div style="width:14px;height:14px;border-radius:999px;background:var(--primary);border:3px solid var(--card);box-shadow:0 2px 8px oklch(0.28 0.06 40 / .4)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function Recenter({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);
  useEffect(() => {
    const valid =
      Number.isFinite(center?.[0]) && Number.isFinite(center?.[1])
        ? (center as [number, number])
        : null;
    const target = valid && INDIA_BOUNDS.contains(valid) ? valid : INDIA_BOUNDS.getCenter();
    const nextZoom = Number.isFinite(zoom) ? (zoom as number) : map.getZoom();
    if (!Number.isFinite(nextZoom)) return;

    const size = map.getSize();
    if (!size || size.x === 0 || size.y === 0) {
      map.setView(target, nextZoom, { animate: false });
      return;
    }
    map.flyTo(target, nextZoom, { duration: 0.8 });
  }, [center?.[0], center?.[1], zoom, map]);

  return null;
}

function ClickPicker({ onPick }: { onPick: (c: { latitude: number; longitude: number }) => void }) {
  useMapEvents({
    click(event) {
      onPick({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
  });
  return null;
}

function HeritageMarker({ 
  item, 
  active, 
  onSelect 
}: { 
  item: HeritageItem; 
  active: boolean; 
  onSelect?: (item: HeritageItem) => void 
}) {
  const [showDetails, setShowDetails] = useState(false);
  const meta = categoryMeta(item.category);
  const dateLabel = festivalDateLabel(item);
  const happening = isHappeningNow(item);

  return (
    <Marker
      position={[item.latitude, item.longitude]}
      icon={pinIcon(item, active)}
      title={item.name}
      eventHandlers={{ 
        click: () => onSelect?.(item),
      }}
    >
      <Tooltip 
        direction="top" 
        offset={[0, -22]} 
        opacity={1} 
        className="heritage-tooltip"
        eventHandlers={{
          add: () => setShowDetails(true),
          remove: () => setShowDetails(false)
        }}
      >
        <div className="w-[15rem] space-y-1">
          {showDetails ? (
            <HeritageImage
              item={item}
              alt={item.name}
              width={480}
              className="mb-2 aspect-[8/5] w-full rounded-lg bg-muted object-contain"
            />
          ) : (
            <div className="mb-2 aspect-[8/5] w-full rounded-lg bg-muted animate-pulse" />
          )}

          <p className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
            {meta.glyph} {categoryLabel(item.category)}
            {item.is_hidden_gem ? " · ⭐ Hidden heritage" : ""}
          </p>
          <p className="font-display text-base leading-tight text-foreground">{item.name}</p>
          <p className="text-xs text-muted-foreground">
            {item.city}, {item.region}
          </p>
          {dateLabel ? (
            <p className="text-xs font-medium text-foreground">
              📅 {dateLabel}
            </p>
          ) : null}
          <p className="line-clamp-3 text-xs leading-relaxed text-foreground/80">
            {item.description}
          </p>
          {happening ? (
            <p className="text-xs font-medium text-primary">{happeningLabel(item)}</p>
          ) : null}
          <p className="pt-1 text-[0.65rem] text-muted-foreground">Click the pin for more</p>
        </div>
      </Tooltip>
    </Marker>
  );
}

export default function HeritageMap({
  items,
  center,
  zoom = 5,
  selectedId,
  userLocation,
  onSelect,
  onPick,
  pickedLocation,
}: Props) {
  const markers = useMemo(
    () => items.filter((i) => Number.isFinite(i.latitude) && Number.isFinite(i.longitude)),
    [items],
  );
  const safeCenter = useMemo<[number, number]>(() => {
    if (Number.isFinite(center?.[0]) && Number.isFinite(center?.[1])) return center;
    const c = INDIA_BOUNDS.getCenter();
    return [c.lat, c.lng];
  }, [center?.[0], center?.[1]]);
  const safeZoom = Number.isFinite(zoom) ? zoom : 5;

  return (
    <MapContainer
      center={safeCenter}
      zoom={safeZoom}
      scrollWheelZoom
      className="h-full w-full"
      zoomControl={false}
      maxBounds={INDIA_BOUNDS}
      maxBoundsViscosity={1}
      minZoom={4}
      worldCopyJump={false}
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
        bounds={INDIA_BOUNDS}
        noWrap
      />
      <Recenter center={safeCenter} zoom={safeZoom} />

      {onPick ? <ClickPicker onPick={onPick} /> : null}

      {userLocation ? (
        <>
          <Circle
            center={[userLocation.latitude, userLocation.longitude]}
            radius={20000}
            pathOptions={{ color: "var(--primary)", weight: 1, fillOpacity: 0.08 }}
          />
          <Marker
            position={[userLocation.latitude, userLocation.longitude]}
            icon={dotIcon}
            title="You are here"
          />
        </>
      ) : null}

      {pickedLocation ? (
        <Marker
          position={[pickedLocation.latitude, pickedLocation.longitude]}
          icon={dotIcon}
          title="Chosen location"
        />
      ) : null}

      {markers.map((item) => (
        <HeritageMarker
          key={item.id}
          item={item}
          active={item.id === selectedId}
          {...(onSelect ? { onSelect } : {})}
        />
      ))}

    </MapContainer>
  );
}
