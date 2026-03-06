CREATE TABLE IF NOT EXISTS gis_points (
  id INTEGER PRIMARY KEY,
  created_date DATETIME NOT NULL,
  updated_date DATETIME,
  created_by TEXT NOT NULL,
  updated_by TEXT,
  point_number TEXT NOT NULL,
  northing REAL NOT NULL,
  easting REAL NOT NULL,
  elevation REAL NOT NULL,
  material TEXT NOT NULL,
  witness TEXT,
  project_number TEXT,
  notes TEXT,
  elevation_ngvd29 REAL,
  conversion_factor REAL,
  conversion_sigma REAL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  source_datum TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gis_points_id ON gis_points(id);
CREATE INDEX IF NOT EXISTS idx_gis_points_point_number ON gis_points(point_number);
CREATE INDEX IF NOT EXISTS idx_gis_points_project_number ON gis_points(project_number);
