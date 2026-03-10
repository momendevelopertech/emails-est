import { generateKeyPairSync } from 'crypto';

let cached: { privateKey: string; publicKey: string } | null = null;

export function getJwtKeys() {
    if (cached) return cached;

    const decodePem = (value?: string) => {
        if (!value) return null;
        const trimmed = value.trim();
        if (!trimmed) return null;
        if (trimmed.includes('BEGIN')) {
            return trimmed.replace(/\\n/g, '\n');
        }
        try {
            const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
            if (decoded.includes('BEGIN')) {
                return decoded;
            }
        } catch {
            // ignore decode errors
        }
        return trimmed.replace(/\\n/g, '\n');
    };

    const privateKeyEnv = decodePem(process.env.JWT_PRIVATE_KEY_B64) ?? decodePem(process.env.JWT_PRIVATE_KEY);
    const publicKeyEnv = decodePem(process.env.JWT_PUBLIC_KEY_B64) ?? decodePem(process.env.JWT_PUBLIC_KEY);

    if (privateKeyEnv && publicKeyEnv) {
        cached = { privateKey: privateKeyEnv, publicKey: publicKeyEnv };
        return cached;
    }

    if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_PRIVATE_KEY and JWT_PUBLIC_KEY must be set in production');
    }

    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    cached = {
        privateKey: privateKey.export({ type: 'pkcs1', format: 'pem' }).toString(),
        publicKey: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    };
    return cached;
}
