import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, Client, PermissionFlagsBits, TextChannel, User } from 'discord.js';
import { IGuildConfigRepository } from '../../domain/repositories/i-guild-config-repository';
import { ITicketRepository } from '../../domain/repositories/i-ticket-repository';
import { IJobQueue } from '../../domain/services/i-job-queue';
import { TicketTypeConfig } from '../../domain/types';
import logger from '../../core/logger';
import { SignatureService } from '../../shared/security/signature-service';
import { EmbedFactory } from '../../shared/utils/embed-factory';
import { findTicketTypeConfig } from '../../shared/utils/ticket-utils';
import { AuditLogService } from './audit-log-service';

export class TicketService {
    constructor(
        private client: Client,
        private guildRepo: IGuildConfigRepository,
        private ticketRepo: ITicketRepository,
        private jobQueue: IJobQueue,
        private signer: SignatureService,
        private auditLog: AuditLogService
    ) { }

    async createTicket(guildId: string, userId: string, typeKey: string, inputData: Record<string, string>): Promise<string> {
        const startTime = Date.now();
        // 1. Check Cooldown & Blacklist
        const config = await this.guildRepo.findByGuildId(guildId);
        if (!config) throw new Error('Guild configuration not found.');
        if (!config.enabled) throw new Error('Ticket system is currently disabled.');

        // Blacklist check
        const blacklist = (config as any).blacklisted_user_ids as string[] || [];
        if (blacklist.includes(userId)) {
            throw new Error('You are blacklisted from opening tickets in this server.');
        }

        const lastTicket = await this.ticketRepo.findLastByOpener(guildId, userId);
        if (lastTicket && config.cooldown_seconds > 0) {
            const now = new Date();
            const diffSeconds = (now.getTime() - lastTicket.created_at.getTime()) / 1000;
            if (diffSeconds < config.cooldown_seconds) {
                const remaining = Math.ceil(config.cooldown_seconds - diffSeconds);
                throw new Error(`Please wait ${remaining} seconds before opening another ticket.`);
            }
        }

        // 1b. Check Open Ticket Limit (Hard Requirement: 1 per user by default)
        const openTickets = await this.ticketRepo.findOpenByOpener(guildId, userId);
        if (openTickets.length >= config.max_open_tickets_per_user) {
            throw new Error(`You already have an open ticket. Limit is ${config.max_open_tickets_per_user}.`);
        }

        // 2. Validate Type (Enhanced for Array/Object)
        const typeConfig = findTicketTypeConfig(config.ticket_types, typeKey) || findTicketTypeConfig(config.ticket_types, 'default');
        if (!typeConfig) throw new Error('Invalid ticket type.');

        const ticketId = (await this.ticketRepo.create({
            guild_id: guildId,
            channel_id: 'PENDING', // Temporary placeholder
            opener_id: userId,
            type_key: typeKey,
            status: 'open',
        })).ticket_id;

        const seq = await this.guildRepo.incrementTicketSeq(guildId);

        let safeUserName = 'user';
        try {
            const user = await this.client.users.fetch(userId);
            // Sanitize: lowercase, alphanumeric and dashes only, remove consecutive dashes
            safeUserName = user.username
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '') || 'user';
        } catch (e) {
            logger.warn(`Failed to fetch user ${userId} for naming`, e);
        }

        const channelName = config.naming_scheme
            .replace('{type}', typeConfig.label.toLowerCase().replace(/\s+/g, '-'))
            .replace('{type_key}', typeKey.toLowerCase())
            .replace('{seq}', seq.toString())
            .replace('{user}', safeUserName)
            .replace('{id}', ticketId.split('-')[0]); // Short ID prefix

        // 4. Create Channel via Queue
        let channelId: string | undefined;

        await this.jobQueue.add(guildId, async () => {
            const guild = await this.client.guilds.fetch(guildId);
            if (!guild) return;

            // Determine Parent Category
            // Hierarchy: Type Specific > Default Config > None
            const defaultCategory = (config.ticket_category_ids as any)?.default;
            let parent = typeConfig.categoryId || defaultCategory;

            try {
                const ch = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    parent: parent as string,
                    topic: `Ticket #${seq} | Type: ${typeConfig.label} | Opener: ${userId}`,
                    permissionOverwrites: [
                        {
                            id: guild.id, // @everyone
                            deny: [PermissionFlagsBits.ViewChannel],
                        },
                        {
                            id: userId, // Opener
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                        },
                        ...config.support_role_ids.map((roleId: string) => ({
                            id: roleId,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                        })),
                        {
                            id: this.client.user!.id, // Bot itself
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AttachFiles]
                        }
                    ]
                });
                channelId = ch.id;
            } catch (error) {
                logger.error('Failed to create channel in queue', error);
            }
        });

        if (!channelId) {
            throw new Error('Failed to create channel (Queue error or timeout).');
        }

        // 5. Update DB Entry with Channel ID
        await this.ticketRepo.update(ticketId, {
            channel_id: channelId,
        });

        // 6. Send Initial Message
        await this.sendWelcomeMessage(channelId, ticketId, guildId, userId, typeConfig, inputData, config);

        // 7. Audit Log
        await this.auditLog.logTicketCreate(guildId, ticketId, userId, channelId);

        // 8. DM Notification (Best Effort)
        if (config.dm_notifications_enabled) {
            try {
                const user = await this.client.users.fetch(userId);
                await user.send({
                    content: `your ticket **#${seq}** has been created in ${config.naming_scheme}.`,
                    embeds: [EmbedFactory.create('ticket created', `you can view it here: <#${channelId}>`)]
                });
            } catch (e) {
                logger.warn(`Failed to DM user ${userId}`, e);
            }
        }

        const latencyMs = Date.now() - startTime;
        logger.info('Ticket Action Log', {
            guild_id: guildId,
            ticket_id: ticketId,
            user_id: userId,
            action: 'ticket_create',
            latency_ms: latencyMs
        });

        return channelId;
    }

    async claimTicket(ticketId: string, staffId: string) {
        const startTime = Date.now();
        const ticket = await this.ticketRepo.findById(ticketId);
        if (!ticket || ticket.claimed_by) return;

        await this.ticketRepo.claimTicket(ticketId, staffId);
        await this.auditLog.logTicketClaim(ticket.guild_id, ticketId, staffId);

        logger.info('Ticket Action Log', {
            guild_id: ticket.guild_id,
            ticket_id: ticketId,
            user_id: staffId,
            action: 'ticket_claim',
            latency_ms: Date.now() - startTime
        });
    }

    async transferTicket(guildId: string, ticketId: string, newUserId: string, executorId: string) {
        const startTime = Date.now();
        // 1. Update DB
        const ticket = await this.ticketRepo.transferTicket(ticketId, newUserId);

        // 2. Audit Log
        await this.auditLog.logTicketTransfer(guildId, ticketId, executorId, newUserId);

        // 3. Update Channel Permissions
        const channel = await this.client.channels.fetch(ticket.channel_id) as TextChannel;
        if (channel) {
            await channel.permissionOverwrites.edit(newUserId, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });

            await channel.send({
                embeds: [EmbedFactory.success(`Ticket transferred to <@${newUserId}> by <@${executorId}>.`)]
            });
        }

        logger.info('Ticket Action Log', {
            guild_id: guildId,
            ticket_id: ticketId,
            user_id: executorId,
            action: 'ticket_transfer',
            latency_ms: Date.now() - startTime
        });
    }

    private async sendWelcomeMessage(
        channelId: string,
        ticketId: string,
        guildId: string,
        userId: string,
        typeConfig: TicketTypeConfig,
        inputData: Record<string, string>,
        config: any // GuildConfig
    ) {
        const channel = await this.client.channels.fetch(channelId) as TextChannel;
        if (!channel) return;

        // Build Description from Input Data
        const fields = Object.entries(inputData).map(([k, v]) => `**${k}:**\n${v}`).join('\n\n');

        // Dynamic Welcome Message
        const rawTitle = typeConfig.welcomeTitle || config.ticket_welcome_title || 'ticket: {type}';
        const welcomeTitle = rawTitle.replace('{type}', typeConfig.label);

        const rawContent = typeConfig.welcomeContent || config.ticket_welcome_content || 'welcome {user}. support will be with you shortly.';
        const welcomeContent = rawContent
            .replace('{user}', `<@${userId}>`)
            .replace('{type}', typeConfig.label);

        const mode = typeConfig.welcomeMode || config.ticket_welcome_mode || 'embed';
        logger.info(`[Ticket] Welcome Mode - Type: ${typeConfig.welcomeMode}, Config: ${config.ticket_welcome_mode}, Final: ${mode}`);

        // Prepare Message Options
        const messageOptions: any = { content: `<@${userId}>`, embeds: [], components: [] };

        if (mode === 'text') {
            // Text Mode: Content + Fields
            messageOptions.content = `${welcomeContent}\n\n${fields}`;
        } else {
            // Embed Mode (Default)
            const embed = EmbedFactory.create(
                welcomeTitle,
                `${welcomeContent}\n\n${fields}`
            );
            messageOptions.embeds = [embed];
        }

        // Buttons
        const closeBtn = new ButtonBuilder()
            .setCustomId(this.signer.sign(guildId, ticketId, 'close'))
            .setLabel('close ticket')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒');

        const claimBtn = new ButtonBuilder()
            .setCustomId(this.signer.sign(guildId, ticketId, 'claim'))
            .setLabel('claim')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🙋‍♂️');

        const transferBtn = new ButtonBuilder()
            .setCustomId(this.signer.sign(guildId, ticketId, 'trans'))
            .setLabel('transfer')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔁');

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(claimBtn, transferBtn, closeBtn);
        messageOptions.components = [row];

        await channel.send(messageOptions);
    }
}
