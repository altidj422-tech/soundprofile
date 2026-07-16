-- Technique tags + reputation + comments. Additive.

ALTER TABLE users ADD COLUMN likes_received INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN dislikes_received INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN banned INTEGER NOT NULL DEFAULT 0;

-- The tag vocabulary (guitar only for now; `instrument` scopes future ones).
CREATE TABLE IF NOT EXISTS technique_tags (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  instrument TEXT NOT NULL DEFAULT 'guitar',
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE
);

-- One owned technique annotation per song (wiki-style).
CREATE TABLE IF NOT EXISTS song_annotations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  song_id    INTEGER NOT NULL UNIQUE,
  author_id  INTEGER NOT NULL,
  note       TEXT NOT NULL DEFAULT '',
  likes      INTEGER NOT NULL DEFAULT 0,
  dislikes   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_annot_author ON song_annotations(author_id);

CREATE TABLE IF NOT EXISTS annotation_tags (
  annotation_id INTEGER NOT NULL,
  tag_id        INTEGER NOT NULL,
  PRIMARY KEY (annotation_id, tag_id)
);

-- One vote per user per song's annotation. value: 1 like, -1 dislike.
CREATE TABLE IF NOT EXISTS annotation_votes (
  song_id    INTEGER NOT NULL,
  voter_id   INTEGER NOT NULL,
  value      INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (song_id, voter_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  song_id    INTEGER NOT NULL,
  user_id    INTEGER NOT NULL,
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_comments_song ON comments(song_id);

INSERT OR IGNORE INTO technique_tags (instrument, name, slug) VALUES
  ('guitar', 'Open chords', 'open-chords'),
  ('guitar', 'Barre chords', 'barre-chords'),
  ('guitar', 'Power chords', 'power-chords'),
  ('guitar', 'Slides', 'slides'),
  ('guitar', 'String bends', 'string-bends'),
  ('guitar', 'Hammer-ons', 'hammer-ons'),
  ('guitar', 'Pull-offs', 'pull-offs'),
  ('guitar', 'Vibrato', 'vibrato'),
  ('guitar', 'Palm muting', 'palm-muting'),
  ('guitar', 'Fingerpicking', 'fingerpicking'),
  ('guitar', 'Strumming', 'strumming'),
  ('guitar', 'Alternate picking', 'alternate-picking'),
  ('guitar', 'Travis picking', 'travis-picking'),
  ('guitar', 'Tapping', 'tapping'),
  ('guitar', 'Sweep picking', 'sweep-picking'),
  ('guitar', 'Natural harmonics', 'harmonics'),
  ('guitar', 'Capo', 'capo'),
  ('guitar', 'Alternate tuning', 'alt-tuning'),
  ('guitar', 'Double stops', 'double-stops'),
  ('guitar', 'Muted / percussive', 'muted-percussive');
