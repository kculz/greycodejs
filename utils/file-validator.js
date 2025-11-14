// utils/file-validator.js
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const logger = require('./logger');
const uploadConfig = require('../config/upload');

/**
 * File Validator Utility
 * Provides file validation functions for upload security
 */

/**
 * Magic number signatures for file type validation
 * Format: { signature: [mimeTypes] }
 */
const FILE_SIGNATURES = {
  // Images
  'ffd8ff': ['image/jpeg', 'image/jpg'],
  '89504e47': ['image/png'],
  '47494638': ['image/gif'],
  '52494646': ['image/webp'], // RIFF (WebP container)
  '3c3f786d': ['image/svg+xml'], // <?xml (SVG)
  '3c737667': ['image/svg+xml'], // <svg
  
  // Documents
  '25504446': ['application/pdf'],
  '504b0304': [
    'application/zip',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ],
  'd0cf11e0': [
    'application/msword',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint'
  ],
  
  // Text
  'efbbbf': ['text/plain'], // UTF-8 BOM
  'fffe': ['text/plain'], // UTF-16 LE BOM
  'feff': ['text/plain'], // UTF-16 BE BOM
  
  // Archives
  '526172211a07': ['application/x-rar-compressed'], // RAR
  '377abcaf271c': ['application/x-7z-compressed'], // 7z
  '1f8b': ['application/gzip'], // GZIP
  
  // Audio
  '494433': ['audio/mpeg'], // MP3 (ID3)
  'fff3': ['audio/mpeg'], // MP3
  'fff2': ['audio/mpeg'], // MP3
  '52494646': ['audio/wav'], // WAV (RIFF)
  '4f676753': ['audio/ogg'], // OGG
  
  // Video
  '000000146674797069736f6d': ['video/mp4'], // MP4
  '000000186674797033677035': ['video/mp4'], // MP4
  '1a45dfa3': ['video/webm'], // WebM
  '000001ba': ['video/mpeg'], // MPEG
  '000001b3': ['video/mpeg'], // MPEG
  '667479704d534e56': ['video/quicktime'] // MOV
};

/**
 * Validate file against allowed types
 * @param {Object} file - Multer file object
 * @param {string} fileType - Type category (image, document, video, etc.)
 * @returns {Promise<Object>} Validation result
 */
async function validateFileType(file, fileType = 'document') {
  try {
    const allowedTypes = uploadConfig.allowedTypes[fileType];
    
    if (!allowedTypes) {
      throw new Error(`Unknown file type category: ${fileType}`);
    }

    // Check extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedTypes.extensions.includes(ext)) {
      return {
        valid: false,
        error: `File extension ${ext} not allowed. Allowed: ${allowedTypes.extensions.join(', ')}`
      };
    }

    // Check MIME type
    if (!allowedTypes.mimeTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: `MIME type ${file.mimetype} not allowed`
      };
    }

    // Check file size
    if (file.size > allowedTypes.maxSize) {
      return {
        valid: false,
        error: `File too large. Maximum size: ${formatBytes(allowedTypes.maxSize)}`
      };
    }

    // Verify file header if enabled
    if (uploadConfig.validation.checkFileHeader) {
      const headerValid = await validateFileHeader(file);
      if (!headerValid.valid) {
        return headerValid;
      }
    }

    // Check for double extensions if enabled
    if (uploadConfig.validation.rejectDoubleExtensions) {
      const doubleExtCheck = checkDoubleExtension(file.originalname);
      if (!doubleExtCheck.valid) {
        return doubleExtCheck;
      }
    }

    return { valid: true };
  } catch (error) {
    logger.error('File type validation error:', error);
    return {
      valid: false,
      error: error.message
    };
  }
}

/**
 * Validate file header (magic numbers)
 * @param {Object} file - Multer file object
 * @returns {Promise<Object>} Validation result
 */
async function validateFileHeader(file) {
  try {
    const filePath = file.path || file.tempFilePath;
    
    if (!filePath || !fsSync.existsSync(filePath)) {
      return {
        valid: false,
        error: 'File path not found for header validation'
      };
    }

    // Read first 12 bytes
    const buffer = Buffer.alloc(12);
    const fd = fsSync.openSync(filePath, 'r');
    fsSync.readSync(fd, buffer, 0, 12, 0);
    fsSync.closeSync(fd);

    const header = buffer.toString('hex');

    // Check against known signatures
    let matchFound = false;
    let matchedMimeTypes = [];

    for (const [signature, mimeTypes] of Object.entries(FILE_SIGNATURES)) {
      if (header.startsWith(signature)) {
        matchFound = true;
        matchedMimeTypes = mimeTypes;
        break;
      }
    }

    if (!matchFound) {
      // For text files, check if it's valid UTF-8
      if (file.mimetype.startsWith('text/')) {
        const isValidText = isValidTextFile(buffer);
        if (isValidText) {
          return { valid: true };
        }
      }

      return {
        valid: false,
        error: 'File header does not match declared file type (possible spoofing)'
      };
    }

    // Check if declared MIME type matches header
    const mimeMatches = matchedMimeTypes.some(mime => 
      file.mimetype === mime || file.mimetype.startsWith(mime.split('/')[0])
    );

    if (!mimeMatches) {
      return {
        valid: false,
        error: `File header indicates ${matchedMimeTypes[0]} but declared as ${file.mimetype}`
      };
    }

    return { valid: true };
  } catch (error) {
    logger.error('File header validation error:', error);
    return {
      valid: false,
      error: 'Failed to validate file header'
    };
  }
}

/**
 * Check if buffer contains valid text
 * @param {Buffer} buffer
 * @returns {boolean}
 */
function isValidTextFile(buffer) {
  // Check if buffer contains mostly printable characters
  let printableCount = 0;
  const totalBytes = Math.min(buffer.length, 512); // Check first 512 bytes

  for (let i = 0; i < totalBytes; i++) {
    const byte = buffer[i];
    // Printable ASCII (32-126) or common whitespace (9,10,13)
    if ((byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13) {
      printableCount++;
    }
  }

  // If more than 95% is printable, consider it text
  return (printableCount / totalBytes) > 0.95;
}

/**
 * Check for double extensions (e.g., file.jpg.exe)
 * @param {string} filename
 * @returns {Object} Validation result
 */
function checkDoubleExtension(filename) {
  // Remove query parameters if present
  const cleanFilename = filename.split('?')[0];
  
  // Get all extensions
  const parts = cleanFilename.split('.');
  
  if (parts.length > 2) {
    // Check if any part before the last extension looks suspicious
    const suspiciousExtensions = [
      'exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js',
      'jar', 'msi', 'app', 'deb', 'rpm', 'sh', 'php', 'asp',
      'aspx', 'jsp', 'pl', 'py', 'rb', 'cgi'
    ];

    for (let i = 1; i < parts.length - 1; i++) {
      if (suspiciousExtensions.includes(parts[i].toLowerCase())) {
        return {
          valid: false,
          error: 'Double extensions not allowed (possible executable file)'
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Validate filename for security
 * @param {string} filename
 * @returns {Object} Validation result
 */
function validateFilename(filename) {
  // Check for null bytes
  if (filename.includes('\0')) {
    return {
      valid: false,
      error: 'Filename contains null bytes'
    };
  }

  // Check for path traversal attempts
  const pathTraversalPattern = /\.\.[\/\\]/;
  if (pathTraversalPattern.test(filename)) {
    return {
      valid: false,
      error: 'Filename contains path traversal attempt'
    };
  }

  // Check for suspicious characters
  const suspiciousChars = /[<>:"|?*\x00-\x1f]/;
  if (suspiciousChars.test(filename)) {
    return {
      valid: false,
      error: 'Filename contains suspicious characters'
    };
  }

  // Check length
  if (filename.length > 255) {
    return {
      valid: false,
      error: 'Filename too long (max 255 characters)'
    };
  }

  return { valid: true };
}

/**
 * Sanitize filename
 * @param {string} filename
 * @returns {string} Sanitized filename
 */
function sanitizeFilename(filename) {
  if (!uploadConfig.validation.sanitizeFilenames) {
    return filename;
  }

  // Remove path components
  let sanitized = path.basename(filename);

  // Replace special characters with underscores
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Remove multiple consecutive underscores
  sanitized = sanitized.replace(/_{2,}/g, '_');

  // Remove leading/trailing underscores
  sanitized = sanitized.replace(/^_+|_+$/g, '');

  // Ensure we still have a valid filename
  if (!sanitized || sanitized === '' || sanitized === '.') {
    sanitized = 'file_' + Date.now();
  }

  return sanitized;
}

/**
 * Validate image dimensions
 * @param {Object} file - Multer file object
 * @param {Object} constraints - { minWidth, maxWidth, minHeight, maxHeight }
 * @returns {Promise<Object>} Validation result
 */
async function validateImageDimensions(file, constraints = {}) {
  try {
    const sharp = require('sharp');
    const metadata = await sharp(file.path).metadata();

    if (constraints.minWidth && metadata.width < constraints.minWidth) {
      return {
        valid: false,
        error: `Image width too small (minimum: ${constraints.minWidth}px)`
      };
    }

    if (constraints.maxWidth && metadata.width > constraints.maxWidth) {
      return {
        valid: false,
        error: `Image width too large (maximum: ${constraints.maxWidth}px)`
      };
    }

    if (constraints.minHeight && metadata.height < constraints.minHeight) {
      return {
        valid: false,
        error: `Image height too small (minimum: ${constraints.minHeight}px)`
      };
    }

    if (constraints.maxHeight && metadata.height > constraints.maxHeight) {
      return {
        valid: false,
        error: `Image height too large (maximum: ${constraints.maxHeight}px)`
      };
    }

    return {
      valid: true,
      dimensions: {
        width: metadata.width,
        height: metadata.height
      }
    };
  } catch (error) {
    logger.error('Image dimension validation error:', error);
    return {
      valid: false,
      error: 'Failed to validate image dimensions'
    };
  }
}

/**
 * Check if file is an image
 * @param {Object} file
 * @returns {boolean}
 */
function isImage(file) {
  return file.mimetype.startsWith('image/');
}

/**
 * Check if file is a video
 * @param {Object} file
 * @returns {boolean}
 */
function isVideo(file) {
  return file.mimetype.startsWith('video/');
}

/**
 * Check if file is audio
 * @param {Object} file
 * @returns {boolean}
 */
function isAudio(file) {
  return file.mimetype.startsWith('audio/');
}

/**
 * Check if file is a document
 * @param {Object} file
 * @returns {boolean}
 */
function isDocument(file) {
  const documentMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument',
    'text/plain',
    'text/csv'
  ];

  return documentMimeTypes.some(type => file.mimetype.includes(type));
}

/**
 * Format bytes to human readable string
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get file extension
 * @param {string} filename
 * @returns {string}
 */
function getFileExtension(filename) {
  return path.extname(filename).toLowerCase();
}

/**
 * Get file type category from MIME type
 * @param {string} mimetype
 * @returns {string}
 */
function getFileTypeCategory(mimetype) {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype.includes('pdf') || mimetype.includes('document') || 
      mimetype.includes('text') || mimetype.includes('spreadsheet')) {
    return 'document';
  }
  if (mimetype.includes('zip') || mimetype.includes('rar') || 
      mimetype.includes('7z') || mimetype.includes('tar')) {
    return 'archive';
  }
  return 'other';
}

/**
 * Validate multiple files
 * @param {Array} files - Array of multer file objects
 * @param {string} fileType - Type category
 * @returns {Promise<Object>} Validation result
 */
async function validateMultipleFiles(files, fileType = 'document') {
  const results = {
    valid: [],
    invalid: []
  };

  for (const file of files) {
    const validation = await validateFileType(file, fileType);
    
    if (validation.valid) {
      results.valid.push(file);
    } else {
      results.invalid.push({
        file: file.originalname,
        error: validation.error
      });
    }
  }

  return {
    valid: results.invalid.length === 0,
    validFiles: results.valid,
    invalidFiles: results.invalid,
    totalValid: results.valid.length,
    totalInvalid: results.invalid.length
  };
}

module.exports = {
  validateFileType,
  validateFileHeader,
  validateFilename,
  sanitizeFilename,
  validateImageDimensions,
  validateMultipleFiles,
  checkDoubleExtension,
  isImage,
  isVideo,
  isAudio,
  isDocument,
  formatBytes,
  getFileExtension,
  getFileTypeCategory,
  FILE_SIGNATURES
};