/**
 * Image Validation Module
 *
 * Validates uploaded image files for allowed MIME types and size limits.
 * No external dependencies — pure validation logic.
 */

// Allowed MIME types for image uploads
const ALLOWED_MIMETYPES = ['image/jpeg', 'image/png'];

// Maximum file size: 2 MB (2 * 1024 * 1024 bytes)
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2097152 bytes

/**
 * Validates an uploaded image file object.
 *
 * @param {Object} file - The multer file object (must have `mimetype` and `size` properties).
 * @returns {{ valid: boolean, error?: string }} Validation result.
 */
function validateImage(file) {
  try {
    // Check if a file was provided
    if (!file) {
      return { valid: false, error: 'No file provided' };
    }

    // Validate MIME type
    if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
      return {
        valid: false,
        error: `Invalid file type: ${file.mimetype}. Only JPEG and PNG images are allowed.`,
      };
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File too large: ${file.size} bytes. Maximum allowed size is ${MAX_FILE_SIZE} bytes (2 MB).`,
      };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: `Validation error: ${error.message}` };
  }
}

module.exports = { validateImage };
