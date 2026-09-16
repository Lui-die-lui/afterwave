# 과제 5 작업 기록

## 공통 설정

* 프로젝트: Afterwave
* 저장소: https://github.com/Lui-die-lui/afterwave
* 작업 브랜치: `assignment-5`
* 공통 시작 버전: `task5-start`
* 공통 시간 상한: AI별 45분
* 공통 요청 수 상한: AI별 8회
* 요청 수 정의: 사용자가 AI에게 전송한 메시지 수
* 고정 검사 수: 10개
- 고정 검사 문서: `src/docs/task5/FIXED_TESTS.md`

---

## AI A 시작

* 사용 서비스: Claude Code
* 공개 비교표 표기: 도구 A
* 시작 시각: 2026-09-16 19:45 KST
* 시작 버전: `task5-start`
* 시작 소스: https://github.com/Lui-die-lui/afterwave/tree/task5-start
* 제공한 자료:

  * 현재 저장소
  * `INITIAL_REQUEST.md`
  * `FIXED_TESTS.md`
  * `USAGE_LIMITS.md`
* 이전 작업 대화 제공: 없음

## AI A 종료·인수인계

* 종료 시각: 2026-09-16 20:04 KST 
* 실제 작업시간: 약 19분
* 실제 요청 수: 5회
* 검사 실행 회차: 2회 (구현 전 1회, 구현 후 1회)
* FAIL이 포함된 실행 회차: 2회 (1회차: 10개 전체 FAIL — 화면 미구현. 2회차: FT-06, FT-10 FAIL)
* 최종 통과 수: 8/10 (PASS: FT-01, FT-02, FT-03, FT-04, FT-05, FT-07, FT-08, FT-09)
* 첫 실패 검사: 1회차(구현 전) 기준 FT-01부터 전체 실행 불가(FAIL). 2회차(구현 후) 기준 FT-06.
* 종료 버전: `task5-ai-a-handoff`
* 인수인계 문서: `src/docs/task5/HANDOFF.md`
* 인수인계 누락 여부: 없음
* 남은 문제: 최소 위험도 필터(FT-06) 미구현, 새로고침 후 필터 상태 유지(FT-10) 미구현. 상세는 `HANDOFF.md` 5·6절 참고.

---

## 새 폴더 재현

- 확인 시각: 2026-09-16 20:19 KST
- 확인 버전: `task5-ai-a-handoff`
- 새 폴더에서 저장소 복제: 성공
- 태그 체크아웃: 성공
- 문서 버전과 실제 버전 일치: 성공
- 최초 고정 검사 실행: 실패 — `ERR_MODULE_NOT_FOUND: jsdom`
- 최초 실패 원인: 태그 체크아웃 전에 설치된 `node_modules`를 그대로 사용하여, 태그의 `package.json`과 로컬 설치 상태가 일치하지 않았음
- 태그의 의존성 확인: `package.json`에 `jsdom: ^29.1.1`, lockfile에 `jsdom: 29.1.1`이 등록되어 있음
- 재현 절차 정정: 태그 체크아웃 후 `npm install`을 다시 실행
- 의존성 확인: `npm ls jsdom --depth=0` 성공
- 고정 검사 실행: 성공 — 8/10 PASS
- 재현된 실패 검사: FT-06, FT-10
- AI A가 기록한 검사 결과와의 일치: 일치
- 인수인계 누락 여부: 없음
- 환경값 누락: 없음

### AI B 직접 검증 및 정정

- 수정 전 기록: 새 폴더 재현에서 `jsdom`이 `package.json`과 lockfile에 등록되지 않았다고 기록됨
- 직접 검증: `task5-ai-a-handoff` 태그의 `package.json`에 `jsdom: ^29.1.1`, lockfile에 `jsdom: 29.1.1`이 이미 등록되어 있음
- 설치 검증: `npm install` 및 `npm ls jsdom --depth=0` 성공
- 수정 후 결론: 현재 인수인계 태그에는 테스트 의존성 누락이 없으며 별도 의존성 변경이 필요하지 않음
- 최초 `ERR_MODULE_NOT_FOUND` 기록 원인: 현재 저장소와 태그 내용만으로는 재현되지 않아 원인 확정 불가

---

## AI B 시작

* 사용 서비스: Codex
* 공개 비교표 표기: 도구 B
* 시작 시각: 2026-09-16 20:24 KST
* 시작 버전: `task5-ai-a-handoff`
* 제공한 자료:

  * 현재 저장소
  * `HANDOFF.md`
  * 저장소 안의 과제 5 문서
* AI A 대화 전문 제공: 없음
* AI A가 남긴 문서와 AI B가 받은 문서의 동일성: 일치
* 인수인계 누락 여부: 없음

## AI B 종료

* 종료 시각: 2026-09-16 20:57 KST
* 실제 작업시간: 33분
* 실제 요청 수: 2회
* 검사 실행 회차: 5회 (구현 전 고정 검사 1회, 구현 후 고정 검사 3회, 전체 테스트 내 고정 검사 1회)
* FAIL이 포함된 실행 회차: 1회 (1회차: FT-06, FT-10 FAIL)
* 최종 통과 검사: 10/10 (FT-01 ~ FT-10 모두 PASS)
* 검사 삭제: 0건
* 검사 완화: 0건
* 기대값 변경: 0건
* 완료한 기능: 최소 위험도 필터, 전체 조건 AND 결합, 새로고침 후 필터 상태 유지, `/assignment-5` 공개 비교 보고서
* 변경한 파일: `src/lib/accessLogs.ts`, `src/components/AccessLogFilter.tsx`, `src/app/assignment-5/page.tsx`, `src/docs/task5/WORK_LOG.md`
* 검증 결과: 고정 검사 10/10 PASS, 빌드 PASS, 린트 PASS, 타입 검사 PASS
* 전체 테스트: 109 PASS / 1 FAIL — 과제 이전부터 존재한 `.env.example` 부재 검사만 FAIL
* 종료 버전: `task5-complete`

---

## 전체 작업 순서

1. AI A 시작: 2026-09-16 19:45 KST — `task5-start`
2. AI A 종료·인수인계: 2026-09-16 20:04 KST — `task5-ai-a-handoff`, 8/10 PASS
3. AI B 시작: 2026-09-16 20:24 KST — 인수인계 상태 8/10 재현
4. AI B 종료: 2026-09-16 20:57 KST — `task5-complete`, 10/10 PASS
---

## 이름을 가린 비교 결과

| 측정 항목 | 도구 A | 도구 B |
|---|---:|---:|
| 실제 작업시간 | 19분 | 33분 |
| 실제 요청 수 | 5회 | 2회 |
| 검사 실행 회차 | 2회 | 5회 |
| 오류 회차 | 2회 | 1회 |
| 최종 통과 수 | 8/10 | 10/10 |
| 시작 버전 | `task5-start` | `task5-ai-a-handoff` |
| 종료 버전 | `task5-ai-a-handoff` | `task5-complete` |

## 다음 작업의 도구 선택 기준

구조 파악과 초기 구현 속도가 중요한 작업에는 도구 A를 먼저 사용하고, 저장소와 인수인계 문서만으로 재현하고 검증해야 하는 작업에는 도구 B를 우선 사용한다.
