-- 0008_learning.sql
-- "Learning" list: songs a user wants to learn / is working on — distinct from
-- user_songs (songs they can already play). Additive.
CREATE TABLE IF NOT EXISTS learning (
  user_id INTEGER NOT NULL,
  song_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, song_id)
);
CREATE INDEX IF NOT EXISTS idx_learning_user ON learning(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_learning_song ON learning(song_id);
