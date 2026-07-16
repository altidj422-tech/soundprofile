-- Profile photos + friends. Additive.

-- A profile photo, stored as a small (client-resized) data URL. "" → fall back
-- to the generative gradient avatar keyed by avatar_hue.
ALTER TABLE users ADD COLUMN avatar_url TEXT NOT NULL DEFAULT '';

-- Directed friend edges. A row (user_id → friend_id) means user_id sent the
-- request. status 'pending' until friend_id accepts, then 'accepted'.
-- Friendship is symmetric: two users are friends if EITHER direction is accepted.
CREATE TABLE IF NOT EXISTS friendships (
  user_id    INTEGER NOT NULL,   -- requester
  friend_id  INTEGER NOT NULL,   -- recipient
  status     TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'accepted'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, friend_id)
);
CREATE INDEX IF NOT EXISTS idx_friend_of ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friend_status ON friendships(status);
