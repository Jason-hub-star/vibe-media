# SEO & Commercialization Audit Report v2

> 경쟁사 벤치마크 기반 VibeHub SEO/상업화 누락 감사 리포트
> 작성일: 2026-03-26

## Competitor Benchmark

| 경쟁사 | 모델 | SEO 수준 | 수익화 | 벤치마크 가치 |
|--------|------|----------|--------|-------------|
| 요즘IT | 광고+작가 | ★★★★★ | 광고+뉴스레터 | SEO SSOT (Naver+JSON-LD+hreflang) |
| GeekNews | 커뮤니티+AI요약 | ★★★★☆ | GN+ 프리미엄 | 동적 OG 이미지 + 봇 배포 |
| Ben's Bites | 구독+스폰서 | ★★★★☆ | $25/mo 유료 | NewsArticle JSON-LD |
| TLDR | 순수 광고 | ★★★☆☆ | 스폰서십 (160만 구독) | Social proof CTA |
| The Rundown AI | 광고+교육 | ★★☆☆☆ | University $99/mo | 수익화 다각화 |
| daily.dev | B2B 광고 | ★★★★☆ | 채용광고+스폰서 | 3중 JSON-LD |
| TechMeme | 광고 | ★★☆☆☆ | 스폰서 포스트 | 멀티플랫폼 공유 버튼 |
| Disquiet | 커뮤니티 | ★☆☆☆☆ | 미비 | 반면교사 (CSR=SEO 사망) |
| Product Hunt | 광고+제휴 | ★★★★☆ | 스폰서+캠페인 | 제품별 OG 이미지 |

## Phase 1 — SEO Foundation (P0)

### 1-1. Favicon + Brand Icon Set
- `favicon.ico` + `favicon.svg` + `apple-touch-icon.png` (180x180) + `icon-192.png` + `icon-512.png`
- 현재: 없음. 브라우저 탭/북마크에서 브랜드 인식 불가

### 1-2. robots.txt
```
User-agent: *
Allow: /
Sitemap: https://vibehub.tech/sitemap.xml
```

### 1-3. Dynamic Sitemap
- Next.js `sitemap.ts` — `/brief/[slug]`, `/radar`, `/sources`, `/newsletter` 동적 생성
- 벤치마크: 요즘IT (콘텐츠 유형별 분할), GeekNews (연도별 분할)

### 1-4. Root Meta Description Fix
- 현재: `"AI brief publishing hub and admin operations cockpit."` ← admin 용어 노출
- 수정: `"Daily AI news briefs, curated from global sources — VibeHub"`

### 1-5. NEXT_PUBLIC_SITE_URL
- 환경변수: `NEXT_PUBLIC_SITE_URL=https://vibehub.tech`
- canonical URL 전역 적용 기반

## Phase 2 — Content SEO (P0-P1)

### 2-1. `/brief/[slug]` generateMetadata
```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  return {
    title: `${brief.title} | VibeHub Brief`,
    description: brief.summary,
    openGraph: {
      type: "article",
      title: brief.title,
      description: brief.summary,
      images: [brief.coverImage ?? ogFallback],
      publishedTime: brief.publishedAt,
    },
    twitter: { card: "summary_large_image" },
    alternates: { canonical: `https://vibehub.tech/brief/${slug}` },
  };
}
```

### 2-2. Per-Page Metadata
| 페이지 | title | description |
|--------|-------|-------------|
| `/` | `VibeHub — Daily AI Briefs` | `Curated AI news briefs from 30+ global sources, published daily.` |
| `/brief` | `AI Briefs Archive \| VibeHub` | `Browse all published AI briefs with quality scores and source tracking.` |
| `/radar` | `Radar — AI Discovery Hub \| VibeHub` | `Track emerging AI tools, research, and trends across 24 categories.` |
| `/sources` | `Source Registry \| VibeHub` | `30+ verified sources powering VibeHub's AI brief pipeline.` |
| `/newsletter` | `Newsletter \| VibeHub` | `Get weekly AI brief digests delivered to your inbox.` |

### 2-3. JSON-LD (3 schemas)
| Schema | Location | Benchmark |
|--------|----------|-----------|
| Organization | Root layout | daily.dev (name, URL, logo, sameAs SNS) |
| NewsArticle | `/brief/[slug]` | 요즘IT (headline, author, publisher+logo, datePublished) |
| BreadcrumbList | `/brief/[slug]`, `/radar` | 요즘IT (Home > Brief > Title) |

### 2-4. Naver Search Advisor
- `<meta name="naver-site-verification" content="...">` 등록
- 한국 검색 점유율 ~30% 대응

## Phase 3 — Commercialization Base (P2)

### 3-1. Footer Expansion (5-section)
| Section | Links |
|---------|-------|
| Product | Brief, Radar, Sources, Newsletter |
| Community | GitHub, Discord/Slack (향후) |
| Company | About, Contact |
| Legal | Privacy Policy, Terms of Service |
| Social | X(Twitter), Threads, GitHub |
| Bottom | © 2026 VibeHub · vibehub.tech |

### 3-2. Privacy Policy + Terms of Service
- 뉴스레터 이메일 수집 시 법적 필수 (GDPR, 개인정보보호법)
- `/privacy`, `/terms` 라우트

### 3-3. GA4 Analytics
- `NEXT_PUBLIC_GA_ID` + `next/script`
- 최소 세트: GA4 단독 → 향후 PostHog(제품분석) 추가

### 3-4. RSS Feed
- `/feed.xml` (전체) + `/feed/brief.xml` (브리프만)
- TLDR/Rundown은 미제공 → 차별화 기회

## Phase 4 — Social Amplification (P2)

### 4-1. Dynamic OG Image
- Next.js `opengraph-image.tsx` (Vercel Edge 자동 생성)
- 또는 GeekNews 방식 별도 서브도메인

### 4-2. Share Buttons
- brief 상세: X, LinkedIn, Threads, 카카오톡
- 벤치마크: TechMeme (6개 플랫폼)

### 4-3. Social Proof CTA
- Newsletter 폼에 구독자 수 표시
- 초기: `"Be among the first to know"` → 성장 후: `"Join N+ readers"`

### 4-4. Kakao SDK (한국 특화)
- 카카오톡 공유 커스텀 템플릿

## VibeHub Differentiation

| VibeHub 강점 | 경쟁사 약점 |
|-------------|------------|
| SSR/SSG (Next.js) | Disquiet CSR = SEO 사망 |
| 기사별 고유 URL (`/brief/{slug}`) | TLDR = 고유 URL 없음 |
| AI 파이프라인 보유 (자동 품질 검증) | 대부분 수동 큐레이션 |
| 30+ 소스 자동 수집 | Ben's Bites = 개인 큐레이션 |
| Quality Score 시스템 | 없는 곳이 대부분 |
| RSS 제공 가능 | TLDR, Rundown = RSS 없음 |

## P3 — Future Enhancements

| 항목 | 상세 | 벤치마크 |
|------|------|----------|
| PWA manifest.json | 앱 이름, 테마 색상, 아이콘 | daily.dev |
| Cookie Consent | GDPR 대응 배너 | daily.dev (Iubenda) |
| hreflang | `en` 기본, `ko` 추가 시 | 요즘IT |
| Stibee 연동 | 한국 최대 이메일 플랫폼 | GeekNews |
| Slack/Discord 봇 | 채널 자동 발행 연결 | GeekNews (7개 플랫폼) |
| 인터넷신문 등록 | 네이버 뉴스 노출 (장기) | 요즘IT |
