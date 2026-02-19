export interface IJobQueue {
    add(guildId: string, job: () => Promise<void>): Promise<void>;
    size(guildId: string): number;
    drain(): Promise<void>;
}
