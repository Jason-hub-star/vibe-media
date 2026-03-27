---
name: vibehub-youtube-link-intake
description: Use this skill when a VibeHub YouTube upload has finished and you need to link the public YouTube URL back to the correct brief through Telegram or the CLI, verify that the intake path actually ran, and recover from the common matching or schema failures.
user_invocable: true
---

# VibeHub YouTube Link Intake

Use this skill for the post-upload handoff between YouTube and VibeHub. It covers the success pattern that is now working in the local stack:
- Telegram plain message with one YouTube URL
- Telegram message like `이 링크 연결해줘 <youtube-url>`
- explicit override `/vh-youtube <brief-slug> <youtube-url>`
- CLI fallback `npm run publish:link-youtube -- [brief-slug] <youtube-url>`

Do not use this skill for generic Telegram bot debugging, unrelated LLM routing work, or broad VibeHub publishing changes.

## Success Pattern

### 1. Prefer the simplest intake first

Default operator input:

```text
https://www.youtube.com/watch?v=...
```

Also valid:

```text
이 링크 연결해줘 https://www.youtube.com/watch?v=...
```

If auto-matching is ambiguous, switch to explicit override:

```text
/vh-youtube <brief-slug> <youtube-url>
```

CLI fallback:

```bash
npm run publish:link-youtube -- <youtube-url>
```

CLI explicit fallback:

```bash
npm run publish:link-youtube -- <brief-slug> <youtube-url>
```

### 2. Know what success means

Successful intake means all of the following happened:
- Telegram router received the message
- the message entered the VibeHub YouTube intake path
- `publish:link-youtube` completed
- `brief_posts.youtube_video_id`, `youtube_url`, and `youtube_linked_at` were updated
- the brief can now surface the YouTube link on web

Threads Pass 3 is best-effort. A Threads injection failure does not mean the YouTube link failed.

### 3. Verify with logs, not guesses

Check the launchd-managed router logs:
- `telegram-orchestrator/logs/launchd.out.log`
- `telegram-orchestrator/logs/launchd.err.log`

Success log pattern:

```text
[telegram] message chat=... text="https://youtu.be/..."
[vh-youtube] starting brief=(auto) url=https://youtu.be/...
[vh-youtube] completed brief=(auto) url=https://youtu.be/...
[telegram] response chat=... route=local admin=true needSearch=false ...
```

Those four lines are the primary proof that Telegram-triggered intake actually ran.

## Workflow

### 1. Check router health first

Confirm the launchd agent is running:

```bash
launchctl print gui/$(id -u)/com.family.telegram-orchestrator
```

If needed, restart it:

```bash
launchctl kickstart -k gui/$(id -u)/com.family.telegram-orchestrator
```

If the agent is missing entirely, the plist lives at:
- `~/Library/LaunchAgents/com.family.telegram-orchestrator.plist`

### 2. Send the YouTube link

Start with the plain URL. Only move to explicit slug mode if auto resolution fails.

### 3. Inspect the outcome

Read the logs and classify the result:
- `message` line exists: Telegram reached the router
- `starting` line exists: intake branch was selected
- `completed` line exists: local command returned successfully
- `오류:` or stack trace: failure needs recovery

### 4. Recover with the smallest fix

Common recovery order:
1. Retry with explicit slug
2. Check whether the brief was ever published with YouTube upload metadata
3. Check whether DB schema is missing the YouTube link columns
4. Re-run the intake explicitly from CLI

## Known Failure Modes

### Auto-match failed

Typical error:

```text
업로드 대기 중인 브리프를 자동 매칭하지 못했습니다.
```

Use:

```text
/vh-youtube <brief-slug> <youtube-url>
```

Reason: the pending upload title and the live YouTube title did not match uniquely.

### DB schema missing

Typical error mentions missing `youtube_video_id`, `youtube_url`, or `youtube_linked_at`.

Preferred fix:

```bash
npm run pipeline:supabase-migrate
```

Important note:
- the current codebase also has a self-heal path that attempts to add the YouTube columns on demand
- if full migration fails because of older non-idempotent policies, the direct `publish:link-youtube` path may still succeed

### Shell ate the YouTube URL

If the URL includes `?si=...`, quote it in zsh:

```bash
npm run publish:link-youtube -- 'https://youtu.be/abc123...?si=...'
```

### Threads Pass 3 failed

If `crossPromoResults` shows a Threads API error but the brief YouTube fields were updated, treat the YouTube link as linked and debug Threads separately.

## Repo Anchors

When you need to inspect or patch this flow, start here:
- `telegram-orchestrator/router/telegram-bot.mjs`
- `apps/backend/src/workers/run-link-youtube.ts`
- `apps/backend/src/shared/youtube-linking.ts`
- `.claude/automations/youtube-link-intake.md`
- `docs/ref/TELEGRAM-ORCHESTRATOR-CONTRACT.md`

## Output Shape

When using this skill for an operational check, report results in this shape:

```md
Router status
- ...

Intake result
- ...

Evidence
- ...

Next action
- ...
```

Keep it short and evidence-first.
