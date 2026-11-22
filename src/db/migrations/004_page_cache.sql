CREATE TABLE IF NOT EXISTS page_cache (
  url TEXT PRIMARY KEY,
  title TEXT,
  text TEXT NOT NULL,
  fetched_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_page_cache_fetched_at ON page_cache (fetched_at);
