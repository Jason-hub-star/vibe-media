-- Migration: seed 7 harness-pattern editorial sources
-- 2026-04-05
-- Purpose: Add AI engineering / agent pattern blogs that feed harness_pattern discover items.
-- All sources: pipeline_lane = 'editorial', fetch_kind = 'rss', source_tier = 'auto-safe'

insert into public.sources (
  name,
  kind,
  base_url,
  source_tier,
  enabled,
  failure_reason,
  feed_url,
  content_type,
  default_tags,
  max_items,
  fetch_kind,
  pipeline_lane
)
values
  (
    '긱뉴스',
    'rss',
    'https://news.hada.io/',
    'auto-safe',
    true,
    null,
    'https://news.hada.io/rss/news',
    'article',
    array['korean', 'ai', 'tech', 'tools', 'news'],
    5,
    'rss',
    'editorial'
  ),
  (
    'Simon Willison''s Weblog',
    'rss',
    'https://simonwillison.net/',
    'auto-safe',
    true,
    null,
    'https://simonwillison.net/atom/everything/',
    'article',
    array['llm', 'agent', 'ai-engineering', 'pattern', 'tools', 'harness'],
    5,
    'rss',
    'editorial'
  ),
  (
    'Simon Willison TIL',
    'rss',
    'https://til.simonwillison.net/',
    'auto-safe',
    true,
    null,
    'https://til.simonwillison.net/tils/feed.atom',
    'article',
    array['til', 'pattern', 'ai-engineering', 'snippet', 'harness'],
    5,
    'rss',
    'editorial'
  ),
  (
    'Lilian Weng''s Blog',
    'rss',
    'https://lilianweng.github.io/',
    'auto-safe',
    true,
    null,
    'https://lilianweng.github.io/index.xml',
    'article',
    array['llm', 'agent', 'research', 'architecture', 'pattern', 'harness'],
    3,
    'rss',
    'editorial'
  ),
  (
    'Eugene Yan''s Blog',
    'rss',
    'https://eugeneyan.com/',
    'auto-safe',
    true,
    null,
    'https://eugeneyan.com/rss/',
    'article',
    array['rag', 'llm', 'evaluation', 'production', 'pattern', 'harness'],
    3,
    'rss',
    'editorial'
  ),
  (
    'Latent Space',
    'rss',
    'https://www.latent.space/',
    'auto-safe',
    true,
    null,
    'https://www.latent.space/feed',
    'article',
    array['llm', 'agent', 'ai-engineering', 'pattern', 'harness'],
    3,
    'rss',
    'editorial'
  ),
  (
    'AI News (smol.ai)',
    'rss',
    'https://news.smol.ai/',
    'auto-safe',
    true,
    null,
    'https://news.smol.ai/rss.xml',
    'article',
    array['news', 'ai', 'daily', 'digest'],
    5,
    'rss',
    'editorial'
  )
on conflict (pipeline_lane, name) do update set
  feed_url     = excluded.feed_url,
  base_url     = excluded.base_url,
  source_tier  = excluded.source_tier,
  default_tags = excluded.default_tags,
  max_items    = excluded.max_items,
  enabled      = excluded.enabled,
  failure_reason = excluded.failure_reason;
