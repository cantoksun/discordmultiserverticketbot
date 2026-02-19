import { GuildConfig, Prisma } from '@prisma/client';

export interface IGuildConfigRepository {
    findByGuildId(guildId: string): Promise<GuildConfig | null>;
    createOrUpdate(guildId: string, data: Partial<GuildConfig>): Promise<GuildConfig>;
    incrementTicketSeq(guildId: string): Promise<number>;
}
