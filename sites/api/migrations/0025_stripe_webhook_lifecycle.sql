CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  stripe_event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  payment_intent_id TEXT,
  created_date DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_payment_intent
  ON stripe_webhook_events(payment_intent_id);

CREATE TABLE IF NOT EXISTS stripe_payment_lifecycle_notifications (
  stripe_payment_intent_id TEXT NOT NULL,
  lifecycle_state TEXT NOT NULL,
  sent_date DATETIME NOT NULL,
  PRIMARY KEY (stripe_payment_intent_id, lifecycle_state)
);
