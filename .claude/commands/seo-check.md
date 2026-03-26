지정한 public route의 SEO 완성도를 점검하세요.

## 인자
- `$ARGUMENTS`: 점검 대상 route (예: `/brief/[slug]`, `/radar/[id]`, 또는 `all`로 전체)

## 수행 순서

### 1. 대상 파일 식별
- `$ARGUMENTS`가 `all`이면 `apps/web/app/(public)` 하위 모든 `page.tsx`
- 아니면 해당 route의 `page.tsx` 단일 파일

### 2. Metadata 점검
각 페이지에서 다음을 확인:
- [ ] `generateMetadata()` 또는 `export const metadata` 존재
- [ ] `title`, `description` 설정
- [ ] `openGraph` (type, title, description, url) 설정
- [ ] `twitter` (card, title, description) 설정
- [ ] `alternates.canonical` 설정
- [ ] canonical URL에 `SITE_URL` 상수 사용 (하드코딩 금지)

### 3. JSON-LD 점검
- [ ] `<JsonLd>` 컴포넌트 사용
- [ ] `@type` 적절한 타입 (NewsArticle, Thing, Organization 등)
- [ ] BreadcrumbList 포함 (상세 페이지)
- [ ] `@context: "https://schema.org"` 포함

### 4. OG 이미지 점검
- [ ] `opengraph-image.tsx` 존재 (상세 페이지)
- [ ] `twitter-image.tsx` 존재 (상세 페이지)
- [ ] `colorTokens`/`brandTokens` 사용 (raw hex 하드코딩 없음)
- [ ] `brandTokens.name`/`brandTokens.domain` 사용 ("VibeHub"/"vibehub.tech" 하드코딩 없음)

### 5. Sitemap 점검
- [ ] `apps/web/app/sitemap.ts`에 해당 route의 동적 페이지 포함

### 6. 내부 링크 점검
- [ ] 카드 컴포넌트에서 상세 페이지 링크 존재
- [ ] 상세 페이지에서 관련 컨텐츠 링크 존재

### 7. 브랜드 하드코딩 점검
변경/신규 파일에서 다음 raw 문자열 검색:
- `"VibeHub"` → `brandTokens.name` 사용해야 함 (OG 이미지 내부)
- `"vibehub.tech"` → `brandTokens.domain` 사용해야 함 (OG 이미지 내부)
- `"#151110"`, `"#f4eee2"`, `"#f08a24"` → `colorTokens.*` 사용해야 함

## 출력 포맷

```
## SEO Check: {route}

| 항목 | 결과 | 비고 |
|------|------|------|
| Metadata | ✅/❌ | |
| JSON-LD | ✅/❌ | |
| OG Image | ✅/❌ | |
| Sitemap | ✅/❌ | |
| Internal Links | ✅/❌ | |
| Brand Hardcode | ✅/❌ | |

### 발견 사항
1. ...

### 추천 조치
- [ ] ...
```
