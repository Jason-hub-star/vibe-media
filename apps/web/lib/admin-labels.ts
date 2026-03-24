/**
 * Central Korean label dictionary for admin UI.
 * Internal data values (statuses, field names) stay English.
 */

export interface AdminPageLabel {
  title: string;
  subtitle: string;
}

export const ADMIN_OVERVIEW = {
  href: "/admin",
  label: "대시보드",
  exact: true,
} as const;

export const ADMIN_SIDEBAR_EYEBROW = "운영 도구";
export const ADMIN_SESSION_NOTE = "운영자 워크스페이스 · 로컬 세션";

export const ADMIN_SIDEBAR_GROUPS = [
  {
    name: "파이프라인",
    links: [
      { href: "/admin/sources", label: "소스" },
      { href: "/admin/pipeline", label: "파이프라인" },
      { href: "/admin/collection", label: "수집 현황" },
    ],
  },
  {
    name: "에디토리얼",
    links: [
      { href: "/admin/briefs", label: "브리프" },
      { href: "/admin/discover", label: "디스커버리" },
      { href: "/admin/pending", label: "검토 대기" },
      { href: "/admin/publish", label: "발행" },
    ],
  },
  {
    name: "레지스트리",
    links: [
      { href: "/admin/showcase", label: "쇼케이스" },
      { href: "/admin/video-jobs", label: "비디오 작업" },
      { href: "/admin/assets", label: "에셋" },
    ],
  },
  {
    name: "참조",
    links: [
      { href: "/admin/rules", label: "운영 규칙" },
    ],
  },
] as const;

export const ADMIN_PAGE_LABELS: Record<string, AdminPageLabel> = {
  "/admin": {
    title: "VibeHub 운영실",
    subtitle: "파이프라인 상태와 대기열 현황을 한눈에 확인합니다",
  },
  "/admin/collection": {
    title: "수집 현황",
    subtitle: "수신함과 실행 이력을 한곳에서 확인합니다",
  },
  "/admin/sources": {
    title: "소스 관리",
    subtitle: "등록된 피드를 관리하고 신뢰 경계를 확인합니다",
  },
  "/admin/briefs": {
    title: "브리프 검수",
    subtitle: "초안, 검수, 예약, 발행 상태를 한눈에 확인합니다",
  },
  "/admin/pending": {
    title: "검토 대기",
    subtitle: "검수 대기 항목과 예외 처리를 한곳에서 확인합니다",
  },
  "/admin/publish": {
    title: "발행 대기열",
    subtitle: "브리프, 디스커버리, 비디오가 하나의 발행 큐에서 만납니다",
  },
  "/admin/discover": {
    title: "디스커버리 레지스트리",
    subtitle: "오픈소스, 스킬, 플러그인, 이벤트, 공모전을 추적합니다",
  },
  "/admin/showcase": {
    title: "쇼케이스",
    subtitle: "수동 큐레이션 사이드카 레인을 운영합니다",
  },
  "/admin/video-jobs": {
    title: "비디오 작업",
    subtitle: "자동 분석 → CapCut → 보호자 검수 → 비공개 업로드 흐름을 관리합니다",
  },
  "/admin/assets": {
    title: "에셋 슬롯",
    subtitle: "이미지 슬롯의 이름, 타입, 사양을 관리합니다",
  },
  "/admin/rules": {
    title: "운영 규칙",
    subtitle: "검수·소스 등급·발행 규칙과 프로그램 규칙을 한곳에서 참조합니다",
  },
  "/admin/pipeline": {
    title: "파이프라인",
    subtitle: "파이프라인 실행 모니터",
  },
};

/** Look up page labels, falling back to generic title if not found. */
export function getPageLabels(pathname: string): AdminPageLabel {
  return (
    ADMIN_PAGE_LABELS[pathname] ?? {
      title: pathname.split("/").pop() ?? "Admin",
      subtitle: "",
    }
  );
}
