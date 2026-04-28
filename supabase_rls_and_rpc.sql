-- ============================================================
-- mynodes.app — Supabase RLS + Access Control
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================


-- ============================================================
-- STEP 1: Add slug column to effects (if not already present)
-- ============================================================
ALTER TABLE effects
  ADD COLUMN IF NOT EXISTS slug text;

-- Index for fast slug lookups
CREATE INDEX IF NOT EXISTS effects_slug_user_idx
  ON effects (user_id, slug);


-- ============================================================
-- STEP 2: Rate-limiting table for failed password attempts
-- ============================================================
CREATE TABLE IF NOT EXISTS access_attempts (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  effect_id    text        NOT NULL,
  attempted_at timestamptz DEFAULT now()
);

-- Index so the rate-limit COUNT query stays fast
CREATE INDEX IF NOT EXISTS access_attempts_effect_time_idx
  ON access_attempts (effect_id, attempted_at DESC);

-- Auto-purge attempts older than 24 hours to keep the table small.
-- Wire this up to a Supabase cron job (pg_cron) if you have it enabled:
--   SELECT cron.schedule('purge-access-attempts', '0 * * * *',
--     $$DELETE FROM access_attempts WHERE attempted_at < now() - interval '24 hours'$$);


-- ============================================================
-- STEP 3: Enable RLS on effects table
-- ============================================================
ALTER TABLE effects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first so this script is re-runnable
DROP POLICY IF EXISTS "Owners can manage their own effects" ON effects;
DROP POLICY IF EXISTS "Public effects are readable by everyone" ON effects;

-- Owners can read, insert, update, delete their own effects
CREATE POLICY "Owners can manage their own effects"
  ON effects
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Anyone can read effects marked as public
CREATE POLICY "Public effects are readable by everyone"
  ON effects
  FOR SELECT
  USING (is_public = true);

-- NOTE: Private effects (is_public = false, owned by someone else) are
-- blocked entirely by RLS. Access for non-owners is only granted via the
-- validate_effect_access RPC below, which runs as SECURITY DEFINER and
-- enforces password + limit checks before returning data.


-- ============================================================
-- STEP 4: validate_effect_access RPC
--
-- Called by the client instead of a direct SELECT.
-- Runs as SECURITY DEFINER so it can read private effects
-- after validating credentials — the client never gets raw
-- access to private rows.
--
-- Returns:
--   Full effect row as JSON          → access granted
--   '{"requires_password":true}'     → private, no password supplied
--   '{"error":"wrong_password"}'     → password supplied but incorrect
--   '{"error":"rate_limited"}'       → too many failed attempts
--   '{"error":"limit_reached"}'      → share_limit exhausted
--   '{"error":"not_found"}'          → username or slug doesn't exist
-- ============================================================
CREATE OR REPLACE FUNCTION validate_effect_access(
  p_username text,
  p_slug     text,
  p_password text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id       uuid;
  v_effect        effects%ROWTYPE;
  v_attempt_count int;
BEGIN

  -- ── Resolve display_name → user_id ───────────────────────
  SELECT id INTO v_user_id
  FROM   profiles
  WHERE  display_name = p_username
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN '{"error":"not_found"}'::json;
  END IF;

  -- ── Fetch the effect ─────────────────────────────────────
  SELECT * INTO v_effect
  FROM   effects
  WHERE  slug    = p_slug
  AND    user_id = v_user_id
  LIMIT  1;

  IF v_effect.id IS NULL THEN
    RETURN '{"error":"not_found"}'::json;
  END IF;

  -- ── Public or Sharing: no password needed ────────────────
  IF v_effect.is_public = true OR v_effect.status = 'Sharing' THEN
    RETURN row_to_json(v_effect);
  END IF;

  -- ── Owner bypasses everything ────────────────────────────
  IF auth.uid() = v_user_id THEN
    RETURN row_to_json(v_effect);
  END IF;

  -- ── Private effect — password required ──────────────────

  -- Rate limit: max 5 failed attempts per effect per hour
  SELECT COUNT(*) INTO v_attempt_count
  FROM   access_attempts
  WHERE  effect_id    = v_effect.id::text
  AND    attempted_at > now() - interval '1 hour';

  IF v_attempt_count >= 5 THEN
    RETURN '{"error":"rate_limited"}'::json;
  END IF;

  -- No password supplied → tell client a password is needed
  IF p_password IS NULL OR p_password = '' THEN
    RETURN '{"requires_password":true}'::json;
  END IF;

  -- Wrong password → log attempt and deny
  IF p_password != v_effect.share_password THEN
    INSERT INTO access_attempts (effect_id)
    VALUES (v_effect.id::text);
    RETURN '{"error":"wrong_password"}'::json;
  END IF;

  -- ── Password correct ─────────────────────────────────────

  -- Check share_limit (NULL = unlimited)
  IF v_effect.share_limit IS NOT NULL
     AND COALESCE(v_effect.view_count, 0) >= v_effect.share_limit THEN
    RETURN '{"error":"limit_reached"}'::json;
  END IF;

  -- Increment view_count
  UPDATE effects
  SET    view_count = COALESCE(view_count, 0) + 1
  WHERE  id = v_effect.id;

  -- Return fresh row with updated view_count
  SELECT * INTO v_effect FROM effects WHERE id = v_effect.id;
  RETURN row_to_json(v_effect);

END;
$$;

-- Grant execute to anon and authenticated roles
GRANT EXECUTE ON FUNCTION validate_effect_access(text, text, text)
  TO anon, authenticated;
