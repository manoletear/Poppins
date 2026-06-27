ALTER TABLE suscripciones
  ADD COLUMN IF NOT EXISTS last_flow_event_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_suscripciones_last_flow_event
  ON suscripciones (last_flow_event_id)
  WHERE last_flow_event_id IS NOT NULL;
