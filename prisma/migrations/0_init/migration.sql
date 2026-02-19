-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "guild_configs" (
    "guild_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "panel_channel_id" TEXT,
    "log_channel_id" TEXT,
    "support_role_ids" TEXT[],
    "admin_role_ids" TEXT[],
    "cooldown_seconds" INTEGER NOT NULL DEFAULT 60,
    "naming_scheme" TEXT NOT NULL DEFAULT 'ticket-{seq}',
    "auto_close_hours" INTEGER,
    "ticket_types" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "blacklisted_user_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dm_notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
    "max_open_tickets_per_user" INTEGER NOT NULL DEFAULT 1,
    "ticket_category_ids" JSONB NOT NULL DEFAULT '[]',
    "ticket_seq" INTEGER NOT NULL DEFAULT 0,
    "transcript_format" TEXT NOT NULL DEFAULT 'md',
    "log_mode" TEXT NOT NULL DEFAULT 'file',
    "panel_description" TEXT,
    "panel_footer" TEXT,
    "panel_title" TEXT,
    "panel_timestamp" BOOLEAN NOT NULL DEFAULT true,
    "ticket_welcome_content" TEXT,
    "ticket_welcome_title" TEXT,
    "ticket_welcome_mode" TEXT NOT NULL DEFAULT 'embed',
    "panel_mode" TEXT NOT NULL DEFAULT 'embed',
    "audit_log_enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "guild_configs_pkey" PRIMARY KEY ("guild_id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "uuid" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "type_key" TEXT NOT NULL,
    "opener_id" TEXT NOT NULL,
    "claimed_by" TEXT,
    "channel_id" TEXT NOT NULL,
    "close_reason" TEXT,
    "close_by" TEXT,
    "transcript_msg_id" TEXT,
    "transcript_url" TEXT,
    "transcript_sha256" TEXT,
    "transcript_size_bytes" INTEGER,
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "priority" TEXT NOT NULL DEFAULT 'low',
    "status" TEXT NOT NULL DEFAULT 'open',

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("uuid")
);

-- CreateIndex
CREATE UNIQUE INDEX "guild_configs_guild_id_key" ON "guild_configs"("guild_id");

-- CreateIndex
CREATE INDEX "tickets_guild_id_idx" ON "tickets"("guild_id");

-- CreateIndex
CREATE INDEX "tickets_opener_id_idx" ON "tickets"("opener_id");

-- CreateIndex
CREATE INDEX "tickets_status_idx" ON "tickets"("status");

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guild_configs"("guild_id") ON DELETE RESTRICT ON UPDATE CASCADE;

