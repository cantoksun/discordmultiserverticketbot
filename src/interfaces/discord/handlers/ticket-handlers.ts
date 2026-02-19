import { ButtonInteraction, ModalSubmitInteraction, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionFlagsBits, TextChannel, UserSelectMenuBuilder, UserSelectMenuInteraction, MessageFlags } from 'discord.js';
import { IInteractionHandler } from './i-interaction-handler';
import { ITicketRepository } from '../../../domain/repositories/i-ticket-repository';
import { IGuildConfigRepository } from '../../../domain/repositories/i-guild-config-repository';
import { SignatureService } from '../../../shared/security/signature-service';
import { EmbedFactory } from '../../../shared/utils/embed-factory';
import { TicketService } from '../../../application/services/ticket-service';
import { TranscriptService } from '../../../application/services/transcript-service';
import { LegacyInteractionService } from '../../../application/services/legacy-interaction-service';
import logger from '../../../core/logger';

export class TicketButtonHandler implements IInteractionHandler {
    constructor(
        private ticketRepo: ITicketRepository,
        private guildRepo: IGuildConfigRepository,
        private signer: SignatureService,
        private ticketService: TicketService,
        private legacyService: LegacyInteractionService
    ) { }

    async handle(interaction: ButtonInteraction): Promise<void> {
        if (!interaction.guildId) return;
        if (interaction.customId.startsWith('cfg_')) return;
        if (interaction.customId.startsWith('panel_')) return;

        // 1. Try Legacy Adapter First
        if (this.legacyService.isLegacy(interaction.customId)) {
            const handled = await this.legacyService.handle(interaction);
            if (handled) return;
        }

        // 2. Strict Signature Verification
        if (!this.signer.verify(interaction.guildId, interaction.customId)) {
            await interaction.reply({ content: `invalid interaction signature. id: ${interaction.customId}`, flags: MessageFlags.Ephemeral });
            return;
        }

        const parsed = this.signer.parse(interaction.customId);
        if (!parsed) return;

        const { ticketId, action } = parsed;
        const guildId = interaction.guildId;

        if (action === 'claim') {
            await this.handleClaim(interaction, guildId, ticketId);
        } else if (action === 'close') {
            await this.handleCloseRequest(interaction, guildId, ticketId);
        } else if (action === 'trans') {
            await this.handleTransferRequest(interaction, guildId, ticketId);
        }
    }

    private async handleTransferRequest(interaction: ButtonInteraction, guildId: string, ticketId: string) {
        // 1. Permission Check (Support/Admin only)
        const config = await this.guildRepo.findByGuildId(guildId);
        const member = await interaction.guild?.members.fetch(interaction.user.id);
        const hasrole = member?.roles.cache.some(r => config?.support_role_ids.includes(r.id) || (config?.admin_role_ids || []).includes(r.id));

        if (!hasrole && !member?.permissions.has(PermissionFlagsBits.Administrator)) {
            await interaction.reply({ content: 'you do not have permission to transfer tickets.', flags: MessageFlags.Ephemeral });
            return;
        }

        // 2. Show User Select Menu
        const userSelect = new UserSelectMenuBuilder()
            .setCustomId(this.signer.sign(guildId, ticketId, 'trans_conf'))
            .setPlaceholder('select new owner/agent')
            .setMinValues(1)
            .setMaxValues(1);

        const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(userSelect);

        await interaction.reply({
            content: 'select the user to transfer this ticket to:',
            components: [row],
            flags: MessageFlags.Ephemeral
        });
    }

    private async handleClaim(interaction: ButtonInteraction, guildId: string, ticketId: string) {
        logger.info(`[TicketAction] Claim Request - Ticket: ${ticketId} User: ${interaction.user.id}`);
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        // 1. Permission Check
        const config = await this.guildRepo.findByGuildId(guildId);
        const member = await interaction.guild?.members.fetch(interaction.user.id);
        const hasrole = member?.roles.cache.some(r => config?.support_role_ids.includes(r.id) || (config?.admin_role_ids || []).includes(r.id));

        if (!hasrole && !member?.permissions.has(PermissionFlagsBits.Administrator)) {
            logger.warn(`[TicketAction] Claim Denied (No Permission) - Ticket: ${ticketId} User: ${interaction.user.id}`);
            await interaction.editReply({ content: 'you do not have permission to claim this ticket.' });
            return;
        }

        // 2. DB Update via Service (to include Audit Log)
        const ticket = await this.ticketRepo.findById(ticketId);
        if (ticket?.claimed_by) {
            logger.warn(`[TicketAction] Claim Collision - Ticket: ${ticketId} already claimed by ${ticket.claimed_by}`);
            await interaction.editReply({ content: `ticket already claimed by <@${ticket.claimed_by}>` });
            return;
        }

        await this.ticketService.claimTicket(ticketId, interaction.user.id);
        logger.info(`[TicketAction] Claim Success - Ticket: ${ticketId} User: ${interaction.user.id}`);

        // 3. UI Update
        await interaction.editReply({ content: 'ticket claimed successfully.' });
        await (interaction.channel as any)?.send({ embeds: [EmbedFactory.success(`ticket claimed by <@${interaction.user.id}>`)] });

        // Optional: Update Channel Topic
        if (interaction.channel?.isTextBased()) {
            const ch = interaction.channel as TextChannel;
            const currentTopic = ch.topic || '';
            const newSuffix = ` | Claimed by: ${interaction.user.tag}`;
            if (currentTopic.length + newSuffix.length <= 1024) {
                await ch.setTopic(`${currentTopic}${newSuffix}`).catch(e => logger.warn('Failed to set topic', e));
            }
        }
    }

    private async handleCloseRequest(interaction: ButtonInteraction, guildId: string, ticketId: string) {
        // Show Close Reason Modal
        const modal = new ModalBuilder()
            .setCustomId(`modal_close_ticket:${ticketId}`)
            .setTitle('close ticket');

        const reasonInput = new TextInputBuilder()
            .setCustomId('close_reason')
            .setLabel('reason for closing')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setPlaceholder('no reason provided');

        const row = new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
    }
}

export class TicketTransferSelectHandler implements IInteractionHandler {
    constructor(
        private ticketService: TicketService,
        private signer: SignatureService
    ) { }

    async handle(interaction: UserSelectMenuInteraction): Promise<void> {
        if (!interaction.guildId) return;

        if (!this.signer.verify(interaction.guildId, interaction.customId)) {
            await interaction.reply({ content: 'invalid interaction signature.', flags: MessageFlags.Ephemeral });
            return;
        }

        const parsed = this.signer.parse(interaction.customId);
        if (!parsed || parsed.action !== 'trans_conf') return;

        const { ticketId } = parsed;
        const guildId = interaction.guildId;
        const newUserId = interaction.values[0];

        await interaction.deferReply();

        try {
            await this.ticketService.transferTicket(guildId, ticketId, newUserId, interaction.user.id);
            await interaction.editReply({ content: `successfully transferred to <@${newUserId}>` });
        } catch (error: any) {
            logger.error('Transfer Failed', error);
            await interaction.editReply({ content: `transfer failed: ${error.message}` });
        }
    }
}

export class CloseModalHandler implements IInteractionHandler {
    constructor(
        private transcriptService: TranscriptService
    ) { }

    async handle(interaction: ModalSubmitInteraction): Promise<void> {
        if (!interaction.customId.startsWith('modal_close_ticket:')) return;

        const ticketId = interaction.customId.split(':')[1];
        const reason = interaction.fields.getTextInputValue('close_reason') || 'no reason provided';

        await interaction.reply({ content: 'closing ticket...', flags: MessageFlags.Ephemeral });

        try {
            await this.transcriptService.closeTicket(interaction.guildId!, ticketId, interaction.user.id, reason);
        } catch (error: any) {
            logger.error('Close Ticket Failed', error);
            await interaction.followUp({ content: `failed to close ticket: ${error.message}`, flags: MessageFlags.Ephemeral });
        }
    }
}
