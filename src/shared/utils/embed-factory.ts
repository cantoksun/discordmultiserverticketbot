import { EmbedBuilder, ColorResolvable } from 'discord.js';

export class EmbedFactory {
    static create(title: string, description: string, color: ColorResolvable = '#5865F2') {
        return new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color)
            .setTimestamp();
    }

    static error(message: string) {
        return new EmbedBuilder()
            .setTitle('error')
            .setDescription(message)
            .setColor('#ED4245');
    }

    static success(message: string) {
        return new EmbedBuilder()
            .setTitle('success')
            .setDescription(message)
            .setColor('#57F287');
    }
}
