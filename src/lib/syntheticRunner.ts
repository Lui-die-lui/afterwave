import { computeChange } from "./change";
import { ERROR_COPY, BoardFetchError } from "./errors";
import {
  buildSchemaDriftPayload,
  buildSyntheticDay1FeedA,
  buildSyntheticDay1FeedB,
  buildSyntheticDay2Feed,
} from "./fixtures/syntheticFeed";
import { normalizeFeature, pickLargestEarthquake } from "./normalize";
import { getSyntheticMeta, getSyntheticRecords, updateSyntheticMeta, upsertSyntheticRecord } from "./syntheticStore";
import { addDaysToDateKey, kstDateKey } from "./timezone";
import type { SyntheticState, UsgsFeed } from "./types";
import { UsgsFeedSchema } from "./types";

export const SCENARIOS = [
  "D1_A",
  "D1_B",
  "TIMEOUT",
  "UPSTREAM_AUTH",
  "RATE_LIMITED",
  "OFFLINE",
  "SCHEMA_CHANGED",
  "RECOVER_D2",
] as const;
export type ScenarioKey = (typeof SCENARIOS)[number];

const SYNTHETIC_FEED_URL = "https://afterwave.invalid/synthetic-fixtures/t04-real-information-board";

async function buildStateFromStore(): Promise<Omit<SyntheticState, "status" | "errorCode" | "errorTitle" | "errorMessage" | "errorAction">> {
  const records = await getSyntheticRecords();
  const meta = await getSyntheticMeta();
  const latestTwo = records.slice(-2);
  const current = records[records.length - 1] ?? null;
  const change = computeChange(latestTwo);
  return {
    current,
    lastSuccessAt: current?.lastUpdatedAt ?? null,
    records: latestTwo,
    change,
    waitingForNextDay: records.length < 2,
    requestedAt: new Date().toISOString(),
    timeZone: "Asia/Seoul",
    feedUrl: SYNTHETIC_FEED_URL,
    dailyRecords: latestTwo,
    dailyChange: change?.delta ?? null,
    lastSuccessfulRecord: current,
    isSynthetic: true,
    lastScenario: meta.lastScenario,
    anchorDate: meta.day1Date,
    day: meta.day2Date ? 2 : meta.day1Date ? 1 : null,
  };
}

async function ingestFeed(feed: UsgsFeed, recordDateOverride?: string) {
  const winner = pickLargestEarthquake(feed);
  const requestedAt = new Date();
  const normalized = normalizeFeature(winner, feed.metadata.generated, SYNTHETIC_FEED_URL, requestedAt);
  const recordDate = recordDateOverride ?? normalized.recordDate;
  const record = { ...normalized, recordDate, firstRecordedAt: requestedAt.toISOString(), lastUpdatedAt: requestedAt.toISOString() };
  await upsertSyntheticRecord(record);
  return record;
}

/** Runs one Failure Lab scenario against synthetic fixtures only — never touches the real store or real network. */
export async function runSyntheticScenario(scenario: ScenarioKey): Promise<SyntheticState> {
  const now = new Date();
  const meta = await getSyntheticMeta();

  try {
    switch (scenario) {
      case "D1_A": {
        const day1Date = meta.day1Date ?? kstDateKey(now);
        await ingestFeed(buildSyntheticDay1FeedA(now), day1Date);
        await updateSyntheticMeta({ day1Date, lastScenario: scenario, lastStatus: "fresh", lastErrorCode: "NONE", lastRunAt: now.toISOString() });
        break;
      }
      case "D1_B": {
        if (!meta.day1Date) {
          throw new BoardFetchError("UNKNOWN", "D1-A를 먼저 재생해야 D1-B를 재생할 수 있습니다.");
        }
        await ingestFeed(buildSyntheticDay1FeedB(now), meta.day1Date);
        await updateSyntheticMeta({ lastScenario: scenario, lastStatus: "fresh", lastErrorCode: "NONE", lastRunAt: now.toISOString() });
        break;
      }
      case "RECOVER_D2": {
        if (!meta.day1Date) {
          throw new BoardFetchError("UNKNOWN", "D1-A를 먼저 재생해야 T04-RECOVER-D2를 재생할 수 있습니다.");
        }
        const day2Date = meta.day2Date ?? addDaysToDateKey(meta.day1Date, 1);
        await ingestFeed(buildSyntheticDay2Feed(now), day2Date);
        await updateSyntheticMeta({ day2Date, lastScenario: "T04-RECOVER-D2", lastStatus: "fresh", lastErrorCode: "NONE", lastRunAt: now.toISOString() });
        break;
      }
      case "TIMEOUT":
        throw new BoardFetchError("TIMEOUT", `[합성 시험] ${ERROR_COPY.TIMEOUT.message}`);
      case "UPSTREAM_AUTH":
        throw new BoardFetchError("UPSTREAM_AUTH", `[합성 시험] ${ERROR_COPY.UPSTREAM_AUTH.message}`);
      case "RATE_LIMITED":
        throw new BoardFetchError("RATE_LIMITED", `[합성 시험] ${ERROR_COPY.RATE_LIMITED.message}`);
      case "OFFLINE":
        throw new BoardFetchError("OFFLINE", `[합성 시험] ${ERROR_COPY.OFFLINE.message}`);
      case "SCHEMA_CHANGED": {
        const malformed = buildSchemaDriftPayload();
        const parsed = UsgsFeedSchema.safeParse(malformed);
        if (parsed.success) {
          // Should never happen — the fixture is deliberately malformed.
          throw new BoardFetchError("UNKNOWN", "합성 스키마 변경 fixture가 예상과 다르게 유효했습니다.");
        }
        throw new BoardFetchError(
          "SCHEMA_CHANGED",
          `[합성 시험] ${ERROR_COPY.SCHEMA_CHANGED.message} (검증 오류: ${parsed.error.issues[0]?.message ?? "구조 불일치"})`
        );
      }
    }

    const base = await buildStateFromStore();
    return { ...base, status: "fresh", errorCode: "NONE", errorTitle: null, errorMessage: null, errorAction: null };
  } catch (err) {
    const code = err instanceof BoardFetchError ? err.code : "UNKNOWN";
    const copy = ERROR_COPY[code];
    const isUserGuardError = err instanceof BoardFetchError && code === "UNKNOWN" && err.message.includes("먼저 재생");

    await updateSyntheticMeta({
      lastScenario: scenario,
      lastStatus: meta.day1Date ? "stale" : "error",
      lastErrorCode: code,
      lastRunAt: now.toISOString(),
    });

    const base = await buildStateFromStore();
    return {
      ...base,
      status: base.current ? "stale" : "error",
      errorCode: code,
      errorTitle: isUserGuardError ? "재생 순서 오류" : copy.title,
      errorMessage: err instanceof BoardFetchError ? err.message : copy.message,
      errorAction: isUserGuardError ? "D1-A 버튼을 먼저 눌러주세요." : copy.action,
    };
  }
}

export async function getSyntheticState(): Promise<SyntheticState> {
  const meta = await getSyntheticMeta();
  const base = await buildStateFromStore();
  const copy = meta.lastErrorCode !== "NONE" ? ERROR_COPY[meta.lastErrorCode] : null;
  return {
    ...base,
    status: meta.lastStatus,
    errorCode: meta.lastErrorCode,
    errorTitle: copy?.title ?? null,
    errorMessage: copy?.message ?? null,
    errorAction: copy?.action ?? null,
  };
}
