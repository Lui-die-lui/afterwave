const fixedTests = [
  ["FT-01", "기본 목록과 전체 건수", "PASS", "PASS"],
  ["FT-02", "사용자명 검색", "PASS", "PASS"],
  ["FT-03", "공백·대소문자 정규화", "PASS", "PASS"],
  ["FT-04", "자원 선택", "PASS", "PASS"],
  ["FT-05", "판정 선택", "PASS", "PASS"],
  ["FT-06", "최소 위험도", "FAIL", "PASS"],
  ["FT-07", "AND 복합 조건", "PASS", "PASS"],
  ["FT-08", "빈 결과 안내", "PASS", "PASS"],
  ["FT-09", "필터 초기화", "PASS", "PASS"],
  ["FT-10", "새로고침 상태 유지", "FAIL", "PASS"],
] as const;

export default function Assignment5ReportPage() {
  return (
    <main className="min-h-full bg-[var(--bg-gradient)] px-4 py-10 text-[var(--ink-0)]">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">Assignment 5</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">접근 로그 필터 비교 보고서</h1>
        <p className="mt-4 max-w-3xl text-[var(--ink-1)]">
          동일한 고정 검사 10개로 인수인계 전후 구현을 비교했습니다. 개인정보나 비밀 환경값은 사용하지 않았으며,
          비교 대상은 공개 화면에서 도구 A와 도구 B로만 표기합니다.
        </p>

        <section className="mt-8 grid gap-4 sm:grid-cols-3" aria-label="핵심 결과">
          {[
            ["도구 A 최종", "8 / 10"],
            ["도구 B 최종", "10 / 10"],
            ["검사 변경", "0건"],
          ].map(([label, value]) => (
            <article key={label} className="rounded-2xl border border-[var(--border-glass)] bg-[var(--surface-2)] p-5 shadow-[var(--shadow-glass)]">
              <p className="text-sm text-[var(--ink-2)]">{label}</p>
              <p className="mt-2 text-3xl font-semibold tabular">{value}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-[var(--border-glass)] bg-[var(--surface-2)] shadow-[var(--shadow-glass)]">
          <div className="border-b border-[var(--border-glass)] p-5">
            <h2 className="text-xl font-semibold">고정 검사 결과</h2>
            <p className="mt-1 text-sm text-[var(--ink-2)]">ID·입력·기대값을 그대로 유지한 결과입니다.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-[var(--surface-1)] text-[var(--ink-2)]">
                <tr><th className="px-5 py-3">검사</th><th className="px-5 py-3">범위</th><th className="px-5 py-3">도구 A</th><th className="px-5 py-3">도구 B</th></tr>
              </thead>
              <tbody>
                {fixedTests.map(([id, scope, toolA, toolB]) => (
                  <tr key={id} className="border-t border-[var(--border-glass)]">
                    <td className="px-5 py-3 font-medium">{id}</td><td className="px-5 py-3">{scope}</td>
                    <td className={`px-5 py-3 font-semibold ${toolA === "PASS" ? "text-[var(--status-fresh)]" : "text-[var(--status-error)]"}`}>{toolA}</td>
                    <td className="px-5 py-3 font-semibold text-[var(--status-fresh)]">{toolB}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-[var(--border-glass)] bg-[var(--surface-2)] p-5 shadow-[var(--shadow-glass)]">
            <h2 className="text-xl font-semibold">완료 범위</h2>
            <ul className="mt-3 space-y-2 text-sm text-[var(--ink-1)]">
              <li>사용자명·자원·판정·최소 위험도 AND 필터</li><li>결과 건수·빈 상태·전체 초기화</li><li>새로고침 후 필터 상태 유지</li>
            </ul>
          </article>
          <article className="rounded-2xl border border-[var(--border-glass)] bg-[var(--surface-2)] p-5 shadow-[var(--shadow-glass)]">
            <h2 className="text-xl font-semibold">검증 원칙</h2>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm"><dt className="text-[var(--ink-2)]">삭제</dt><dd>0건</dd><dt className="text-[var(--ink-2)]">완화</dt><dd>0건</dd><dt className="text-[var(--ink-2)]">기대값 변경</dt><dd>0건</dd></dl>
          </article>
        </section>

        <a href="/access-logs" className="mt-8 inline-flex rounded-xl bg-[var(--brand)] px-5 py-3 font-semibold text-white hover:bg-[var(--brand-hover)]">완성된 접근 로그 화면 보기</a>
      </div>
    </main>
  );
}
