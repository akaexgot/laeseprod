import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const CAPTCHA_TTL_MS = 30 * 60 * 1000;
const MIN_FORM_FILL_MS = 2500;
const runtimeSecret = randomBytes(32).toString('hex');

function getSecret() {
    return (
        import.meta.env.CAPTCHA_SECRET ||
        import.meta.env.SUPABASE_SERVICE_ROLE_KEY ||
        import.meta.env.RESEND_API_KEY ||
        runtimeSecret
    );
}

function sign(payload: string) {
    return createHmac('sha256', getSecret()).update(payload).digest('hex');
}

function safeCompare(a: string, b: string) {
    const left = Buffer.from(a);
    const right = Buffer.from(b);

    return left.length === right.length && timingSafeEqual(left, right);
}

export function createCaptchaChallenge() {
    const left = 2 + Math.floor(Math.random() * 8);
    const right = 2 + Math.floor(Math.random() * 8);
    const expiresAt = Date.now() + CAPTCHA_TTL_MS;
    const nonce = randomBytes(12).toString('hex');
    const payload = `${left}.${right}.${expiresAt}.${nonce}`;
    const signature = sign(payload);

    return {
        question: `${left} + ${right}`,
        token: `${payload}.${signature}`,
        startedAt: String(Date.now()),
    };
}

export function validateCaptcha(input: {
    token?: unknown;
    answer?: unknown;
    website?: unknown;
    startedAt?: unknown;
}) {
    if (typeof input.website === 'string' && input.website.trim() !== '') {
        return false;
    }

    if (
        typeof input.token !== 'string' ||
        typeof input.answer !== 'string' ||
        typeof input.startedAt !== 'string'
    ) {
        return false;
    }

    const startedAt = Number(input.startedAt);
    if (!Number.isFinite(startedAt) || Date.now() - startedAt < MIN_FORM_FILL_MS) {
        return false;
    }

    const parts = input.token.split('.');
    if (parts.length !== 5) {
        return false;
    }

    const [leftRaw, rightRaw, expiresRaw, nonce, signature] = parts;
    const payload = `${leftRaw}.${rightRaw}.${expiresRaw}.${nonce}`;

    if (!safeCompare(signature, sign(payload))) {
        return false;
    }

    const left = Number(leftRaw);
    const right = Number(rightRaw);
    const expiresAt = Number(expiresRaw);
    const answer = Number(input.answer.trim());

    if (![left, right, expiresAt, answer].every(Number.isFinite)) {
        return false;
    }

    return Date.now() <= expiresAt && answer === left + right;
}
