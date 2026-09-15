import { getMagnitudeGuide, getRippleSizeTier } from "@/lib/magnitudeGuide";
import { MAP_VIEWBOX_HEIGHT, MAP_VIEWBOX_WIDTH, projectEquirectangular } from "@/lib/projection";
import { WORLD_LAND_PATH_D } from "@/lib/worldMapPath";
import type { BoardState } from "@/lib/types";
import { EarthquakeRipple } from "./EarthquakeRipple";

const GRID_LONGITUDES = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150];
const GRID_LATITUDES = [-60, -30, 0, 30, 60];

export function WorldMap({ state, isLoading }: { state: BoardState; isLoading: boolean }) {
  const current = state.current;
  const point = current ? projectEquirectangular(current.longitude, current.latitude) : null;
  const tier = current ? getRippleSizeTier(current.magnitude) : null;
  const tone = current ? getMagnitudeGuide(current.magnitude).tone : null;

  return (
    <svg
      viewBox={`0 0 ${MAP_VIEWBOX_WIDTH} ${MAP_VIEWBOX_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      className="h-full w-full"
      role="img"
      aria-label={
        current
          ? `세계지도. ${current.place} 부근에 최근 24시간 최대 규모 지진 위치가 표시되어 있습니다.`
          : "세계지도. 표시할 지진 위치 정보가 아직 없습니다."
      }
    >
      <rect x={0} y={0} width={MAP_VIEWBOX_WIDTH} height={MAP_VIEWBOX_HEIGHT} className="fill-[#060a16]" />

      <g className="stroke-white/[0.05]" strokeWidth={0.6}>
        {GRID_LONGITUDES.map((lon) => {
          const { x } = projectEquirectangular(lon, 0);
          return <line key={`lon-${lon}`} x1={x} y1={0} x2={x} y2={MAP_VIEWBOX_HEIGHT} />;
        })}
        {GRID_LATITUDES.map((lat) => {
          const { y } = projectEquirectangular(0, lat);
          return <line key={`lat-${lat}`} x1={0} y1={y} x2={MAP_VIEWBOX_WIDTH} y2={y} />;
        })}
        <line x1={0} y1={MAP_VIEWBOX_HEIGHT / 2} x2={MAP_VIEWBOX_WIDTH} y2={MAP_VIEWBOX_HEIGHT / 2} className="stroke-white/[0.08]" />
      </g>

      <path d={WORLD_LAND_PATH_D} className="fill-slate-400/[0.16] stroke-slate-300/[0.22]" strokeWidth={0.7} />

      {point && current && tier && tone && (
        <EarthquakeRipple
          cx={point.x}
          cy={point.y}
          magnitude={current.magnitude}
          tier={tier}
          tone={tone}
          status={state.status}
          isLoading={isLoading}
        />
      )}

      {!point && state.status === "error" && (
        <text
          x={MAP_VIEWBOX_WIDTH / 2}
          y={MAP_VIEWBOX_HEIGHT / 2}
          textAnchor="middle"
          className="fill-white/70 text-[13px]"
        >
          위치를 표시할 실제 정상값이 아직 없습니다.
        </text>
      )}
    </svg>
  );
}
