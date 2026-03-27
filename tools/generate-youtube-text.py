#!/usr/bin/env python3
"""
YouTube 맞춤 Description + 썸네일 프롬프트 생성 (Gemini API)

Usage: python3 tools/generate-youtube-text.py <slug>
필요: GEMINI_API_KEY 환경변수
출력: output/<slug>/youtube-seo-assistant.txt (신규)
      output/<slug>/thumbnail-prompt.txt (신규)
"""

import os
import sys
import json

def main():
    slug = sys.argv[1] if len(sys.argv) > 1 else None
    if not slug:
        print("Usage: python3 tools/generate-youtube-text.py <slug>")
        sys.exit(1)

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("⚠️ GEMINI_API_KEY not set, skipping YouTube text generation")
        sys.exit(0)

    out_dir = f"output/{slug}"
    if not os.path.isdir(out_dir):
        print(f"❌ Directory not found: {out_dir}")
        sys.exit(1)

    # Brief 정보 읽기 (brief-body.txt 또는 subtitles에서)
    title = slug.replace("-", " ").title()
    body = ""
    tags = []

    # brief-body.txt가 있으면 사용
    body_path = f"{out_dir}/brief-body.txt"
    if os.path.exists(body_path):
        with open(body_path) as f:
            body = f.read()

    # 자막에서 본문 추출 (fallback)
    if not body:
        srt_path = f"{out_dir}/subtitles-en.srt"
        if os.path.exists(srt_path):
            with open(srt_path) as f:
                lines = f.readlines()
                body = " ".join(
                    l.strip() for l in lines
                    if l.strip() and not l.strip().isdigit() and "-->" not in l
                )

    if not body:
        print("⚠️ No brief body or subtitles found, skipping")
        sys.exit(0)

    # Gemini API 호출
    import urllib.request

    # 1. YouTube Description
    desc_prompt = f"""You are a YouTube SEO expert. Given this AI tech brief, write a YouTube video description.

Rules:
- 3 sections: hook (1-2 engaging sentences), key points (3-4 bullet points with emoji), call to action
- Include these links at the end:
  📄 Full Article: https://vibehub.tech/en/brief/{slug}
  🧵 Threads: https://www.threads.net/@vibehub1030
  🌐 Website: https://vibehub.tech/en
- Add 8-12 relevant hashtags (no duplicates)
- Add a separate line: TAGS: comma-separated tags for YouTube Studio
- Keep under 5000 characters
- English only
- Do NOT include the title (YouTube has a separate title field)

Brief title: {title}
Brief content: {body[:3000]}"""

    # 2. 썸네일 프롬프트
    thumb_prompt = f"""You are a YouTube thumbnail designer. Generate an image generation prompt for this AI tech video thumbnail.

Rules:
- Style: bold, eye-catching, minimal text overlay
- Color scheme: dark background with orange (#F97316) and purple (#7C3AED) accents
- Include a visual metaphor or icon related to the topic
- Suggest max 4 words for text overlay (separate from the image prompt)
- 16:9 aspect ratio

Brief title: {title}

Output format:
IMAGE_PROMPT: <the image generation prompt>
TEXT_OVERLAY: <max 4 words for the thumbnail>"""

    def call_gemini(prompt):
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
        data = json.dumps({
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.7, "maxOutputTokens": 2000}
        }).encode()
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                result = json.loads(resp.read())
                return result["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            print(f"⚠️ Gemini API failed: {e}")
            return None

    def call_ollama(prompt, model="vibehub-chat:latest"):
        """로컬 LLM 폴백 (ollama)."""
        url = "http://localhost:11434/api/generate"
        data = json.dumps({
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0.7, "num_predict": 2000}
        }).encode()
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                result = json.loads(resp.read())
                return result.get("response", "")
        except Exception as e:
            print(f"⚠️ Ollama failed: {e}")
            return None

    def call_llm(prompt):
        """Gemini → Ollama → None 폴백 체인."""
        if api_key:
            result = call_gemini(prompt)
            if result:
                print("  (via Gemini)")
                return result

        result = call_ollama(prompt)
        if result:
            print("  (via Ollama local)")
            return result

        print("  ❌ All LLM backends failed")
        return None

    # Description 생성
    print("Generating YouTube description...")
    desc_text = call_llm(desc_prompt)
    if desc_text:
        guide_path = f"{out_dir}/youtube-seo-assistant.txt"

        # 운영용 canonical guide는 유지하고, 이 파일은 SEO 보조 초안만 저장한다.
        guide_content = f"""═══════════════════════════════════════════════════
  VibeHub — YouTube SEO Assistant
  Generated by Gemini
═══════════════════════════════════════════════════

이 파일은 `youtube-upload-guide.txt`를 덮어쓰지 않습니다.
복붙용 운영 절차는 canonical guide를 사용하고, 아래 내용은 SEO 보조 초안으로만 참고하세요.

📋 TITLE REFERENCE
───────────────────────────────────────────────────
{title}

📝 SEO DESCRIPTION DRAFT
───────────────────────────────────────────────────
{desc_text}

📌 NOTE
───────────────────────────────────────────────────
Apply any useful edits manually into `youtube-upload-guide.txt`.
═══════════════════════════════════════════════════
"""
        with open(guide_path, "w") as f:
            f.write(guide_content)
        print(f"✅ {guide_path}")

    # 썸네일 프롬프트 생성
    print("Generating thumbnail prompt...")
    thumb_text = call_llm(thumb_prompt)
    if thumb_text:
        thumb_path = f"{out_dir}/thumbnail-prompt.txt"
        with open(thumb_path, "w") as f:
            f.write(thumb_text)
        print(f"✅ {thumb_path}")

    print("Done!")


if __name__ == "__main__":
    main()
