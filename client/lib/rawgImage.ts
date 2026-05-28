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
