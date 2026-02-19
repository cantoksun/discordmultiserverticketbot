import { StringSelectMenuInteraction, ModalSubmitInteraction, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonInteraction, MessageFlags } from 'discord.js';
import { IInteractionHandler } from './i-interaction-handler';
import { IGuildConfigRepository } from '../../../domain/repositories/i-guild-config-repository';
import { TicketService } from '../../../application/services/ticket-service';
import { TicketTypeConfig } from '../../../domain/types';
import { findTicketTypeConfig } from '../../../shared/utils/ticket-utils';
import logger from '../../../core/logger';
import { getRandomMessage, LoadingMessages, formatSuccessMessage, ErrorMessages } from '../../../shared/utils/message-utils';
import { t } from '../../../shared/utils/i18n';


export class PanelSelectHandler implements IInteractionHandler {
    constructor(private guildRepo: IGuildConfigRepository) { }

    async handle(interaction: StringSelectMenuInteraction): Promise<void> {
        if (interaction.customId !== 'panel_select_type') return;

        const typeKey = interaction.values[0];
        const config = await this.guildRepo.findByGuildId(interaction.guildId!);
        const lang = (config as any)?.language || 'en';
        logger.info(`[PanelSelect] Selection: ${typeKey}`, { guildId: interaction.guildId });

        if (!config || !config.ticket_types) {
            logger.error('[PanelSelect] Config or types missing');
            await interaction.reply({ content: t(lang, 'ticket.config_error'), flags: MessageFlags.Ephemeral });
            return;
        }


        const typeConfig = findTicketTypeConfig(config.ticket_types, typeKey);
        if (!typeConfig) {
            logger.error(`[PanelSelect] Type config not found for key: ${typeKey}`, { types: config.ticket_types });
            await interaction.reply({ content: t(lang, 'ticket.invalid_type'), flags: MessageFlags.Ephemeral });
            return;
        }

        // Show Modal
        const modal = new ModalBuilder()
            .setCustomId(`modal_create_ticket:${typeKey}`)
            .setTitle(t(lang, 'ticket.open_title', { type: typeConfig.label }));

        const fields = typeConfig.modalFields || [
            { customId: 'issue_desc', label: t(lang, 'ticket.default_desc'), style: 'PARAGRAPH', required: true }
        ];


        const rows = fields.map(field => {
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

        // Add components to modal
        modal.addComponents(rows);

        await interaction.showModal(modal);
    }
}

export class PanelButtonHandler implements IInteractionHandler {
    constructor(
        private guildRepo: IGuildConfigRepository,
        private ticketService: TicketService
    ) { }

    async handle(interaction: ButtonInteraction): Promise<void> {
        if (!interaction.customId.startsWith('panel_open_type:')) return;

        const typeKey = interaction.customId.split(':')[1];
        const config = await this.guildRepo.findByGuildId(interaction.guildId!);
        const lang = (config as any)?.language || 'en';

        logger.info(`[PanelButton] Click: ${typeKey}`, { guildId: interaction.guildId });

        if (!config || !config.ticket_types) {
            await interaction.reply({ content: t(lang, 'ticket.config_error'), flags: MessageFlags.Ephemeral });
            return;
        }

        const typeConfig = findTicketTypeConfig(config.ticket_types, typeKey);
        if (!typeConfig) {
            await interaction.reply({ content: t(lang, 'ticket.invalid_type'), flags: MessageFlags.Ephemeral });
            return;
        }


        // Check if modal is enabled for this type
        const modalEnabled = typeConfig.modalEnabled !== false; // Default: true

        if (!modalEnabled) {
            // Modal is disabled - create ticket directly

            // 1. Defer Reply immediately with a creative message
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            await interaction.editReply({ content: getRandomMessage(LoadingMessages) });

            try {
                const channelId = await this.ticketService.createTicket(
                    interaction.guildId!,
                    interaction.user.id,
                    typeKey,
                    {} // No modal data
                );

                // 2. Success with creative message
                await interaction.editReply({ content: formatSuccessMessage(channelId) });
            } catch (error) {
                logger.error('[PanelButton] Direct ticket creation failed', error);
                // 3. Friendly error message
                await interaction.editReply({
                    content: getRandomMessage(ErrorMessages) + `\n(${error instanceof Error ? error.message : 'Unknown error'})`
                });
            }
            return;
        }

        // Show Modal
        const modal = new ModalBuilder()
            .setCustomId(`modal_create_ticket:${typeKey}`)
            .setTitle(t(lang, 'ticket.open_title', { type: typeConfig.label }));

        const fields = typeConfig.modalFields || [
            { customId: 'issue_desc', label: t(lang, 'ticket.default_desc'), style: 'PARAGRAPH', required: true }
        ];


        const rows = fields.map(field => {
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
        await interaction.showModal(modal);
    }
}

export class TicketCreateModalHandler implements IInteractionHandler {
    constructor(
        private ticketService: TicketService,
        private guildRepo: IGuildConfigRepository
    ) { }


    async handle(interaction: ModalSubmitInteraction): Promise<void> {
        if (!interaction.customId.startsWith('modal_create_ticket:')) return;

        const typeKey = interaction.customId.split(':')[1];
        const guildId = interaction.guildId!;


        const userId = interaction.user.id;
        const config = await this.guildRepo.findByGuildId(guildId);
        const lang = (config as any)?.language || 'en';

        logger.info(`[TicketCreate] Modal Submitted - Type: ${typeKey} User: ${userId} Guild: ${guildId}`);
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });


        // Collect Input Data
        const inputData: Record<string, string> = {};
        interaction.fields.fields.forEach((field: any) => {
            inputData[field.customId] = field.value;
        });

        try {
            const channelId = await this.ticketService.createTicket(
                guildId,
                userId,
                typeKey,
                inputData
            );

            logger.info(`[TicketCreate] Success - Ticket Channel: ${channelId} User: ${userId}`);
            await interaction.editReply({ content: t(lang, 'ticket.created', { channel: `<#${channelId}>` }) });
        } catch (error: any) {
            logger.error(`[TicketCreate] Failed - User: ${userId} Error: ${error.message}`, {
                typeKey,
                inputData,
                stack: error.stack
            });
            await interaction.editReply({ content: t(lang, 'ticket.create_failed', { error: error.message }) });
        }

    }
}
