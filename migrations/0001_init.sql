CREATE TABLE applications (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  property_address TEXT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  date_of_birth TEXT,
  ssn_last4 TEXT,
  ssn_full TEXT,
  monthly_income TEXT,
  payload TEXT NOT NULL,
  notes TEXT
);

CREATE INDEX idx_applications_created ON applications (created_at DESC);
CREATE INDEX idx_applications_status ON applications (status);

CREATE TABLE credit_checks (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  score INTEGER,
  rating TEXT,
  recommendation TEXT,
  summary TEXT,
  raw_json TEXT,
  FOREIGN KEY (application_id) REFERENCES applications (id)
);

CREATE INDEX idx_credit_application ON credit_checks (application_id, created_at DESC);
