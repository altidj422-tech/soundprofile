-- 0011_reports.sql
-- Lightweight abuse reporting. Any signed-in member can report content; a
-- moderator (rep >= threshold) reviews + resolves. One report per
-- (reporter, target). Additive.
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_id INTEGER NOT NULL,
  target_type TEXT NOT NULL,          -- 'comment' | 'user'
  target_id INTEGER NOT NULL,
  song_id INTEGER,                    -- context for jumping to the content
  reason TEXT NOT NULL DEFAULT '',
  resolved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(reporter_id, target_type, target_id)
);
CREATE INDEX IF NOT EXISTS idx_reports_open ON reports(resolved, created_at);
