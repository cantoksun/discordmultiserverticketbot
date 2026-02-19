
import { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
    console.error('Environment variables DISCORD_TOKEN or DISCORD_CLIENT_ID are missing.');
    process.exit(1);
}

const commands = [
    new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Ticket system management')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        // Only one subcommand: settings
        .addSubcommand(sub =>
            sub.setName('settings')
                .setDescription('View and manage support settings')
        )
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        // This PUT request fully replaces all existing commands with the new set.
        // Since we only provide '/ticket settings', all other commands (including 'voice') will be deleted.
        const data = await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands }
        );

        console.log(`Successfully reloaded ${(data as any).length} application (/) commands.`);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
})();
