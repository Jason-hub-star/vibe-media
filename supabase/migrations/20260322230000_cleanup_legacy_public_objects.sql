drop trigger if exists update_comments_updated_at on public.comments;
drop trigger if exists update_post_stats_comments_delete on public.comments;
drop trigger if exists update_post_stats_comments_insert on public.comments;
drop trigger if exists update_community_posts_updated_at on public.community_posts;
drop trigger if exists update_news_articles_updated_at on public.news_articles;
drop trigger if exists update_projects_updated_at on public.projects;
drop trigger if exists trigger_update_content_report_count on public.reports;
drop trigger if exists update_tool_reviews_updated_at on public.tool_reviews;
drop trigger if exists update_user_profiles_updated_at on public.user_profiles;
drop trigger if exists refresh_weekly_vibe_ranking_delete on public.vibe_checks;
drop trigger if exists refresh_weekly_vibe_ranking_insert on public.vibe_checks;
drop trigger if exists update_post_stats_vibe_checks_delete on public.vibe_checks;
drop trigger if exists update_post_stats_vibe_checks_insert on public.vibe_checks;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  return new;
end;
$$;

drop function if exists public.refresh_weekly_vibe_ranking();
drop function if exists public.submit_report(uuid, text, text);
drop function if exists public.update_content_report_count();
drop function if exists public.update_post_stats();
drop function if exists public.update_updated_at_column();

drop table if exists public.comments cascade;
drop table if exists public.community_poll_options cascade;
drop table if exists public.community_poll_votes cascade;
drop table if exists public.community_polls cascade;
drop table if exists public.community_post_tags cascade;
drop table if exists public.community_posts cascade;
drop table if exists public.news_articles cascade;
drop table if exists public.news_categories cascade;
drop table if exists public.profiles cascade;
drop table if exists public.project_categories cascade;
drop table if exists public.project_features cascade;
drop table if exists public.project_technologies cascade;
drop table if exists public.project_tools cascade;
drop table if exists public.projects cascade;
drop table if exists public.refresh_control cascade;
drop table if exists public.reports cascade;
drop table if exists public.review_categories cascade;
drop table if exists public.tool_reviews cascade;
drop table if exists public.user_profiles cascade;
drop table if exists public.vibe_checks cascade;
