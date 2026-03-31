import { C, FONT, addBase, addCard, addHeader, addMetric, addPill, assets, createDeck, footer, slideHeight, slideWidth, writeDeck } from "./presentation-kit.mjs";

const pptx = createDeck();

let slide = pptx.addSlide();
addBase(slide, C.orange);
addPill(slide, 0.76, 0.55, 2.75, "SSOT Docs + Automations + Graph Verified", C.ink, C.cream);
slide.addImage({ data: assets.logoWordmark, x: 0.78, y: 1.02, w: 3.9, h: 0.9 });
slide.addText("AI 미디어 운영을\n파이프라인으로 바꾸는 허브", {
  x: 0.78,
  y: 2.08,
  w: 5.8,
  h: 1.2,
  fontFace: FONT.display,
  fontSize: 23,
  bold: true,
  color: C.ink,
  margin: 0,
});
slide.addText("VibeHub Media는 AI 뉴스와 툴 발견, 검수, 발행을 하나의 event-driven 운영 시스템으로 묶습니다.", {
  x: 0.8,
  y: 3.42,
  w: 6.2,
  h: 0.55,
  fontFace: FONT.body,
  fontSize: 11.5,
  color: C.inkSoft,
  margin: 0,
});
addCard(slide, { x: 0.78, y: 4.58, w: 3.78, h: 1.55, number: "01", title: "Public Hub", body: "/brief, /radar, /sources, /newsletter\n읽는 사람은 쉽게 탐색하고, 운영자는 노출 범위를 통제합니다.", fill: C.white, accent: C.orange });
addCard(slide, { x: 4.78, y: 4.58, w: 3.78, h: 1.55, number: "02", title: "Admin Cockpit", body: "/admin, /collection, /pending, /publish\n운영은 승인 화면이 아니라 실제 컨트롤 서피스로 설계됐습니다.", fill: C.white, accent: C.sky });
addCard(slide, { x: 8.78, y: 4.58, w: 3.78, h: 1.55, number: "03", title: "Human on Exception", body: "하이브리드 LLM + 규칙 엔진 + 자동화\n사람은 전수 검수 대신 예외와 정책만 다룹니다.", fill: C.white, accent: C.mint });
slide.addText("Grounding: AGENTS / PRD / SCHEMA / ARCHITECTURE / PIPELINE / AGENT MODEL / AUTO-PUBLISH / PROJECT STATUS / .claude automations / code-review-graph status", {
  x: 0.8,
  y: 6.34,
  w: 10.8,
  h: 0.28,
  fontFace: FONT.mono,
  fontSize: 7.8,
  color: C.inkSoft,
  margin: 0,
});
footer(slide, 1);

slide = pptx.addSlide();
addBase(slide, C.mint);
addHeader(slide, "Product", "한눈에 보는 VibeHub", "겉으로는 콘텐츠 허브지만, 안쪽은 운영 자동화 시스템에 가깝습니다.");
addCard(slide, { x: 0.8, y: 2.18, w: 3.65, h: 3.76, number: "01", title: "읽는 사람에게 보이는 것", body: "• Brief: 해설형 AI 브리프\n• Radar: 툴, 스킬, 플러그인 큐레이션\n• Sources: 툴 제출 허브\n• Newsletter: 주간 요약 구독", fill: C.white, accent: C.orange });
addCard(slide, { x: 4.84, y: 2.18, w: 3.65, h: 3.76, number: "02", title: "운영자가 다루는 것", body: "• Sources / Runs / Inbox\n• Briefs / Discover / Pending\n• Publish / Translations / Assets\n• Video jobs / Showcase / Imported tools", fill: C.white, accent: C.sky });
addCard(slide, { x: 8.88, y: 2.18, w: 3.65, h: 3.76, number: "03", title: "뒤에서 자동으로 도는 것", body: "• fetch -> ingest -> sync -> export\n• editorial review -> auto approve\n• drift guard -> auto publish\n• channel publish / translation / newsletter", fill: C.white, accent: C.mint });
addPill(slide, 3.85, 6.2, 5.65, "핵심 포인트: 하나의 ingest spine을 여러 surface가 공유", C.ink, C.cream);
footer(slide, 2);

slide = pptx.addSlide();
addBase(slide, C.rose);
addHeader(slide, "Need", "왜 이 프로젝트가 필요한가", "AI 관련 정보는 빠르게 쌓이지만, 운영은 여전히 손으로 이어 붙이는 경우가 많습니다.");
addCard(slide, { x: 0.85, y: 2.05, w: 4.25, h: 3.8, title: "Before: 운영이 흩어질 때", body: "• 소스가 RSS, GitHub, 공식 블로그로 분산\n• 초안 품질이 들쭉날쭉하고 소스 수가 얕음\n• 사람이 모든 항목을 다 보게 됨\n• 채널 발행과 후속 링크 연결이 자주 끊김", fill: C.white, accent: C.rose });
slide.addText("→", { x: 5.48, y: 3.15, w: 0.55, h: 0.6, fontFace: FONT.display, fontSize: 34, bold: true, color: C.orange, margin: 0, align: "center" });
addCard(slide, { x: 6.25, y: 2.05, w: 5.95, h: 3.8, title: "After: 운영이 시스템이 될 때", body: "• source -> ingest -> brief/discover -> publish 흐름이 고정\n• 타깃 surface와 예외 조건이 먼저 결정됨\n• 사람은 예외만 확인하고 나머지는 자동 승인 / 자동 발행\n• Telegram, Obsidian, YouTube, Threads까지 연결이 이어짐", fill: C.white, accent: C.orange });
addPill(slide, 2.48, 6.15, 8.1, "핵심 변화: 사람의 역할이 전수 검수자에서 규칙 설계자 + 예외 처리자로 이동", C.ink, C.cream);
footer(slide, 3);

slide = pptx.addSlide();
addBase(slide, C.yellow);
addHeader(slide, "Pipeline", "콘텐츠가 만들어지는 기본 흐름", "SSOT 문서의 기본값은 event-driven 파이프라인이며, 단계가 끝나면 다음 단계로 바로 넘깁니다.");
[
  ["1. 수집", "source를 기준으로 새 항목을 가져옴", C.orange, 0.82],
  ["2. 가공", "본문 추출, 메타데이터 정리, 중복 키 생성", C.mint, 3.34],
  ["3. 초안", "brief / discover / both / archive / discard 분류", C.sky, 5.86],
  ["4. 검수", "예외만 사람이 확인하는 control surface", C.rose, 8.38],
  ["5. 배포", "approved -> scheduled -> published + channels", C.purple, 10.9],
].forEach(([title, body, accent, x]) => {
  addCard(slide, { x, y: 2.45, w: 1.58, h: 2.4, title, body, fill: C.white, accent });
});
["›", "›", "›", "›"].forEach((arrow, idx) => {
  slide.addText(arrow, { x: 2.6 + idx * 2.52, y: 3.28, w: 0.26, h: 0.4, fontFace: FONT.display, fontSize: 24, bold: true, color: C.inkSoft, margin: 0, align: "center" });
});
addCard(slide, { x: 0.82, y: 5.45, w: 2.65, h: 1.0, title: "Sidecar lane", body: "Showcase와 Obsidian export는 본선과 분리", fill: C.white, accent: C.yellow });
addCard(slide, { x: 3.67, y: 5.45, w: 2.65, h: 1.0, title: "Public surfaces", body: "Brief / Radar / Sources / Newsletter", fill: C.white, accent: C.orange });
addCard(slide, { x: 6.52, y: 5.45, w: 2.65, h: 1.0, title: "Admin surfaces", body: "Collection / Pending / Publish / Translations", fill: C.white, accent: C.sky });
addCard(slide, { x: 9.37, y: 5.45, w: 2.65, h: 1.0, title: "Reports", body: "Telegram 보고와 discover export summary", fill: C.white, accent: C.mint });
footer(slide, 4);

slide = pptx.addSlide();
addBase(slide, C.sky);
addHeader(slide, "Orchestration", "에이전트 팀은 역할을 나눠서 움직인다", "중요한 점은 LLM이 모든 결정을 다 하는 게 아니라, 규칙 엔진과 상태 머신이 중심이라는 점입니다.");
addCard(slide, { x: 0.86, y: 2.16, w: 3.35, h: 3.9, title: "Local lane", body: "• chat / router / search / memory\n• classifier 초기 active\n• collector / parser 보조 판단\n• 기본값: qwen3.5-9b (로컬)", fill: C.white, accent: C.mint });
addCard(slide, { x: 4.94, y: 2.16, w: 3.45, h: 3.9, title: "Rule engine + state", body: "• publisher는 규칙 엔진이 직접 소유\n• watchdog이 예외와 retry를 관리\n• status integrity와 quality gate를 보호\n• human-on-exception 경계를 유지", fill: C.white, accent: C.orange });
addCard(slide, { x: 9.08, y: 2.16, w: 3.35, h: 3.9, title: "Claude lane", body: "• brief draft / discover draft shadow 비교\n• critic 유력 후보\n• eval -> shadow -> activate -> rollback\n• fallback을 남기는 hybrid resilience", fill: C.white, accent: C.sky });
addPill(slide, 4.18, 6.23, 4.98, "publisher는 LLM이 아니라 rule engine이 최종 소유", C.ink, C.cream);
footer(slide, 5);

slide = pptx.addSlide();
addBase(slide, C.purple);
addHeader(slide, "Architecture", "겉으로는 허브, 뒤에서는 운영 콘솔", "데이터는 ingest spine에서 editorial spine으로 흐르고, 그 위에 public/admin surface가 올라갑니다.");
addCard(slide, { x: 0.86, y: 2.02, w: 11.6, h: 0.9, title: "Public surface", body: "home / brief / brief detail / radar / radar detail / sources / newsletter / about / privacy / terms  |  locale: en + es", fill: C.white, accent: C.orange });
addCard(slide, { x: 0.86, y: 3.02, w: 11.6, h: 0.9, title: "Admin surface", body: "collection / briefs / discover / pending / publish / translations / showcase / submissions / imported tools / video jobs / rules", fill: C.white, accent: C.sky });
addCard(slide, { x: 0.86, y: 4.02, w: 11.6, h: 0.98, title: "Editorial spine", body: "brief_posts / discover_items / discover_actions / admin_reviews / brief_post_variants / discover_item_variants / video_jobs", fill: C.white, accent: C.mint });
addCard(slide, { x: 0.86, y: 5.1, w: 11.6, h: 0.98, title: "Ingest spine", body: "sources / ingest_runs / ingested_items / item_classifications / source_entries / ingest_run_attempts / publish_dispatches", fill: C.white, accent: C.purple });
addPill(slide, 0.92, 6.28, 2.25, "Supabase-first", C.ink, C.cream);
addPill(slide, 3.36, 6.28, 1.85, "Next.js 16", C.ink, C.cream);
addPill(slide, 5.4, 6.28, 1.55, "Obsidian", C.ink, C.cream);
addPill(slide, 7.12, 6.28, 1.55, "Telegram", C.ink, C.cream);
addPill(slide, 8.84, 6.28, 1.42, "Threads", C.ink, C.cream);
addPill(slide, 10.42, 6.28, 1.62, "YouTube", C.ink, C.cream);
footer(slide, 6);

slide = pptx.addSlide();
addBase(slide, C.mint);
addHeader(slide, "Automation", "자동화는 매일 같은 리듬으로 돈다", "README 기준 추천 세트는 daily 5개, weekly 3개, manual 1개이며, 한 자동화는 한 번에 하나의 결정만 내립니다.");
addPill(slide, 0.84, 2.1, 1.15, "Daily", C.orange, C.white);
["pipeline", "dedup", "editorial", "drift guard", "auto publish"].forEach((item, idx) => addCard(slide, { x: 1.4 + idx * 2.18, y: 2.42, w: 1.88, h: 1.02, title: item, body: idx === 0 ? "fetch -> ingest -> sync -> export" : idx === 2 ? "draft -> review -> auto approve" : idx === 4 ? "brief/discover publish + channels" : "guard and verify", fill: C.white, accent: [C.orange, C.yellow, C.sky, C.rose, C.purple][idx] }));
addPill(slide, 0.84, 4.1, 1.3, "Weekly", C.sky, C.white);
["source health", "ingest research", "autoresearch"].forEach((item, idx) => addCard(slide, { x: 1.55 + idx * 3.08, y: 4.42, w: 2.62, h: 1.02, title: item, body: idx === 0 ? "실패 소스, maxItems, 신규 소스 후보" : idx === 1 ? "새 source/tool 조사" : "keep / discard 작은 실험", fill: C.white, accent: [C.mint, C.yellow, C.orange][idx] }));
addPill(slide, 0.84, 5.95, 1.32, "Manual", C.ink, C.cream);
addCard(slide, { x: 1.82, y: 5.78, w: 3.08, h: 0.88, title: "youtube-link-intake", body: "업로드 후 public URL을 canonical brief에 연결", fill: C.white, accent: C.rose });
addMetric(slide, 9.18, 2.18, "5", "daily automations", C.orange);
addMetric(slide, 11.25, 2.18, "3", "weekly automations", C.sky);
addMetric(slide, 9.18, 3.58, "1", "manual intake", C.ink);
addMetric(slide, 11.25, 3.58, "1 rule", "one decision each", C.mint);
footer(slide, 7);

slide = pptx.addSlide();
addBase(slide, C.orange);
addHeader(slide, "Proof", "현재 어디까지 왔나", "문서와 상태 로그 기준으로 보면, 공개 허브와 운영 파이프라인의 핵심 골격은 이미 실동작 단계까지 올라와 있습니다.");
addMetric(slide, 0.84, 2.0, "23 / 30", "enabled sources", C.orange);
addMetric(slide, 2.95, 2.0, "63", "items fetched / run", C.mint);
addMetric(slide, 5.06, 2.0, "19", "items synced", C.sky);
addMetric(slide, 7.17, 2.0, "38 + 28", "unit + e2e", C.purple);
addMetric(slide, 9.28, 2.0, "2", "public locales", C.yellow);
addMetric(slide, 11.39, 2.0, "367", "repo files in graph", C.rose);
addMetric(slide, 0.84, 3.45, "936", "graph nodes", C.orange);
addMetric(slide, 2.95, 3.45, "3707", "graph edges", C.mint);
addCard(slide, { x: 5.14, y: 3.38, w: 7.12, h: 2.38, title: "이미 구현된 것", body: "• public hub + admin shell + discovery/radar + localized routes\n• auto-publish, editorial review hardening, dedup guard, source health\n• newsletter, translation, channel publish, YouTube link intake path\n• Vercel production deploy + full cycle validation 기록", fill: C.white, accent: C.ink });
addPill(slide, 0.86, 6.1, 11.42, "Boundary today: published까지는 구현 완료, 그 이후 richer media / analytics feedback / auth hardening이 다음 고도화 구간", C.ink, C.cream);
footer(slide, 8);

slide = pptx.addSlide();
addBase(slide, C.ink);
slide.addShape("rect", {
  x: 0,
  y: 0,
  w: slideWidth,
  h: slideHeight,
  line: { color: C.ink, transparency: 100 },
  fill: { color: C.ink },
});
slide.addShape("ellipse", {
  x: 8.85,
  y: -0.6,
  w: 4.2,
  h: 4.2,
  line: { color: C.orange, transparency: 100 },
  fill: { color: C.orange, transparency: 35 },
});
slide.addImage({ data: assets.logoMark, x: 9.7, y: 3.2, w: 2.2, h: 2.2 });
slide.addText("이 프로젝트를 한 문장으로 정리하면", {
  x: 0.88,
  y: 0.95,
  w: 5.8,
  h: 0.38,
  fontFace: FONT.body,
  fontSize: 12,
  bold: true,
  color: C.creamMuted,
  margin: 0,
});
slide.addText("VibeHub는 AI 미디어 운영을\n'콘텐츠 제작'이 아니라 '운영 시스템'으로 바꾸는 프로젝트입니다.", {
  x: 0.86,
  y: 1.45,
  w: 6.85,
  h: 1.24,
  fontFace: FONT.display,
  fontSize: 24,
  bold: true,
  color: C.white,
  margin: 0,
});
addCard(slide, { x: 0.9, y: 3.35, w: 2.75, h: 1.66, title: "Next 1", body: "richer media loop\nNotebookLM / Remotion / channel polish", fill: C.cream, accent: C.orange });
addCard(slide, { x: 3.95, y: 3.35, w: 2.75, h: 1.66, title: "Next 2", body: "feedback loop\nanalytics -> insight -> prompt tuning", fill: C.cream, accent: C.sky });
addCard(slide, { x: 7.0, y: 3.35, w: 2.75, h: 1.66, title: "Next 3", body: "operator hardening\nauth, observability, rollback policy", fill: C.cream, accent: C.mint });
slide.addText("쉽게 말해, 좋은 글을 쓰는 시스템이 아니라\n좋은 운영이 반복되게 만드는 시스템입니다.", {
  x: 0.9,
  y: 5.65,
  w: 6.1,
  h: 0.64,
  fontFace: FONT.body,
  fontSize: 13,
  color: C.creamMuted,
  margin: 0,
});
slide.addText("vibehub.tech", {
  x: 0.92,
  y: 6.78,
  w: 1.75,
  h: 0.2,
  fontFace: FONT.mono,
  fontSize: 9,
  color: C.creamMuted,
  margin: 0,
});
slide.addText("9", {
  x: 12.14,
  y: 6.78,
  w: 0.25,
  h: 0.2,
  fontFace: FONT.mono,
  fontSize: 9,
  color: C.creamMuted,
  margin: 0,
  align: "right",
});

await writeDeck(pptx);
