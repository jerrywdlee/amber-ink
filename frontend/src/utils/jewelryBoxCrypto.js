import {
    generateAESKey,
    generateRSAKeyPair,
    encryptAES,
    wrapAESKey,
    unwrapAESKey,
    exportKey,
    importKey,
    decryptAES
} from './crypto';
import { embedDataInImage, extractDataFromImage, addWatermark } from './steganography';

/**
 * Seals a memory into the Jewelry Box.
 * Supports updating an existing box if a public key is provided.
 */
export const sealMemory = async (content, imageSrc, userName, existingPublicKeyBase64 = null) => {
    try {
        let rsaPublicKey;
        let keyImageBlob = null;
        let exportedRSAPublicKey = existingPublicKeyBase64;

        // 1. Prepare RSA Public Key
        if (existingPublicKeyBase64) {
            // Reuse existing public key (Update mode)
            rsaPublicKey = await importKey(existingPublicKeyBase64, {
                name: 'RSA-OAEP',
                hash: 'SHA-256'
            }, 'spki', ['wrapKey']);
        } else {
            // New Box: Generate RSA key pair
            const rsaPair = await generateRSAKeyPair();
            rsaPublicKey = rsaPair.publicKey;
            exportedRSAPublicKey = await exportKey(rsaPair.publicKey, 'spki');

            // Export Private Key (PKCS#8) to embed in image
            const privateKeyBase64 = await exportKey(rsaPair.privateKey, 'pkcs8');

            // Load image to canvas, watermark it, then embed PRIVATE key
            const canvas = await embedDataInImage(imageSrc, privateKeyBase64);
            addWatermark(canvas, userName);
            keyImageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        }

        // 2. Symmetric Encryption (New AES key every time)
        const aesKey = await generateAESKey();
        const { ciphertext, iv } = await encryptAES(content, aesKey);

        // 3. Wrap AES key with RSA Public Key
        const wrappedAESKey = await wrapAESKey(aesKey, rsaPublicKey);

        // 4. Format Metadata Bundle (iv.wrappedKey.ciphertext)
        const memoryBundle = `${iv}.${wrappedAESKey}.${ciphertext}`;

        return {
            success: true,
            keyImageBlob, // null if updating
            persistenceData: {
                jewelryBox: {
                    memoryBundle,
                    publicKey: exportedRSAPublicKey,
                    lastEncryptedAt: new Date().toISOString(),
                    keyImageName: imageSrc.split('/').pop()
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

/**
 * Unseals a memory from the Jewelry Box using a key image.
 */
export const unsealMemory = async (keyImageFile, memoryBundle) => {
    try {
        // 1. Load File into Canvas
        const canvas = await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const c = document.createElement('canvas');
                c.width = img.width;
                c.height = img.height;
                const ctx = c.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(c);
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(keyImageFile);
        });

        // 2. Extract RSA Private Key from Image
        const privateKeyBase64 = extractDataFromImage(canvas);
        if (!privateKeyBase64) {
            throw new Error("この画像には有効な「鍵」が見つかりませんでした。");
        }

        // 3. Import the Private Key
        const rsaPrivateKey = await importKey(privateKeyBase64, {
            name: 'RSA-OAEP',
            hash: 'SHA-256'
        }, 'pkcs8', ['unwrapKey']);

        // 4. Parse Memory Bundle (iv.wrappedKey.ciphertext)
        const parts = memoryBundle.split('.');
        if (parts.length !== 3) {
            throw new Error("データ形式が正しくありません。");
        }
        const [iv, wrappedKey, ciphertext] = parts;

        // 5. Unwrap AES Key
        const aesKey = await unwrapAESKey(wrappedKey, rsaPrivateKey);

        // 6. Decrypt Content
        const content = await decryptAES(ciphertext, iv, aesKey);

        return { success: true, content };
    } catch (e) {
        console.error("Unsealing failed:", e);

        // Specific error for key mismatch
        if (e.name === 'OperationError' || e.message.includes("decryption failed")) {
            return {
                success: false,
                error: "鍵の照合に失敗しました。この宝石箱を開けるための正しい鍵画像か、もう一度確認してみてください。"
            };
        }

        return { success: false, error: e.message };
    }
};
