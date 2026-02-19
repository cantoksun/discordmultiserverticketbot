import crypto from 'crypto';

export class SignatureService {
    private readonly secret: string;

    constructor(secret: string) {
        if (!secret) {
            throw new Error('SIGNATURE_SECRET is required');
        }
        this.secret = secret;
    }

    /**
     * Generates a signed customId
     * Format: 1:ticketId:action:nonce:signature
     */
    sign(guildId: string, ticketId: string, action: string): string {
        // Use shorter nonce (last 8 chars of timestamp)
        const nonce = Date.now().toString().slice(-8);
        // Format: 1:ticketId:action:nonce:signature
        // Note: GuildID is implicit in verification to end save space
        const payloadToSign = `1:${guildId}:${ticketId}:${action}:${nonce}`;
        const signature = crypto
            .createHmac('sha256', this.secret)
            .update(payloadToSign)
            .digest('hex')
            .substring(0, 10);

        return `1:${ticketId}:${action}:${nonce}:${signature}`;
    }

    // Fallback secret from antigravity-kit for v1 buttons
    private readonly fallbackSecret = '7f9b2d3e5a1c4b8e9f2a0d3c5e7b1a9d8c6b4a2e0f1d3c5b7a9e0f2d4c6b8a1f';

    verify(guildId: string, customId: string): boolean {
        console.log(`[SignatureService] Verifying: ${customId} (Guild: ${guildId})`);
        const parts = customId.split(':');

        // Format 1: (rafford original) -> 1:guildId:ticketId:action:nonce:signature
        // Note: Earlier sign() omitted guildId in payload string but not customId string? No, wait. 
        // sign() returns `1:${ticketId}:${action}:${nonce}:${signature}` (no guildId in string)
        if (parts[0] === '1' && parts.length === 5) {
            const [version, ticketId, action, nonce, signature] = parts;
            // Original code used `1:${guildId}:${ticketId}:${action}:${nonce}` for HMAC
            const payloadToSign = `${version}:${guildId}:${ticketId}:${action}:${nonce}`;
            const expectedSignature = crypto
                .createHmac('sha256', this.secret)
                .update(payloadToSign)
                .digest('hex')
                .substring(0, 10);

            if (signature !== expectedSignature) {
                console.log(`[SignatureService] V1 Fail: Got=${signature} Exp=${expectedSignature}`);
                console.log(`[SignatureService] Payload: ${payloadToSign}`);
                return false;
            }
            return true;
        }

        // Format 2: (antigravity-kit legacy) -> v1:guildId:ticketId:action:nonce:signature
        if (parts[0] === 'v1' && parts.length === 6) {
            const [version, gId, ticketId, action, nonce, signature] = parts;
            if (gId !== guildId) return false;

            const payloadRaw = `${version}:${guildId}:${ticketId}:${action}:${nonce}`;
            // Try with CURRENT secret (unlikely but possible)
            const expectedCurrent = crypto
                .createHmac('sha256', this.secret)
                .update(payloadRaw)
                .digest('hex')
                .substring(0, 16);

            if (signature === expectedCurrent) return true;

            // Try with FALLBACK secret (Antigravity legacy)
            const expectedFallback = crypto
                .createHmac('sha256', this.fallbackSecret)
                .update(payloadRaw)
                .digest('hex')
                .substring(0, 16); // Legacy used 16 chars

            if (signature === expectedFallback) return true;

            // Also try Short (10 char) signature if user updated logic recently 
            // (e.g. if I generated v1 with 10 chars earlier today)
            const expectedFallbackShort = expectedFallback.substring(0, 10);
            if (signature === expectedFallbackShort) return true;

            console.log(`[SignatureService] Legacy V1 Fail: Got=${signature} Exp=${expectedFallback} / ${expectedFallbackShort}`);
            console.log(`[SignatureService] Payload: ${payloadRaw}`);
            return false;
        }

        return false;
    }

    parse(customId: string) {
        const parts = customId.split(':');

        if (parts[0] === '1' && parts.length === 5) {
            return {
                version: parts[0],
                ticketId: parts[1],
                action: parts[2],
                nonce: parts[3],
                signature: parts[4]
            };
        }

        if (parts[0] === 'v1' && parts.length === 6) {
            return {
                version: parts[0],
                ticketId: parts[2], // index 2 is ticketId
                action: parts[3],
                nonce: parts[4],
                signature: parts[5]
            };
        }

        return null;
    }
}
