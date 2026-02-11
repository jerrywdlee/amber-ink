import {
    generateAESKey,
    generateRSAKeyPair,
    encryptAES,
    wrapAESKey,
    exportKey
} from './crypto';
import { embedDataInImage, addWatermark } from './steganography';

/**
 * Seals a memory into the Jewelry Box.
 * 
 * 1. Generates ephemeral AES and RSA keys.
 * 2. Encrypts the content with AES.
 * 3. Wraps the AES key with RSA Public Key.
 * 4. Embeds the RAW AES key into the image (Steganography).
 * 5. Returns the ciphertext, the "Key Image" as a Blob, and metadata for DB.
 */
export const sealMemory = async (content, imageSrc, userName) => {
    try {
        // 1. Generate keys
        const aesKey = await generateAESKey();
        const rsaPair = await generateRSAKeyPair();

        // 2. Encrypt content
        const { ciphertext, iv } = await encryptAES(content, aesKey);

        // 3. Wrap AES key for DB storage (Metadata)
        const wrappedAESKey = await wrapAESKey(aesKey, rsaPair.publicKey);
        const exportedRSAPublicKey = await exportKey(rsaPair.publicKey, 'spki');

        // 4. Prepare Steganography (Key on Image)
        // We embed the RAW AES key strings (Base64) into the image
        const rawAESKeyBase64 = await exportKey(aesKey, 'raw');

        // Load image to canvas, watermark it, then embed
        const canvas = await embedDataInImage(imageSrc, rawAESKeyBase64);

        // Add name watermark (shortened to 8 chars internally by addWatermark)
        addWatermark(canvas, userName);

        // 5. Format Metadata Bundle (iv.wrappedKey.ciphertext)
        const memoryBundle = `${iv}.${wrappedAESKey}.${ciphertext}`;

        // 6. Export Key Image as Blob
        const keyImageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

        return {
            success: true,
            keyImageBlob,
            persistenceData: {
                jewelryBox: {
                    memoryBundle,
                    publicKey: exportedRSAPublicKey,
                    lastEncryptedAt: new Date().toISOString(),
                    keyImageName: imageSrc.split('/').pop() // e.g., key_01.png
                }
            }
        };
    } catch (e) {
        console.error("Sealing failed:", e);
        return { success: false, error: e.message };
    }
};

/**
 * Helper to download the key image.
 */
export const downloadKeyImage = (blob, fileName = 'amber_ink_key.png') => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
