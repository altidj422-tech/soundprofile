-- SoundProfile schema. Additive only (one live D1 DB behind the deploy).
-- Bound as env.DB. Applied by the platform on deploy.

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT UNIQUE,
  username      TEXT NOT NULL UNIQUE,
  display_name  TEXT NOT NULL,
  bio           TEXT NOT NULL DEFAULT '',
  avatar_hue    INTEGER NOT NULL DEFAULT 210,
  password_hash TEXT NOT NULL DEFAULT '',
  password_salt TEXT NOT NULL DEFAULT '',
  is_seed       INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS instruments (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL UNIQUE,
  slug  TEXT NOT NULL UNIQUE,
  emoji TEXT NOT NULL DEFAULT '🎵'
);

CREATE TABLE IF NOT EXISTS user_instruments (
  user_id       INTEGER NOT NULL,
  instrument_id INTEGER NOT NULL,
  skill         INTEGER NOT NULL DEFAULT 2, -- 1 beginner .. 4 pro
  PRIMARY KEY (user_id, instrument_id)
);
CREATE INDEX IF NOT EXISTS idx_ui_instrument ON user_instruments(instrument_id);

CREATE TABLE IF NOT EXISTS songs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT NOT NULL,
  artist     TEXT NOT NULL,
  genre      TEXT NOT NULL DEFAULT '',
  year       INTEGER,
  hue        INTEGER NOT NULL DEFAULT 200,
  added_by   INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_songs_title_artist ON songs(title, artist);
CREATE INDEX IF NOT EXISTS idx_songs_genre ON songs(genre);

-- A song a user can play, on a specific instrument, with their difficulty rating.
CREATE TABLE IF NOT EXISTS user_songs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL,
  song_id       INTEGER NOT NULL,
  instrument_id INTEGER NOT NULL,
  difficulty    INTEGER NOT NULL DEFAULT 3, -- 1 easy .. 5 hard
  note          TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, song_id, instrument_id)
);
CREATE INDEX IF NOT EXISTS idx_us_user ON user_songs(user_id);
CREATE INDEX IF NOT EXISTS idx_us_song ON user_songs(song_id);

-- "Not interested" for the discovery feed.
CREATE TABLE IF NOT EXISTS dismissed (
  user_id    INTEGER NOT NULL,
  song_id    INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, song_id)
);

-- Instrument catalog (static, additive-safe).
INSERT OR IGNORE INTO instruments (name, slug, emoji) VALUES
  ('Acoustic Guitar', 'acoustic-guitar', '🎸'),
  ('Electric Guitar', 'electric-guitar', '🎸'),
  ('Bass', 'bass', '🎸'),
  ('Piano', 'piano', '🎹'),
  ('Synth / Keys', 'synth', '🎹'),
  ('Drums', 'drums', '🥁'),
  ('Vocals', 'vocals', '🎤'),
  ('Violin', 'violin', '🎻'),
  ('Cello', 'cello', '🎻'),
  ('Saxophone', 'saxophone', '🎷'),
  ('Trumpet', 'trumpet', '🎺'),
  ('Ukulele', 'ukulele', '🪕'),
  ('Flute', 'flute', '🎶');
