import logger from './logger';
import { PrismaClient } from '@prisma/client';
import { Client } from 'discord.js';
import { IJobQueue } from '../domain/services/i-job-queue';

export const handleShutdown = async (client: Client, prisma: PrismaClient, jobQueue: IJobQueue) => {
    const shutdown = async (signal: string) => {
        logger.info(`Received ${signal}. Starting graceful shutdown...`);

        try {
            // 1. Drain Job Queue (Wait for pending channel ops)
            const drainTimeout = setTimeout(() => {
                logger.warn('Queue drain timed out. Proceeding with shutdown.');
            }, 10000); // 10s max wait

            await jobQueue.drain();
            clearTimeout(drainTimeout);

            // 2. Disconnect DB
            logger.info('Disconnecting Database...');
            await prisma.$disconnect();

            // 3. Destroy Client
            logger.info('Destroying Discord Client...');
            await client.destroy();

            logger.info('Graceful shutdown completed. Exiting.');
            process.exit(0);
        } catch (error) {
            logger.error('Error during shutdown:', error);
            process.exit(1);
        }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('uncaughtException', (error) => {
        logger.error('Uncaught Exception:', error);
        // Decide if we should exit or keep running. For critical errors, exit.
        process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
};
