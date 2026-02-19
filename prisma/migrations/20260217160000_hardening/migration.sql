-- Database Hardening: Constraints

-- 1. Enum Constraints for Tickets
ALTER TABLE "tickets" ADD CONSTRAINT "check_status_valid" CHECK ("status" IN ('open', 'closed', 'locked'));
ALTER TABLE "tickets" ADD CONSTRAINT "check_priority_valid" CHECK ("priority" IN ('low', 'medium', 'high', 'urgent'));

-- 2. Positive Number Constraints for Guild Configs
ALTER TABLE "guild_configs" ADD CONSTRAINT "check_max_tickets_positive" CHECK ("max_open_tickets_per_user" >= 0);
ALTER TABLE "guild_configs" ADD CONSTRAINT "check_cooldown_positive" CHECK ("cooldown_seconds" >= 0);
ALTER TABLE "guild_configs" ADD CONSTRAINT "check_autoclose_positive" CHECK ("auto_close_hours" IS NULL OR "auto_close_hours" > 0);
