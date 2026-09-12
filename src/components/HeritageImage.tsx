import { useInView } from "react-intersection-observer";
import { useHeritageImage } from "@/hooks/useHeritageImage";
import type { Category } from "@/lib/heritage";

export function HeritageImage({
  item,
  alt,
  className,
  eager,
  width = 640,
  aspect = 8 / 5,
}: {
  item: { image_url: string | null; category: Category };
  alt: string;
  className?: string;
  eager?: boolean;
  /** Rendered pixel width — used to request a matching thumbnail. */
  width?: number;
  /** Width/height ratio of the box the image fills (default 8:5). Pass 0 to keep the photo's natural shape. */
  aspect?: number;
}) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: '200px 0px',
    skip: Boolean(eager),
  });

  const height = aspect > 0 ? Math.round(width / aspect) : undefined;
  const src = useHeritageImage(item, {
    width,
    ...(height ? { height } : {}),
    enabled: eager || inView,
  });

  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      width={width}
      height={height ?? Math.round((width * 5) / 8)}
      decoding="async"
      {...(eager ? { fetchPriority: "high" as const } : { loading: "lazy" as const })}
      className={className}
    />
  );
}
