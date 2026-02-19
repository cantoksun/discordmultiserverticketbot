import { ChatInputCommandInteraction } from 'discord.js';
import { IInteractionHandler } from '../../interfaces/discord/handlers/i-interaction-handler';
import { IGuildConfigRepository } from '../../domain/repositories/i-guild-config-repository';
import logger from '../../core/logger';

export class BlacklistCommandHandler implements IInteractionHandler {
    constructor(private guildRepo: IGuildConfigRepository) { }

    async handle(interaction: ChatInputCommandInteraction): Promise<void> {
        if (!interaction.guildId) return;

        const subcommand = interaction.options.getSubcommand();
        const user = interaction.options.getUser('user', true);

        const config = await this.guildRepo.findByGuildId(interaction.guildId);
        if (!config) {
            await interaction.reply({ content: 'Guild config not found.', ephemeral: true });
            return;
        }

        let blacklist = (config as any).blacklisted_user_ids as string[] || [];

        if (subcommand === 'add') {
            if (blacklist.includes(user.id)) {
                await interaction.reply({ content: 'User is already blacklisted.', ephemeral: true });
                return;
            }
            blacklist.push(user.id);
        } else if (subcommand === 'remove') {
            if (!blacklist.includes(user.id)) {
                await interaction.reply({ content: 'User is not blacklisted.', ephemeral: true });
                return;
            }
            blacklist = blacklist.filter(id => id !== user.id);
        }

        try {
            await this.guildRepo.createOrUpdate(interaction.guildId, {
                blacklisted_user_ids: blacklist
            } as any);
            await interaction.reply({ content: `Successfully ${subcommand === 'add' ? 'blacklisted' : 'removed from blacklist'} <@${user.id}>.`, ephemeral: true });
        } catch (error) {
            logger.error('Failed to update blacklist', error);
            await interaction.reply({ content: 'Failed to update blacklist in database.', ephemeral: true });
        }
    }
}
