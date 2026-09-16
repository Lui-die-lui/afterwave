# AFTERWAVE — 오늘 지구가 남긴 가장 큰 신호

USGS 공개 GeoJSON 피드에서 조회 시점 기준 최근 24시간 동안 발생한 지진 중 규모가 가장 큰 지진을 표시하고,
Asia/Seoul 기준으로 하루 한 건씩 실제 기록을 남기는 대시보드입니다. (과제 T04)

## 실행 방법

```bash
npm install
npm run dev
# http://localhost:3000
```

프로덕션 빌드로 확인하려면:

```bash
npm run build
npm run start
```

USGS 원천 자체는 API 키가 필요 없지만, 일별 기록 저장에 Supabase를 사용하므로 아래 "환경 변수" 절의
값을 `.env.local`(로컬) 또는 배포 환경 변수(Vercel)에 설정해야 합니다.

## 환경 변수

```
SUPABASE_URL=
SUPABASE_SECRET_KEY=
```

(`.env.example` 참고. Supabase 대시보드가 기본으로 보여주는 이름인 `NEXT_PUBLIC_SUPABASE_URL` /
`SUPABASE_SERVICE_ROLE_KEY`도 동일하게 인식합니다 — `src/lib/supabase/env.ts` 참고.) 비밀키는 서버
전용 모듈에서만 읽고, 브라우저 번들·네트워크 응답·로그에는 절대 값이 노출되지 않습니다.

## Supabase 테이블 준비 (배포 전 필수)

이 저장소에는 마이그레이션 러너가 없어 아래 두 SQL 파일이 자동으로 실행되지 않습니다. 처음 한 번,
Supabase 프로젝트의 SQL Editor에서 순서대로 직접 실행해야 합니다.

1. `supabase/migrations/0001_create_afterwave_daily_records.sql` — **실제** 일별 기록 (`afterwave_daily_records`).
2. `supabase/migrations/0002_create_afterwave_synthetic_state.sql` — Failure Lab **합성** 상태 (`afterwave_synthetic_state`).

두 테이블은 완전히 분리되어 있고, 각각 RLS가 켜져 있으며 `service_role`(서버 전용 비밀키)만 접근할 수
있습니다. 두 번째 테이블을 실행하지 않으면 Failure Lab(다섯 실패 재생 버튼)이 503 오류를 반환합니다 —
실제 조회 화면(대표값·상세 정보)은 첫 번째 테이블만으로 정상 동작합니다.

## Vercel 배포

1. GitHub 저장소를 Vercel에 Import (Next.js 프레임워크 자동 인식, 별도 설정 불필요).
2. Project Settings → Environment Variables에 `SUPABASE_URL`, `SUPABASE_SECRET_KEY`를 추가(Production/Preview 모두 권장).
3. 위 "Supabase 테이블 준비" 절의 SQL 두 개를 실행했는지 확인.
4. 배포 후 공개 화면에서 실제 값 조회와 Failure Lab 다섯 버튼이 모두 정상 동작하는지 확인.

## 구조

- `src/app/page.tsx` — 서버 컴포넌트. 요청마다 실제 USGS 피드를 조회 → Supabase에 저장 → 최근 두 건을
  다시 읽어 초기 상태를 렌더링합니다 (`force-dynamic`, 정적 캐시 없음).
- `src/app/api/earthquake/latest` — 실제 조회 API (다시 시도 버튼이 호출).
- `src/app/api/earthquake/replay` — 합성 실패/복구 시나리오 재생 API (Failure Lab 전용, 실제 네트워크 호출 없음).
- `src/app/api/earthquake/synthetic` — 합성 저장소의 현재 상태 조회.
- `src/lib/` — USGS 피드 fetch/검증(zod), 정규화, KST 날짜 계산, 오류 분류, 규모 해석(`magnitudeGuide.ts`),
  equirectangular 좌표 변환(`projection.ts`).
- `src/lib/realStore.ts`, `src/lib/supabase/realRecordsRepository.ts` — **실제** 일별 기록 저장/조회
  (Supabase, `afterwave_daily_records` 테이블). 서버 전용, upsert-by-`record_date`로 같은 KST 날짜
  중복 삽입을 막습니다.
- `src/lib/syntheticStore.ts`, `src/lib/supabase/syntheticStateRepository.ts` — Failure Lab **합성**
  상태 저장/조회 (Supabase, `afterwave_synthetic_state` 테이블). 실제 저장소와 완전히 분리된 별도
  테이블·모듈이며, 실제 저장소 코드는 이 모듈을 참조하지 않고 그 반대도 마찬가지입니다.
- `src/lib/fixtures/dailyComparisonPreview.ts` — Failure Lab의 "일별 비교 미리보기" 시나리오. 네트워크
  호출도 저장소 쓰기도 하지 않는 순수 in-memory fixture입니다.
- `src/components/map/` — 세계지도(로컬 SVG path, 외부 지도 타일/키 없음)와 지진파 리플 마커.
- `scripts/generate-world-map.mjs` — `world-atlas`(Natural Earth 110m land, 로컬 npm 패키지 데이터)를
  `src/lib/projection.ts`와 동일한 equirectangular 공식으로 투영해 `src/lib/worldMapPath.ts`를 생성하는
  1회성 스크립트. 지도를 다시 생성하려면 `node scripts/generate-world-map.mjs`.

## 과제 asset 패키지 관련 누락 사항

CLAUDE.md와 과제 설명은 `assets/studio-task-assets/t04-real-information-board/`의 `README.md`,
`public-contract.json`, `asset-manifest.json`(및 package SHA-256)을 참조하지만, 이 저장소와 로컬 머신 전체를
검색했을 때 해당 파일을 찾지 못했습니다. 값을 추측하지 않는다는 원칙에 따라 SHA-256 대조는 수행하지
않았고, `src/lib/fixtures/syntheticFeed.ts`의 다섯 실패/복구 fixture는 공식 asset이 아닌 자체 작성한
합성 값임을 코드 주석과 Failure Lab 화면에 명시했습니다. 공식 asset 패키지가 제공되면 해당 파일의 값으로
교체하고 `asset-manifest.json` 기준 SHA-256을 검증해야 합니다.

## 실제 일별 기록 2건에 대한 메모

실제 기록은 실제 성공 조회로만 쌓입니다. 지금까지 확보한 실제 기록은 조회를 실행한 KST 날짜의 1건뿐이며,
다음 KST 날짜에 실제로 성공 조회를 한 번 더 실행해야 2건째가 채워집니다(공개 화면은 그때까지 "다음 실제
KST 날짜 기록 대기 중"으로 정직하게 표시합니다). 같은 날짜 재조회 시 한 행으로 유지되는 동작과 다음
날짜에 새 행이 추가되는 동작 자체는 Failure Lab의 합성 D1/D2 시나리오와 "일별 비교 미리보기"로 별도
검증할 수 있으며, 이 합성 값이 실제 두 번째 날짜 기록을 대신하지는 않습니다.
