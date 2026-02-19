import { PrismaClient, GuildConfig } from '@prisma/client';
import { IGuildConfigRepository } from '../../domain/repositories/i-guild-config-repository';

export class PrismaGuildConfigRepository implements IGuildConfigRepository {
    constructor(private prisma: PrismaClient) { }

    async findByGuildId(guildId: string): Promise<GuildConfig | null> {
        return this.prisma.guildConfig.findUnique({
            where: { guild_id: guildId },
        });
    }

    async createOrUpdate(guildId: string, data: Partial<GuildConfig>): Promise<GuildConfig> {
        return this.prisma.guildConfig.upsert({
            where: { guild_id: guildId },
            update: data as any,
            create: {
                guild_id: guildId,
                ticket_category_ids: {},
                ticket_types: {
                    default: {
                        label: 'General Support',
                        modalFields: [
                            { customId: 'issue_desc', label: 'Describe your issue', style: 'PARAGRAPH', required: true }
                        ]
                    }
                },
                support_role_ids: [],
                admin_role_ids: [],
                ...data,
            } as any,
        });
    }

    async incrementTicketSeq(guildId: string): Promise<number> {
        const config = await this.prisma.guildConfig.update({
            where: { guild_id: guildId },
            data: {
                ticket_seq: { increment: 1 },
            },
            select: { ticket_seq: true },
        });
        return config.ticket_seq;
    }
}
