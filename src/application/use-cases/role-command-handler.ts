import { ChatInputCommandInteraction } from 'discord.js';
import { IInteractionHandler } from '../../interfaces/discord/handlers/i-interaction-handler';
import { IGuildConfigRepository } from '../../domain/repositories/i-guild-config-repository';
import logger from '../../core/logger';

export class RoleCommandHandler implements IInteractionHandler {
    constructor(private guildRepo: IGuildConfigRepository) { }

    async handle(interaction: ChatInputCommandInteraction): Promise<void> {
        if (!interaction.guildId) return;

        const subcommand = interaction.options.getSubcommand();
        const type = interaction.options.getString('type', true); // 'admin' or 'support'
        const role = interaction.options.getRole('role', true);

        const config = await this.guildRepo.findByGuildId(interaction.guildId);
        if (!config) {
            await interaction.reply({ content: 'Guild config not found. Please run `/ticket setup` first.', ephemeral: true });
            return;
        }

        const field = type === 'admin' ? 'admin_role_ids' : 'support_role_ids';
        let currentRoles = (config as any)[field] as string[] || [];

        if (subcommand === 'add') {
            if (currentRoles.includes(role.id)) {
                await interaction.reply({ content: 'Role is already added.', ephemeral: true });
                return;
            }
            currentRoles.push(role.id);
        } else if (subcommand === 'remove') {
            if (!currentRoles.includes(role.id)) {
                await interaction.reply({ content: 'Role is not in the list.', ephemeral: true });
                return;
            }
            currentRoles = currentRoles.filter(id => id !== role.id);
        }

        try {
            await this.guildRepo.createOrUpdate(interaction.guildId, { [field]: currentRoles });
            await interaction.reply({ content: `Successfully ${subcommand === 'add' ? 'added' : 'removed'} ${role.name} to ${type} roles.`, ephemeral: true });
        } catch (error) {
            logger.error('Failed to update roles', error);
            await interaction.reply({ content: 'Failed to update roles in database.', ephemeral: true });
        }
    }
}
