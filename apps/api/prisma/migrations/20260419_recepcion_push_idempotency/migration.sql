-- Track when a reception has been pushed to OrderEat to prevent double-sends
ALTER TABLE "recepciones" ADD COLUMN IF NOT EXISTS "pushed_to_ordereat_at" TIMESTAMP(3);
ALTER TABLE "recepciones" ADD COLUMN IF NOT EXISTS "pushed_to_ordereat_by" TEXT;
