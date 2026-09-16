/**
 * Two daily records/earthquakes count as "the same earthquake" when the
 * 24-hour rolling USGS feed happens to keep ranking it #1 across a KST
 * midnight boundary — matched by `earthquakeId` first, falling back to
 * coordinates + observed time only if an older stored record predates that
 * field being required.
 */
export interface EarthquakeIdentity {
  earthquakeId: string;
  latitude: number;
  longitude: number;
  observedAt: string;
}

export function isSameEarthquake(a: EarthquakeIdentity, b: EarthquakeIdentity): boolean {
  if (a.earthquakeId && b.earthquakeId) return a.earthquakeId === b.earthquakeId;
  const sameCoords = Math.abs(a.latitude - b.latitude) < 1e-6 && Math.abs(a.longitude - b.longitude) < 1e-6;
  const sameTime = new Date(a.observedAt).getTime() === new Date(b.observedAt).getTime();
  return sameCoords && sameTime;
}
