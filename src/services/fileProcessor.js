/**
 * File Processor Service
 * Handles file uploads (PDF, images) and converts them to base64 for Gemini API
 */

// Supported file types
const SUPPORTED_TYPES = {
    'application/pdf': { icon: '📄', label: 'PDF' },
    'image/png': { icon: '🖼️', label: 'PNG' },
    'image/jpeg': { icon: '🖼️', label: 'JPEG' },
    'image/jpg': { icon: '🖼️', label: 'JPG' },
    'image/webp': { icon: '🖼️', label: 'WebP' }
};

// Maximum file size (20MB for inline data)
const MAX_FILE_SIZE = 20 * 1024 * 1024;

/**
 * Process a file and convert to base64
 * @param {File} file - The file to process
 * @returns {Promise<{base64: string, mimeType: string, fileName: string, fileSize: number}>}
 */
export async function processFile(file) {
    // Validate file type
    if (!SUPPORTED_TYPES[file.type]) {
        throw new Error(`Unsupported file type: ${file.type}. Supported types: PDF, PNG, JPG, JPEG, WebP`);
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}`);
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            // Extract base64 data (remove the data URL prefix)
            const base64 = reader.result.split(',')[1];

            resolve({
                base64,
                mimeType: file.type,
                fileName: file.name,
                fileSize: file.size,
                icon: SUPPORTED_TYPES[file.type].icon,
                label: SUPPORTED_TYPES[file.type].label
            });
        };

        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };

        reader.readAsDataURL(file);
    });
}

/**
 * Format file size to human-readable string
 * @param {number} bytes - File size in bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Check if a file type is supported
 * @param {string} mimeType - The MIME type to check
 * @returns {boolean}
 */
export function isSupported(mimeType) {
    return mimeType in SUPPORTED_TYPES;
}

/**
 * Get file info for display
 * @param {string} mimeType - The MIME type
 * @returns {{icon: string, label: string}}
 */
export function getFileInfo(mimeType) {
    return SUPPORTED_TYPES[mimeType] || { icon: '📎', label: 'File' };
}
