comment on table public.channel_publish_results
  is 'Per-channel publish result history. Tracked by brief_slug + channel_name + created_at.';

comment on column public.channel_publish_results.channel_name
  is 'Extensible channel key such as threads, ghost, tistory, youtube, or podcast-rss.';

comment on table public.publish_dispatches
  is 'Per-dispatch publish run record. One publish:channels run creates one dispatch row.';

comment on table public.brief_post_variants
  is 'Localized variants of brief_posts. Unique on canonical_id + locale.';

comment on table public.discover_item_variants
  is 'Localized variants of discover_items. Unique on canonical_id + locale.';

comment on column public.channel_publish_results.locale
  is 'Publish locale such as en or es. Defaults to en for backward compatibility.';
