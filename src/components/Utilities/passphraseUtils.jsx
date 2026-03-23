// src/utils/passphraseUtils.js

const PBKDF2_ITERATIONS = 250000;

// ─── Internal helpers ────────────────────────────────────────────────────────

const toBase64 = (buffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));
const fromBase64 = (b64) => Uint8Array.from(atob(b64), c => c.charCodeAt(0));

// Derive an AES-GCM key from a passphrase and salt using PBKDF2
const deriveKey = async (passphrase, salt) => {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        enc.encode(passphrase),
        'PBKDF2',
        false,
        ['deriveKey']
    );
    return window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
};

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Encrypts a PEM private key string with a user-supplied passphrase.
 */
export const encryptPrivateKey = async (privateKeyPem, passphrase) => {
    const salt = window.crypto.getRandomValues(new Uint8Array(32));
    const iv   = window.crypto.getRandomValues(new Uint8Array(12));

    const aesKey = await deriveKey(passphrase, salt);

    const enc = new TextEncoder();
    const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        aesKey,
        enc.encode(privateKeyPem)
    );

    return {
        encryptedKey: toBase64(encrypted),
        salt: toBase64(salt),
        iv:   toBase64(iv),
    };
};

/**
 * Decrypts an encrypted private key blob using the user's passphrase.
 */
export const decryptPrivateKey = async (encryptedKey, salt, iv, passphrase) => {
    const saltBytes      = fromBase64(salt);
    const ivBytes        = fromBase64(iv);
    const encryptedBytes = fromBase64(encryptedKey);

    const aesKey = await deriveKey(passphrase, saltBytes);

    let decrypted;
    try {
        decrypted = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: ivBytes },
            aesKey,
            encryptedBytes
        );
    } catch {
        // AES-GCM authentication tag failure = wrong passphrase
        throw new Error('Incorrect passphrase');
    }

    return new TextDecoder().decode(decrypted);
};