# VibeHub 주간 SEO 점검

## 목적

공개 사이트의 SEO 건강성을 주간 단위로 점검해 메타데이터 누락, hreflang 불일치,
구조화 데이터 오류, 사이트맵 격차를 조기에 발견한다.
이 프롬프트는 주 1회 스케줄러에서 자동 실행된다.

---

## 1. 사이트맵 정합성

- `apps/web/app/sitemap.ts`를 읽고, Supabase에서 현재 published brief 수와 published discover item 수를 조회한다.
- 사이트맵 생성 결과와 실제 published 건수가 일치하는지 확인한다.
- 누락된 brief slug나 discover id가 있으면 보고한다.
- 정적 페이지 8개 × locale 2 = 16건이 모두 포함되는지 확인한다.

## 2. 메타데이터 일관성

공개 라우트 전체를 순회하며 다음을 확인한다:

- `generateMetadata` 함수가 있는가
- `title`과 `description`이 비어있지 않은가
- `canonical` URL이 올바른 locale prefix를 포함하는가
- `buildAlternates`로 hreflang이 생성되는가 (en, es, x-default)
- `openGraph.locale`이 설정되어 있는가

대상 파일:
```
apps/web/app/[locale]/(public)/page.tsx
apps/web/app/[locale]/(public)/brief/page.tsx
apps/web/app/[locale]/(public)/brief/[slug]/page.tsx
apps/web/app/[locale]/(public)/radar/page.tsx
apps/web/app/[locale]/(public)/radar/[id]/page.tsx
apps/web/app/[locale]/(public)/sources/page.tsx
apps/web/app/[locale]/(public)/newsletter/page.tsx
apps/web/app/[locale]/(public)/about/page.tsx
apps/web/app/[locale]/(public)/privacy/page.tsx
apps/web/app/[locale]/(public)/terms/page.tsx
```

## 3. 구조화 데이터 (JSON-LD) 검증

- **Root layout**: Organization 스키마가 있는가 (name, url, logo, description)
- **Brief detail**: NewsArticle + BreadcrumbList가 있는가
  - VideoObject는 youtubeUrl 있을 때만 렌더되는가
  - headline, description, datePublished, author, publisher 필드가 빠짐없는가
- **Radar detail**: Thing + BreadcrumbList가 있는가
- Brief/Radar 리스트 페이지에 ItemList 스키마가 필요한지 검토한다 (현재 없음)

## 4. OG 이미지 검증

- `apps/web/app/opengraph-image.tsx` (기본) 존재 확인
- `apps/web/app/[locale]/(public)/brief/[slug]/opengraph-image.tsx` 존재 확인
- `apps/web/app/[locale]/(public)/radar/[id]/opengraph-image.tsx` 존재 확인
- OG 이미지에서 `colorTokens`/`brandTokens`를 import하는가 (하드코딩 금지 규칙)

## 5. robots.ts + middleware 검증

- `robots.ts`: `/admin` disallow, sitemap 경로 포함 확인
- `middleware.ts`: locale prefix 없는 접근이 301 리다이렉트되는가
- middleware에서 sitemap.xml, robots.txt, feed.xml이 제외되는가

## 6. RSS feed 검증

- `feed.xml/route.ts`를 읽고 brief 링크에 locale prefix(`/en/`)가 포함되는지 확인
- `<language>` 태그가 올바른지 확인
- atom:link self 참조가 있는지 확인

## 7. 번역 SEO 일관성

- ES locale brief에서 variant가 있을 때 og:title, og:description, twitter:title, twitter:description이 번역본을 사용하는가
- canonical URL이 ES locale 경로를 가리키는가 (영어 canonical이 아닌)

## 8. 성능 관련 SEO

- `next/image`를 사용하지 않는 `<img>` 태그가 있는가 (커버 이미지 등)
- `next/font`를 사용하는가
- `<link rel="preconnect">`가 필요한 외부 도메인이 있는가

---

## 보고 형식

```
## Weekly SEO Audit Report — {날짜}

| 항목 | 결과 | 비고 |
|------|------|------|
| 사이트맵 정합성 | ✅/⚠️ | published N건 vs sitemap N건 |
| 메타데이터 일관성 | ✅/⚠️ | 누락 N건 |
| JSON-LD 검증 | ✅/⚠️ | |
| OG 이미지 | ✅/⚠️ | |
| robots + middleware | ✅/⚠️ | |
| RSS feed | ✅/⚠️ | |
| 번역 SEO | ✅/⚠️ | |
| 성능 SEO | ✅/⚠️ | |

### 발견 사항
1. [severity] 설명
2. ...

### 추천 조치
- [ ] MUST: ...
- [ ] SHOULD: ...
```

## 규칙

- 추측하지 않고 실제 파일을 읽고 판단한다.
- 이전 보고서와 비교해 신규/해결/지속 이슈를 구분한다.
- MUST 조치는 SEO 인덱싱에 직접 영향을 주는 건, SHOULD는 개선 권장 건으로 구분한다.
- admin 라우트는 점검 대상이 아니다 (`noindex` 확인만).
