import { roundMagnitude } from "./change";

export function formatMagnitude(mag: number): string {
  return roundMagnitude(mag).toFixed(1);
}

export function formatDepth(depthKm: number): string {
  return `${depthKm.toFixed(1)} km`;
}

export function formatCoord(latitude: number, longitude: number): string {
  const ns = latitude >= 0 ? "N" : "S";
  const ew = longitude >= 0 ? "E" : "W";
  return `${Math.abs(latitude).toFixed(3)}°${ns}, ${Math.abs(longitude).toFixed(3)}°${ew}`;
}

export function formatDelta(delta: number): string {
  const sign = delta > 0 ? "+" : delta < 0 ? "" : "±";
  return `${sign}${delta.toFixed(1)}`;
}
