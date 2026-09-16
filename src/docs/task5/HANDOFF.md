# AI A → AI B 인수인계

## 1. 목표

Afterwave 접근 로그 화면에 다중 조건 필터(사용자명 검색, 자원 선택, 판정 ALLOW/DENY, 최소 위험도, AND 결합, 결과 건수, 빈 상태 안내, 필터 초기화, 새로고침 후 상태 유지)를 추가한다. AI A는 이 중 사용자명 검색, 자원 선택, 판정 ALLOW/DENY 필터, 필터 결과 건수 표시, 필터 초기화만 구현했다.

## 2. 현재 상태

* 저장소 버전 ID: `task5-ai-a-handoff`
* 현재 구현된 기능:
  * 접근 로그 화면 신규 라우트 `/access-logs` (`src/app/access-logs/page.tsx`)
  * 사용자명 검색 (공백 trim + 대소문자 무시, 부분 일치)
  * 자원 선택 필터 (드롭다운, 로그에 존재하는 자원 목록 자동 생성)
  * 판정 ALLOW/DENY 필터 (드롭다운)
  * 필터 결과 건수 표시 (`전체 N건 중 M건 표시`)
  * 결과 0건일 때 `조건에 맞는 로그가 없습니다` 안내 문구
  * 필터 초기화 버튼 (모든 필터를 기본값으로 되돌림)
  * 필터 로직은 `src/lib/accessLogs.ts`의 순수 함수(`filterAccessLogs`)로 분리, 화면은 `src/components/AccessLogFilter.tsx`
  * 로그 데이터는 합성(fixture) 데이터셋(`SYNTHETIC_ACCESS_LOGS`, 12건) — 실제 접근 로그가 아님을 주석으로 명시
* 아직 구현되지 않은 기능:
  * 최소 위험도 입력 필터 (UI 자체가 없음 — FT-06 대상)
  * 위 필터를 포함한 복합 조건 (최소 위험도가 관여하는 조합)
  * 새로고침 후 필터 상태 유지 (URL 파라미터/스토리지 미연동 — FT-10 대상)
* 현재 고정 검사 통과 수: 8 / 10 (FT-06, FT-10 FAIL)

버전 확인 명령:

```
git describe --tags --exact-match
```

기대 결과:

```
task5-ai-a-handoff
```

## 3. 실행 명령

```
npm install
npm run dev      # http://localhost:3000/access-logs 에서 화면 확인 (로그인 불필요)
npm run build    # 프로덕션 빌드 검증
npm run lint
npx tsc --noEmit
npm run test     # 전체 vitest 실행
npx vitest run src/tests/task5_filter.spec.tsx   # 고정 검사 10개만 실행
```

## 4. 통과 검사

고정 검사 10개(`src/tests/task5_filter.spec.tsx`에 자동화됨, `@testing-library/react` + jsdom 사용, 실제 화면 입력/선택/클릭/재마운트를 시뮬레이션):

| ID    | 구현 전 (최초 실행) | 구현 후 (최종 실행) |
| ----- | ------------ | ------------ |
| FT-01 | FAIL (화면 없음) | PASS         |
| FT-02 | FAIL (화면 없음) | PASS         |
| FT-03 | FAIL (화면 없음) | PASS         |
| FT-04 | FAIL (화면 없음) | PASS         |
| FT-05 | FAIL (화면 없음) | PASS         |
| FT-06 | FAIL (화면 없음) | **FAIL (최소 위험도 필터 미구현)** |
| FT-07 | FAIL (화면 없음) | PASS         |
| FT-08 | FAIL (화면 없음) | PASS         |
| FT-09 | FAIL (화면 없음) | PASS         |
| FT-10 | FAIL (화면 없음) | **FAIL (새로고침 상태 유지 미구현)** |

* 구현 전 실행: 화면/컴포넌트가 존재하지 않아 테스트 파일이 모듈을 찾지 못해 10개 전체가 실행 자체에 실패(FAIL)했다. 이를 "최초 결과"로 보존한다.
* 구현 후 실행: 8 PASS / 2 FAIL. **첫 번째 실패 검사: FT-06.**
* 검사 ID·입력·기대값은 `FIXED_TESTS.md` 원문 그대로이며 변경하지 않았다.
* 위 표와 동일한 결과가 `WORK_LOG.md`의 검사 실행 회차 표에도 기록되어 있다.

참고: 전체 `npm run test` 실행 시 task5와 무관한 기존 테스트 `src/lib/__tests__/security-boundaries.test.ts`의 `.env.example` 관련 검사 1건이 실패한다. 이는 이번 작업 이전부터 저장소에 `.env.example` 파일 자체가 없어서 발생하는 기존 문제이며, AI A가 만들거나 악화시키지 않았다(건드리지 않음).

## 5. 남은 문제

* FT-06 (최소 위험도 필터): UI 입력 요소 자체가 없다. `getByLabelText("최소 위험도")`가 요소를 찾지 못해 실패한다.
* FT-10 (새로고침 상태 유지): 필터 상태가 컴포넌트 로컬 `useState`에만 존재하며 URL, 세션/로컬 스토리지 등 어디에도 저장되지 않는다. 테스트에서는 실제 새로고침 대신 컴포넌트 unmount 후 재마운트로 재현했다 — 상태가 초기값으로 리셋되어 실패한다.
* 재현 방법: `npx vitest run src/tests/task5_filter.spec.tsx` 실행 후 콘솔에서 FT-06, FT-10 실패 스택트레이스로 확인 가능.

## 6. 다음 행동

1. `src/lib/accessLogs.ts`의 `AccessLogFilterState`에 `minRisk: number | ""` 필드를 추가하고 `filterAccessLogs`에 `riskScore >= minRisk` 조건을 추가한다.
2. `src/components/AccessLogFilter.tsx`에 `id="access-log-min-risk"`, `aria-label`(또는 연결된 `<label>`) `"최소 위험도"`인 숫자 입력을 추가한다(기존 필터 컨트롤과 동일한 스타일 사용).
3. 필터 상태를 새로고침 후에도 유지하도록 구현한다 — URL 쿼리 파라미터(예: `?username=kim`) 또는 `sessionStorage` 중 택일. `/access-logs`가 로그인 없이 공개 접근 가능해야 하므로 서버 세션에 의존하지 않는 방식을 권장한다.
4. `npx vitest run src/tests/task5_filter.spec.tsx`를 다시 실행해 FT-06, FT-10을 포함한 10개 전체가 PASS하는지 확인한다. **검사 ID·입력·기대값은 절대 수정하지 말 것.**
5. `WORK_LOG.md`의 "AI B 시작/종료" 섹션과 "이름을 가린 비교 결과" 표를 채운다.
6. 완료 시 `task5-complete` 태그를 남긴다.

## 7. 건드리지 말 것

* 고정 검사 10개의 ID·입력·기대값 (`FIXED_TESTS.md`)
* 기존 로그 원본 데이터 — `SYNTHETIC_ACCESS_LOGS`는 합성 fixture이며 실제 로그가 아니다. 실제 로그 저장소/데이터 구조가 별도로 있다면 이 합성 데이터로 대체하지 말 것.
* 실제 환경변수 및 비밀값(`.env`의 Supabase 값 등) — 이번 기능은 이를 전혀 사용하지 않는다.
* 과제와 관계없는 기존 기능 — AFTERWAVE 지진 대시보드(`src/app/page.tsx`, `src/components/Dashboard.tsx` 등)와 관련 lib/테스트는 이번 작업에서 수정하지 않았다.
* `vitest.config.ts`의 `@` 별칭 설정 — 기존 테스트 실행 방식에는 영향이 없으나(기존 테스트는 상대 경로 import만 사용), 새 테스트가 `@/lib/accessLogs` 형태의 import를 해석하는 데 필요하다.
