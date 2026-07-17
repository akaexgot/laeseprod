import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../passwords';

describe('portal passwords', () => {
    it('hashes and verifies without storing plain text', async () => {
        const hash = await hashPassword('una-clave-segura');
        expect(hash).not.toContain('una-clave-segura');
        expect(await verifyPassword('una-clave-segura', hash)).toBe(true);
        expect(await verifyPassword('otra-clave', hash)).toBe(false);
    });

    it('accepts legacy plain-text values during migration', async () => {
        expect(await verifyPassword('clave-antigua', 'clave-antigua')).toBe(true);
    });
});
