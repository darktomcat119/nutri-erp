-- Add cafeteriaId (OrderEat branch ID) — was in schema but missing from earlier migrations
ALTER TABLE "sucursales" ADD COLUMN IF NOT EXISTS "cafeteria_id" TEXT;

-- Add encrypted OrderEat token columns to sucursales
ALTER TABLE "sucursales" ADD COLUMN IF NOT EXISTS "ordereat_token_enc" TEXT;
ALTER TABLE "sucursales" ADD COLUMN IF NOT EXISTS "ordereat_token_last4" TEXT;
ALTER TABLE "sucursales" ADD COLUMN IF NOT EXISTS "ordereat_token_updated_at" TIMESTAMP(3);
ALTER TABLE "sucursales" ADD COLUMN IF NOT EXISTS "ordereat_token_updated_by" TEXT;
