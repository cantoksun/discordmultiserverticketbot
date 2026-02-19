import { ChatInputCommandInteraction, TextChannel, PermissionFlagsBits } from 'discord.js';
import { IInteractionHandler } from '../../interfaces/discord/handlers/i-interaction-handler';
import { IGuildConfigRepository } from '../../domain/repositories/i-guild-config-repository';
import { ITicketRepository } from '../../domain/repositories/i-ticket-repository';
import logger from '../../core/logger';

export class MemberCommandHandler implements IInteractionHandler {
    constructor(
        private guildRepo: IGuildConfigRepository,
        private ticketRepo: ITicketRepository
    ) { }

    async handle(interaction: ChatInputCommandInteraction): Promise<void> {
        if (!interaction.guildId || !interaction.channelId) return;

        const subcommand = interaction.options.getSubcommand();
        const user = interaction.options.getUser('user', true);

        // 1. Check if it's a ticket channel
        const ticket = await this.ticketRepo.findByChannelId(interaction.channelId);
        if (!ticket) {
            await interaction.reply({ content: 'This command can only be used inside a ticket channel.', ephemeral: true });
            return;
        }

        // 2. Permission Check (Support/Admin only)
        const config = await this.guildRepo.findByGuildId(interaction.guildId);
        const member = await interaction.guild?.members.fetch(interaction.user.id);
        const hasrole = member?.roles.cache.some(r => config?.support_role_ids.includes(r.id) || (config?.admin_role_ids || []).includes(r.id));

        if (!hasrole && !member?.permissions.has(PermissionFlagsBits.Administrator)) {
            await interaction.reply({ content: 'You do not have permission to manage ticket members.', ephemeral: true });
            return;
        }

        const channel = interaction.channel as TextChannel;

        try {
            if (subcommand === 'add') {
                await channel.permissionOverwrites.edit(user.id, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true
                });
                await interaction.reply({ content: `Successfully added <@${user.id}> to the ticket.` });
            } else if (subcommand === 'remove') {
                await channel.permissionOverwrites.delete(user.id);
                await interaction.reply({ content: `Successfully removed <@${user.id}> from the ticket.` });
            }
        } catch (error) {
            logger.error('Failed to manage member permissions', error);
            await interaction.reply({ content: 'Failed to update channel permissions.', ephemeral: true });
        }
    }
}
