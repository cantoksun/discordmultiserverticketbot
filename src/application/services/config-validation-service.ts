import { Client } from 'discord.js';
import { IGuildConfigRepository } from '../../domain/repositories/i-guild-config-repository';
import logger from '../../core/logger';

export class ConfigValidationService {
    constructor(
        private client: Client,
        private guildRepo: IGuildConfigRepository
    ) { }

    async validateAllGuilds() {
        logger.info('Starting Global Configuration Validation...');
        const guilds = this.client.guilds.cache;

        for (const [guildId, guild] of guilds) {
            try {
                await this.validateGuild(guildId);
            } catch (error) {
                logger.error(`Validation failed for guild ${guildId}:`, error);
            }
        }
        logger.info('Configuration Validation Complete.');
    }

    async validateGuild(guildId: string) {
        const config = await this.guildRepo.findByGuildId(guildId);
        if (!config) {
            logger.warn(`No configuration found for guild ${guildId}. Skipping validation.`);
            return;
        }

        const guild = await this.client.guilds.fetch(guildId).catch(() => null);
        if (!guild) {
            logger.warn(`Could not fetch guild ${guildId}. It might have removed the bot.`);
            return;
        }

        const issues: string[] = [];

        // 1. Check Channels
        if (config.log_channel_id) {
            const logChannel = await guild.channels.fetch(config.log_channel_id).catch(() => null);
            if (!logChannel) issues.push(`Log channel (${config.log_channel_id}) is missing or inaccessible.`);
        }

        if (config.panel_channel_id) {
            const panelChannel = await guild.channels.fetch(config.panel_channel_id).catch(() => null);
            if (!panelChannel) issues.push(`Panel channel (${config.panel_channel_id}) is missing or inaccessible.`);
        }

        const defaultCategoryId = (config.ticket_category_ids as any)?.default;
        if (defaultCategoryId) {
            const category = await guild.channels.fetch(defaultCategoryId).catch(() => null);
            if (!category) issues.push(`Default ticket category (${defaultCategoryId}) is missing.`);
        }

        // 2. Check Roles
        for (const roleId of config.support_role_ids) {
            const role = await guild.roles.fetch(roleId).catch(() => null);
            if (!role) issues.push(`Support role (${roleId}) is missing.`);
        }

        for (const roleId of config.admin_role_ids) {
            const role = await guild.roles.fetch(roleId).catch(() => null);
            if (!role) issues.push(`Admin role (${roleId}) is missing.`);
        }

        if (issues.length > 0) {
            logger.warn(`[Validation] Config issues detected in guild ${guild.name} (${guildId}):`, { issues });
        } else {
            logger.info(`[Validation] Configuration for guild ${guild.name} is healthy.`);
        }
    }
}
