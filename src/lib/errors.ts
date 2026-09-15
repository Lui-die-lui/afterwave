import type { ErrorCode } from "./types";

export class BoardFetchError extends Error {
  code: Exclude<ErrorCode, "NONE">;
  constructor(code: Exclude<ErrorCode, "NONE">, message: string) {
    super(message);
    this.code = code;
    this.name = "BoardFetchError";
  }
}

interface ErrorCopy {
  title: string;
  message: string;
  action: string;
}

/**
 * Each of the five simulated failures gets its own title/message/action —
 * the assignment explicitly forbids collapsing them into one generic error.
 */
export const ERROR_COPY: Record<Exclude<ErrorCode, "NONE">, ErrorCopy> = {
  TIMEOUT: {
    title: "USGS 응답 지연",
    message:
      "USGS 서버가 제한 시간(8초) 안에 응답하지 않았습니다. 네트워크 지연이거나 서버가 일시적으로 느릴 수 있습니다.",
    action: "잠시 후 다시 시도 버튼을 눌러주세요.",
  },
  UPSTREAM_AUTH: {
    title: "출처 접근 거부",
    message:
      "USGS 원천이 요청을 401/403으로 거절했습니다. 공개 피드 경로나 요청 헤더가 예기치 않게 바뀌었을 수 있습니다.",
    action: "잠시 후 다시 시도하고, 반복되면 원천 URL 변경 여부를 확인해주세요.",
  },
  RATE_LIMITED: {
    title: "호출 제한 초과",
    message: "USGS 원천이 429(호출 제한 초과) 응답을 반환했습니다. 짧은 시간에 너무 많이 조회했을 수 있습니다.",
    action: "1분 정도 기다린 뒤 다시 시도해주세요.",
  },
  OFFLINE: {
    title: "네트워크 연결 없음",
    message: "서버에서 외부 네트워크에 접속할 수 없습니다. 오프라인 상태이거나 DNS/연결이 끊어졌을 수 있습니다.",
    action: "네트워크 연결을 확인한 뒤 다시 시도해주세요.",
  },
  SCHEMA_CHANGED: {
    title: "응답 형식 변경 감지",
    message: "USGS 응답 구조가 예상한 형태와 달라 안전하게 해석할 수 없었습니다. 값을 임의로 추정하지 않았습니다.",
    action: "정상 형식으로 복구될 때까지 마지막 정상값을 표시합니다. 반복되면 관리자에게 알려주세요.",
  },
  UNKNOWN: {
    title: "알 수 없는 오류",
    message: "예상하지 못한 오류로 원천 데이터를 가져오지 못했습니다.",
    action: "다시 시도해주세요. 반복되면 잠시 후 다시 확인해주세요.",
  },
};
