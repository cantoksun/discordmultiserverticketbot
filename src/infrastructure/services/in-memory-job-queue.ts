import logger from '../../core/logger';
import { IJobQueue } from '../../domain/services/i-job-queue';

interface QueueItem {
    id: string;
    task: () => Promise<void>;
    resolve: () => void;
    reject: (error: any) => void;
}

export class InMemoryJobQueue implements IJobQueue {
    private queues: Map<string, QueueItem[]> = new Map();
    private processing: Map<string, boolean> = new Map();
    private readonly CONCURRENCY_DELAY = 1000; // 1 second delay between channel ops per guild

    async add(guildId: string, task: () => Promise<void>): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.queues.has(guildId)) {
                this.queues.set(guildId, []);
            }

            const queue = this.queues.get(guildId)!;
            const id = Date.now().toString(36) + Math.random().toString(36).substr(2);

            queue.push({ id, task, resolve, reject });
            logger.debug(`Job added to queue for guild ${guildId}. Queue size: ${queue.length}`);

            this.process(guildId);
        });
    }

    size(guildId: string): number {
        return this.queues.get(guildId)?.length || 0;
    }

    async drain(): Promise<void> {
        logger.info('Draining job queue...');
        return new Promise((resolve) => {
            const check = () => {
                const isProcessing = Array.from(this.processing.values()).some(v => v);
                const hasJobs = Array.from(this.queues.values()).some(q => q.length > 0);

                if (!isProcessing && !hasJobs) {
                    logger.info('Job queue drained.');
                    resolve();
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }

    private async process(guildId: string) {
        if (this.processing.get(guildId)) return;

        const queue = this.queues.get(guildId);
        if (!queue || queue.length === 0) {
            this.processing.set(guildId, false);
            this.queues.delete(guildId);
            return;
        }

        this.processing.set(guildId, true);

        const item = queue.shift();
        if (item) {
            try {
                await item.task();
                item.resolve();
            } catch (error) {
                logger.error(`Job ${item.id} failed for guild ${guildId}`, error);
                item.reject(error);
            } finally {
                // Enforce rate limit / throttle
                setTimeout(() => {
                    this.processing.set(guildId, false);
                    this.process(guildId);
                }, this.CONCURRENCY_DELAY);
            }
        }
    }
}
