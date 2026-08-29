-- One row per (target, kind, client). Counts are derived with COUNT(*), so a
-- visitor can only ever contribute one of each reaction and pressing again
-- removes it. `client_hash` is a salted hash of the request IP and user agent:
-- it exists to make that constraint and the comment rate limit possible, and
-- is never returned to the browser.
CREATE TABLE IF NOT EXISTS reactions (
  target      TEXT NOT NULL,
  kind        TEXT NOT NULL,
  client_hash TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  PRIMARY KEY (target, kind, client_hash)
);

CREATE TABLE IF NOT EXISTS comments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  target      TEXT NOT NULL,
  author      TEXT,
  body        TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  client_hash TEXT NOT NULL,
  visible     INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS comments_target_idx ON comments (target, id);
CREATE INDEX IF NOT EXISTS comments_rate_idx ON comments (client_hash, created_at);
