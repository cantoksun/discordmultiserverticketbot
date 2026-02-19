import { ChatInputCommandInteraction, ChannelType, ActionRowBuilder, RoleSelectMenuBuilder, ChannelSelectMenuBuilder, ComponentType, EmbedBuilder, MessageFlags } from 'discord.js';
import { IInteractionHandler } from '../../interfaces/discord/handlers/i-interaction-handler';
import { EmbedFactory } from '../../shared/utils/embed-factory';
import { IGuildConfigRepository } from '../../domain/repositories/i-guild-config-repository';
import logger from '../../core/logger';

export class SetupCommandHandler implements IInteractionHandler {
    constructor(private guildConfigRepo: IGuildConfigRepository) { }

    async handle(interaction: ChatInputCommandInteraction): Promise<void> {
        if (!interaction.guildId) {
            await interaction.reply({ content: 'Command only available in guilds.', flags: MessageFlags.Ephemeral });
            return;
        }

        // 1. Permission Check (Owner Only)
        if (interaction.user.id !== interaction.guild?.ownerId) {
            await interaction.reply({ content: 'Only the server owner can run this command.', flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            // STEP 1: Support Roles
            const roleSelect = new RoleSelectMenuBuilder()
                .setCustomId('setup_support_roles')
                .setPlaceholder('Select Support Roles')
                .setMinValues(1)
                .setMaxValues(10);

            const row1 = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(roleSelect);
            const msg = await interaction.editReply({
                embeds: [EmbedFactory.create('Ticket Setup - Step 1/4', 'Please select the roles that act as Support agents.')],
                components: [row1]
            });

            const roleSelection = await msg.awaitMessageComponent({
                componentType: ComponentType.RoleSelect,
                filter: (i) => i.user.id === interaction.user.id,
                time: 60000
            });
            const supportRoleIds = roleSelection.values;
            await roleSelection.deferUpdate();

            // STEP 2: Log Channel
            const logSelect = new ChannelSelectMenuBuilder()
                .setCustomId('setup_log_channel')
                .setPlaceholder('Select Log Channel')
                .setChannelTypes(ChannelType.GuildText);

            const row2 = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(logSelect);
            await roleSelection.editReply({
                embeds: [EmbedFactory.create('Ticket Setup - Step 2/4', 'Select the channel where transcripts and logs will be sent.')],
                components: [row2]
            });

            const logSelection = await msg.awaitMessageComponent({
                componentType: ComponentType.ChannelSelect,
                filter: (i) => i.user.id === interaction.user.id,
                time: 60000
            });
            const logChannelId = logSelection.values[0];
            await logSelection.deferUpdate();

            // STEP 3: Ticket Category
            const catSelect = new ChannelSelectMenuBuilder()
                .setCustomId('setup_category')
                .setPlaceholder('Select Ticket Category')
                .setChannelTypes(ChannelType.GuildCategory);

            const row3 = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(catSelect);
            await logSelection.editReply({
                embeds: [EmbedFactory.create('Ticket Setup - Step 3/4', 'Select the category where new ticket channels will be created.')],
                components: [row3]
            });

            const catSelection = await msg.awaitMessageComponent({
                componentType: ComponentType.ChannelSelect,
                filter: (i) => i.user.id === interaction.user.id,
                time: 60000
            });
            const categoryId = catSelection.values[0];
            await catSelection.deferUpdate();

            // STEP 4: Panel Channel
            const panelSelect = new ChannelSelectMenuBuilder()
                .setCustomId('setup_panel_channel')
                .setPlaceholder('Select Panel Channel')
                .setChannelTypes(ChannelType.GuildText);

            const row4 = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(panelSelect);
            await catSelection.editReply({
                embeds: [EmbedFactory.create('Ticket Setup - Step 4/4', 'Select the channel where the ticket panel will be sent.')],
                components: [row4]
            });

            const panelSelection = await msg.awaitMessageComponent({
                componentType: ComponentType.ChannelSelect,
                filter: (i) => i.user.id === interaction.user.id,
                time: 60000
            });
            const panelChannelId = panelSelection.values[0];
            await panelSelection.deferUpdate();

            // Final Save
            await this.guildConfigRepo.createOrUpdate(interaction.guildId, {
                enabled: true,
                support_role_ids: supportRoleIds,
                admin_role_ids: [],
                log_channel_id: logChannelId,
                panel_channel_id: panelChannelId,
                ticket_category_ids: { default: categoryId },
                ticket_types: {
                    default: {
                        label: 'General Support',
                        categoryId: categoryId, // Direct override for default type
                        modalFields: [
                            { customId: 'issue_desc', label: 'Describe your issue', style: 'PARAGRAPH', required: true }
                        ]
                    }
                }
            });

            await panelSelection.editReply({
                embeds: [EmbedFactory.success('Setup Completed! The bot is now configured and ready for use.')],
                components: []
            });

            // Note: In a real "Panel Kanalını Seçtir" scenario, we might want to also TRIGGER the panel message here.
            // But usually, /ticket panel send exists for that. For now, we just save the config.

        } catch (e) {
            logger.error('Setup wizard timed out or failed', e);
            await interaction.editReply({ content: 'Setup timed out or failed. Please try again.', components: [] });
        }
    }
}
