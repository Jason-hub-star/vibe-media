-- comments.update_comments_updated_at
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- comments.update_post_stats_comments_delete
CREATE TRIGGER update_post_stats_comments_delete AFTER DELETE ON comments FOR EACH ROW EXECUTE FUNCTION update_post_stats();

-- comments.update_post_stats_comments_insert
CREATE TRIGGER update_post_stats_comments_insert AFTER INSERT ON comments FOR EACH ROW EXECUTE FUNCTION update_post_stats();

-- community_posts.update_community_posts_updated_at
CREATE TRIGGER update_community_posts_updated_at BEFORE UPDATE ON community_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- news_articles.update_news_articles_updated_at
CREATE TRIGGER update_news_articles_updated_at BEFORE UPDATE ON news_articles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- projects.update_projects_updated_at
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- reports.trigger_update_content_report_count
CREATE TRIGGER trigger_update_content_report_count AFTER INSERT OR DELETE ON reports FOR EACH ROW EXECUTE FUNCTION update_content_report_count();

-- tool_reviews.update_tool_reviews_updated_at
CREATE TRIGGER update_tool_reviews_updated_at BEFORE UPDATE ON tool_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- user_profiles.update_user_profiles_updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- vibe_checks.refresh_weekly_vibe_ranking_delete
CREATE TRIGGER refresh_weekly_vibe_ranking_delete AFTER DELETE ON vibe_checks FOR EACH STATEMENT EXECUTE FUNCTION refresh_weekly_vibe_ranking();

-- vibe_checks.refresh_weekly_vibe_ranking_insert
CREATE TRIGGER refresh_weekly_vibe_ranking_insert AFTER INSERT ON vibe_checks FOR EACH STATEMENT EXECUTE FUNCTION refresh_weekly_vibe_ranking();

-- vibe_checks.update_post_stats_vibe_checks_delete
CREATE TRIGGER update_post_stats_vibe_checks_delete AFTER DELETE ON vibe_checks FOR EACH ROW EXECUTE FUNCTION update_post_stats();

-- vibe_checks.update_post_stats_vibe_checks_insert
CREATE TRIGGER update_post_stats_vibe_checks_insert AFTER INSERT ON vibe_checks FOR EACH ROW EXECUTE FUNCTION update_post_stats();
