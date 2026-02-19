import { Interaction, MessageFlags } from 'discord.js';
import logger from '../../core/logger';

interface IInteractionHandler {
    handle(interaction: Interaction): Promise<void>;
}

export class InteractionRouter {
    private commandHandlers: IInteractionHandler[];
    private buttonHandlers: IInteractionHandler[];
    private modalHandlers: IInteractionHandler[];
    private selectMenuHandlers: IInteractionHandler[];
    private userSelectMenuHandlers: IInteractionHandler[];
    private channelSelectMenuHandlers: IInteractionHandler[];
    private roleSelectMenuHandlers: IInteractionHandler[];

    constructor(
        commandHandlers: IInteractionHandler | IInteractionHandler[],
        buttonHandlers: IInteractionHandler | IInteractionHandler[],
        modalHandlers: IInteractionHandler | IInteractionHandler[],
        selectMenuHandlers: IInteractionHandler | IInteractionHandler[],
        userSelectMenuHandlers: IInteractionHandler | IInteractionHandler[] = [],
        channelSelectMenuHandlers: IInteractionHandler | IInteractionHandler[] = [],
        roleSelectMenuHandlers: IInteractionHandler | IInteractionHandler[] = []
    ) {
        this.commandHandlers = Array.isArray(commandHandlers) ? commandHandlers : [commandHandlers];
        this.buttonHandlers = Array.isArray(buttonHandlers) ? buttonHandlers : [buttonHandlers];
        this.modalHandlers = Array.isArray(modalHandlers) ? modalHandlers : [modalHandlers];
        this.selectMenuHandlers = Array.isArray(selectMenuHandlers) ? selectMenuHandlers : [selectMenuHandlers];
        this.userSelectMenuHandlers = Array.isArray(userSelectMenuHandlers) ? userSelectMenuHandlers : [userSelectMenuHandlers];
        this.channelSelectMenuHandlers = Array.isArray(channelSelectMenuHandlers) ? channelSelectMenuHandlers : [channelSelectMenuHandlers];
        this.roleSelectMenuHandlers = Array.isArray(roleSelectMenuHandlers) ? roleSelectMenuHandlers : [roleSelectMenuHandlers];
    }

    async handle(interaction: Interaction) {
        const startTime = Date.now();
        const customId = (interaction as any).customId || 'N/A';
        const guildId = interaction.guildId || 'DM';

        try {
            if (interaction.isChatInputCommand()) {
                await this.executeHandlers(this.commandHandlers, interaction);
            } else if (interaction.isButton()) {
                await this.executeHandlers(this.buttonHandlers, interaction);
            } else if (interaction.isModalSubmit()) {
                await this.executeHandlers(this.modalHandlers, interaction);
            } else if (interaction.isStringSelectMenu()) {
                await this.executeHandlers(this.selectMenuHandlers, interaction);
            } else if (interaction.isUserSelectMenu()) {
                await this.executeHandlers(this.userSelectMenuHandlers, interaction);
            } else if (interaction.isChannelSelectMenu()) {
                await this.executeHandlers(this.channelSelectMenuHandlers, interaction);
            } else if (interaction.isRoleSelectMenu()) {
                await this.executeHandlers(this.roleSelectMenuHandlers, interaction);
            }
        } catch (error) {
            const latency = Date.now() - startTime;
            logger.error(`[InteractionRouter] Critical error`, {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                guildId,
                userId: interaction.user.id,
                type: interaction.type,
                customId,
                latencyMs: latency
            });

            if (interaction.isRepliable()) {
                const errorMessage = '❌ Etkileşim işlenirken bir hata oluştu.';
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: errorMessage, flags: MessageFlags.Ephemeral }).catch(() => null);
                } else {
                    await interaction.reply({ content: errorMessage, flags: MessageFlags.Ephemeral }).catch(() => null);
                }
            }
        }
    }

    private async executeHandlers(handlers: IInteractionHandler[], interaction: Interaction) {
        for (const handler of handlers) {
            // Stop if a previous handler already responded
            if ((interaction as any).replied || (interaction as any).deferred) return;
            await handler.handle(interaction);
        }
    }
}

