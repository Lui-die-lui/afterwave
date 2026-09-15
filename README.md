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

API 키가 필요 없는 공개 USGS 피드만 사용하므로 별도 `.env` 설정이 필요하지 않습니다.

## 구조

- `src/app/page.tsx` — 서버 컴포넌트. 요청마다 실제 USGS 피드를 조회하고 초기 상태를 렌더링합니다 (`force-dynamic`, 정적 캐시 없음).
- `src/app/api/earthquake/latest` — 실제 조회 API (다시 시도 버튼이 호출).
- `src/app/api/earthquake/replay` — 합성 실패/복구 시나리오 재생 API (Failure Lab 전용, 실제 네트워크 호출 없음).
- `src/app/api/earthquake/synthetic` — 합성 저장소의 현재 상태 조회.
- `src/lib/` — USGS 피드 fetch/검증(zod), 정규화, KST 날짜 계산, 실제/합성 저장소(JSON 파일), 오류 분류,
  규모 해석(`magnitudeGuide.ts`), equirectangular 좌표 변환(`projection.ts`).
- `data/real/records.json` — 실제 일별 기록 저장소 (서버 전용, git에 커밋되지 않음).
- `data/synthetic/` — 합성 Failure Lab 저장소. 실제 저장소와 완전히 분리된 별도 파일입니다.
- `src/components/map/` — 세계지도(로컬 SVG path, 외부 지도 타일/키 없음)와 지진파 리플 마커.
- `scripts/generate-world-map.mjs` — `world-atlas`(Natural Earth 110m land, 로컬 npm 패키지 데이터)를
  `src/lib/projection.ts`와 동일한 equirectangular 공식으로 투영해 `src/lib/worldMapPath.ts`를 생성하는
  1회성 스크립트. 지도를 다시 생성하려면 `node scripts/generate-world-map.mjs`.

## 저장 방식에 대한 메모

DB 인프라가 이미 구성된 기존 프로젝트가 아니어서(빈 저장소로 시작), 별도 DB 서버·비밀값 없이 동작하도록
서버 전용 JSON 파일 저장소(`src/lib/jsonFileStore.ts`, 직렬화된 원자적 쓰기)를 사용했습니다. 로컬/단일 프로세스
배포에서는 안전하게 영속됩니다. 서버리스(Vercel 등) 배포 시 파일시스템이 휘발성이므로, 그런 환경에 배포한다면
Postgres/Turso 같은 실제 DB로 교체가 필요합니다.

## 과제 asset 패키지 관련 누락 사항

CLAUDE.md와 과제 설명은 `assets/studio-task-assets/t04-real-information-board/`의 `README.md`,
`public-contract.json`, `asset-manifest.json`(및 package SHA-256)을 참조하지만, 이 저장소와 로컬 머신 전체를
검색했을 때 해당 파일을 찾지 못했습니다. 값을 추측하지 않는다는 원칙에 따라 SHA-256 대조는 수행하지
않았고, `src/lib/fixtures/syntheticFeed.ts`의 다섯 실패/복구 fixture는 공식 asset이 아닌 자체 작성한
합성 값임을 코드 주석과 Failure Lab 화면에 명시했습니다. 공식 asset 패키지가 제공되면 해당 파일의 값으로
교체하고 `asset-manifest.json` 기준 SHA-256을 검증해야 합니다.

## 실제 일별 기록 2건에 대한 메모

실제 기록은 실제 성공 조회로만 쌓입니다. 이 세션에서 확보한 실제 기록은 조회를 실행한 KST 날짜의 1건뿐이며,
다음 KST 날짜에 실제로 성공 조회를 한 번 더 실행해야 2건째가 채워집니다. 같은 날짜 재조회 시 한 행으로
유지되는 동작과 다음 날짜에 새 행이 추가되는 동작은 Failure Lab의 합성 D1/D2 시나리오로 별도 검증했습니다.
