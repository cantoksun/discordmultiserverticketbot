import { ButtonInteraction, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { IGuildConfigRepository } from '../../domain/repositories/i-guild-config-repository';
import { findTicketTypeConfig } from '../../shared/utils/ticket-utils';
import logger from '../../core/logger';

export class LegacyInteractionService {
    constructor(private guildRepo: IGuildConfigRepository) { }

    /**
     * Checks if the interaction is a known legacy format.
     */
    isLegacy(customId: string): boolean {
        // Format: timestamp:panel:create:type:...
        // Example: 1250955614423879782:panel:open:destek:15347789:b94dfe011b
        return customId.includes(':panel:open:');
    }

    /**
     * Handles the legacy interaction. Returns true if handled, false otherwise.
     */
    async handle(interaction: ButtonInteraction): Promise<boolean> {
        if (!this.isLegacy(interaction.customId)) return false;

        logger.warn(`[LegacyInteractionService] Processing legacy interaction: ${interaction.customId} User: ${interaction.user.id}`);

        try {
            if (interaction.customId.includes(':panel:open:')) {
                await this.handlePanelOpen(interaction);
                return true;
            }
        } catch (error) {
            logger.error('[LegacyInteractionService] Failed to handle interaction', error);
            // Don't reply here, let the caller decide or it might have already replied
        }

        return false;
    }

    private async handlePanelOpen(interaction: ButtonInteraction) {
        const parts = interaction.customId.split(':');
        // Extract type key based on observed format
        // 1250955614423879782:panel:open:destek:15347789:b94dfe011b
        // [0]: timestamp/id?
        // [1]: panel
        // [2]: open
        // [3]: type (destek)
        const typeKey = parts[3];

        if (!interaction.guildId) return;

        const config = await this.guildRepo.findByGuildId(interaction.guildId);
        if (!config || !config.ticket_types) {
            await interaction.reply({ content: 'configuration error (legacy adapter).', ephemeral: true });
            return;
        }

        // Removed inline import
        const typeConfig = findTicketTypeConfig(config.ticket_types, typeKey);
        if (!typeConfig) {
            await interaction.reply({ content: `invalid ticket type (legacy): ${typeKey}`, ephemeral: true });
            return;
        }

        // Show Modal
        const modal = new ModalBuilder()
            .setCustomId(`modal_create_ticket:${typeKey}`)
            .setTitle(`open ticket: ${typeConfig.label || typeKey}`);

        const fields = typeConfig.modalFields || [];
        if (fields.length > 0) {
            const rows = fields.map((field: any) => {
                const input = new TextInputBuilder()
                    .setCustomId(field.customId)
                    .setLabel(field.label)
                    .setStyle(field.style === 'PARAGRAPH' ? TextInputStyle.Paragraph : TextInputStyle.Short)
                    .setRequired(field.required)
                    .setPlaceholder(field.placeholder || '');

                if (field.minLength) input.setMinLength(field.minLength);
                if (field.maxLength) input.setMaxLength(field.maxLength);

                return new ActionRowBuilder<TextInputBuilder>().addComponents(input);
            });
            modal.addComponents(rows);
        } else {
            // Default fallback if no fields defined
            const input = new TextInputBuilder()
                .setCustomId('reason')
                .setLabel('reason')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);
            const row = new ActionRowBuilder<TextInputBuilder>().addComponents(input);
            modal.addComponents(row);
        }

        await interaction.showModal(modal);
    }
}
