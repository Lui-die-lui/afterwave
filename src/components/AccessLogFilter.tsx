"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createInitialAccessLogFilterState,
  filterAccessLogs,
  getAccessLogResources,
  type AccessLogEntry,
  type AccessLogFilterState,
  type AccessVerdict,
} from "@/lib/accessLogs";

interface AccessLogFilterProps {
  initialLogs: AccessLogEntry[];
}

const STORAGE_KEY = "afterwave:access-log-filters";
let transientFilterSnapshot: AccessLogFilterState | null = null;

function readSavedFilters(): AccessLogFilterState {
  if (transientFilterSnapshot) {
    const snapshot = transientFilterSnapshot;
    transientFilterSnapshot = null;
    return snapshot;
  }

  if (typeof window === "undefined") {
    return createInitialAccessLogFilterState();
  }

  try {
    const saved = window.sessionStorage.getItem(STORAGE_KEY);
    if (!saved) return createInitialAccessLogFilterState();

    const parsed = JSON.parse(saved) as Partial<AccessLogFilterState>;
    return {
      username: typeof parsed.username === "string" ? parsed.username : "",
      resource: typeof parsed.resource === "string" ? parsed.resource : "",
      verdict: parsed.verdict === "ALLOW" || parsed.verdict === "DENY" ? parsed.verdict : "",
      minRisk: typeof parsed.minRisk === "number" && Number.isFinite(parsed.minRisk) ? parsed.minRisk : "",
    };
  } catch {
    return createInitialAccessLogFilterState();
  }
}

export function AccessLogFilter({ initialLogs }: AccessLogFilterProps) {
  const [filters, setFilters] = useState(readSavedFilters);
  const filtersRef = useRef(filters);
  const resources = useMemo(() => getAccessLogResources(initialLogs), [initialLogs]);
  const filtered = useMemo(() => filterAccessLogs(initialLogs, filters), [initialLogs, filters]);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    const saveForReload = () => {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filtersRef.current));
    };

    window.addEventListener("pagehide", saveForReload);
    return () => {
      window.removeEventListener("pagehide", saveForReload);
      const snapshot = filtersRef.current;
      transientFilterSnapshot = snapshot;
      queueMicrotask(() => {
        if (transientFilterSnapshot === snapshot) transientFilterSnapshot = null;
      });
    };
  }, []);

  const handleReset = () => {
    window.sessionStorage.removeItem(STORAGE_KEY);
    transientFilterSnapshot = null;
    setFilters(createInitialAccessLogFilterState());
  };

  return (
    <section className="aw-widget" aria-labelledby="access-log-filter-heading">
      <h2 id="access-log-filter-heading" className="aw-widget-title">
        접근 로그
      </h2>

      <form
        className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="access-log-username" className="text-sm">
            사용자명 검색
          </label>
          <input
            id="access-log-username"
            type="text"
            value={filters.username}
            onChange={(event) => setFilters((prev) => ({ ...prev, username: event.target.value }))}
            placeholder="사용자명"
            className="rounded-lg border border-white/20 bg-black/20 px-3 py-2 text-base"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="access-log-resource" className="text-sm">
            자원 선택
          </label>
          <select
            id="access-log-resource"
            value={filters.resource}
            onChange={(event) => setFilters((prev) => ({ ...prev, resource: event.target.value }))}
            className="rounded-lg border border-white/20 bg-black/20 px-3 py-2 text-base"
          >
            <option value="">전체</option>
            {resources.map((resource) => (
              <option key={resource} value={resource}>
                {resource}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="access-log-min-risk" className="text-sm">
            최소 위험도
          </label>
          <input
            id="access-log-min-risk"
            type="number"
            min="0"
            value={filters.minRisk}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                minRisk: event.target.value === "" ? "" : Number(event.target.value),
              }))
            }
            className="rounded-lg border border-white/20 bg-black/20 px-3 py-2 text-base"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="access-log-verdict" className="text-sm">
            판정
          </label>
          <select
            id="access-log-verdict"
            value={filters.verdict}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, verdict: event.target.value as AccessVerdict | "" }))
            }
            className="rounded-lg border border-white/20 bg-black/20 px-3 py-2 text-base"
          >
            <option value="">전체</option>
            <option value="ALLOW">ALLOW</option>
            <option value="DENY">DENY</option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-base"
        >
          필터 초기화
        </button>
      </form>

      <p className="mt-3 text-sm opacity-80" role="status">
        전체 {initialLogs.length}건 중 {filtered.length}건 표시
      </p>

      <p className="mt-1 text-xs opacity-60">모든 필터는 AND 조건으로 적용되며 새로고침 후에도 유지됩니다.</p>

      {filtered.length === 0 ? (
        <p className="mt-4 text-base" role="status">
          조건에 맞는 로그가 없습니다
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/20">
                <th className="py-2 pr-3">사용자명</th>
                <th className="py-2 pr-3">자원</th>
                <th className="py-2 pr-3">판정</th>
                <th className="py-2 pr-3">위험도</th>
                <th className="py-2 pr-3">발생 시각</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id} className="border-b border-white/10">
                  <td className="py-2 pr-3">{log.username}</td>
                  <td className="py-2 pr-3">{log.resource}</td>
                  <td className="py-2 pr-3">{log.verdict}</td>
                  <td className="py-2 pr-3">{log.riskScore}</td>
                  <td className="py-2 pr-3">{log.occurredAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
