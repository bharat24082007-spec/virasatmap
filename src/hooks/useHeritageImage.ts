import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { categoryMeta, type Category } from "@/lib/heritage";

export const STORAGE_PREFIX = "sb://";

const SIGN_TTL = 3600;

/**
 * Bucket photos are full-resolution (up to several MB). Signing them with a
 * transform makes storage serve a right-sized rendition instead, which is what
 * makes long photo lists load quickly. Results are memoised per path+width so a
 * photo shown in several places is only ever signed once.
 */
const cache = new Map<string, Promise<string | null>>();

function signPath(path: string, width?: number, height?: number) {
  const key = `${path}@${width ?? 0}x${height ?? 0}`;
  const hit = cache.get(key);
  if (hit) return hit;

  // Fit the whole photo inside the requested frame. Width-only transforms can
  // preserve a source's original pixel height and produce tall skinny strips.
  const promise = supabase.storage
    .from("heritage-photos")
    .createSignedUrl(
      path,
      SIGN_TTL,
      width
        ? {
            transform: height
              ? { width, height, resize: "contain" as const, quality: 70 }
              : { width, quality: 70 },
          }
        : undefined,
    )
    .then(({ data, error }) => {
      if (error || !data?.signedUrl) {
        cache.delete(key);
        return null;
      }
      return data.signedUrl;
    })
    .catch(() => {
      cache.delete(key);
      return null;
    });

  cache.set(key, promise);
  return promise;
}

/**
 * Resolves an item's image: an uploaded photo (stored as sb://<path> in the
 * private photo bucket) becomes a signed URL; anything else is used as-is.
 */
export function useHeritageImage(
  item: { image_url: string | null; category: Category },
  options?: { width?: number; height?: number; enabled?: boolean },
) {
  const fallback = categoryMeta(item.category).image;
  const path = item.image_url?.startsWith(STORAGE_PREFIX)
    ? item.image_url.slice(STORAGE_PREFIX.length)
    : null;
  const width = options?.width;
  const height = options?.height;
  const isEnabled = options?.enabled !== false;

  const signed = useQuery({
    queryKey: ["heritage-photo", path, width ?? 0, height ?? 0],
    enabled: !!path && isEnabled,
    staleTime: (SIGN_TTL - 300) * 1000,
    gcTime: SIGN_TTL * 1000,
    retry: false,
    queryFn: () => {
      if (!path) return Promise.resolve(null);
      return signPath(path, width, height);
    },
  });

  if (path) return signed.data ?? fallback;
  return item.image_url || fallback;
}
