/**
 * Shared equirectangular projection: the SAME formula is used to (a)
 * generate the static world-map SVG path (see scripts/generate-world-map.mjs
 * -> src/lib/worldMapPath.ts) and (b) place the earthquake marker at
 * runtime, so the marker is guaranteed to land exactly where the land
 * silhouette itself was projected from.
 *
 * X: longitude -180..180 -> 0..width
 * Y: latitude 90..-90 -> 0..height
 */
export const MAP_VIEWBOX_WIDTH = 1000;
export const MAP_VIEWBOX_HEIGHT = 500;

export function projectEquirectangular(
  longitude: number,
  latitude: number,
  width: number = MAP_VIEWBOX_WIDTH,
  height: number = MAP_VIEWBOX_HEIGHT
): { x: number; y: number } {
  const x = ((longitude + 180) / 360) * width;
  const y = ((90 - latitude) / 180) * height;
  return { x, y };
}
