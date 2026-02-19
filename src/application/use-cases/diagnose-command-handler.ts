import { ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { IGuildConfigRepository } from '../../domain/repositories/i-guild-config-repository';
import { ITicketRepository } from '../../domain/repositories/i-ticket-repository';
import { IJobQueue } from '../../domain/services/i-job-queue';
import logger from '../../core/logger';
import { EmbedFactory } from '../../shared/utils/embed-factory';

export class DiagnoseCommandHandler {
    constructor(
        private guildRepo: IGuildConfigRepository,
        private ticketRepo: ITicketRepository,
        private jobQueue: IJobQueue
    ) { }

    async handle(interaction: ChatInputCommandInteraction): Promise<void> {
        if (!interaction.guild) return;

        await interaction.deferReply({ ephemeral: true });

        const guild = interaction.guild;
        const botMember = await guild.members.fetchMe();

        // 1. Permission Checks
        const requiredPerms = [
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ManageRoles,
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles
        ];

        const missingPerms = requiredPerms.filter(p => !botMember.permissions.has(p));

        // 2. Config Check
        const config = await this.guildRepo.findByGuildId(guild.id);

        // 3. Queue Stats
        const queueSize = this.jobQueue.size(guild.id);
        const openTickets = await this.ticketRepo.countOpenTickets(guild.id);

        // Build Report
        const embed = new EmbedBuilder()
            .setTitle(`🩺 System Diagnosis: ${guild.name}`)
            .setColor(missingPerms.length > 0 || !config ? '#ED4245' : '#57F287')
            .setTimestamp();

        // Permissions
        if (missingPerms.length > 0) {
            embed.addFields({
                name: '❌ Missing Permissions',
                value: missingPerms.map(p => `\`${p.toString()}\``).join(', ')
            });
        } else {
            embed.addFields({ name: '✅ Permissions', value: 'All required permissions available.' });
        }

        // Config
        if (config) {
            embed.addFields(
                { name: '✅ Config Found', value: `Enabled: \`${config.enabled}\`\nTicket Types: \`${Object.keys(config.ticket_types as object).length}\``, inline: true },
                { name: '📊 Stats', value: `Open Tickets: \`${openTickets}\`\nQueue Size: \`${queueSize}\``, inline: true }
            );

            // Check Log Channel existence
            if (config.log_channel_id) {
                const logCh = guild.channels.cache.get(config.log_channel_id);
                if (!logCh) {
                    embed.addFields({ name: '⚠️ Log Channel Issue', value: 'Log channel configured but not found (deleted?).' });
                } else if (!logCh.permissionsFor(botMember).has(PermissionFlagsBits.SendMessages)) {
                    embed.addFields({ name: '⚠️ Log Channel Issue', value: 'Cannot send messages to log channel.' });
                }
            }
        } else {
            embed.addFields({ name: '❌ Config Missing', value: 'Run `/ticket setup` to initialize.' });
        }

        await interaction.editReply({ embeds: [embed] });
    }
}
