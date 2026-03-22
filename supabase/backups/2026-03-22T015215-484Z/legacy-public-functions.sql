-- handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  meta JSON;
BEGIN
  meta := NEW.raw_user_meta_data;

  INSERT INTO public.user_profiles (user_id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(meta->>'user_name', split_part(NEW.email, '@', 1)),
    COALESCE(meta->>'full_name', split_part(NEW.email, '@', 1)),
    meta->>'avatar_url'
  );

  RETURN NEW;
END;
$function$


-- refresh_weekly_vibe_ranking
CREATE OR REPLACE FUNCTION public.refresh_weekly_vibe_ranking()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  can_lock boolean;
  last_ts timestamptz;
  throttle_interval interval := interval '30 seconds'; -- 필요시 5s~60s 등으로 조정
BEGIN
  -- 동시 실행 방지: 어드바이저리 락 시도
  can_lock := pg_try_advisory_lock(1234567890);
  IF NOT can_lock THEN
    -- 이미 누군가 리프레시 중이면 조용히 종료
    RETURN NULL;
  END IF;

  -- 예외 발생에도 락 해제 보장
  BEGIN
    SELECT last_refreshed INTO last_ts
    FROM refresh_control
    WHERE name = 'weekly_vibe_ranking'
    FOR UPDATE;

    -- 쓰로틀: 최근 리프레시가 throttle_interval 내면 스킵
    IF (now() - last_ts) < throttle_interval THEN
      PERFORM pg_advisory_unlock(1234567890);
      RETURN NULL;
    END IF;

    -- 타임스탬프 먼저 갱신(경쟁 상태 방지)
    UPDATE refresh_control
    SET last_refreshed = now()
    WHERE name = 'weekly_vibe_ranking';

    -- CONCURRENTLY 리프레시 (UNIQUE 인덱스가 필요)
    REFRESH MATERIALIZED VIEW CONCURRENTLY weekly_vibe_ranking;

    PERFORM pg_advisory_unlock(1234567890);
    RETURN NULL;
  EXCEPTION WHEN OTHERS THEN
    -- 예외 발생 시 락 해제
    PERFORM pg_advisory_unlock(1234567890);
    RAISE;
  END;
END;
$function$


-- submit_report
CREATE OR REPLACE FUNCTION public.submit_report(p_target_id uuid, p_target_type text, p_reason text, p_description text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
  report_id UUID;
BEGIN
  INSERT INTO reports(reporter_user_id, target_id, target_type, reason, description)
  VALUES(auth.uid(), p_target_id, p_target_type, p_reason, p_description)
  RETURNING id INTO report_id;

  RETURN report_id;
END;
$function$


-- update_content_report_count
CREATE OR REPLACE FUNCTION public.update_content_report_count()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    CASE NEW.target_type
      WHEN 'project' THEN
        UPDATE projects SET report_count = report_count + 1 WHERE id = NEW.target_id;
      WHEN 'comment' THEN
        UPDATE comments SET report_count = report_count + 1 WHERE id = NEW.target_id;
      WHEN 'community_post' THEN
        UPDATE community_posts SET report_count = report_count + 1 WHERE id = NEW.target_id;
      WHEN 'tool_review' THEN
        UPDATE tool_reviews SET report_count = report_count + 1 WHERE id = NEW.target_id;
    END CASE;
  ELSIF TG_OP = 'DELETE' THEN
    CASE OLD.target_type
      WHEN 'project' THEN
        UPDATE projects SET report_count = GREATEST(report_count - 1, 0) WHERE id = OLD.target_id;
      WHEN 'comment' THEN
        UPDATE comments SET report_count = GREATEST(report_count - 1, 0) WHERE id = OLD.target_id;
      WHEN 'community_post' THEN
        UPDATE community_posts SET report_count = GREATEST(report_count - 1, 0) WHERE id = OLD.target_id;
      WHEN 'tool_review' THEN
        UPDATE tool_reviews SET report_count = GREATEST(report_count - 1, 0) WHERE id = OLD.target_id;
    END CASE;
  END IF;

  RETURN NULL;
END;
$function$


-- update_post_stats
CREATE OR REPLACE FUNCTION public.update_post_stats()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Handle vibe_checks
    IF TG_TABLE_NAME = 'vibe_checks' THEN
        IF TG_OP = 'INSERT' THEN
            -- Increment the vibe_check_count in the related table
            CASE NEW.target_type
                WHEN 'project' THEN
                    UPDATE projects SET vibe_check_count = vibe_check_count + 1 WHERE id = NEW.target_id;
                WHEN 'review' THEN
                    UPDATE tool_reviews SET vibe_check_count = vibe_check_count + 1 WHERE id = NEW.target_id;
                WHEN 'community' THEN
                    UPDATE community_posts SET vibe_check_count = vibe_check_count + 1 WHERE id = NEW.target_id;
                WHEN 'news' THEN
                    UPDATE news_articles SET vibe_check_count = vibe_check_count + 1 WHERE id = NEW.target_id;
                WHEN 'comment' THEN
                    UPDATE comments SET vibe_check_count = vibe_check_count + 1 WHERE id = NEW.target_id;
            END CASE;
        ELSIF TG_OP = 'DELETE' THEN
            -- Decrement the vibe_check_count in the related table
            CASE OLD.target_type
                WHEN 'project' THEN
                    UPDATE projects SET vibe_check_count = vibe_check_count - 1 WHERE id = OLD.target_id;
                WHEN 'review' THEN
                    UPDATE tool_reviews SET vibe_check_count = vibe_check_count - 1 WHERE id = OLD.target_id;
                WHEN 'community' THEN
                    UPDATE community_posts SET vibe_check_count = vibe_check_count - 1 WHERE id = OLD.target_id;
                WHEN 'news' THEN
                    UPDATE news_articles SET vibe_check_count = vibe_check_count - 1 WHERE id = OLD.target_id;
                WHEN 'comment' THEN
                    UPDATE comments SET vibe_check_count = vibe_check_count - 1 WHERE id = OLD.target_id;
            END CASE;
        END IF;
    -- Handle comments
    ELSIF TG_TABLE_NAME = 'comments' THEN
        IF TG_OP = 'INSERT' THEN
            -- Increment the comment_count in the related table
            CASE NEW.post_type
                WHEN 'project' THEN
                    UPDATE projects SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
                WHEN 'review' THEN
                    UPDATE tool_reviews SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
                WHEN 'community' THEN
                    UPDATE community_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
                WHEN 'news' THEN
                    UPDATE news_articles SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
            END CASE;
        ELSIF TG_OP = 'DELETE' THEN
            -- Decrement the comment_count in the related table
            CASE OLD.post_type
                WHEN 'project' THEN
                    UPDATE projects SET comment_count = comment_count - 1 WHERE id = OLD.post_id;
                WHEN 'review' THEN
                    UPDATE tool_reviews SET comment_count = comment_count - 1 WHERE id = OLD.post_id;
                WHEN 'community' THEN
                    UPDATE community_posts SET comment_count = comment_count - 1 WHERE id = OLD.post_id;
                WHEN 'news' THEN
                    UPDATE news_articles SET comment_count = comment_count - 1 WHERE id = OLD.post_id;
            END CASE;
        END IF;
    END IF;
    
    RETURN NULL;
END;
$function$


-- update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$

