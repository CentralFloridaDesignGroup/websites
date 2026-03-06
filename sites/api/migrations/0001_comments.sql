CREATE TABLE IF NOT EXISTS review_package (
  id INTEGER PRIMARY KEY,
  created_date DATETIME NOT NULL,
  updated_date DATETIME,
  created_by TEXT NOT NULL,
  updated_by TEXT,
  project_number TEXT,
  municipal_number TEXT,
  review_number INTEGER,
  review_date DATE,
  project_name TEXT
);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY,
  package INTEGER,
  created_date DATETIME NOT NULL,
  updated_date DATETIME,
  created_by TEXT NOT NULL,
  updated_by TEXT,
  comment_id TEXT,
  comment_text TEXT,
  response_text TEXT,
  FOREIGN KEY (package) REFERENCES review_package(id)
);

CREATE INDEX IF NOT EXISTS idx_review_package_id ON review_package(id);
CREATE INDEX IF NOT EXISTS idx_comments_package ON comments(package);
