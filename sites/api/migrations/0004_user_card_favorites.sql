CREATE TABLE IF NOT EXISTS user_card_favorites (
  user_id TEXT PRIMARY KEY,
  favorites_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(favorites_json)),
  updated_date DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_card_favorites_updated_date ON user_card_favorites(updated_date);