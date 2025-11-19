-- AlterTable
ALTER TABLE "admin_users" 
ADD COLUMN IF NOT EXISTS "password" TEXT,
ADD COLUMN IF NOT EXISTS "email_verified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE IF NOT EXISTS "verification_tokens" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "admin_id" VARCHAR(30) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "verification_tokens_token_idx" ON "verification_tokens"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "verification_tokens_admin_id_idx" ON "verification_tokens"("admin_id");

-- AddForeignKey
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'verification_tokens_admin_id_fkey'
  ) THEN
    ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_admin_id_fkey" 
    FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
