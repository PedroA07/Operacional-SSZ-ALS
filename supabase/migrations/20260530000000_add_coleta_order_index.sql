ALTER TABLE trips
ADD COLUMN IF NOT EXISTS coleta_order_index integer;

CREATE INDEX IF NOT EXISTS trips_coleta_order_index_idx ON trips (coleta_order_index) WHERE coleta_order_index IS NOT NULL;
