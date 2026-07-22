-- 0014_song_ratings.sql
-- Star ratings: a graded 1..5 "how good is this song" signal — distinct from
-- BOTH the per-instrument difficulty on user_songs (how HARD it is) and song_likes
-- (a binary "more like this" that also removes the song from your feed). One row
-- per user per song, editable in place. Drives a community-quality nudge in the
-- recommender's ranking (it reorders picks, it never hides them). Additive.
CREATE TABLE IF NOT EXISTS song_ratings (
  user_id INTEGER NOT NULL,
  song_id INTEGER NOT NULL,
  rating INTEGER NOT NULL, -- 1..5 stars
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, song_id)
);
CREATE INDEX IF NOT EXISTS idx_song_ratings_song ON song_ratings(song_id);
