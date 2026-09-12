import { ClientOnly } from "@tanstack/react-router";
import { Suspense, lazy, type ComponentProps } from "react";

const HeritageMap = lazy(() => import("./HeritageMap"));

type Props = ComponentProps<typeof HeritageMap>;

function MapSkeleton() {
  return (
    <div className="hairline-grid flex h-full w-full items-center justify-center bg-muted">
      <p className="text-sm text-muted-foreground">Loading map…</p>
    </div>
  );
}

export function MapCanvas(props: Props) {
  return (
    <ClientOnly fallback={<MapSkeleton />}>
      <Suspense fallback={<MapSkeleton />}>
        <HeritageMap {...props} />
      </Suspense>
    </ClientOnly>
  );
}
