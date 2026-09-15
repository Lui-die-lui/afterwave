// One-time generator: Natural Earth 110m land data (bundled locally in the
// world-atlas npm package, no runtime network calls) -> a single SVG path
// string, projected with the exact same equirectangular formula as
// src/lib/projection.ts (duplicated here deliberately since this script
// runs standalone via plain Node, outside the TS/Next build).
//
// Run with: node scripts/generate-world-map.mjs
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { feature } from "topojson-client";
import land110m from "world-atlas/land-110m.json" with { type: "json" };

const WIDTH = 1000;
const HEIGHT = 500;

function project(lon, lat) {
  const x = ((lon + 180) / 360) * WIDTH;
  const y = ((90 - lat) / 180) * HEIGHT;
  return [x, y];
}

function ringToPath(ring) {
  return ring
    .map(([lon, lat], i) => {
      const [x, y] = project(lon, lat);
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ") + " Z";
}

function polygonToPath(polygon) {
  return polygon.map(ringToPath).join(" ");
}

const landFC = feature(land110m, land110m.objects.land);

const pathSegments = [];
for (const f of landFC.features) {
  const geom = f.geometry;
  if (!geom) continue;
  if (geom.type === "Polygon") {
    pathSegments.push(polygonToPath(geom.coordinates));
  } else if (geom.type === "MultiPolygon") {
    for (const polygon of geom.coordinates) {
      pathSegments.push(polygonToPath(polygon));
    }
  }
}

const d = pathSegments.join(" ");

const out = `// GENERATED FILE — do not edit by hand.
// Source: world-atlas land-110m.json (Natural Earth 1:110m land silhouette,
// bundled locally, no runtime network fetch), projected with the equirectangular
// formula in src/lib/projection.ts. Regenerate with:
//   node scripts/generate-world-map.mjs
export const WORLD_LAND_PATH_D = ${JSON.stringify(d)};
`;

const outPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "lib", "worldMapPath.ts");
await writeFile(outPath, out, "utf8");
console.log(`Wrote ${outPath} (${(d.length / 1024).toFixed(1)} KB of path data, ${landFC.features.length} feature(s))`);
