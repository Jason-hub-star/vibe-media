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
      { href: "/admin/pipeline", label: "파이프라인" },
      { href: "/admin/inbox", label: "수신함" },
      { href: "/admin/runs", label: "실행 이력" },
      { href: "/admin/sources", label: "소스" },
    ],
  },
  {
    name: "에디토리얼",
    links: [
      { href: "/admin/briefs", label: "브리프" },
      { href: "/admin/review", label: "검수" },
      { href: "/admin/publish", label: "발행" },
      { href: "/admin/exceptions", label: "예외 처리" },
    ],
  },
  {
    name: "레지스트리",
    links: [
      { href: "/admin/discover", label: "디스커버리" },
      { href: "/admin/showcase", label: "쇼케이스" },
      { href: "/admin/video-jobs", label: "비디오 작업" },
      { href: "/admin/assets", label: "에셋" },
    ],
  },
  {
    name: "참조",
    links: [
      { href: "/admin/policies", label: "정책" },
      { href: "/admin/programs", label: "프로그램" },
    ],
  },
] as const;

export const ADMIN_PAGE_LABELS: Record<string, AdminPageLabel> = {
  "/admin": {
    title: "VibeHub 운영실",
    subtitle: "파이프라인 상태와 대기열 현황을 한눈에 확인합니다",
  },
  "/admin/inbox": {
    title: "수신함",
    subtitle: "새로 수집된 항목이 검수·발행·디스커버리 큐로 이동하기 전 대기합니다",
  },
  "/admin/runs": {
    title: "실행 이력",
    subtitle: "수집, 파싱, 분류, 실패 이력을 추적합니다",
  },
  "/admin/sources": {
    title: "소스 관리",
    subtitle: "등록된 피드를 관리하고 신뢰 경계를 확인합니다",
  },
  "/admin/briefs": {
    title: "브리프 검수",
    subtitle: "초안, 검수, 예약, 발행 상태를 한눈에 확인합니다",
  },
  "/admin/review": {
    title: "검수 워크벤치",
    subtitle: "예외 항목만 사람이 검수합니다 — 출처, 파싱 결과, 미리보기를 함께 봅니다",
  },
  "/admin/publish": {
    title: "발행 대기열",
    subtitle: "브리프, 디스커버리, 비디오가 하나의 발행 큐에서 만납니다",
  },
  "/admin/exceptions": {
    title: "예외 처리",
    subtitle: "신뢰도, 정책, 렌더링, 개인정보 검사를 통과하지 못한 항목입니다",
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
  "/admin/policies": {
    title: "정책 참조",
    subtitle: "검수, 소스 등급, 발행 규칙을 현행 정책과 대조합니다",
  },
  "/admin/programs": {
    title: "프로그램 참조",
    subtitle: "파이프라인 동작을 정의하는 프로그램 규칙 파일입니다",
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
