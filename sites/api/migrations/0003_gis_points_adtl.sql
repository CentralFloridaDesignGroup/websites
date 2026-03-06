ALTER TABLE gis_points
  ADD COLUMN additional_info TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(additional_info));

