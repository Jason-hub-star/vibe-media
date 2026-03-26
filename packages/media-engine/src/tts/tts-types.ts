/**
 * TTS (Text-to-Speech) 서브시스템 타입.
 * 기존 types.ts의 TtsRequest/TtsResult를 확장.
 */

/** NotebookLM 옵션 */
export interface NotebookLMOptions {
  /** nlm CLI 경로 (기본: "nlm", pyenv 대응) */
  cliPath?: string;
  /** NLM_ENABLED=false면 skip */
  enabled?: boolean;
  /** ffmpeg loudnorm 적용 여부 (기본: true) */
  loudnorm?: boolean;
  /** 타겟 LUFS (기본: -16) */
  targetLufs?: number;
}

/** NotebookLM 결과 */
export interface NotebookLMResult {
  /** 원본 M4A 경로 */
  rawAudioPath: string;
  /** loudnorm 적용된 M4A 경로 */
  normalizedAudioPath: string;
  /** 오디오 길이 (초) */
  durationSec: number;
  /** 노트북 ID */
  notebookId: string;
  /** 성공 여부 */
  success: boolean;
  error?: string;
}

/** NotebookLM 생성 요청 */
export interface NotebookLMRequest {
  /** 브리프 본문 (텍스트) */
  text: string;
  /** 출력 디렉토리 */
  outputDir: string;
  /** 파일명 접두사 */
  filePrefix?: string;
}
