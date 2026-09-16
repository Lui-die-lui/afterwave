export type AccessVerdict = "ALLOW" | "DENY";

export interface AccessLogEntry {
  id: string;
  username: string;
  resource: string;
  verdict: AccessVerdict;
  riskScore: number;
  occurredAt: string;
}

export interface AccessLogFilterState {
  username: string;
  resource: string;
  verdict: AccessVerdict | "";
  minRisk: number | "";
}

export function createInitialAccessLogFilterState(): AccessLogFilterState {
  return { username: "", resource: "", verdict: "", minRisk: "" };
}

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function filterAccessLogs(
  logs: AccessLogEntry[],
  filters: AccessLogFilterState,
): AccessLogEntry[] {
  const username = normalizeUsername(filters.username);
  return logs.filter((log) => {
    if (username && !log.username.toLowerCase().includes(username)) {
      return false;
    }
    if (filters.resource && log.resource !== filters.resource) {
      return false;
    }
    if (filters.verdict && log.verdict !== filters.verdict) {
      return false;
    }
    if (filters.minRisk !== "" && log.riskScore < filters.minRisk) {
      return false;
    }
    return true;
  });
}

export function getAccessLogResources(logs: AccessLogEntry[]): string[] {
  return Array.from(new Set(logs.map((log) => log.resource))).sort();
}

/**
 * Synthetic demo dataset for the access log filter screen.
 * Not real access data — usernames/resources are fixture values only.
 */
export const SYNTHETIC_ACCESS_LOGS: AccessLogEntry[] = [
  { id: "log-01", username: "kim", resource: "hr-system", verdict: "ALLOW", riskScore: 22, occurredAt: "2026-09-15T09:12:00+09:00" },
  { id: "log-02", username: "kim", resource: "hr-system", verdict: "DENY", riskScore: 8, occurredAt: "2026-09-15T09:20:00+09:00" },
  { id: "log-03", username: "kim", resource: "payroll-db", verdict: "ALLOW", riskScore: 30, occurredAt: "2026-09-15T10:05:00+09:00" },
  { id: "log-04", username: "lee", resource: "hr-system", verdict: "ALLOW", riskScore: 5, occurredAt: "2026-09-15T10:30:00+09:00" },
  { id: "log-05", username: "lee", resource: "payroll-db", verdict: "DENY", riskScore: 45, occurredAt: "2026-09-15T11:02:00+09:00" },
  { id: "log-06", username: "park", resource: "vpn-gateway", verdict: "ALLOW", riskScore: 12, occurredAt: "2026-09-15T11:40:00+09:00" },
  { id: "log-07", username: "park", resource: "hr-system", verdict: "DENY", riskScore: 18, occurredAt: "2026-09-15T12:15:00+09:00" },
  { id: "log-08", username: "choi", resource: "vpn-gateway", verdict: "DENY", riskScore: 60, occurredAt: "2026-09-15T13:01:00+09:00" },
  { id: "log-09", username: "choi", resource: "payroll-db", verdict: "ALLOW", riskScore: 3, occurredAt: "2026-09-15T13:45:00+09:00" },
  { id: "log-10", username: "jung", resource: "vpn-gateway", verdict: "ALLOW", riskScore: 9, occurredAt: "2026-09-15T14:22:00+09:00" },
  { id: "log-11", username: "jung", resource: "hr-system", verdict: "ALLOW", riskScore: 16, occurredAt: "2026-09-15T15:00:00+09:00" },
  { id: "log-12", username: "han", resource: "payroll-db", verdict: "DENY", riskScore: 27, occurredAt: "2026-09-15T15:38:00+09:00" },
];
