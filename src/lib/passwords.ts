import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(nodeScrypt);
const PREFIX = 'scrypt';

export async function hashPassword(password: string): Promise<string> {
    if (!password) throw new Error('La contrasena no puede estar vacia');
    const salt = randomBytes(16).toString('hex');
    const derived = await scrypt(password, salt, 64) as Buffer;
    return `${PREFIX}$${salt}$${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, storedValue: string): Promise<boolean> {
    const [prefix, salt, storedHex] = String(storedValue || '').split('$');
    if (prefix !== PREFIX || !salt || !storedHex) return password === storedValue;

    try {
        const stored = Buffer.from(storedHex, 'hex');
        const derived = await scrypt(password, salt, stored.length) as Buffer;
        return stored.length === derived.length && timingSafeEqual(stored, derived);
    } catch {
        return false;
    }
}
