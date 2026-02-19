import { ChatInputCommandInteraction } from 'discord.js';
import { IInteractionHandler } from '../../interfaces/discord/handlers/i-interaction-handler';
import { IGuildConfigRepository } from '../../domain/repositories/i-guild-config-repository';
import logger from '../../core/logger';

export class TypeCommandHandler implements IInteractionHandler {
    constructor(private guildRepo: IGuildConfigRepository) { }

    async handle(interaction: ChatInputCommandInteraction): Promise<void> {
        if (!interaction.guildId) return;

        const subcommand = interaction.options.getSubcommand();
        const config = await this.guildRepo.findByGuildId(interaction.guildId);

        if (!config) {
            await interaction.reply({ content: 'Guild config not found.', ephemeral: true });
            return;
        }

        const ticketTypes = (config.ticket_types as any) || {};

        if (subcommand === 'add') {
            const id = interaction.options.getString('id', true).toLowerCase();
            const label = interaction.options.getString('label', true);
            const emoji = interaction.options.getString('emoji');

            ticketTypes[id] = {
                label,
                emoji,
                modalFields: [
                    { customId: 'issue_desc', label: 'Describe your issue', style: 'PARAGRAPH', required: true }
                ]
            };

            await this.guildRepo.createOrUpdate(interaction.guildId, { ticket_types: ticketTypes });
            await interaction.reply({ content: `Successfully added ticket type: **${label}** (\`${id}\`)`, ephemeral: true });

        } else if (subcommand === 'edit') {
            const id = interaction.options.getString('id', true).toLowerCase();
            const label = interaction.options.getString('label');
            const emoji = interaction.options.getString('emoji');

            if (!ticketTypes[id]) {
                await interaction.reply({ content: `Ticket type \`${id}\` not found.`, ephemeral: true });
                return;
            }

            if (label) ticketTypes[id].label = label;
            if (emoji) ticketTypes[id].emoji = emoji;

            await this.guildRepo.createOrUpdate(interaction.guildId, { ticket_types: ticketTypes });
            await interaction.reply({ content: `Successfully updated ticket type: \`${id}\``, ephemeral: true });

        } else if (subcommand === 'remove') {
            const id = interaction.options.getString('id', true).toLowerCase();

            if (!ticketTypes[id]) {
                await interaction.reply({ content: 'Ticket type not found.', ephemeral: true });
                return;
            }

            delete ticketTypes[id];

            await this.guildRepo.createOrUpdate(interaction.guildId, { ticket_types: ticketTypes });
            await interaction.reply({ content: `Successfully removed ticket type: \`${id}\``, ephemeral: true });
        }
    }
}
