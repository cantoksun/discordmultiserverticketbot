import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, TextChannel } from 'discord.js';
import { IGuildConfigRepository } from '../../domain/repositories/i-guild-config-repository';
import { TicketTypeConfig } from '../../domain/types';
import { EmbedFactory } from '../../shared/utils/embed-factory';
import { getTicketTypeOptions } from '../../shared/utils/ticket-utils';

export class PanelService {
    constructor(private guildRepo: IGuildConfigRepository) { }

    async getPanelData(guildId: string) {
        const config = await this.guildRepo.findByGuildId(guildId);
        if (!config || !config.enabled) throw new Error('Guild config not found or disabled.');

        const options = getTicketTypeOptions(config.ticket_types);

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('panel_select_type')
            .setPlaceholder('Select a ticket type...')
            .addOptions(options);

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

        const panelMode = (config as any).panel_mode || 'embed';
        const title = (config as any).panel_title || 'Support Tickets';
        const description = (config as any).panel_description || 'Please select a category below to open a ticket.\nOur support team will be with you shortly.';

        if (panelMode === 'text') {
            // Text Mode
            let content = `**${title}**\n${description}`;
            if ((config as any).panel_footer) {
                content += `\n\n*${(config as any).panel_footer}*`;
            }
            return { content, components: [row] };
        } else {
            // Embed Mode (Default)
            const embed = EmbedFactory.create(title, description, '#5865F2');
            if ((config as any).panel_footer) {
                embed.setFooter({ text: (config as any).panel_footer });
            }
            if ((config as any).panel_timestamp === false) {
                embed.setTimestamp(null);
            }
            return { embeds: [embed], components: [row] };
        }
    }

    async sendPanel(guildId: string, channel: TextChannel) {
        const data = await this.getPanelData(guildId);
        await channel.send(data);
    }

    async updatePanel(guildId: string, channel: TextChannel, messageId: string) {
        const data = await this.getPanelData(guildId);
        const message = await channel.messages.fetch(messageId);
        if (message) {
            await message.edit(data);
        }
    }

    async getTypePanelData(guildId: string, typeKey: string) {
        const config = await this.guildRepo.findByGuildId(guildId);
        if (!config || !config.enabled) throw new Error('Guild config not found or disabled.');

        const typeConfig = Array.isArray(config.ticket_types)
            ? config.ticket_types.find((t: any) => t.key === typeKey)
            : (config.ticket_types as any)?.[typeKey];

        if (!typeConfig) throw new Error(`Ticket type ${typeKey} not found.`);

        const title = typeConfig.panelTitle || `${typeConfig.label} Ticket`;
        const description = typeConfig.panelDescription || `Click the button below to open a **${typeConfig.label}** ticket.`;

        const button = new ButtonBuilder()
            .setCustomId(`panel_open_type:${typeKey}`)
            .setLabel(typeConfig.label)
            .setStyle(ButtonStyle.Primary);

        if (typeConfig.emoji && typeConfig.emoji.trim().length > 0) {
            const raw = typeConfig.emoji.trim();
            // 1. Custom Emoji
            if (/^<a?:.+?:\d+>$/.test(raw)) {
                button.setEmoji(raw);
            }
            // 2. Unicode Emoji (Short length check, NO alphanumeric text like "cowboy")
            else if (raw.length <= 4 && !/^[a-zA-Z0-9]+$/.test(raw)) {
                button.setEmoji(raw);
            }
        }

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

        const panelMode = (config as any).panel_mode || 'embed';

        if (panelMode === 'text') {
            // Text Mode
            let content = `**${title}**\n${description}`;
            return { content, components: [row] };
        } else {
            // Embed Mode (Default)
            const embed = EmbedFactory.create(title, description, '#5865F2');

            if ((config as any).panel_timestamp === false) {
                embed.setTimestamp(null);
            }

            return { embeds: [embed], components: [row] };
        }
    }

    async sendTypePanel(guildId: string, channel: TextChannel, typeKey: string) {
        const data = await this.getTypePanelData(guildId, typeKey);
        await channel.send(data);
    }
}
