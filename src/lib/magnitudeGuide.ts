/**
 * General-education guidance for interpreting an earthquake's magnitude —
 * NOT a prediction of what any specific person will feel. Magnitude
 * (a single number per earthquake, log-scaled) and intensity (how strong
 * the shaking felt at a specific place) are different concepts; this file
 * only ever speaks about magnitude in general terms.
 */

export type MagnitudeTone = "minimal" | "low" | "moderate" | "high" | "extreme";

export interface MagnitudeBand {
  min: number;
  max: number; // exclusive; Infinity for the open-ended top band
  level: string;
  summary: string;
  tone: MagnitudeTone;
}

export interface MagnitudeGuide extends MagnitudeBand {
  /** 1-based position of the matched band, for a 7-step severity ladder. */
  ladderIndex: number;
  ladderTotal: number;
}

/**
 * Seven bands as specified by the product brief. `tone` (5 values) drives
 * color/visual intensity and is intentionally coarser than the 7 bands —
 * two pairs of adjacent bands ("작은/가벼운" and "강한/매우 큰") share a tone
 * while remaining distinct steps on the ladder and in their label/summary text.
 */
export const MAGNITUDE_BANDS: MagnitudeBand[] = [
  { min: -Infinity, max: 2.5, level: "매우 작은 규모", summary: "대부분 사람이 느끼기 어렵고 관측 장비로 확인되는 경우가 많아요.", tone: "minimal" },
  { min: 2.5, max: 4.0, level: "작은 규모", summary: "진앙 가까이에서는 약한 흔들림을 느낄 수 있어요.", tone: "low" },
  { min: 4.0, max: 5.0, level: "가벼운 규모", summary: "진앙 주변에서는 흔들림이 분명하게 느껴질 수 있어요.", tone: "low" },
  { min: 5.0, max: 6.0, level: "중간 규모", summary: "진앙 가까이에서는 강한 흔들림과 가벼운 피해가 발생할 수 있어요.", tone: "moderate" },
  { min: 6.0, max: 7.0, level: "강한 규모", summary: "인구 밀집 지역에서는 강한 흔들림과 피해가 발생할 수 있어요.", tone: "high" },
  { min: 7.0, max: 8.0, level: "매우 큰 규모", summary: "넓은 지역에 강한 흔들림과 큰 피해를 일으킬 수 있어요.", tone: "high" },
  { min: 8.0, max: Infinity, level: "거대 지진", summary: "매우 넓은 지역에 심각한 영향을 줄 수 있는 규모예요.", tone: "extreme" },
];

export function getMagnitudeGuide(magnitude: number): MagnitudeGuide {
  const index = MAGNITUDE_BANDS.findIndex((band) => magnitude >= band.min && magnitude < band.max);
  const safeIndex = index === -1 ? MAGNITUDE_BANDS.length - 1 : index;
  const band = MAGNITUDE_BANDS[safeIndex];
  return { ...band, ladderIndex: safeIndex + 1, ladderTotal: MAGNITUDE_BANDS.length };
}

export const MAGNITUDE_LOG_SCALE_NOTE =
  "규모가 1 증가하면 계측된 파동 진폭은 약 10배, 방출 에너지는 약 32배 커집니다.";

export const MAGNITUDE_VS_INTENSITY_NOTE =
  "규모(magnitude)는 지진 자체의 크기로 하나의 지진에 하나의 대표값을 갖지만, 진도(intensity)는 특정 장소에서 느껴진 흔들림이라 위치마다 다릅니다.";

/** Simplified 4-tier scale for the map ripple's maximum radius — a separate, coarser scale from the 7-band guide above, per the visual spec. */
export type RippleSizeTier = 1 | 2 | 3 | 4;

export function getRippleSizeTier(magnitude: number): RippleSizeTier {
  if (magnitude < 3) return 1;
  if (magnitude < 5) return 2;
  if (magnitude < 7) return 3;
  return 4;
}

export interface RippleGeometry {
  ringCount: number;
  /** Max ring radius in the 1000x500 map viewBox's units — a visual size only, not a damage radius. */
  maxRadius: number;
}

const RIPPLE_GEOMETRY: Record<RippleSizeTier, RippleGeometry> = {
  1: { ringCount: 3, maxRadius: 20 },
  2: { ringCount: 3, maxRadius: 32 },
  3: { ringCount: 4, maxRadius: 46 },
  4: { ringCount: 4, maxRadius: 62 },
};

export function getRippleGeometry(tier: RippleSizeTier): RippleGeometry {
  return RIPPLE_GEOMETRY[tier];
}

/** Brightness/opacity multiplier applied within the ripple's status color — kept in a narrow range so tone never overrides the status color itself. */
const TONE_OPACITY: Record<MagnitudeTone, number> = {
  minimal: 0.55,
  low: 0.68,
  moderate: 0.8,
  high: 0.92,
  extreme: 1,
};

export function getToneOpacity(tone: MagnitudeTone): number {
  return TONE_OPACITY[tone];
}

const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

/** Standard Modified Mercalli Intensity short descriptors (public, well-established scale wording) — not derived or guessed from this event's magnitude. */
function mmiDescriptor(rounded: number): string {
  if (rounded <= 1) return "감지 안 됨";
  if (rounded <= 3) return "약함";
  if (rounded === 4) return "약간 강함";
  if (rounded === 5) return "보통";
  if (rounded === 6) return "강함";
  if (rounded === 7) return "매우 강함";
  if (rounded === 8) return "심각함";
  if (rounded === 9) return "격렬함";
  return "극심함";
}

export interface MmiSummary {
  available: boolean;
  text: string;
}

/**
 * `mmi` must come directly from USGS `properties.mmi`. When it's null/absent
 * we say so plainly — we never estimate or convert it from magnitude.
 */
export function getMmiSummary(mmi: number | null): MmiSummary {
  if (mmi === null || Number.isNaN(mmi)) {
    return { available: false, text: "USGS 최대 추정 진도 정보가 아직 제공되지 않았습니다." };
  }
  const rounded = Math.min(12, Math.max(1, Math.round(mmi)));
  const roman = ROMAN_NUMERALS[rounded - 1];
  return { available: true, text: `MMI ${roman} · ${mmiDescriptor(rounded)}` };
}
