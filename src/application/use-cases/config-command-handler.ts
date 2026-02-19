import { ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType, ComponentType, StringSelectMenuBuilder, MessageFlags } from 'discord.js';
import { IGuildConfigRepository } from '../../domain/repositories/i-guild-config-repository';
import logger from '../../core/logger';
import { t } from '../../shared/utils/i18n';


export class ConfigCommandHandler {
    constructor(private guildRepo: IGuildConfigRepository) { }

    async handle(interaction: ChatInputCommandInteraction): Promise<void> {
        if (!interaction.guild) return;

        // Ensure Owner (Strict Requirement)
        if (interaction.user.id !== interaction.guild.ownerId) {
            await interaction.reply({ content: 'Only the server owner can run this command.', flags: MessageFlags.Ephemeral });
            return;
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'view' || subcommand === 'settings') {
            let config = await this.guildRepo.findByGuildId(interaction.guildId!);

            // Auto-initialize if config is missing (since /ticket setup is removed)
            if (!config) {
                config = await this.guildRepo.createOrUpdate(interaction.guildId!, {
                    enabled: true,
                    ticket_types: {
                        default: {
                            label: 'Support',
                            emoji: '🎫',
                            modalFields: [
                                { customId: 'issue_desc', label: 'Describe your issue', style: 'PARAGRAPH', required: true }
                            ]
                        }
                    }
                });
                // Notify user they just initialized
                await interaction.followUp({ content: '🆕 Guild configuration initialized with default settings.', flags: MessageFlags.Ephemeral });
            }

            const lang = config.language || 'en';

            // Aligned Keys & Strict Vertical Normalization (Exactly 10 lines)
            const lines = [
                `${t(lang, 'system.enabled').padEnd(20)}: ${config.enabled ? t(lang, 'system.yes') : t(lang, 'system.no')}`,
                `${t(lang, 'system.dm_notifications').padEnd(20)}: ${config.dm_notifications_enabled ? t(lang, 'system.yes') : t(lang, 'system.no')}`,
                `${t(lang, 'system.naming').padEnd(20)}: "${config.naming_scheme}"`,
                `${t(lang, 'system.auto_close').padEnd(20)}: ${config.auto_close_hours ? config.auto_close_hours + 'h' : t(lang, 'system.disabled')}`,
                `${t(lang, 'system.transcript').padEnd(20)}: ${config.transcript_format.toUpperCase()}`,
                `${t(lang, 'system.max_tickets').padEnd(20)}: ${config.max_open_tickets_per_user}`,
                `${t(lang, 'system.cooldown').padEnd(20)}: ${config.cooldown_seconds}s`
            ];


            // Normalize to exactly 10 lines to prevent jitter
            while (lines.length < 10) lines.push('');
            const finalBlock = lines.slice(0, 10).join('\n');

            const embed = new EmbedBuilder()
                .setTitle(t(lang, 'system.title'))
                .setColor('#2b2d31') // Discord Dark Theme Color
                .setDescription(`\`\`\`yaml\n${finalBlock}\n\`\`\``)
                .setFooter({ text: `Viewing: ${t(lang, 'nav.system').toUpperCase()}` });


            // Navigation Row (Same as ConfigInteractionHandler)
            const navRow = new ActionRowBuilder<StringSelectMenuBuilder>()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('cfg_nav')
                        .setPlaceholder(t(lang, 'nav.placeholder'))
                        .addOptions([
                            { label: t(lang, 'nav.system'), value: 'system', emoji: '📋', description: t(lang, 'nav.system_desc'), default: true },
                            { label: t(lang, 'nav.types'), value: 'types', emoji: '🎨', description: t(lang, 'nav.types_desc') },
                            { label: t(lang, 'nav.security'), value: 'security', emoji: '🛡️', description: t(lang, 'nav.security_desc') },
                            { label: t(lang, 'nav.logs'), value: 'logs', emoji: '📜', description: t(lang, 'nav.logs_desc') },
                        ])

                );

            // Category Selector
            const categoryRow = new ActionRowBuilder<ChannelSelectMenuBuilder>()
                .addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId('cfg_select_category')
                        .setPlaceholder(t(lang, 'placeholders.category'))
                        .setChannelTypes(ChannelType.GuildCategory)

                );

            // Action Buttons
            const generalRow = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('cfg_toggle_enabled')
                        .setLabel(config.enabled ? 'System: ON' : 'System: OFF')
                        .setEmoji(config.enabled ? '🟢' : '🔴')
                        .setStyle(config.enabled ? ButtonStyle.Secondary : ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('cfg_toggle_dm')
                        .setLabel(config.dm_notifications_enabled ? 'DMs: ON' : 'DMs: OFF')
                        .setEmoji(config.dm_notifications_enabled ? '🔔' : '🔕')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('cfg_open_modal_texts')
                        .setLabel(t(lang, 'buttons.edit_naming'))
                        .setStyle(ButtonStyle.Primary)

                        .setEmoji('📝')
                );

            await interaction.reply({
                embeds: [embed],
                components: [navRow, categoryRow, generalRow],
                flags: MessageFlags.Ephemeral
            });

        }
        // Legacy 'set' removed. Use interactive UI.
    }
}
