import { ButtonInteraction, ChannelSelectMenuInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType, Interaction, StringSelectMenuBuilder, StringSelectMenuInteraction, RoleSelectMenuBuilder, RoleSelectMenuInteraction, ModalBuilder, TextInputBuilder, TextInputStyle, ModalSubmitInteraction, MessageFlags } from 'discord.js';
import { IInteractionHandler } from './i-interaction-handler';
import { IGuildConfigRepository } from '../../../domain/repositories/i-guild-config-repository';
import logger from '../../../core/logger';
import { GuildConfig } from '@prisma/client';

import { PanelService } from '../../../application/services/panel-service';
import { t } from '../../../shared/utils/i18n';


export class ConfigInteractionHandler implements IInteractionHandler {
    constructor(private guildRepo: IGuildConfigRepository, private panelService: PanelService) { }

    async handle(interaction: Interaction): Promise<void> {
        // Entry log for debugging
        if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isChannelSelectMenu() || interaction.isRoleSelectMenu() || interaction.isModalSubmit()) {
            logger.info(`[ConfigHandler] Incoming Interaction: ${interaction.customId} Type: ${interaction.type}`);
        }

        // Handle Modals
        if (interaction.isModalSubmit() && interaction.customId.startsWith('cfg_modal_')) {
            await this.handleModal(interaction);
            return;
        }

        if (!interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isChannelSelectMenu() && !interaction.isRoleSelectMenu()) return;
        if (!interaction.customId.startsWith('cfg_')) return;

        // Security: Owner Only
        if (interaction.guild && interaction.user.id !== interaction.guild.ownerId) {
            await interaction.reply({ content: 'Only the server owner can configure the bot.', flags: MessageFlags.Ephemeral });
            return;
        }

        try {
            if (interaction.isStringSelectMenu()) {
                if (interaction.customId === 'cfg_nav') {
                    await this.handleNavigation(interaction);
                } else if (['cfg_type_edit', 'cfg_type_remove', 'cfg_send_panel_action', 'cfg_type_actions'].includes(interaction.customId)) {
                    await this.handleTypeSelect(interaction);
                } else if (interaction.customId === 'cfg_lang_select') {
                    await this.handleLanguageSelect(interaction);
                }

            } else if (interaction.isButton()) {
                if (interaction.customId.startsWith('cfg_open_modal_')) {
                    await this.openModal(interaction);
                } else {
                    await this.handleButton(interaction);
                }
            } else if (interaction.isChannelSelectMenu()) {
                await this.handleChannelSelect(interaction);
            } else if (interaction.isRoleSelectMenu()) {
                await this.handleRoleSelect(interaction);
            }
        } catch (error) {
            logger.error('Config interaction failed', { error, customId: interaction.customId, type: interaction.type });
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: `Failed to update configuration. Error: ${error instanceof Error ? error.message : 'Unknown'}`, flags: MessageFlags.Ephemeral });
            } else {
                await interaction.followUp({ content: `Failed to update configuration. Error: ${error instanceof Error ? error.message : 'Unknown'}`, flags: MessageFlags.Ephemeral });
            }
        }
    }

    private async handleNavigation(interaction: StringSelectMenuInteraction) {
        const selected = interaction.values[0];
        const config = await this.guildRepo.findByGuildId(interaction.guildId!);
        if (!config) return;

        await this.updateMessage(interaction, config, selected);
    }

    private async handleButton(interaction: ButtonInteraction) {
        const guildId = interaction.guildId!;
        const config = await this.guildRepo.findByGuildId(guildId);
        if (!config) return;

        const action = interaction.customId;
        const updates: any = {};
        const lang = (config as any).language || 'en';


        if (action === 'cfg_toggle_dm') {
            updates.dm_notifications_enabled = !config.dm_notifications_enabled;
        } else if (action === 'cfg_toggle_transcript') {
            updates.transcript_format = config.transcript_format === 'md' ? 'html' : 'md';
        } else if (action === 'cfg_toggle_enabled') {
            updates.enabled = !config.enabled;
        } else if (action === 'cfg_send_panel') {
            if (!config.panel_channel_id) {
                await interaction.reply({ content: '❌ Please select a Panel Channel first!', flags: MessageFlags.Ephemeral });
                return;
            }
            try {
                const channel = await interaction.guild!.channels.fetch(config.panel_channel_id) as any;
                if (channel) {
                    await this.panelService.sendPanel(guildId, channel);
                    await this.panelService.sendPanel(guildId, channel);
                    await interaction.reply({ content: t(lang, 'messages.panel_sent', { channel: `<#${config.panel_channel_id}>` }), flags: MessageFlags.Ephemeral });
                    return; // Don't update message, just return
                }
            } catch (e) {
                logger.error('Failed to send panel', e);
                await interaction.reply({ content: t(lang, 'messages.error'), flags: MessageFlags.Ephemeral });
                return;
            }

        } else if (action === 'cfg_toggle_timestamp') {
            const hasTimestamp = (config as any).panel_timestamp ?? true;
            updates.panel_timestamp = !hasTimestamp;
        } else if (action === 'cfg_toggle_panel_mode') {
            const currentMode = (config as any).panel_mode || 'embed';
            updates.panel_mode = currentMode === 'embed' ? 'text' : 'embed';
        } else if (action === 'cfg_toggle_welcome_mode') {
            const currentMode = (config as any).ticket_welcome_mode || 'embed';
            updates.ticket_welcome_mode = currentMode === 'embed' ? 'text' : 'embed';
        } else if (action === 'cfg_toggle_audit_log') {
            const currentStatus = (config as any).audit_log_enabled !== false;
            updates.audit_log_enabled = !currentStatus;
        } else if (action.startsWith('cfg_edit_gen_')) {
            const typeId = action.replace('cfg_edit_gen_', '');
            await this.openModal(interaction, `edit_type:${typeId}`);
            return;
        } else if (action.startsWith('cfg_edit_wel_')) {
            const typeId = action.replace('cfg_edit_wel_', '');
            await this.openModal(interaction, `welcome_type:${typeId}`);
            return;
        }

        const newConfig = await this.guildRepo.createOrUpdate(guildId, updates);

        // Determine target tab based on action
        let targetTab = 'system';
        if (action === 'cfg_toggle_timestamp' || action === 'cfg_toggle_welcome_mode' || action === 'cfg_toggle_panel_mode') {
            targetTab = 'types';
        } else if (action === 'cfg_toggle_transcript' || action === 'cfg_toggle_audit_log') {
            targetTab = 'logs';
        }

        await this.updateMessage(interaction, newConfig, targetTab);
    }

    private async handleLanguageSelect(interaction: StringSelectMenuInteraction) {
        const guildId = interaction.guildId!;
        const selectedLang = interaction.values[0];

        // Update DB
        await this.guildRepo.createOrUpdate(guildId, { language: selectedLang } as any);

        // Fetch fresh config
        const newConfig = await this.guildRepo.findByGuildId(guildId);

        // Update UI
        if (newConfig) {
            await this.updateMessage(interaction, newConfig, 'system');
        }
    }

    private async handleChannelSelect(interaction: ChannelSelectMenuInteraction) {

        const guildId = interaction.guildId!;
        const selectedChannelId = interaction.values[0];
        const action = interaction.customId;

        const updates: any = {};
        if (action === 'cfg_select_panel') updates.panel_channel_id = selectedChannelId;
        else if (action === 'cfg_select_log') updates.log_channel_id = selectedChannelId;
        else if (action === 'cfg_select_category') {
            const currentCats = (await this.guildRepo.findByGuildId(guildId))?.ticket_category_ids as any || {};
            updates.ticket_category_ids = { ...currentCats, default: selectedChannelId };
        }

        const newConfig = await this.guildRepo.createOrUpdate(guildId, updates);
        await this.updateMessage(interaction, newConfig, 'system');
    }



    private async handleRoleSelect(interaction: RoleSelectMenuInteraction) {
        const guildId = interaction.guildId!;
        const selectedRoleIds = interaction.values; // Array of IDs
        const action = interaction.customId;

        const updates: any = {};
        if (action === 'cfg_select_support') updates.support_role_ids = selectedRoleIds;
        else if (action === 'cfg_select_admin') updates.admin_role_ids = selectedRoleIds;

        const newConfig = await this.guildRepo.createOrUpdate(guildId, updates);
        await this.updateMessage(interaction, newConfig, 'security');
    }



    private async handleTypeSelect(interaction: StringSelectMenuInteraction): Promise<void> {
        const guildId = interaction.guildId!;
        const selectedId = interaction.values[0];
        const action = interaction.customId;
        const config = await this.guildRepo.findByGuildId(guildId);

        logger.info(`[Config] Type Selection - Action: ${action} Selected: ${selectedId}`);

        if (!config) {
            await interaction.reply({ content: '❌ Configuration not found.', flags: MessageFlags.Ephemeral });
            return;
        }

        // Handle unified type actions dropdown (send:, edit:, remove: prefixes)
        if (action === 'cfg_type_actions') {
            const [prefix, typeId] = selectedId.split(':');
            const lang = (config as any).language || 'en';

            if (prefix === 'edit') {
                const typeData = this.getTypeDataFromConfig(config, typeId);
                if (!typeData) {
                    await interaction.reply({ content: `❌ Type not found: ${typeId}`, flags: MessageFlags.Ephemeral });

                    return;
                }

                const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId(`cfg_edit_gen_${typeId}`).setLabel(t(lang, 'buttons.edit_general')).setStyle(ButtonStyle.Primary).setEmoji('📝'),
                    new ButtonBuilder().setCustomId(`cfg_edit_wel_${typeId}`).setLabel(t(lang, 'buttons.edit_welcome')).setStyle(ButtonStyle.Success).setEmoji('👋')
                );


                await interaction.reply({
                    content: `**Edit Type: ${typeData.label || typeId}**\nWhat would you like to edit?`,
                    components: [row],
                    flags: MessageFlags.Ephemeral
                });
                return;
            } else if (prefix === 'toggle_modal') {
                // Toggle Modal Enabled
                const types = (config.ticket_types as any) || {};
                let currentStatus = true;

                if (Array.isArray(types)) {
                    const index = types.findIndex(t => t.key === typeId || t.id === typeId);
                    if (index !== -1) {
                        currentStatus = types[index].modalEnabled !== false;
                        types[index].modalEnabled = !currentStatus;
                    }
                } else if (types[typeId]) {
                    currentStatus = types[typeId].modalEnabled !== false;
                    types[typeId].modalEnabled = !currentStatus;
                }

                const newStatus = !currentStatus ? 'ON' : 'OFF';
                await this.guildRepo.createOrUpdate(guildId, { ticket_types: types });
                const newConfig = await this.guildRepo.findByGuildId(guildId);
                const lang = (newConfig as any)?.language || 'en';
                await this.updateMessage(interaction, newConfig!, 'types');

                await interaction.followUp({
                    content: t(lang, 'messages.updated', { section: 'Modal' }),
                    flags: MessageFlags.Ephemeral
                });
                return;
            } else if (prefix === 'remove') {
                // Remove Type

                const types = (config.ticket_types as any) || {};
                if (Array.isArray(types)) {
                    const index = types.findIndex(t => t.key === typeId || t.id === typeId);
                    if (index !== -1) types.splice(index, 1);
                } else {
                    delete types[typeId];
                }

                await this.guildRepo.createOrUpdate(guildId, { ticket_types: types });

                const updatedConfig = await this.guildRepo.findByGuildId(guildId);
                const lang = (updatedConfig as any)?.language || 'en';
                if (updatedConfig) {

                    await this.updateMessage(interaction, updatedConfig, 'types');
                }
                await interaction.followUp({
                    content: t(lang, 'messages.updated', { section: `Type ${typeId}` }),
                    flags: MessageFlags.Ephemeral
                });
                return;

            }
            return;
        }

        const types = (config.ticket_types as any) || {};

        if (action === 'cfg_type_remove') {
            if (Array.isArray(types)) {
                const index = types.findIndex(t => t.key === selectedId || t.id === selectedId);
                if (index !== -1) types.splice(index, 1);
            } else {
                delete types[selectedId];
            }

            await this.guildRepo.createOrUpdate(guildId, { ticket_types: types });

            const updatedConfig = await this.guildRepo.findByGuildId(guildId);
            if (updatedConfig) {
                await this.updateMessage(interaction, updatedConfig, 'panel');
            }
            await interaction.followUp({ content: `✅ Deleted type: ${selectedId}`, flags: MessageFlags.Ephemeral });
        } else if (action === 'cfg_send_panel_action') {
            const selectedId = interaction.values[0];

            // Use the channel where the command was used, not the saved panel_channel
            const channel = interaction.channel as any;
            if (!channel || !channel.isTextBased()) {
                await interaction.reply({ content: '❌ This command must be used in a text channel!', flags: MessageFlags.Ephemeral });
                return;
            }

            try {
                const lang = (config as any).language || 'en';
                if (selectedId === 'unified_all') {
                    await this.panelService.sendPanel(guildId, channel);

                    await interaction.reply({ content: t(lang, 'messages.panel_sent', { channel: 'Current Channel' }), flags: MessageFlags.Ephemeral });
                } else {
                    await this.panelService.sendTypePanel(guildId, channel, selectedId);
                    await interaction.reply({ content: t(lang, 'messages.panel_sent', { channel: 'Current Channel' }), flags: MessageFlags.Ephemeral });
                }
            } catch (e) {
                const lang = (config as any).language || 'en';

                logger.error('Failed to send panel', e);
                await interaction.reply({ content: t(lang, 'messages.error'), flags: MessageFlags.Ephemeral });
            }

            return;

        } else if (action === 'cfg_type_edit') {
            // New Flow: Ask what to edit (General or Welcome)
            const typeData = this.getTypeDataFromConfig(config, selectedId);
            const lang = (config as any).language || 'en';
            if (!typeData) {

                await interaction.reply({ content: `❌ Type not found: ${selectedId}`, flags: MessageFlags.Ephemeral });
                return;
            }

            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId(`cfg_edit_gen_${selectedId}`).setLabel(t(lang, 'buttons.edit_general')).setStyle(ButtonStyle.Primary).setEmoji('📝'),
                new ButtonBuilder().setCustomId(`cfg_edit_wel_${selectedId}`).setLabel(t(lang, 'buttons.edit_welcome')).setStyle(ButtonStyle.Success).setEmoji('👋')
            );


            await interaction.reply({
                content: t(lang, 'modals.edit_type', { type: typeData.label || selectedId }),
                components: [row],
                flags: MessageFlags.Ephemeral
            });

        }
    }

    private getTypeDataFromConfig(config: GuildConfig, id: string): any {
        const types = config.ticket_types as any;
        if (!types) return null;
        if (Array.isArray(types)) {
            return types.find(t => t.key === id || t.id === id);
        }
        return types[id];
    }

    private async openModal(interaction: ButtonInteraction | StringSelectMenuInteraction, typeOverride?: string) {
        const type = typeOverride || interaction.customId.replace('cfg_open_modal_', '');
        const config = await this.guildRepo.findByGuildId(interaction.guildId!);

        if (!config) {
            await interaction.reply({ content: 'Configuration not found.', flags: MessageFlags.Ephemeral });
            return;
        }

        const lang = (config as any).language || 'en';
        const modal = new ModalBuilder().setCustomId(`cfg_modal_${type}`).setTitle(t(lang, 'modals.edit_type', { type: type.charAt(0).toLowerCase() + type.slice(1) }));



        if (type === 'limits') {
            modal.setTitle(t(lang, 'modals.edit_limits'));

            modal.addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('auto_close').setLabel('auto close (hours)').setValue(config.auto_close_hours?.toString() || '').setStyle(TextInputStyle.Short).setRequired(false)),
                new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('max_tickets').setLabel('max tickets per user').setValue(config.max_open_tickets_per_user.toString()).setStyle(TextInputStyle.Short)),
                new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('cooldown').setLabel('cooldown (seconds)').setValue(config.cooldown_seconds.toString()).setStyle(TextInputStyle.Short))
            );
        } else if (type === 'texts') {
            modal.setTitle(t(lang, 'modals.edit_texts'));

            modal.addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('naming').setLabel('naming scheme ({user}, {seq})').setValue(config.naming_scheme).setStyle(TextInputStyle.Short))
            );
        } else if (type === 'panel_texts') {
            modal.setTitle(t(lang, 'modals.edit_panel'));

            modal.addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('p_title').setLabel('unified title').setValue((config as any)?.panel_title || 'server support').setStyle(TextInputStyle.Short).setRequired(false)),
                new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('p_desc').setLabel('unified description').setValue((config as any)?.panel_description || 'click button to open ticket').setStyle(TextInputStyle.Paragraph).setRequired(false))
            );
        } else if (type === 'welcome_texts') {
            modal.setTitle(t(lang, 'modals.edit_welcome_msg'));

            modal.addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('w_title').setLabel('embed title ({type})').setValue((config as any)?.ticket_welcome_title || 'ticket: {type}').setStyle(TextInputStyle.Short).setRequired(false)),
                new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('w_content').setLabel('content ({user}, {type})').setValue((config as any)?.ticket_welcome_content || 'welcome {user}. support will be with you shortly.').setStyle(TextInputStyle.Paragraph).setRequired(false))
            );
        } else if (type.startsWith('welcome_type:')) {
            const typeId = type.split(':')[1];
            const typeData = this.getTypeDataFromConfig(config, typeId);
            const rawLabel = typeData?.label || typeId;
            const safeLabel = rawLabel.length > 25 ? rawLabel.substring(0, 22) + '...' : rawLabel;

            modal.setTitle(`edit welcome: ${safeLabel}`);
            modal.addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('w_title').setLabel('title (leave empty for global)').setValue(typeData?.welcomeTitle || '').setStyle(TextInputStyle.Short).setRequired(false)),
                new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('w_content').setLabel('content (leave empty for global)').setValue(typeData?.welcomeContent || '').setStyle(TextInputStyle.Paragraph).setRequired(false))
            );
        } else if (type === 'blacklist') {
            const blacklist = (config as any).blacklisted_user_ids as string[] || [];
            const currentList = blacklist.length > 0 ? blacklist.map(id => `<@${id}>`).join(', ') : 'boş';
            modal.setTitle('kara liste yönetimi');
            modal.addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder()
                        .setCustomId('blacklist_add')
                        .setLabel('eklenecek kullanıcı id (virgülle ayır)')
                        .setPlaceholder('örn: 123456789012345678, 987654321098765432')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false)
                ),
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder()
                        .setCustomId('blacklist_remove')
                        .setLabel('kaldırılacak kullanıcı id (virgülle ayır)')
                        .setPlaceholder('örn: 123456789012345678')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false)
                ),
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder()
                        .setCustomId('blacklist_current')
                        .setLabel('mevcut kara liste (salt okunur)')
                        .setValue(currentList.substring(0, 100))
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(false)
                )
            );
        } else if (type === 'add_type') {
            modal.setTitle(t(lang, 'modals.add_type'));

            modal.addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('t_id').setLabel('id (unique, no spaces)').setStyle(TextInputStyle.Short)),
                new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('t_label').setLabel('display label').setStyle(TextInputStyle.Short)),
                new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('t_emoji').setLabel('emoji').setStyle(TextInputStyle.Short).setRequired(false))
            );
        } else if (type.startsWith('edit_type:')) {
            const typeId = type.split(':')[1];
            const typeData = this.getTypeDataFromConfig(config, typeId);
            if (!typeData) {
                await interaction.reply({ content: `❌ Type not found: ${typeId}`, flags: MessageFlags.Ephemeral });
                return;
            }

            const rawLabel = typeData.label || typeId;
            const safeLabel = rawLabel.length > 25 ? rawLabel.substring(0, 22) + '...' : rawLabel;

            modal.setTitle(`edit type: ${safeLabel}`);

            const modalEnabled = typeData.modalEnabled !== false ? 'yes' : 'no';
            modal.addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('t_label').setLabel('display label').setValue(typeData.label || '').setStyle(TextInputStyle.Short)),
                new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('t_emoji').setLabel('emoji').setValue(typeData.emoji || '').setStyle(TextInputStyle.Short).setRequired(false)),
                new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('t_p_title').setLabel('panel title (optional)').setValue(typeData.panelTitle || '').setStyle(TextInputStyle.Short).setRequired(false)),
                new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('t_p_desc').setLabel('panel description (optional)').setValue(typeData.panelDescription || '').setStyle(TextInputStyle.Paragraph).setRequired(false)),
                new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('t_modal_enabled').setLabel('show form? (yes/no)').setValue(modalEnabled).setStyle(TextInputStyle.Short).setPlaceholder('yes or no').setMinLength(1).setMaxLength(5).setRequired(true))
            );
        }

        await interaction.showModal(modal);
    }

    private async handleModal(interaction: ModalSubmitInteraction) {
        const guildId = interaction.guildId!;
        const type = interaction.customId.replace('cfg_modal_', '');
        const updates: any = {};

        if (type === 'blacklist') {
            const config = await this.guildRepo.findByGuildId(guildId);
            let blacklist = (config as any).blacklisted_user_ids as string[] || [];

            const addInput = interaction.fields.getTextInputValue('blacklist_add').trim();
            const removeInput = interaction.fields.getTextInputValue('blacklist_remove').trim();

            // Add users
            if (addInput) {
                const idsToAdd = addInput.split(',').map(id => id.trim()).filter(id => id.length > 0);
                for (const id of idsToAdd) {
                    if (!blacklist.includes(id)) {
                        blacklist.push(id);
                    }
                }
            }

            // Remove users
            if (removeInput) {
                const idsToRemove = removeInput.split(',').map(id => id.trim()).filter(id => id.length > 0);
                blacklist = blacklist.filter(id => !idsToRemove.includes(id));
            }

            updates.blacklisted_user_ids = blacklist;

        } else if (type === 'limits') {
            const max = parseInt(interaction.fields.getTextInputValue('max_tickets'));
            const cold = parseInt(interaction.fields.getTextInputValue('cooldown'));
            const auto = parseInt(interaction.fields.getTextInputValue('auto_close'));

            if (!isNaN(max)) updates.max_open_tickets_per_user = max;
            if (!isNaN(cold)) updates.cooldown_seconds = cold;
            if (!isNaN(auto)) updates.auto_close_hours = auto === 0 ? null : auto;

        } else if (type === 'texts') {
            updates.naming_scheme = interaction.fields.getTextInputValue('naming');
        } else if (type === 'panel_texts') {
            updates.panel_title = interaction.fields.getTextInputValue('p_title');
            updates.panel_description = interaction.fields.getTextInputValue('p_desc');
        } else if (type === 'welcome_texts') {
            updates.ticket_welcome_title = interaction.fields.getTextInputValue('w_title');
            updates.ticket_welcome_content = interaction.fields.getTextInputValue('w_content');
        } else if (type.startsWith('welcome_type:')) {
            const typeId = type.split(':')[1];
            const wTitle = interaction.fields.getTextInputValue('w_title');
            const wContent = interaction.fields.getTextInputValue('w_content');

            const config = await this.guildRepo.findByGuildId(guildId);
            const types = (config?.ticket_types as any) || {};

            if (Array.isArray(types)) {
                const index = types.findIndex(t => t.key === typeId || t.id === typeId);
                if (index !== -1) {
                    types[index].welcomeTitle = wTitle || undefined;
                    types[index].welcomeContent = wContent || undefined;
                }
            } else {
                if (types[typeId]) {
                    types[typeId] = {
                        ...types[typeId],
                        welcomeTitle: wTitle || undefined,
                        welcomeContent: wContent || undefined
                    };
                }
            }
            updates.ticket_types = types;

        } else if (type === 'add_type' || type.startsWith('edit_type:')) {
            const isEdit = type.startsWith('edit_type:');
            const id = isEdit ? type.split(':')[1] : interaction.fields.getTextInputValue('t_id').toLowerCase();
            const label = interaction.fields.getTextInputValue('t_label');
            const emoji = interaction.fields.getTextInputValue('t_emoji');
            const pTitle = isEdit ? interaction.fields.getTextInputValue('t_p_title') : undefined;
            const pDesc = isEdit ? interaction.fields.getTextInputValue('t_p_desc') : undefined;
            const modalEnabledInput = isEdit ? (interaction.fields.getTextInputValue('t_modal_enabled') || 'yes').toLowerCase().trim() : 'yes';
            const modalEnabled = modalEnabledInput === 'yes' || modalEnabledInput === 'y' || modalEnabledInput === '1' || modalEnabledInput === 'true';

            const config = await this.guildRepo.findByGuildId(guildId);
            let types = (config?.ticket_types as any) || {};

            if (isEdit) {
                if (Array.isArray(types)) {
                    const index = types.findIndex(t => t.key === id || t.id === id);
                    if (index !== -1) {
                        types[index].label = label;
                        types[index].emoji = emoji;
                        types[index].panelTitle = pTitle || undefined;
                        types[index].panelDescription = pDesc || undefined;
                        types[index].modalEnabled = modalEnabled;
                    }
                } else {
                    types[id] = {
                        ...types[id],
                        label,
                        emoji,
                        panelTitle: pTitle || undefined,
                        panelDescription: pDesc || undefined,
                        modalEnabled
                    };
                }
            } else {
                // Add New
                if (Array.isArray(types)) {
                    if (types.some(t => t.key === id)) {
                        await interaction.reply({ content: `Type ID ${id} already exists!`, flags: MessageFlags.Ephemeral });
                        return;
                    }
                    types.push({
                        key: id,
                        label,
                        emoji,
                        modalFields: [{ customId: 'issue_desc', label: 'Describe your issue', style: 'PARAGRAPH', required: true }]
                    });
                } else {
                    if (types[id]) {
                        await interaction.reply({ content: `Type ID ${id} already exists!`, flags: MessageFlags.Ephemeral });
                        return;
                    }
                    types[id] = {
                        label,
                        emoji,
                        modalFields: [{ customId: 'issue_desc', label: 'describe your issue', style: 'PARAGRAPH', required: true }]
                    };
                }
            }

            updates.ticket_types = types;
        }

        const newConfig = await this.guildRepo.createOrUpdate(guildId, updates);

        // We can't update the original message directly from modal submit easily if ephemeral, 
        // but we can reply new config or edit if we have reference.
        // Best UX: Reply ephemeral success and user refreshes if they want, 
        // OR try to update the original message if possible (often not possible if original interaction is long gone).
        // Actually, we can just send a new ephemeral confirming update.
        const lang = (newConfig as any)?.language || 'en';
        await interaction.reply({ content: t(lang, 'messages.updated', { section: type }), flags: MessageFlags.Ephemeral });
    }



    private getTypeOptions(types: any): { label: string, value: string, emoji?: string }[] {
        if (!types) return [];
        const options = [];

        // Helper for sanitization
        const sanitize = (t: any) => {
            const emojiStr = t.emoji;
            const customEmojiRegex = /^<a?:.+?:\d+>$/;

            if (emojiStr && emojiStr.trim().length > 0) {
                const trimmed = emojiStr.trim();
                // 1. Custom Emoji
                if (customEmojiRegex.test(trimmed)) return trimmed;
                // 2. Unicode Emoji (Short length check)
                if (trimmed.length > 4) return undefined;
                // 3. Must NOT be purely alphanumeric (to exclude "ok", "1", "abc")
                if (/^[a-zA-Z0-9]+$/.test(trimmed)) return undefined;

                return trimmed;
            }
            return undefined;
        };

        if (Array.isArray(types)) {
            for (const t of types) {
                let label = t.label || t.key || 'Unknown';
                if (label.length > 100) label = label.substring(0, 97) + '...';

                options.push({
                    label,
                    value: (t.key || t.id).toString(),
                    emoji: sanitize(t)
                });
            }
        } else {
            for (const [k, v] of Object.entries(types)) {
                let label = (v as any).label || k;
                if (label.length > 100) label = label.substring(0, 97) + '...';

                options.push({
                    label,
                    value: k,
                    emoji: sanitize(v)
                });
            }
        }
        return options.slice(0, 24); // Max 24 choices (Discord limit - 1 for unified option)
    }

    private formatTicketTypes(types: any): string {
        if (!types) return 'none';
        const list = [];
        if (Array.isArray(types)) {
            for (const t of types) list.push(`${t.key}: ${t.label} ${t.emoji || ''}`);
        } else {
            for (const [k, v] of Object.entries(types)) list.push(`${k}: ${(v as any).label} ${(v as any).emoji || ''}`);
        }
        return list.length ? list.join('\n') : 'none';
    }


    private async updateMessage(interaction: any, config: GuildConfig, activeTab: string = 'general') {
        const lang = (config as any).language || 'en';
        const defaultCategoryId = (config.ticket_category_ids as any)?.default || t(lang, 'system.not_set');


        const formatRow = (key: string, value: string) => {
            const padKey = key.padEnd(24, ' ');
            return `${padKey}: ${value}`;
        };


        const normalizeHeight = (items: (string | undefined)[], target: number = 10) => {
            const flattened = items.map(i => i || '').join('\n').split('\n').map(l => l.trimEnd());
            const result = [...flattened];
            while (result.length < target) result.push('');
            // Pad each line to consistent width for better alignment with dropdowns
            const paddedResult = result.map(line => line.padEnd(100, ' '));
            return paddedResult.slice(0, target).join('\n');
        };

        const rows: string[] = [];
        if (activeTab === 'system') {
            rows.push(
                formatRow(t(lang, 'system.enabled'), config.enabled ? t(lang, 'system.yes') : t(lang, 'system.no')),
                formatRow(t(lang, 'system.dm_notifications'), config.dm_notifications_enabled ? t(lang, 'system.yes') : t(lang, 'system.no')),
                formatRow(t(lang, 'system.naming'), `"${config.naming_scheme}"`),
                '',
                formatRow('ticket category', defaultCategoryId),
                formatRow(t(lang, 'system.auto_close'), config.auto_close_hours ? config.auto_close_hours + 'h' : t(lang, 'system.disabled'))
            );
        } else if (activeTab === 'security') {
            const blacklistCount = (config as any).blacklisted_user_ids?.length || 0;
            rows.push(
                formatRow('support roles', `${config.support_role_ids.length} ${t(lang, 'system.assigned')}`),
                formatRow('admin roles', `${config.admin_role_ids.length} ${t(lang, 'system.assigned')}`),
                '',
                formatRow(t(lang, 'system.max_tickets'), config.max_open_tickets_per_user.toString()),
                formatRow(t(lang, 'system.cooldown'), `${config.cooldown_seconds}s`),
                formatRow('blacklisted users', blacklistCount.toString())
            );
        } else if (activeTab === 'types') {
            rows.push(
                t(lang, 'types.header_texts'),
                formatRow(t(lang, 'types.panel_title'), `"${(config as any).panel_title || 'default'}"`),
                formatRow(t(lang, 'types.panel_desc'), `"${((config as any).panel_description || 'default').substring(0, 20)}..."`),
                formatRow(t(lang, 'types.timestamp'), (config as any).panel_timestamp === false ? t(lang, 'system.no') : t(lang, 'system.yes')),
                '',
                t(lang, 'types.header_types'),
                this.formatTicketTypes(config.ticket_types)
            );
        } else if (activeTab === 'logs') {
            const auditLogEnabled = (config as any).audit_log_enabled !== false;
            rows.push(
                formatRow(t(lang, 'placeholders.log_channel'), config.log_channel_id || t(lang, 'system.not_set')),
                formatRow('transcript', t(lang, 'logs.format', { format: config.transcript_format })),
                formatRow('log mode', ((config as any).log_channel_mode || 'file')),
                formatRow('audit log', auditLogEnabled ? t(lang, 'logs.audit_enabled') : t(lang, 'logs.audit_disabled'))
            );

        }


        const configBlock = normalizeHeight(rows, 10);

        const embed = new EmbedBuilder()
            .setTitle(t(lang, 'system.title'))

            .setColor('#2b2d31')
            .setDescription(`\`\`\`yaml\n${configBlock}\n\`\`\``)
            .setFooter({ text: `viewing: ${activeTab}` });

        // Navigation Row
        const navRow = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('cfg_nav')
                    .setPlaceholder('📂 switch category')
                    .addOptions([
                        { label: t(lang, 'nav.system'), value: 'system', emoji: '📋', description: t(lang, 'nav.system_desc'), default: activeTab === 'system' },
                        { label: t(lang, 'nav.types'), value: 'types', emoji: '🎨', description: t(lang, 'nav.types_desc'), default: activeTab === 'types' },
                        { label: t(lang, 'nav.security'), value: 'security', emoji: '🛡️', description: t(lang, 'nav.security_desc'), default: activeTab === 'security' },
                        { label: t(lang, 'nav.logs'), value: 'logs', emoji: '📜', description: t(lang, 'nav.logs_desc'), default: activeTab === 'logs' },
                    ])
            );

        // lang is already defined at the top of updateMessage
        const components: any[] = [navRow];
        const tabComponents = this.renderComponents(activeTab, config, lang);
        components.push(...tabComponents);


        if (interaction.replied || interaction.deferred) {

            await interaction.editReply({ embeds: [embed], components: components });
        } else {
            await interaction.update({ embeds: [embed], components: components });
        }
    }

    private renderComponents(activeTab: string, config: GuildConfig, lang: string): any[] {
        const components: any[] = [];


        if (activeTab === 'system') {
            // 1. Channel Select (Top)
            components.push(
                new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(new ChannelSelectMenuBuilder().setCustomId('cfg_select_category').setPlaceholder(t(lang, 'placeholders.category')).setChannelTypes(ChannelType.GuildCategory))
            );


            // 2. Language Select (Middle)
            components.push(
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('cfg_lang_select')
                        .setPlaceholder(t(lang, 'buttons.language'))
                        .addOptions([
                            { label: 'English', value: 'en', emoji: '🇺🇸', default: lang === 'en' },
                            { label: 'Türkçe', value: 'tr', emoji: '🇹🇷', default: lang === 'tr' },
                            { label: 'Español', value: 'es', emoji: '🇪🇸', default: lang === 'es' },
                            { label: 'Français', value: 'fr', emoji: '🇫🇷', default: lang === 'fr' },
                            { label: 'Deutsch', value: 'de', emoji: '🇩🇪', default: lang === 'de' },
                            { label: 'Italiano', value: 'it', emoji: '🇮🇹', default: lang === 'it' },
                            { label: 'Русский', value: 'ru', emoji: '🇷🇺', default: lang === 'ru' },
                            { label: '中文', value: 'zh', emoji: '🇨🇳', default: lang === 'zh' },
                        ])
                )
            );

            // 3. Action Buttons (Bottom)
            components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId('cfg_toggle_enabled').setLabel(config.enabled ? `${t(lang, 'system.enabled')}: ${t(lang, 'system.on')}` : `${t(lang, 'system.enabled')}: ${t(lang, 'system.off')}`).setEmoji(config.enabled ? '🟢' : '🔴').setStyle(config.enabled ? ButtonStyle.Secondary : ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('cfg_toggle_dm').setLabel(config.dm_notifications_enabled ? `${t(lang, 'system.dm_notifications')}: ${t(lang, 'system.on')}` : `${t(lang, 'system.dm_notifications')}: ${t(lang, 'system.off')}`).setEmoji(config.dm_notifications_enabled ? '🔔' : '🔕').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('cfg_open_modal_texts').setLabel(t(lang, 'buttons.edit_naming')).setStyle(ButtonStyle.Primary).setEmoji('📝')
            ));



        } else if (activeTab === 'security') {
            // 1. Role Selects (Top)
            components.push(
                new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(new RoleSelectMenuBuilder().setCustomId('cfg_select_support').setPlaceholder('🛡️ select support roles').setMinValues(0).setMaxValues(10)),
                new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(new RoleSelectMenuBuilder().setCustomId('cfg_select_admin').setPlaceholder('👑 select admin roles').setMinValues(0).setMaxValues(10))
            );

            // 2. Action Buttons (Bottom)
            const blacklistCount = (config as any).blacklisted_user_ids?.length || 0;
            components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId('cfg_open_modal_limits').setLabel(t(lang, 'buttons.edit_limits')).setStyle(ButtonStyle.Primary).setEmoji('⏱️'),
                new ButtonBuilder().setCustomId('cfg_open_modal_blacklist').setLabel(t(lang, 'security.blacklist_count', { count: blacklistCount })).setStyle(ButtonStyle.Danger).setEmoji('🚫')
            ));

        } else if (activeTab === 'logs') {
            // 1. Log Channel Select (Top)
            components.push(
                new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(new ChannelSelectMenuBuilder().setCustomId('cfg_select_log').setPlaceholder('📜 Log Channel').setChannelTypes(ChannelType.GuildText))
            );

            // 2. Toggle Buttons (Bottom)
            const auditLogEnabled = (config as any).audit_log_enabled !== false;
            components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId('cfg_toggle_transcript').setLabel(`format: ${config.transcript_format}`).setEmoji('📄').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('cfg_toggle_audit_log').setLabel(auditLogEnabled ? 'audit: on' : 'audit: off').setEmoji(auditLogEnabled ? '✅' : '❌').setStyle(ButtonStyle.Secondary)
            ));
        } else if (activeTab === 'types') {
            // Type Options
            const typeOptionsRaw = this.getTypeOptions(config.ticket_types);
            const typeOptions = typeOptionsRaw.slice(0, 24);

            // 1. Send Panel Dropdown
            const sendOptions = [
                { label: t(lang, 'types.unified_panel'), value: 'unified_all', description: t(lang, 'types.unified_desc') }
            ];

            if (typeOptions.length > 0) {
                sendOptions.push(...typeOptions.map(opt => {
                    const label = t(lang, 'types.individual', { type: opt.label });
                    const desc = t(lang, 'types.individual_desc', { type: opt.label });
                    return {
                        ...opt,
                        label: label.substring(0, 100),
                        description: desc.substring(0, 100)
                    };
                }));
            }

            components.push(
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('cfg_send_panel_action')
                        .setPlaceholder(t(lang, 'placeholders.send_panel'))
                        .addOptions(sendOptions)
                        .setMaxValues(1)
                )
            );


            // 2. Edit/Remove/Toggle Modal Dropdown
            if (typeOptions.length > 0) {
                const allOptions = [
                    ...typeOptions.map(opt => ({
                        label: `✏️ edit: ${opt.label}`,
                        value: `edit:${opt.value}`,
                        description: `edit settings for ${opt.label}`.substring(0, 100),
                        emoji: opt.emoji
                    })),
                    ...typeOptions.map(opt => {
                        const typeData = this.getTypeDataFromConfig(config, opt.value);
                        const modalStatus = typeData?.modalEnabled !== false ? 'on' : 'off';
                        return {
                            label: `📋 modal ${modalStatus}: ${opt.label}`,
                            value: `toggle_modal:${opt.value}`,
                            description: `toggle form for ${opt.label} (currently ${modalStatus})`.substring(0, 100),
                            emoji: opt.emoji
                        };
                    }),
                    ...typeOptions.map(opt => ({
                        label: `🗑️ remove: ${opt.label}`,
                        value: `remove:${opt.value}`,
                        description: `delete ${opt.label}`.substring(0, 100),
                        emoji: opt.emoji
                    }))
                ].slice(0, 25);

                components.push(
                    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('cfg_type_actions')
                            .setPlaceholder('⚙️ edit, toggle modal, or remove type...')
                            .addOptions(allOptions)
                            .setMaxValues(1)
                    )
                );
            }

            // 3. Action Buttons (Bottom)
            const panelMode = (config as any).panel_mode || 'embed';
            const welcomeMode = (config as any).ticket_welcome_mode || 'embed';
            const showTimestamp = (config as any).panel_timestamp ?? true;

            // Row 1: Panel & Welcome Mode Toggles
            components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId('cfg_toggle_panel_mode').setLabel(`panel: ${panelMode}`).setStyle(ButtonStyle.Secondary).setEmoji('📋'),
                new ButtonBuilder().setCustomId('cfg_toggle_welcome_mode').setLabel(`welcome: ${welcomeMode}`).setStyle(ButtonStyle.Secondary).setEmoji('👋'),
                new ButtonBuilder().setCustomId('cfg_toggle_timestamp').setLabel(showTimestamp ? 'date: on' : 'date: off').setStyle(ButtonStyle.Secondary).setEmoji(showTimestamp ? '📅' : '🚫')
            ));

            // Row 2: Edit Actions
            components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId('cfg_open_modal_panel_texts').setLabel('edit panel text').setStyle(ButtonStyle.Primary).setEmoji('✏️'),
                new ButtonBuilder().setCustomId('cfg_open_modal_add_type').setLabel('add type').setStyle(ButtonStyle.Success).setEmoji('➕'),
                new ButtonBuilder().setCustomId('cfg_open_modal_welcome_texts').setLabel('edit welcome').setStyle(ButtonStyle.Primary).setEmoji('👋')
            ));
        }

        return components;
    }
}
