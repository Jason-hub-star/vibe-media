#!/usr/bin/env python3
"""
NotebookLM 오디오/비디오 직접 다운로드.
nlm CLI의 인증 클라이언트를 재활용하여 미디어 파일을 다운로드한다.

Usage: python3.11 tools/nlm-download-direct.py <notebook-id> [output-dir]
"""

import sys
import os
import json

# nlm 패키지 경로 추가
sys.path.insert(0, os.path.expanduser(
    "~/.local/share/uv/tools/notebooklm-cli/lib/python3.11/site-packages"
))

from nlm.core.auth import AuthManager
from nlm.core.client import NotebookLMClient
import httpx

def main():
    if len(sys.argv) < 2:
        print("Usage: python3.11 tools/nlm-download-direct.py <notebook-id> [output-dir]")
        sys.exit(1)

    notebook_id = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else f"output/nlm-{notebook_id[:8]}"

    os.makedirs(output_dir, exist_ok=True)

    # nlm 인증
    auth = AuthManager("default")
    profile = auth.load_profile()
    client = NotebookLMClient(
        cookies=auth.get_cookies(),
        csrf_token=profile.csrf_token,
    )

    # artifact 목록 가져오기
    print(f"Fetching artifacts for notebook {notebook_id}...")
    result = client._call_rpc(
        "gArtLc",
        [[2], notebook_id, 'NOT artifact.status = "ARTIFACT_STATUS_SUGGESTED"'],
        f"/notebook/{notebook_id}",
    )

    if not result or not isinstance(result, list) or not result[0]:
        print("No artifacts found")
        sys.exit(1)

    # 미디어 URL 추출
    type_names = {1: "audio", 3: "video"}
    artifacts = []

    for art in result[0]:
        if not isinstance(art, list) or len(art) < 5:
            continue

        art_id = art[0]
        title = art[1] or "untitled"
        type_code = art[2]
        status_code = art[4]
        type_name = type_names.get(type_code, f"type-{type_code}")

        if status_code != 3:  # 3 = completed
            print(f"  Skip {title} ({type_name}): not completed (status={status_code})")
            continue

        # 미디어 URL 추출
        media_url = None

        # 오디오: field[6]에 URL 정보
        if type_code == 1 and len(art) > 6 and isinstance(art[6], list):
            for item in art[6]:
                if isinstance(item, str) and "googleusercontent.com" in item:
                    media_url = item
                    break

        # 비디오: field[8]에 URL 정보
        if type_code == 3 and len(art) > 8 and isinstance(art[8], list):
            for item in art[8]:
                if isinstance(item, str) and "googleusercontent.com" in item:
                    media_url = item
                    break

        if media_url:
            artifacts.append({
                "id": art_id,
                "title": title,
                "type": type_name,
                "url": media_url,
            })
            print(f"  Found {type_name}: {title}")
        else:
            print(f"  No URL for {type_name}: {title}")

    if not artifacts:
        print("No downloadable artifacts found")
        sys.exit(1)

    # nlm의 httpx 클라이언트 헤더를 재활용해서 다운로드
    cookie_str = "; ".join(f"{k}={v}" for k, v in auth.get_cookies().items())
    headers = {
        "Cookie": cookie_str,
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Referer": "https://notebooklm.google.com/",
        "Origin": "https://notebooklm.google.com",
    }

    downloaded = []

    for art in artifacts:
        url = art["url"]
        ext = "mp4" if art["type"] == "video" else "m4a"
        filename = f"{art['type']}-en.{ext}"
        filepath = os.path.join(output_dir, filename)

        print(f"\nDownloading {art['type']}: {art['title']}")
        print(f"  URL: {url[:80]}...")

        try:
            with httpx.Client(headers=headers, follow_redirects=True, timeout=120.0) as http:
                resp = http.get(url)

                content_type = resp.headers.get("content-type", "")
                size = len(resp.content)
                print(f"  Status: {resp.status_code}, Type: {content_type}, Size: {size/1024/1024:.1f}MB")

                if size < 10000 and "html" in content_type:
                    print(f"  ❌ Got HTML instead of media. Trying with stream...")

                    # 스트리밍 다운로드 시도
                    with http.stream("GET", url) as stream:
                        total = 0
                        with open(filepath, "wb") as f:
                            for chunk in stream.iter_bytes(65536):
                                f.write(chunk)
                                total += len(chunk)
                        print(f"  Streamed: {total/1024/1024:.1f}MB")
                        if total > 100000:
                            downloaded.append(filename)
                            print(f"  ✅ Saved: {filename}")
                        else:
                            os.remove(filepath)
                            print(f"  ❌ Too small, removed")
                else:
                    with open(filepath, "wb") as f:
                        f.write(resp.content)
                    downloaded.append(filename)
                    print(f"  ✅ Saved: {filename} ({size/1024/1024:.1f}MB)")

        except Exception as e:
            print(f"  ❌ Error: {e}")

    # 결과
    print("\n" + "=" * 50)
    print(f"📥 Downloaded: {len(downloaded)}/{len(artifacts)} files")
    for f in downloaded:
        size = os.path.getsize(os.path.join(output_dir, f))
        print(f"  ✅ {f} ({size/1024/1024:.1f}MB)")
    print("=" * 50)


if __name__ == "__main__":
    main()
