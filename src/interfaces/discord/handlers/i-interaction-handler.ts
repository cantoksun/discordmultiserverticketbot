import { Interaction } from 'discord.js';

export interface IInteractionHandler {
    handle(interaction: Interaction): Promise<void>;
}
