-- Idempotent PostGIS setup and spatial indexes.
-- Run after every prisma migrate deploy via postmigrate script.
-- Safe to re-run: IF NOT EXISTS prevents duplicate errors.

-- 1. Enable PostGIS extension (idempotent)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. GIST index on Company.location (per D-04 — enables ST_DWithin for company search)
CREATE INDEX IF NOT EXISTS "company_location_idx"
  ON "Company" USING GIST ("location");

-- 3. GIST index on WasherProfile.current_location (enables washer proximity queries)
CREATE INDEX IF NOT EXISTS "washer_location_idx"
  ON "WasherProfile" USING GIST ("current_location");

-- 4. GIST index on Order.service_location (for on-site orders)
CREATE INDEX IF NOT EXISTS "order_service_location_idx"
  ON "Order" USING GIST ("service_location");
