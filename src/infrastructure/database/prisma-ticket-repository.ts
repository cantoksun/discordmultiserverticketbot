import { PrismaClient, Ticket } from '@prisma/client';
import { ITicketRepository } from '../../domain/repositories/i-ticket-repository';
import { TicketStatus } from '../../domain/types';

export class PrismaTicketRepository implements ITicketRepository {
    constructor(private prisma: PrismaClient) { }

    async create(data: any): Promise<Ticket> {
        return this.prisma.ticket.create({
            data: {
                ...data,
                status: TicketStatus.OPEN,
            },
        });
    }

    async findById(ticketId: string): Promise<Ticket | null> {
        return this.prisma.ticket.findUnique({
            where: { ticket_id: ticketId },
            include: { guild: true },
        });
    }

    async findByChannelId(channelId: string): Promise<Ticket | null> {
        return this.prisma.ticket.findFirst({
            where: { channel_id: channelId },
            include: { guild: true },
        });
    }

    async findOpenByOpener(guildId: string, openerId: string): Promise<Ticket[]> {
        return this.prisma.ticket.findMany({
            where: {
                guild_id: guildId,
                opener_id: openerId,
                status: TicketStatus.OPEN,
            },
        });
    }

    async findLastByOpener(guildId: string, openerId: string): Promise<Ticket | null> {
        return this.prisma.ticket.findFirst({
            where: {
                guild_id: guildId,
                opener_id: openerId,
            },
            orderBy: {
                created_at: 'desc',
            },
        });
    }

    async updateStatus(ticketId: string, status: string, closeReason?: string, closeBy?: string): Promise<Ticket> {
        return this.prisma.ticket.update({
            where: { ticket_id: ticketId },
            data: {
                status,
                close_reason: closeReason,
                close_by: closeBy,
                closed_at: status === TicketStatus.CLOSED ? new Date() : null,
            },
        });
    }

    async claimTicket(ticketId: string, staffId: string): Promise<Ticket> {
        return this.prisma.ticket.update({
            where: { ticket_id: ticketId },
            data: {
                claimed_by: staffId,
            },
        });
    }

    async transferTicket(ticketId: string, newUserId: string): Promise<Ticket> {
        return this.prisma.ticket.update({
            where: { ticket_id: ticketId },
            data: {
                claimed_by: newUserId,
            },
        });
    }

    async countOpenTickets(guildId: string): Promise<number> {
        return this.prisma.ticket.count({
            where: {
                guild_id: guildId,
                status: TicketStatus.OPEN,
            },
        });
    }

    async update(ticketId: string, data: Partial<Ticket>): Promise<Ticket> {
        return this.prisma.ticket.update({
            where: { ticket_id: ticketId },
            data: data as any,
        });
    }
}
