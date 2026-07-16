-- Real-catalog metadata for songs (Apple/iTunes search). Additive.
ALTER TABLE songs ADD COLUMN artwork_url TEXT NOT NULL DEFAULT '';
ALTER TABLE songs ADD COLUMN preview_url TEXT NOT NULL DEFAULT '';
ALTER TABLE songs ADD COLUMN external_id TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_songs_external ON songs(external_id);
