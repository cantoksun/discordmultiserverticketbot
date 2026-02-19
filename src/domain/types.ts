export enum TicketStatus {
    OPEN = 'open',
    CLOSED = 'closed',
    LOCKED = 'locked',
}

export enum TranscriptFormat {
    HTML = 'html',
    MARKDOWN = 'md',
}

export interface TicketTypeConfig {
    label: string;
    emoji?: string;
    categoryId?: string;
    supportRoleIdsOverride?: string[];
    panelTitle?: string;
    panelDescription?: string;
    welcomeTitle?: string;
    welcomeContent?: string;
    welcomeMode?: 'embed' | 'text';
    modalEnabled?: boolean; // Default: true
    modalFields: ModalField[];
}

export interface ModalField {
    customId: string;
    label: string;
    style: 'SHORT' | 'PARAGRAPH';
    required: boolean;
    placeholder?: string;
    minLength?: number;
    maxLength?: number;
}
