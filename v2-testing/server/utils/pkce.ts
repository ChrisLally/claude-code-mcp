// server/utils/pkce.ts

import crypto from 'crypto';
import type { PKCEChallenge } from '../types.js';

/**
 * Generate a random code verifier for PKCE
 * Per RFC 7636: 43-128 characters from [A-Z, a-z, 0-9, -, ., _, ~]
 */
export function generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
}

/**
 * Generate code challenge from verifier using S256 method
 * Per RFC 7636: BASE64URL(SHA256(code_verifier))
 */
export function generateCodeChallenge(verifier: string): string {
    return crypto
        .createHash('sha256')
        .update(verifier)
        .digest('base64url');
}

/**
 * Create a complete PKCE challenge pair
 */
export function createPKCEChallenge(): PKCEChallenge {
    const code_verifier = generateCodeVerifier();
    const code_challenge = generateCodeChallenge(code_verifier);

    return {
        code_verifier,
        code_challenge,
        code_challenge_method: 'S256',
    };
}

/**
 * Verify a code verifier against a challenge
 */
export function verifyPKCEChallenge(verifier: string, challenge: string): boolean {
    const computedChallenge = generateCodeChallenge(verifier);
    return computedChallenge === challenge;
}