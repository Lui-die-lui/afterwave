// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { AccessLogFilter } from "../components/AccessLogFilter";
import { SYNTHETIC_ACCESS_LOGS } from "../lib/accessLogs";

// Fixed tests FT-01..FT-10, mirrored verbatim from docs/task5/FIXED_TESTS.md.
// Do not change test IDs, inputs, or expected values to make implementation pass.

const N = SYNTHETIC_ACCESS_LOGS.length;

function renderScreen() {
  return render(<AccessLogFilter initialLogs={SYNTHETIC_ACCESS_LOGS} />);
}

function getRowUsernames() {
  const rows = screen.getAllByRole("row").slice(1); // skip header row
  return rows.map((row) => within(row).getAllByRole("cell")[0].textContent);
}

function getRowResources() {
  const rows = screen.getAllByRole("row").slice(1);
  return rows.map((row) => within(row).getAllByRole("cell")[1].textContent);
}

function getRowVerdicts() {
  const rows = screen.getAllByRole("row").slice(1);
  return rows.map((row) => within(row).getAllByRole("cell")[2].textContent);
}

function getRowRiskScores() {
  const rows = screen.getAllByRole("row").slice(1);
  return rows.map((row) => Number(within(row).getAllByRole("cell")[3].textContent));
}

afterEach(() => {
  cleanup();
});

describe("Task 5 fixed tests (FT-01..FT-10)", () => {
  it("FT-01: 필터를 입력하지 않고 접근 로그 화면에 접속한다 -> 전체 로그가 표시되고 결과 건수는 N이다", () => {
    renderScreen();
    expect(getRowUsernames()).toHaveLength(N);
    expect(screen.getByText(new RegExp(`전체 ${N}건 중 ${N}건 표시`))).toBeInTheDocument();
  });

  it("FT-02: 사용자명 검색창에 kim을 입력한다 -> 표시된 모든 로그의 사용자명이 kim이며 결과가 1건 이상이다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.type(screen.getByLabelText("사용자명 검색"), "kim");
    const usernames = getRowUsernames();
    expect(usernames.length).toBeGreaterThanOrEqual(1);
    expect(usernames.every((name) => name === "kim")).toBe(true);
  });

  it("FT-03: 사용자명 검색창에 앞뒤 공백과 대문자가 포함된 KIM을 입력한다 -> FT-02와 같은 결과", async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.type(screen.getByLabelText("사용자명 검색"), "  KIM  ");
    const usernames = getRowUsernames();
    expect(usernames.length).toBeGreaterThanOrEqual(1);
    expect(usernames.every((name) => name === "kim")).toBe(true);
  });

  it("FT-04: 자원 필터에서 hr-system을 선택한다 -> 표시된 모든 로그의 자원이 hr-system이다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.selectOptions(screen.getByLabelText("자원 선택"), "hr-system");
    const resources = getRowResources();
    expect(resources.length).toBeGreaterThan(0);
    expect(resources.every((resource) => resource === "hr-system")).toBe(true);
  });

  it("FT-05: 판정 필터에서 ALLOW를 선택한다 -> 표시된 모든 로그의 판정이 ALLOW다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.selectOptions(screen.getByLabelText("판정"), "ALLOW");
    const verdicts = getRowVerdicts();
    expect(verdicts.length).toBeGreaterThan(0);
    expect(verdicts.every((verdict) => verdict === "ALLOW")).toBe(true);
  });

  it("FT-06: 최소 위험도에 15를 입력한다 -> 표시된 모든 로그의 위험도 점수가 15 이상이다", async () => {
    const user = userEvent.setup();
    renderScreen();
    const minRiskInput = screen.getByLabelText("최소 위험도");
    await user.type(minRiskInput, "15");
    const riskScores = getRowRiskScores();
    expect(riskScores.length).toBeGreaterThan(0);
    expect(riskScores.every((score) => score >= 15)).toBe(true);
  });

  it("FT-07: 사용자명 kim과 판정 ALLOW를 동시에 적용한다 -> 두 조건을 모두 만족하는 로그만 표시된다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.type(screen.getByLabelText("사용자명 검색"), "kim");
    await user.selectOptions(screen.getByLabelText("판정"), "ALLOW");
    const usernames = getRowUsernames();
    const verdicts = getRowVerdicts();
    expect(usernames.length).toBeGreaterThan(0);
    expect(usernames.every((name) => name === "kim")).toBe(true);
    expect(verdicts.every((verdict) => verdict === "ALLOW")).toBe(true);
  });

  it("FT-08: 사용자명 검색창에 no-such-user-999를 입력한다 -> 결과 건수는 0이고 안내 문구가 표시된다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.type(screen.getByLabelText("사용자명 검색"), "no-such-user-999");
    expect(screen.queryAllByRole("row")).toHaveLength(0);
    expect(screen.getByText("조건에 맞는 로그가 없습니다")).toBeInTheDocument();
  });

  it("FT-09: 하나 이상의 필터를 적용한 뒤 초기화 버튼을 누른다 -> 필터가 초기화되고 전체 N건이 다시 표시된다", async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.type(screen.getByLabelText("사용자명 검색"), "kim");
    await user.selectOptions(screen.getByLabelText("판정"), "ALLOW");
    await user.click(screen.getByRole("button", { name: "필터 초기화" }));
    expect(screen.getByLabelText("사용자명 검색")).toHaveValue("");
    expect(screen.getByLabelText("판정")).toHaveValue("");
    expect(getRowUsernames()).toHaveLength(N);
  });

  it("FT-10: 사용자명 kim 필터를 적용한 상태에서 페이지를 새로고침한다 -> 새로고침 후에도 필터 값과 결과가 유지된다", async () => {
    const user = userEvent.setup();
    const { unmount } = renderScreen();
    await user.type(screen.getByLabelText("사용자명 검색"), "kim");
    // Simulate a page reload: unmount and mount a fresh screen instance,
    // since this app performs no client/server persistence of filter state.
    unmount();
    renderScreen();
    expect(screen.getByLabelText("사용자명 검색")).toHaveValue("kim");
    const usernames = getRowUsernames();
    expect(usernames.length).toBeGreaterThanOrEqual(1);
    expect(usernames.every((name) => name === "kim")).toBe(true);
  });
});
