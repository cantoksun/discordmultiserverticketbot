import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import { IGuildConfigRepository } from '../../domain/repositories/i-guild-config-repository';
import { EmbedFactory } from '../../shared/utils/embed-factory';
import logger from '../../core/logger';

export class AuditLogService {
    constructor(
        private client: Client,
        private guildRepo: IGuildConfigRepository
    ) { }

    async log(guildId: string, title: string, description: string, color: number = 0x5865F2) {
        const config = await this.guildRepo.findByGuildId(guildId);
        if (!config?.log_channel_id) return;

        // Check if audit log is enabled
        const auditLogEnabled = (config as any).audit_log_enabled !== false;
        if (!auditLogEnabled) return;

        try {
            const channel = await this.client.channels.fetch(config.log_channel_id) as TextChannel;
            if (!channel) return;

            const embed = new EmbedBuilder()
                .setTitle(`audit log: ${title}`)
                .setDescription(description)
                .setColor(color)
                .setTimestamp();

            await channel.send({ embeds: [embed] });
        } catch (error) {
            logger.error(`Failed to send audit log for guild ${guildId}`, error);
        }
    }

    async logTicketCreate(guildId: string, ticketId: string, userId: string, channelId: string) {
        await this.log(
            guildId,
            'ticket created',
            `**ticket:** ${ticketId}\n**user:** <@${userId}>\n**channel:** <#${channelId}>`,
            0x57F287 // Green
        );
    }

    async logTicketClaim(guildId: string, ticketId: string, staffId: string) {
        await this.log(
            guildId,
            'ticket claimed',
            `**ticket:** ${ticketId}\n**staff:** <@${staffId}>`,
            0xFEE75C // Yellow
        );
    }

    async logTicketTransfer(guildId: string, ticketId: string, fromId: string, toId: string) {
        await this.log(
            guildId,
            'ticket transferred',
            `**ticket:** ${ticketId}\n**from:** <@${fromId}>\n**to:** <@${toId}>`,
            0x5865F2 // Blue
        );
    }
}
