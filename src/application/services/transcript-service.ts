import { Client, TextChannel, Message, AttachmentBuilder, Collection } from 'discord.js';
import { ITicketRepository } from '../../domain/repositories/i-ticket-repository';
import { IGuildConfigRepository } from '../../domain/repositories/i-guild-config-repository';
import { IJobQueue } from '../../domain/services/i-job-queue';
import logger from '../../core/logger';
import { TimeUtils } from '../../shared/utils/time-utils';
import { EmbedFactory } from '../../shared/utils/embed-factory';

export class TranscriptService {
    constructor(
        private client: Client,
        private ticketRepo: ITicketRepository,
        private guildRepo: IGuildConfigRepository,
        private jobQueue: IJobQueue
    ) { }

    async closeTicket(guildId: string, ticketId: string, closedByUserId: string, reason: string): Promise<void> {
        const ticket = await this.ticketRepo.findById(ticketId);
        if (!ticket || ticket.status !== 'open') throw new Error('ticket not found or already closed.');

        const channel = await this.client.channels.fetch(ticket.channel_id) as TextChannel;
        if (!channel) throw new Error('ticket channel no longer exists.');

        // 1. Generate Transcript
        const markdown = await this.generateMarkdown(channel, ticket, closedByUserId, reason);
        const buffer = Buffer.from(markdown, 'utf-8');
        const attachment = new AttachmentBuilder(buffer, { name: `transcript-${ticket.ticket_id}.md` });

        // Calculate SHA256 and Size (Requirement 7)
        const crypto = await import('crypto');
        const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
        const sizeBytes = buffer.length;

        // 2. Log to Log Channel
        const config = await this.guildRepo.findByGuildId(guildId);
        let logMsgId: string | undefined;

        if (config?.log_channel_id) {
            try {
                const logChannel = await this.client.channels.fetch(config.log_channel_id) as TextChannel;
                if (logChannel) {
                    const files = [attachment];
                    const msg = await logChannel.send({
                        content: `ticket closed: **${ticket.ticket_id}** (user: <@${ticket.opener_id}>)`,
                        files: files
                    });
                    logMsgId = msg.id;
                }
            } catch (error) {
                logger.error(`Failed to send log for ticket ${ticketId}`, error);
            }
        }

        // 3. Update DB Status
        await this.ticketRepo.updateStatus(ticketId, 'closed', reason, closedByUserId);

        // Update Metadata
        await (this.ticketRepo as any).updateMetadata?.(ticketId, {
            transcript_message_id: logMsgId,
            transcript_sha256: sha256,
            transcript_size_bytes: sizeBytes
        });

        // 4. Delete Channel (via Queue)
        await this.jobQueue.add(guildId, async () => {
            try {
                await channel.delete(`Ticket closed by ${closedByUserId}`);
            } catch (error) {
                logger.error(`Failed to delete channel ${channel.id}`, error);
            }
        });
    }

    private async generateMarkdown(channel: TextChannel, ticket: any, closedBy: string, reason: string): Promise<string> {
        let output = `# ticket transcript\n\n`;
        output += `- **id:** ${ticket.ticket_id}\n`;
        output += `- **opener:** ${ticket.opener_id}\n`;
        output += `- **closed by:** ${closedBy}\n`;
        output += `- **reason:** ${reason}\n`;
        output += `- **opened:** ${ticket.created_at.toISOString()}\n`;
        output += `- **closed:** ${new Date().toISOString()}\n`;
        output += `\n---\n\n`;

        // Fetch messages (simple fetch loop, could be optimized for massive histories)
        let messages: Message[] = [];
        let lastId: string | undefined;

        while (true) {
            const batch = await channel.messages.fetch({ limit: 100, before: lastId });
            if (batch.size === 0) break;
            messages = messages.concat(Array.from(batch.values()));
            lastId = batch.last()?.id;
        }

        // Reverse to chronological order
        messages.reverse();

        messages.forEach(msg => {
            const time = msg.createdAt.toISOString();
            const author = `${msg.author.tag} (${msg.author.id})`;
            output += `[${time}] **${author}**: ${msg.content || ''}\n`;

            if (msg.attachments.size > 0) {
                msg.attachments.forEach(att => {
                    output += `> [Attachment: ${att.name}](${att.url})\n`;
                });
            }
            if (msg.embeds.length > 0) {
                output += `> [Embed Content Hidden]\n`;
            }
            output += `\n`;
        });

        return output;
    }
}
