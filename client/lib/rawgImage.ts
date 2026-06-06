/**
 * RAWG image URL helper.
 *
 * RAWG's CDN only pre-generates a small set of crop sizes — arbitrary widths
 * like /media/crop/560/748/ return 404. The reliable preset is 600x400, which
 * is what RAWG itself uses for card thumbnails on their site.
 *
 * We rewrite any `media/games/...` URL to `media/crop/600/400/games/...` so
 * the browser downloads a ~50KB thumbnail instead of the multi-MB source.
 */
export function rawgImage(url: string | null | undefined): string {
  if (!url) return ""
  if (!url.includes("rawg.io")) return url
  if (url.includes("/media/crop/") || url.includes("/media/resize/")) return url
  return url.replace("/media/", "/media/crop/600/400/")
}

/**
 * Full-framing variant — returns RAWG's ORIGINAL 16:9 art (≈1280×720) instead
 * of the 600×400 thumbnail. The thumbnail center-crops ~16% off the sides to
 * force 1.5:1; the original keeps the full 16:9 frame, so cards that display the
 * cover prominently (stretch cards) don't lose the main subject.
 *
 * Heavier than the thumbnail (~200–400KB vs ~85KB) — use only where the cover is
 * shown large. RAWG offers no 16:9 *thumbnail* preset, so the original is the
 * only way to get the uncropped frame.
 */
export function rawgImageFull(url: string | null | undefined): string {
  if (!url) return ""
  if (!url.includes("rawg.io")) return url
  // Strip any crop/resize transform back to the original asset.
  return url.replace(/\/media\/(crop|resize)\/\d+\/-?\d+\//, "/media/")
}
