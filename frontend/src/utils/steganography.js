/**
 * Utility for image manipulation, steganography (LSB), and watermarking.
 * Works with Canvas API for pixel-level access.
 */

/**
 * Adds a subtle text watermark to an image at a random position.
 */
export const addWatermark = (canvas, text) => {
    const ctx = canvas.getContext('2d');
    const shortName = text.substring(0, 8);
    const displayName = `${shortName} 様`;

    ctx.save();
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; // Brighter/Thicker
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'right';

    // Limit to bottom 10% area
    // padding for readability
    const padding = 15;
    const x = canvas.width - padding;
    const y = canvas.height - padding;

    // Add shadow for better contrast on gem images
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 6;

    ctx.fillText(displayName, x, y);
    ctx.restore();
};

/**
 * Embeds string data into an image using LSB (Least Significant Bit) logic.
 * Primarily uses the Alpha channel for robustness in some browsers/formats,
 * or RGB LSB for standard steganography.
 */
export const embedDataInImage = async (imageSrc, dataStr) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            // 1. Convert data to bit stream
            // We append a delimiter to know where the data ends
            const fullData = dataStr + '###END###';
            const binaryData = Array.from(fullData).map(char =>
                char.charCodeAt(0).toString(2).padStart(8, '0')
            ).join('');

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixels = imageData.data;

            if (binaryData.length > pixels.length / 4) {
                reject(new Error("Image is too small to contain this data."));
                return;
            }

            // 2. Embed bits into LSB of Alpha channel (Safe from color management)
            for (let i = 0; i < binaryData.length; i++) {
                const pixelIndex = i * 4 + 3; // Alpha channel
                const bit = parseInt(binaryData[i]);

                // Set the LSB of Alpha to the bit
                pixels[pixelIndex] = (pixels[pixelIndex] & 0xFE) | bit;
            }

            ctx.putImageData(imageData, 0, 0);

            // Note: addWatermark is usually called before steganography 
            // if we want the watermark to be part of the "cover".
            // But if we do it after, we must ensure it doesn't overwrite our bits.
            // For simplicity, we assume the watermark is small and won't kill the AES key bits.

            resolve(canvas);
        };
        img.onerror = reject;
        img.src = imageSrc;
    });
};

/**
 * Extracts hidden data from an image canvas.
 */
export const extractDataFromImage = (canvas) => {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    let binaryData = '';
    // We check enough pixels to find our delimiter
    // A safe upper bound for a Base64 RSA Private Key (PKCS#8) is ~2-3KB
    // RSA-2048 private key is roughly 1700-1800 chars in Base64
    const maxBits = 64000;

    for (let i = 0; i < Math.min(maxBits, pixels.length / 4); i++) {
        const pixelIndex = i * 4 + 3; // Alpha channel
        binaryData += (pixels[pixelIndex] & 1).toString();
    }

    // Convert bits back to chars
    let extractedStr = '';
    for (let i = 0; i < binaryData.length; i += 8) {
        const byte = binaryData.slice(i, i + 8);
        if (byte.length < 8) break;
        const charCode = parseInt(byte, 2);
        const char = String.fromCharCode(charCode);
        extractedStr += char;

        // Stop at delimiter
        if (extractedStr.endsWith('###END###')) {
            return extractedStr.replace('###END###', '');
        }
    }

    return null;
};
