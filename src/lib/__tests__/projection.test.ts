import { describe, expect, it } from "vitest";
import { MAP_VIEWBOX_HEIGHT, MAP_VIEWBOX_WIDTH, projectEquirectangular } from "../projection";

describe("projectEquirectangular", () => {
  it("maps (0,0) — the Gulf of Guinea — to the exact center of the viewBox", () => {
    const { x, y } = projectEquirectangular(0, 0);
    expect(x).toBeCloseTo(MAP_VIEWBOX_WIDTH / 2, 6);
    expect(y).toBeCloseTo(MAP_VIEWBOX_HEIGHT / 2, 6);
  });

  it("maps the four extreme corners of the lon/lat range to the four corners of the viewBox", () => {
    expect(projectEquirectangular(-180, 90)).toEqual({ x: 0, y: 0 });
    expect(projectEquirectangular(180, 90)).toEqual({ x: MAP_VIEWBOX_WIDTH, y: 0 });
    expect(projectEquirectangular(-180, -90)).toEqual({ x: 0, y: MAP_VIEWBOX_HEIGHT });
    expect(projectEquirectangular(180, -90)).toEqual({ x: MAP_VIEWBOX_WIDTH, y: MAP_VIEWBOX_HEIGHT });
  });

  it("is linear/monotonic: moving east increases x, moving north decreases y", () => {
    const west = projectEquirectangular(-10, 0);
    const east = projectEquirectangular(10, 0);
    expect(east.x).toBeGreaterThan(west.x);

    const south = projectEquirectangular(0, -10);
    const north = projectEquirectangular(0, 10);
    expect(north.y).toBeLessThan(south.y);
  });

  it("places a real reference point (Seoul, 126.98E 37.57N) in the expected quadrant", () => {
    const { x, y } = projectEquirectangular(126.98, 37.57);
    // East of center, north of the equator.
    expect(x).toBeGreaterThan(MAP_VIEWBOX_WIDTH / 2);
    expect(y).toBeLessThan(MAP_VIEWBOX_HEIGHT / 2);
  });
});
