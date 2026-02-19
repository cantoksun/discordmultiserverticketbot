import { Client, GatewayIntentBits, Interaction, MessageFlags } from 'discord.js';
import logger from './core/logger';
import { handleShutdown } from './core/shutdown';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { PrismaGuildConfigRepository } from './infrastructure/database/prisma-guild-config-repository';
import { PrismaTicketRepository } from './infrastructure/database/prisma-ticket-repository';
import { InMemoryJobQueue } from './infrastructure/services/in-memory-job-queue';
import { SignatureService } from './shared/security/signature-service';
import { TicketService } from './application/services/ticket-service';
import { SetupCommandHandler } from './application/use-cases/setup-command-handler';
import { PanelService } from './application/services/panel-service';
import { InteractionRouter } from './interfaces/discord/interaction-router';
import { PanelButtonHandler, PanelSelectHandler, TicketCreateModalHandler } from './interfaces/discord/handlers/panel-handlers';
import { CloseModalHandler, TicketButtonHandler, TicketTransferSelectHandler } from './interfaces/discord/handlers/ticket-handlers';
import { TranscriptService } from './application/services/transcript-service';
import { DiagnoseCommandHandler } from './application/use-cases/diagnose-command-handler';
import { ConfigCommandHandler } from './application/use-cases/config-command-handler';
import { PanelCommandHandler } from './application/use-cases/panel-command-handler';
import { RoleCommandHandler } from './application/use-cases/role-command-handler';
import { TypeCommandHandler } from './application/use-cases/type-command-handler';
import { AuditLogService } from './application/services/audit-log-service';
import { MemberCommandHandler } from './application/use-cases/member-command-handler';
import { BlacklistCommandHandler } from './application/use-cases/blacklist-command-handler';
import { LegacyInteractionService } from './application/services/legacy-interaction-service';
import { ConfigInteractionHandler } from './interfaces/discord/handlers/config-handlers';
import { ConfigValidationService } from './application/services/config-validation-service';

dotenv.config();

const prisma = new PrismaClient();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
});

// Dependency Injection Container (Manual)
const guildRepo = new PrismaGuildConfigRepository(prisma);
const ticketRepo = new PrismaTicketRepository(prisma);
const jobQueue = new InMemoryJobQueue();
const signer = new SignatureService(process.env.SIGNATURE_SECRET || 'changeme');

const transcriptService = new TranscriptService(client, ticketRepo, guildRepo, jobQueue);
const auditLog = new AuditLogService(client, guildRepo);
const ticketService = new TicketService(client, guildRepo, ticketRepo, jobQueue, signer, auditLog);
const legacyService = new LegacyInteractionService(guildRepo);

// Handlers
const setupCmdHandler = new SetupCommandHandler(guildRepo);
const diagnoseCmdHandler = new DiagnoseCommandHandler(guildRepo, ticketRepo, jobQueue);
const configCmdHandler = new ConfigCommandHandler(guildRepo);
const panelService = new PanelService(guildRepo);
const panelCmdHandler = new PanelCommandHandler(guildRepo, panelService);
const roleCmdHandler = new RoleCommandHandler(guildRepo);
const typeCmdHandler = new TypeCommandHandler(guildRepo);
const memberCmdHandler = new MemberCommandHandler(guildRepo, ticketRepo);
const blacklistCmdHandler = new BlacklistCommandHandler(guildRepo);
const configValidationService = new ConfigValidationService(client, guildRepo);

const panelSelectHandler = new PanelSelectHandler(guildRepo);
const panelButtonHandler = new PanelButtonHandler(guildRepo, ticketService);
const ticketCreateModalHandler = new TicketCreateModalHandler(ticketService, guildRepo);
const ticketButtonHandler = new TicketButtonHandler(ticketRepo, guildRepo, signer, ticketService, legacyService);
const closeModalHandler = new CloseModalHandler(transcriptService);
const transferSelectHandler = new TicketTransferSelectHandler(ticketService, signer);
const configInteractionHandler = new ConfigInteractionHandler(guildRepo, panelService);

// Helper for command handling
const commandHandler = {
    handle: async (i: any) => {
        const subcommand = i.options.getSubcommand(false);
        logger.info(`Interaction: cmd=${i.commandName} sub=${subcommand}`);

        if (i.commandName === 'ticket' && subcommand === 'settings') {
            await configCmdHandler.handle(i);
        } else {
            await i.reply({ content: 'Bilinmeyen komut', flags: MessageFlags.Ephemeral });
        }
    }
};

const router = new InteractionRouter(
    commandHandler, // Command Handler
    [ticketButtonHandler, configInteractionHandler, panelButtonHandler], // Button Handlers
    [ticketCreateModalHandler, closeModalHandler, configInteractionHandler], // Modal Handlers
    [panelSelectHandler, configInteractionHandler], // Select Menu Handler // Modified
    transferSelectHandler, // User Select Menu Handler
    configInteractionHandler, // Channel Select Menu Handler
    configInteractionHandler // Role Select Menu Handler
);

client.on('ready', async () => {
    logger.info(`Logged in as ${client.user?.tag}! (ready)`);
    await configValidationService.validateAllGuilds();
});

client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand() || interaction.isButton() || interaction.isStringSelectMenu() || interaction.isChannelSelectMenu() || interaction.isRoleSelectMenu() || interaction.isModalSubmit()) {
        const customId = (interaction as any).customId || 'N/A';
        logger.info(`[Router] Received Interaction - Type: ${interaction.type} ID: ${customId} User: ${interaction.user.id}`);
    }
    await router.handle(interaction);
});

client.on('error', (error) => {
    logger.error('Discord client error:', error);
});

import { AutoCloseWorker } from './infrastructure/crons/auto-close-worker';

/* ... */

// Workers
const autoCloseWorker = new AutoCloseWorker(client, prisma, transcriptService);

async function main() {
    try {
        await prisma.$connect();
        logger.info('Connected to Database');

        handleShutdown(client, prisma, jobQueue);

        if (!process.env.DISCORD_TOKEN) {
            throw new Error('DISCORD_TOKEN is missing in environment variables (.env file).');
        }

        await client.login(process.env.DISCORD_TOKEN);

        // Start Workers
        autoCloseWorker.start();
    } catch (error) {
        logger.error('Failed to start application:', error);
        process.exit(1);
    }
}

main();
