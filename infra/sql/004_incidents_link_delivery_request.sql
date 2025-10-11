-- Link incidents to delivery_requests for traceability
-- Safe to run multiple times
DO $$
BEGIN
    -- Add column if not exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'incidents' AND column_name = 'delivery_request_id'
    ) THEN
        ALTER TABLE incidents ADD COLUMN delivery_request_id INTEGER;
    END IF;

    -- Optional: add index for filter by delivery_request_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_incidents_delivery_request_id'
    ) THEN
        CREATE INDEX idx_incidents_delivery_request_id ON incidents (delivery_request_id);
    END IF;
END $$;
