import { Ticket } from '@prisma/client';

export interface ITicketRepository {
    create(data: Omit<Ticket, 'ticket_id' | 'created_at' | 'last_activity_at' | 'closed_at' | 'close_reason' | 'close_by' | 'transcript_message_id' | 'transcript_uri' | 'claimed_by' | 'transcript_sha256' | 'transcript_size_bytes' | 'is_locked' | 'priority'>): Promise<Ticket>;
    findById(ticketId: string): Promise<Ticket | null>;
    findByChannelId(channelId: string): Promise<Ticket | null>;
    findOpenByOpener(guildId: string, openerId: string): Promise<Ticket[]>;
    findLastByOpener(guildId: string, openerId: string): Promise<Ticket | null>;
    updateStatus(ticketId: string, status: string, closeReason?: string, closeBy?: string): Promise<Ticket>;
    claimTicket(ticketId: string, staffId: string): Promise<Ticket>;
    transferTicket(ticketId: string, newUserId: string): Promise<Ticket>;
    update(ticketId: string, data: Partial<Ticket>): Promise<Ticket>;
    countOpenTickets(guildId: string): Promise<number>;
}
