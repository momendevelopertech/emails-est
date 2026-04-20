CREATE TABLE IF NOT EXISTS "sender_email_accounts" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sender_name" TEXT NOT NULL,
    "sender_email" TEXT NOT NULL,
    "mail_from" TEXT NOT NULL,
    "smtp_host" TEXT NOT NULL,
    "smtp_port" INTEGER NOT NULL DEFAULT 587,
    "smtp_secure" BOOLEAN NOT NULL DEFAULT false,
    "smtp_require_tls" BOOLEAN NOT NULL DEFAULT true,
    "smtp_username" TEXT NOT NULL,
    "smtp_password" TEXT NOT NULL,
    "smtp_daily_limit" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sender_email_accounts_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "email_settings"
ADD COLUMN IF NOT EXISTS "active_sender_account_id" TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'email_settings_active_sender_account_id_fkey'
    ) THEN
        ALTER TABLE "email_settings"
        ADD CONSTRAINT "email_settings_active_sender_account_id_fkey"
        FOREIGN KEY ("active_sender_account_id") REFERENCES "sender_email_accounts"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
