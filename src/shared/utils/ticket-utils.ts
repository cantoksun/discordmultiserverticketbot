import { TicketTypeConfig } from '../../domain/types';

/**
 * Safely retrieves a TicketTypeConfig from the guild's ticket_types property.
 * Handles both Array (legacy/migrated) and Object (record) structures.
 * 
 * @param ticketTypes The raw ticket_types property from GuildConfig
 * @param key The type key to look for (e.g., 'destek', 'default')
 * @returns The matching TicketTypeConfig or undefined if not found
 */
export function findTicketTypeConfig(ticketTypes: any, key: string): TicketTypeConfig | undefined {
    if (!ticketTypes) return undefined;

    // Case 1: Array (Observed in DB)
    if (Array.isArray(ticketTypes)) {
        // Iterate and find where key property matches
        const found = ticketTypes.find((t: any) => t.key === key);
        if (found) return found as TicketTypeConfig;

        // Fallback: If looking for 'destek' but only '0' exists? No, that's index.
        // Array structure usually has 'key' property inside the object.
        return undefined;
    }

    // Case 2: Object/Record (Expected by Code)
    if (typeof ticketTypes === 'object') {
        return ticketTypes[key] as TicketTypeConfig;
    }

    return undefined;
}

/**
 * Retrieves all available ticket type keys and labels.
 */
export function getTicketTypeOptions(ticketTypes: any): { label: string, value: string, emoji?: string, description?: string }[] {
    if (!ticketTypes) return [];

    const truncate = (str: string, max: number = 100) => {
        if (!str) return str;
        return str.length > max ? str.substring(0, max - 3) + '...' : str;
    };

    const sanitizeEmoji = (emoji: any) => {
        if (typeof emoji !== 'string') return undefined;
        const trimmed = emoji.trim();
        // 1. Custom Emoji regex
        if (/^<a?:.+?:\d+>$/.test(trimmed)) return trimmed;
        // 2. Unicode Emoji (Short length check)
        if (trimmed.length > 4) return undefined;
        // 3. Must NOT be purely alphanumeric (to exclude "ok", "1", "cowboy")
        if (/^[a-zA-Z0-9]+$/.test(trimmed)) return undefined;

        return trimmed.length > 0 ? trimmed : undefined;
    };

    if (Array.isArray(ticketTypes)) {
        return ticketTypes.map((t: any) => ({
            label: truncate(t.label || t.key),
            value: t.key,
            emoji: sanitizeEmoji(t.emoji),
            description: truncate(t.description || `Open a ${t.label || t.key} ticket`)
        }));
    }

    if (typeof ticketTypes === 'object') {
        return Object.entries(ticketTypes).map(([k, v]: [string, any]) => ({
            label: truncate(v.label || k),
            value: k,
            emoji: sanitizeEmoji(v.emoji),
            description: truncate(`Open a ${v.label || k} ticket`)
        }));
    }

    return [];
}
