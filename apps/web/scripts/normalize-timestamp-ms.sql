-- Normalize epoch-second timestamps to milliseconds (values < 1e11).
UPDATE apps SET
  submitted_at = CASE WHEN submitted_at IS NOT NULL AND submitted_at > 0 AND submitted_at < 100000000000 THEN submitted_at * 1000 ELSE submitted_at END,
  reviewed_at = CASE WHEN reviewed_at IS NOT NULL AND reviewed_at > 0 AND reviewed_at < 100000000000 THEN reviewed_at * 1000 ELSE reviewed_at END,
  published_at = CASE WHEN published_at IS NOT NULL AND published_at > 0 AND published_at < 100000000000 THEN published_at * 1000 ELSE published_at END,
  created_at = CASE WHEN created_at IS NOT NULL AND created_at > 0 AND created_at < 100000000000 THEN created_at * 1000 ELSE created_at END,
  updated_at = CASE WHEN updated_at IS NOT NULL AND updated_at > 0 AND updated_at < 100000000000 THEN updated_at * 1000 ELSE updated_at END;

UPDATE collections SET
  published_at = CASE WHEN published_at IS NOT NULL AND published_at > 0 AND published_at < 100000000000 THEN published_at * 1000 ELSE published_at END,
  created_at = CASE WHEN created_at IS NOT NULL AND created_at > 0 AND created_at < 100000000000 THEN created_at * 1000 ELSE created_at END,
  updated_at = CASE WHEN updated_at IS NOT NULL AND updated_at > 0 AND updated_at < 100000000000 THEN updated_at * 1000 ELSE updated_at END;

UPDATE app_assets SET
  created_at = CASE WHEN created_at IS NOT NULL AND created_at > 0 AND created_at < 100000000000 THEN created_at * 1000 ELSE created_at END;

UPDATE collection_apps SET
  created_at = CASE WHEN created_at IS NOT NULL AND created_at > 0 AND created_at < 100000000000 THEN created_at * 1000 ELSE created_at END;

UPDATE users SET
  created_at = CASE WHEN created_at IS NOT NULL AND created_at > 0 AND created_at < 100000000000 THEN created_at * 1000 ELSE created_at END,
  updated_at = CASE WHEN updated_at IS NOT NULL AND updated_at > 0 AND updated_at < 100000000000 THEN updated_at * 1000 ELSE updated_at END;
