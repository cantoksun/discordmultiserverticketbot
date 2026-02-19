import { Client, TextChannel } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { TranscriptService } from '../../application/services/transcript-service';
import logger from '../../core/logger';

export class AutoCloseWorker {
    private intervalIdentifier: any = null;
    private isRunning = false;

    constructor(
        private client: Client,
        private prisma: PrismaClient,
        private transcriptService: TranscriptService,
        private checkIntervalMs: number = 5 * 60 * 1000 // 5 minutes
    ) { }

    start() {
        if (this.intervalIdentifier) return;
        logger.info('AutoCloseWorker started.');
        this.intervalIdentifier = setInterval(() => this.run(), this.checkIntervalMs);
    }

    stop() {
        if (this.intervalIdentifier) {
            clearInterval(this.intervalIdentifier);
            this.intervalIdentifier = null;
        }
    }

    private async run() {
        if (this.isRunning) return;
        this.isRunning = true;

        try {
            // Find guilds with auto_close_hours set
            const configs = await this.prisma.guildConfig.findMany({
                where: { auto_close_hours: { not: null } }
            });

            for (const config of configs) {
                if (!config.auto_close_hours) continue;

                const cutoff = new Date(Date.now() - config.auto_close_hours * 60 * 60 * 1000);

                const staleTickets = await this.prisma.ticket.findMany({
                    where: {
                        guild_id: config.guild_id,
                        status: 'open',
                        last_activity_at: { lt: cutoff }
                    }
                });

                logger.info(`Checking auto-close for guild ${config.guild_id}: Found ${staleTickets.length} stale tickets.`);

                for (const ticket of staleTickets) {
                    try {
                        await this.transcriptService.closeTicket(
                            config.guild_id,
                            ticket.ticket_id,
                            this.client.user!.id,
                            'Auto-closed due to inactivity.'
                        );
                        logger.info(`Auto-closed ticket ${ticket.ticket_id}`);
                    } catch (err) {
                        logger.error(`Failed to auto-close ticket ${ticket.ticket_id}`, err);
                    }
                }
            }
        } catch (error) {
            logger.error('AutoCloseWorker run failed', error);
        } finally {
            this.isRunning = false;
        }
    }
}
