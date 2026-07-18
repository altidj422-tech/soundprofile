-- 0013_song_likes.sql
-- Song likes: a low-friction taste signal ("I like this"), distinct from BOTH
-- playing it (user_songs) and the 👍/👎 on technique tags (which drives author
-- reputation, not taste). Feeds the recommender's similarity + scoring.
-- Additive.
CREATE TABLE IF NOT EXISTS song_likes (
  user_id INTEGER NOT NULL,
  song_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, song_id)
);
CREATE INDEX IF NOT EXISTS idx_song_likes_song ON song_likes(song_id);
