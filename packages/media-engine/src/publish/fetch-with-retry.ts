/**
 * Generic fetch-with-retry — gemini-client.ts의 callWithRetry 패턴 일반화.
 * 429 (rate limit) 및 5xx 서버 에러에 대해 지수 백오프로 재시도.
 */

export interface RetryOptions {
  maxRetries?: number;
  /** 초기 대기 시간 (ms). 기본 2000. */
  baseDelayMs?: number;
  /** 재시도 대상 HTTP 상태 코드. 기본 [429, 500, 502, 503, 504]. */
  retryStatuses?: number[];
}

const DEFAULT_RETRY_STATUSES = [429, 500, 502, 503, 504];

/**
 * fetch를 래핑하여 재시도 로직 적용.
 * 응답이 retryStatuses에 해당하면 지수 백오프로 재시도.
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options?: RetryOptions,
): Promise<Response> {
  const maxRetries = options?.maxRetries ?? 2;
  const baseDelay = options?.baseDelayMs ?? 2000;
  const retryStatuses = options?.retryStatuses ?? DEFAULT_RETRY_STATUSES;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, init);

    if (res.ok || !retryStatuses.includes(res.status) || attempt >= maxRetries) {
      return res;
    }

    // 지수 백오프: 2s → 4s → 8s ...
    const delay = baseDelay * Math.pow(2, attempt);
    await new Promise((r) => setTimeout(r, delay));
  }

  // unreachable — 위 루프에서 반드시 반환
  throw new Error("fetchWithRetry: unreachable");
}
