-- 0009_tutorials.sql
-- One community-pinned YouTube tutorial per song. Governed like technique tags:
-- the contributor (or a trusted, higher-rep member) can replace/remove it.
-- Additive.
CREATE TABLE IF NOT EXISTS song_tutorials (
  song_id INTEGER PRIMARY KEY,
  video_id TEXT NOT NULL,
  added_by INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
