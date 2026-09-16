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

const comparison = [
  ["실제 작업시간", "19분", "33분"],
  ["실제 요청 수", "5회", "2회"],
  ["검사 실행 회차", "2회", "5회"],
  ["오류 회차", "2회", "1회"],
  ["최종 통과 수", "8/10", "10/10"],
  ["시작 버전", "task5-start", "task5-ai-a-handoff"],
  ["종료 버전", "task5-ai-a-handoff", "task5-complete"],
] as const;

const handoffSummary = [
  ["목표", "접근 로그 화면에 다중 조건 필터와 결과 안내, 초기화, 상태 유지를 완성한다."],
  ["현재 상태", "도구 A가 사용자명·자원·판정 필터와 건수·빈 상태·초기화를 구현한 8/10 상태였다."],
  ["실행 명령", "npm install, npm run build, npm run lint, npx tsc --noEmit, npx vitest run src/tests/task5_filter.spec.tsx"],
  ["통과 검사", "FT-01~05, FT-07~09가 통과했고 FT-06과 FT-10이 실패했다."],
  ["남은 문제", "최소 위험도 필터와 새로고침 후 필터 상태 유지가 구현되지 않았다."],
  ["다음 행동", "최소 위험도 AND 조건과 클라이언트 상태 저장을 구현한 뒤 동일 검사 10개를 재실행한다."],
  ["건드리지 말 것", "고정 검사, 합성 fixture 외 원본 데이터, 환경변수 비밀값, 과제와 무관한 대시보드 기능."],
] as const;

const panelClass =
  "rounded-2xl border border-[var(--border-glass)] bg-[var(--surface-2)] p-5 shadow-[var(--shadow-glass)]";

export default function Assignment5ReportPage() {
  return (
    <main className="min-h-full bg-[var(--bg-gradient)] px-4 py-10 text-[var(--ink-0)]">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-strong)]">Assignment 5</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">접근 로그 필터 비교 보고서</h1>
        <p className="mt-4 max-w-3xl text-[var(--ink-1)]">
          동일한 고정 검사 10개로 인수인계 전후 구현을 비교했습니다. 개인정보나 비밀 환경값은 사용하지 않았으며,
          비교 대상은 도구 A와 도구 B로만 표기합니다.
        </p>

        <section className="mt-8 grid gap-4 sm:grid-cols-3" aria-label="핵심 결과">
          {[["도구 A 최종", "8 / 10"], ["도구 B 최종", "10 / 10"], ["검사 변경", "0건"]].map(
            ([label, value]) => (
              <article key={label} className={panelClass}>
                <p className="text-sm text-[var(--ink-2)]">{label}</p>
                <p className="mt-2 text-3xl font-semibold tabular">{value}</p>
              </article>
            ),
          )}
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <article className={panelClass}>
            <h2 className="text-xl font-semibold">공통 사용 상한</h2>
            <dl className="mt-4 grid grid-cols-[1fr_auto] gap-x-4 gap-y-3 text-sm">
              <dt className="text-[var(--ink-2)]">AI별 시간 상한</dt><dd className="font-semibold">45분</dd>
              <dt className="text-[var(--ink-2)]">AI별 요청 상한</dt><dd className="font-semibold">8회</dd>
            </dl>
            <p className="mt-4 border-t border-[var(--border-glass)] pt-4 text-sm text-[var(--ink-1)]">요청은 사용자가 AI에게 보낸 메시지 수로 계산합니다.</p>
          </article>
          <article className={panelClass}>
            <h2 className="text-xl font-semibold">검증 원칙</h2>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <dt className="text-[var(--ink-2)]">삭제</dt><dd>0건</dd>
              <dt className="text-[var(--ink-2)]">완화</dt><dd>0건</dd>
              <dt className="text-[var(--ink-2)]">기대값 변경</dt><dd>0건</dd>
            </dl>
          </article>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-[var(--border-glass)] bg-[var(--surface-2)] shadow-[var(--shadow-glass)]">
          <div className="border-b border-[var(--border-glass)] p-5"><h2 className="text-xl font-semibold">이름을 가린 비교표</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-[var(--surface-1)] text-[var(--ink-2)]"><tr><th className="px-5 py-3">측정 항목</th><th className="px-5 py-3">도구 A</th><th className="px-5 py-3">도구 B</th></tr></thead>
              <tbody>{comparison.map(([metric, toolA, toolB]) => <tr key={metric} className="border-t border-[var(--border-glass)]"><th className="px-5 py-3 font-medium">{metric}</th><td className="px-5 py-3 tabular">{toolA}</td><td className="px-5 py-3 tabular">{toolB}</td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-[var(--border-glass)] bg-[var(--surface-2)] shadow-[var(--shadow-glass)]">
          <div className="border-b border-[var(--border-glass)] p-5"><h2 className="text-xl font-semibold">고정 검사 결과</h2><p className="mt-1 text-sm text-[var(--ink-2)]">ID·입력·기대값을 그대로 유지한 결과입니다.</p></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-[var(--surface-1)] text-[var(--ink-2)]"><tr><th className="px-5 py-3">검사</th><th className="px-5 py-3">범위</th><th className="px-5 py-3">도구 A</th><th className="px-5 py-3">도구 B</th></tr></thead>
              <tbody>{fixedTests.map(([id, scope, toolA, toolB]) => <tr key={id} className="border-t border-[var(--border-glass)]"><td className="px-5 py-3 font-medium">{id}</td><td className="px-5 py-3">{scope}</td><td className={`px-5 py-3 font-semibold ${toolA === "PASS" ? "text-[var(--status-fresh)]" : "text-[var(--status-error)]"}`}>{toolA}</td><td className="px-5 py-3 font-semibold text-[var(--status-fresh)]">{toolB}</td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <article className={panelClass}>
            <h2 className="text-xl font-semibold">작업 순서</h2>
            <ol className="mt-4 space-y-3 text-sm text-[var(--ink-1)]">
              <li><strong className="text-[var(--ink-0)]">1. AI A 시작</strong> — 2026-09-16 19:45 KST</li>
              <li><strong className="text-[var(--ink-0)]">2. AI A 종료·인수인계</strong> — 2026-09-16 20:04 KST</li>
              <li><strong className="text-[var(--ink-0)]">3. AI B 시작</strong> — 2026-09-16 20:24 KST</li>
              <li><strong className="text-[var(--ink-0)]">4. AI B 종료</strong> — 2026-09-16 20:57 KST</li>
            </ol>
          </article>
          <article className={panelClass}>
            <h2 className="text-xl font-semibold">새 폴더 재현 결과</h2>
            <ul className="mt-4 space-y-2 text-sm text-[var(--ink-1)]">
              <li>✓ <code>task5-ai-a-handoff</code> 버전 일치</li>
              <li>✓ 태그 체크아웃 후 <code>npm install</code></li>
              <li>✓ 도구 A 결과 8/10 재현</li>
              <li>✓ FT-06, FT-10 실패 재현</li>
              <li>✓ 인수인계 누락 없음</li>
            </ul>
          </article>
        </section>

        <section className={`mt-6 ${panelClass}`}>
          <h2 className="text-xl font-semibold">인수인계 7항목 요약</h2>
          <dl className="mt-4 divide-y divide-[var(--border-glass)]">
            {handoffSummary.map(([title, description]) => <div key={title} className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr]"><dt className="font-semibold">{title}</dt><dd className="text-sm text-[var(--ink-1)]">{description}</dd></div>)}
          </dl>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <article className={panelClass}>
            <h2 className="text-xl font-semibold">공개 링크</h2>
            <ul className="mt-4 space-y-3 text-sm text-[var(--brand-strong)] underline underline-offset-4">
              <li><a href="https://github.com/Lui-die-lui/afterwave">저장소</a></li>
              <li><a href="https://github.com/Lui-die-lui/afterwave/tree/task5-start">시작 버전: task5-start</a></li>
              <li><a href="https://github.com/Lui-die-lui/afterwave/tree/task5-ai-a-handoff">A 인계 버전: task5-ai-a-handoff</a></li>
              <li><a href="https://github.com/Lui-die-lui/afterwave/tree/task5-complete">완료 버전: task5-complete</a></li>
              <li><a href="https://github.com/Lui-die-lui/afterwave/blob/task5-ai-a-handoff/src/docs/task5/HANDOFF.md">HANDOFF.md</a></li>
            </ul>
          </article>
          <article className={panelClass}>
            <h2 className="text-xl font-semibold">다음 작업의 도구 선택 기준</h2>
            <p className="mt-4 text-sm leading-7 text-[var(--ink-1)]">구조 파악과 초기 구현 속도가 중요한 작업에는 도구 A를 먼저 사용하고, 저장소와 인수인계만으로 재현·검증해야 하는 작업에는 도구 B를 우선 사용한다.</p>
          </article>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <article className={panelClass}>
            <h2 className="text-xl font-semibold">짧은 확인 방법</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div><dt className="font-semibold">위치</dt><dd className="text-[var(--ink-1)]">공개 주소의 <code>/access-logs</code></dd></div>
              <div><dt className="font-semibold">3단계 이내 행동</dt><dd className="text-[var(--ink-1)]">필터 입력 → 결과 확인 → 새로고침</dd></div>
              <div><dt className="font-semibold">통과 모습</dt><dd className="text-[var(--ink-1)]">조건에 맞는 건수와 행만 표시되고 새로고침 후 값이 유지됨</dd></div>
              <div><dt className="font-semibold">안 될 때 모습</dt><dd className="text-[var(--ink-1)]">조건 밖 행이 보이거나 입력값·결과가 초기화됨</dd></div>
            </dl>
          </article>
          <article className={panelClass}>
            <h2 className="text-xl font-semibold">AI와 나의 판단</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div><dt className="font-semibold">AI에게 맡긴 일</dt><dd className="text-[var(--ink-1)]">저장소 재현, 필터 구현, 자동 검사와 공개 보고서 작성</dd></div>
              <div><dt className="font-semibold">직접 판단한 일</dt><dd className="text-[var(--ink-1)]">고정 검사·상한·비교 항목과 공개 범위 확정</dd></div>
              <div><dt className="font-semibold">AI 제안을 따르지 않은 일과 이유</dt><dd className="text-[var(--ink-1)]">검사 기대값 변경은 비교의 공정성을 훼손하므로 채택하지 않음</dd></div>
            </dl>
          </article>
        </section>

        <a href="/access-logs" className="mt-8 inline-flex rounded-xl bg-[var(--brand)] px-5 py-3 font-semibold text-white hover:bg-[var(--brand-hover)]">완성된 접근 로그 화면 보기</a>
      </div>
    </main>
  );
}
