import { ChatInputCommandInteraction, TextChannel } from 'discord.js';
import { IInteractionHandler } from '../../interfaces/discord/handlers/i-interaction-handler';
import { IGuildConfigRepository } from '../../domain/repositories/i-guild-config-repository';
import { PanelService } from '../services/panel-service';
import { EmbedFactory } from '../../shared/utils/embed-factory';
import logger from '../../core/logger';

export class PanelCommandHandler implements IInteractionHandler {
    constructor(
        private guildRepo: IGuildConfigRepository,
        private panelService: PanelService
    ) { }

    async handle(interaction: ChatInputCommandInteraction): Promise<void> {
        if (!interaction.guildId) return;

        // Owner Only
        if (interaction.user.id !== interaction.guild?.ownerId) {
            await interaction.reply({ content: 'Only the server owner can run this command.', ephemeral: true });
            return;
        }

        const subcommand = interaction.options.getSubcommand();
        const channel = interaction.options.getChannel('channel', true) as TextChannel;

        if (!channel.isTextBased() || channel.type !== 0) { // 0 is GuildText
            await interaction.reply({ content: 'Please select a regular text channel.', ephemeral: true });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            if (subcommand === 'send') {
                await this.panelService.sendPanel(interaction.guildId, channel);

                // Update panel_channel_id in config
                await this.guildRepo.createOrUpdate(interaction.guildId, {
                    panel_channel_id: channel.id
                });

                await interaction.editReply({ content: `✅ Panel successfully sent to <#${channel.id}>` });
            } else if (subcommand === 'refresh') {
                const messageId = interaction.options.getString('message_id', true);

                await this.panelService.updatePanel(interaction.guildId, channel, messageId);

                await interaction.editReply({ content: `✅ Panel message ${messageId} in <#${channel.id}> successfully refreshed.` });
            }
        } catch (error: any) {
            logger.error(`Panel Command Failed [${subcommand}]`, error);
            await interaction.editReply({ content: `❌ Failed: ${error.message}` });
        }
    }
}
