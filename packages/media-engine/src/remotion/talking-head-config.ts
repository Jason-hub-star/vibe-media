/**
 * Talking Head Anime 3 — 파이프라인 설정.
 * separable_float 모델 + 24fps 기준.
 */

export const TALKING_HEAD_CONFIG = {
  /** 모델 종류 (separable_float이 MPS에서 6.5fps로 가장 빠름) */
  model: "separable_float",
  /** 출력 FPS */
  fps: 24,
  /** 이미지 해상도 */
  resolution: 512,
  /** Python venv 경로 */
  venvPath: "/Users/family/talking-head-anime-3-demo/venv/bin/python",
  /** 프로젝트 경로 */
  projectPath: "/Users/family/talking-head-anime-3-demo",
} as const;
