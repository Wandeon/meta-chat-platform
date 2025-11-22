-- CreateEnum
CREATE TYPE "TenantUserRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- DropForeignKey
ALTER TABLE "analytics_daily" DROP CONSTRAINT "analytics_daily_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "pending_tenant_setups" DROP CONSTRAINT "pending_tenant_setups_admin_id_fkey";

-- DropForeignKey
ALTER TABLE "usage_tracking" DROP CONSTRAINT "usage_tracking_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "verification_tokens" DROP CONSTRAINT "verification_tokens_admin_id_fkey";

-- DropIndex
DROP INDEX "tenants_widget_config_idx";

-- AlterTable
ALTER TABLE "admin_users" ALTER COLUMN "email_verified" SET NOT NULL;

-- AlterTable
ALTER TABLE "analytics_daily" ALTER COLUMN "tenant_id" SET DATA TYPE TEXT,
ALTER COLUMN "total_conversations" SET NOT NULL,
ALTER COLUMN "total_messages" SET NOT NULL,
ALTER COLUMN "active_users" SET NOT NULL,
ALTER COLUMN "documents_queried" SET NOT NULL,
ALTER COLUMN "api_calls" SET NOT NULL,
ALTER COLUMN "rag_queries" SET NOT NULL,
ALTER COLUMN "conversations_resolved" SET NOT NULL,
ALTER COLUMN "conversations_escalated" SET NOT NULL,
ALTER COLUMN "error_count" SET NOT NULL,
ALTER COLUMN "widget_impressions" SET NOT NULL,
ALTER COLUMN "widget_conversations" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "invoices" ALTER COLUMN "tenant_id" SET DATA TYPE TEXT,
ALTER COLUMN "stripe_invoice_id" SET DATA TYPE TEXT,
ALTER COLUMN "currency" SET NOT NULL,
ALTER COLUMN "currency" SET DATA TYPE TEXT,
ALTER COLUMN "status" SET DATA TYPE TEXT,
ALTER COLUMN "invoice_pdf" SET DATA TYPE TEXT,
ALTER COLUMN "hosted_invoice_url" SET DATA TYPE TEXT,
ALTER COLUMN "period_start" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "period_end" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "message_metrics" ALTER COLUMN "conversation_id" SET DATA TYPE TEXT,
ALTER COLUMN "message_id" SET DATA TYPE TEXT,
ALTER COLUMN "tenant_id" SET DATA TYPE TEXT,
ALTER COLUMN "sent_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "response_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "rag_used" SET NOT NULL,
ALTER COLUMN "rag_top_document_id" SET DATA TYPE TEXT,
ALTER COLUMN "escalated" SET NOT NULL,
ALTER COLUMN "error_occurred" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenants" ALTER COLUMN "widget_config" SET NOT NULL,
ALTER COLUMN "stripe_customer_id" SET DATA TYPE TEXT,
ALTER COLUMN "stripe_subscription_id" SET DATA TYPE TEXT,
ALTER COLUMN "subscription_status" SET NOT NULL,
ALTER COLUMN "subscription_status" SET DATA TYPE TEXT,
ALTER COLUMN "current_plan_id" SET NOT NULL,
ALTER COLUMN "current_plan_id" SET DATA TYPE TEXT,
ALTER COLUMN "subscription_end_date" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "usage_tracking" ALTER COLUMN "tenant_id" SET DATA TYPE TEXT,
ALTER COLUMN "period_start" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "period_end" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "conversations_count" SET NOT NULL,
ALTER COLUMN "documents_count" SET NOT NULL,
ALTER COLUMN "team_members_count" SET NOT NULL,
ALTER COLUMN "messages_count" SET NOT NULL,
ALTER COLUMN "api_calls_count" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "verification_tokens" ADD COLUMN     "tenant_user_id" TEXT,
ALTER COLUMN "token" SET DATA TYPE TEXT,
ALTER COLUMN "admin_id" SET DATA TYPE TEXT,
ALTER COLUMN "expires_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "used" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "widget_analytics" ALTER COLUMN "tenant_id" SET DATA TYPE TEXT,
ALTER COLUMN "event_type" SET DATA TYPE TEXT,
ALTER COLUMN "session_id" SET DATA TYPE TEXT,
ALTER COLUMN "user_id" SET DATA TYPE TEXT,
ALTER COLUMN "metadata" SET NOT NULL,
ALTER COLUMN "metadata" SET DATA TYPE JSONB,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- DropTable
DROP TABLE "pending_tenant_setups";

-- CreateTable
CREATE TABLE "tenant_users" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "role" "TenantUserRole" NOT NULL DEFAULT 'OWNER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "tenant_user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_users_email_key" ON "tenant_users"("email");

-- CreateIndex
CREATE INDEX "tenant_users_tenantId_idx" ON "tenant_users"("tenantId");

-- CreateIndex
CREATE INDEX "tenant_users_email_idx" ON "tenant_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_token_idx" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_tenant_user_id_idx" ON "password_reset_tokens"("tenant_user_id");

-- CreateIndex
CREATE INDEX "idx_verification_tokens_tenant_user_id" ON "verification_tokens"("tenant_user_id");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_tracking" ADD CONSTRAINT "usage_tracking_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_tenant_user_id_fkey" FOREIGN KEY ("tenant_user_id") REFERENCES "tenant_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_tenant_user_id_fkey" FOREIGN KEY ("tenant_user_id") REFERENCES "tenant_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_daily" ADD CONSTRAINT "analytics_daily_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_metrics" ADD CONSTRAINT "message_metrics_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_metrics" ADD CONSTRAINT "message_metrics_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "widget_analytics" ADD CONSTRAINT "widget_analytics_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

