/**
 * Web Crypto API based cryptographic utilities for the Jewelry Box.
 * Provides AES-GCM encryption/decryption and RSA-OAEP key wrapping.
 */

// --- Utility Helpers ---

const arrayBufferToBase64 = (buffer) => {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
};

const base64ToArrayBuffer = (base64) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
};

// --- AES-GCM Operations ---

/**
 * Generates a random 256-bit AES-GCM key.
 */
export const generateAESKey = async () => {
    return await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
};

/**
 * Encrypts cleartext using AES-GCM.
 * Returns { ciphertext: base64, iv: base64 }
 */
export const encryptAES = async (text, key) => {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedText = new TextEncoder().encode(text);

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encodedText
    );

    return {
        ciphertext: arrayBufferToBase64(ciphertextBuffer),
        iv: arrayBufferToBase64(iv)
    };
};

/**
 * Decrypts AES-GCM ciphertext.
 */
export const decryptAES = async (ciphertextBase64, ivBase64, key) => {
    const ciphertext = base64ToArrayBuffer(ciphertextBase64);
    const iv = base64ToArrayBuffer(ivBase64);

    try {
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            ciphertext
        );
        return new TextDecoder().decode(decryptedBuffer);
    } catch (e) {
        console.error("Decryption failed:", e);
        throw new Error("Failed to decrypt content. Key might be incorrect.");
    }
};

// --- RSA-OAEP Operations ---

/**
 * Generates an RSA-2048 key pair for wrapping.
 */
export const generateRSAKeyPair = async () => {
    return await window.crypto.subtle.generateKey(
        {
            name: 'RSA-OAEP',
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256'
        },
        true,
        ['wrapKey', 'unwrapKey']
    );
};

/**
 * Wraps (encrypts) an AES key using an RSA Public Key.
 */
export const wrapAESKey = async (aesKey, rsaPublicKey) => {
    const wrappedBuffer = await window.crypto.subtle.wrapKey(
        'raw',
        aesKey,
        rsaPublicKey,
        'RSA-OAEP'
    );
    return arrayBufferToBase64(wrappedBuffer);
};

/**
 * Unwraps (decrypts) an AES key using an RSA Private Key.
 */
export const unwrapAESKey = async (wrappedKeyBase64, rsaPrivateKey) => {
    const wrappedBuffer = base64ToArrayBuffer(wrappedKeyBase64);
    return await window.crypto.subtle.unwrapKey(
        'raw',
        wrappedBuffer,
        rsaPrivateKey,
        'RSA-OAEP',
        'AES-GCM',
        true,
        ['encrypt', 'decrypt']
    );
};

// --- Export/Import Utilities ---

/**
 * Exports a key to Base64 (Spki for Public, Pkcs8 for Private, Raw for Symmetric).
 */
export const exportKey = async (key, format = 'raw') => {
    const exported = await window.crypto.subtle.exportKey(format, key);
    return arrayBufferToBase64(exported);
};

/**
 * Imports a key from Base64.
 */
export const importKey = async (base64, algorithm, format = 'raw', usages = ['encrypt', 'decrypt']) => {
    const buffer = base64ToArrayBuffer(base64);
    return await window.crypto.subtle.importKey(format, buffer, algorithm, true, usages);
};
