CREATE TABLE availability_alerts (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  listing_id TEXT NOT NULL,
  listing_name TEXT,
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  notified_at TEXT
);

CREATE UNIQUE INDEX idx_waitlist_listing_email
  ON availability_alerts (listing_id, email);
CREATE INDEX idx_waitlist_pending
  ON availability_alerts (listing_id, notified_at);
