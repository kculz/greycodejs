// middlewares/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const uploadConfig = require('../config/upload');
const logger = require('../utils/logger');
const { validateFilename, sanitizeFilename } = require('../utils/file-validator');

/**
 * Upload Middleware
 * Configures multer for file uploads with validation and security features
 */

// Ensure upload directories exist
const initializeDirectories = () => {
  const uploadDir = path.resolve(process.cwd(), uploadConfig.local.uploadDir);
  const tempDir = path.resolve(process.cwd(), uploadConfig.temp.dir);

  [uploadDir, tempDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`Created directory: ${dir}`);
    }
  });
};

// Initialize directories on module load
try {
  initializeDirectories();
} catch (error) {
  logger.error('Failed to initialize upload directories:', error);
}

/**
 * Configure multer storage
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.resolve(process.cwd(), uploadConfig.temp.dir);
    
    // Ensure directory exists
    if (!fs.existsSync(tempDir)) {
      try {
        fs.mkdirSync(tempDir, { recursive: true });
      } catch (error) {
        logger.error('Failed to create temp directory:', error);
        return cb(error);
      }
    }
    
    cb(null, tempDir);
  },
  
  filename: (req, file, cb) => {
    try {
      // Validate filename
      const filenameValidation = validateFilename(file.originalname);
      if (!filenameValidation.valid) {
        logger.warn('Invalid filename detected:', file.originalname);
        return cb(new Error(filenameValidation.error));
      }

      // Sanitize filename
      const sanitized = sanitizeFilename(file.originalname);
      
      // Generate unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(sanitized);
      const basename = path.basename(sanitized, ext);
      
      const filename = `${basename}-${uniqueSuffix}${ext}`;
      
      // Store original name in file object for later use
      file.originalname = sanitized;
      
      cb(null, filename);
    } catch (error) {
      logger.error('Error generating filename:', error);
      cb(error);
    }
  }
});

/**
 * File filter function
 * Performs basic validation before storing the file
 */
const fileFilter = (req, file, cb) => {
  try {
    // Get file type from request
    const fileType = req.body.fileType || req.query.fileType || 'document';
    
    // Check if file type is valid
    const allowedTypes = uploadConfig.allowedTypes[fileType];
    if (!allowedTypes) {
      logger.warn(`Unknown file type requested: ${fileType}`);
      return cb(new Error(`Invalid file type category: ${fileType}`), false);
    }

    // Check MIME type
    if (!allowedTypes.mimeTypes.includes(file.mimetype)) {
      logger.warn(`Rejected file with MIME type: ${file.mimetype}`, {
        filename: file.originalname,
        expected: allowedTypes.mimeTypes
      });
      return cb(
        new Error(`File type ${file.mimetype} not allowed for ${fileType} uploads`),
        false
      );
    }

    // Check extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedTypes.extensions.includes(ext)) {
      logger.warn(`Rejected file with extension: ${ext}`, {
        filename: file.originalname,
        expected: allowedTypes.extensions
      });
      return cb(
        new Error(`File extension ${ext} not allowed for ${fileType} uploads`),
        false
      );
    }

    // File passed basic validation
    logger.debug('File passed basic validation:', {
      filename: file.originalname,
      mimetype: file.mimetype,
      fileType
    });
    
    cb(null, true);
  } catch (error) {
    logger.error('File filter error:', error);
    cb(error, false);
  }
};

/**
 * Multer configuration options
 */
const multerOptions = {
  storage,
  fileFilter,
  limits: {
    fileSize: uploadConfig.limits.fileSize,
    files: uploadConfig.limits.files,
    fields: 10,
    fieldNameSize: 100,
    fieldSize: 1024 * 1024, // 1MB for text fields
  }
};

/**
 * Create multer instance
 */
const upload = multer(multerOptions);

/**
 * Predefined upload configurations for different use cases
 */
const uploadConfigs = {
  /**
   * Single file upload
   * Usage: uploadConfigs.single('file')
   */
  single: (fieldName = 'file') => upload.single(fieldName),

  /**
   * Multiple files upload (same field)
   * Usage: uploadConfigs.multiple('files', 10)
   */
  multiple: (fieldName = 'files', maxCount = uploadConfig.limits.files) => 
    upload.array(fieldName, maxCount),

  /**
   * Multiple files with different field names
   * Usage: uploadConfigs.fields([
   *   { name: 'avatar', maxCount: 1 },
   *   { name: 'gallery', maxCount: 8 }
   * ])
   */
  fields: (fields) => upload.fields(fields),

  /**
   * Image upload only
   */
  image: (fieldName = 'image') => {
    const imageUpload = multer({
      storage,
      fileFilter: (req, file, cb) => {
        // Only allow images
        if (!file.mimetype.startsWith('image/')) {
          return cb(new Error('Only image files are allowed'), false);
        }

        const imageTypes = uploadConfig.allowedTypes.image;
        if (!imageTypes.mimeTypes.includes(file.mimetype)) {
          return cb(
            new Error(`Image type ${file.mimetype} not allowed`),
            false
          );
        }

        cb(null, true);
      },
      limits: {
        fileSize: uploadConfig.allowedTypes.image.maxSize,
        files: 1
      }
    });

    return imageUpload.single(fieldName);
  },

  /**
   * Document upload only
   */
  document: (fieldName = 'document') => {
    const docUpload = multer({
      storage,
      fileFilter: (req, file, cb) => {
        const docTypes = uploadConfig.allowedTypes.document;
        
        if (!docTypes.mimeTypes.some(type => file.mimetype.includes(type.split('/')[1]))) {
          return cb(
            new Error(`Document type ${file.mimetype} not allowed`),
            false
          );
        }

        cb(null, true);
      },
      limits: {
        fileSize: uploadConfig.allowedTypes.document.maxSize,
        files: 1
      }
    });

    return docUpload.single(fieldName);
  },

  /**
   * Video upload only
   */
  video: (fieldName = 'video') => {
    const videoUpload = multer({
      storage,
      fileFilter: (req, file, cb) => {
        const videoTypes = uploadConfig.allowedTypes.video;
        
        if (!videoTypes.mimeTypes.includes(file.mimetype)) {
          return cb(
            new Error(`Video type ${file.mimetype} not allowed`),
            false
          );
        }

        cb(null, true);
      },
      limits: {
        fileSize: uploadConfig.allowedTypes.video.maxSize,
        files: 1
      }
    });

    return videoUpload.single(fieldName);
  },

  /**
   * Avatar upload (small image)
   */
  avatar: (fieldName = 'avatar') => {
    const avatarUpload = multer({
      storage,
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(new Error('Only image files are allowed for avatars'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 2 * 1024 * 1024, // 2MB for avatars
        files: 1
      }
    });

    return avatarUpload.single(fieldName);
  }
};

/**
 * Error handling middleware for multer errors
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    let statusCode = 400;
    let message = 'File upload error';
    
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        message = `File too large. Maximum size: ${Math.round(uploadConfig.limits.fileSize / (1024 * 1024))}MB`;
        break;
      case 'LIMIT_FILE_COUNT':
        message = `Too many files. Maximum allowed: ${uploadConfig.limits.files}`;
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = `Unexpected field name: ${err.field}`;
        break;
      case 'LIMIT_PART_COUNT':
        message = 'Too many parts in the multipart upload';
        break;
      case 'LIMIT_FIELD_KEY':
        message = 'Field name is too long';
        break;
      case 'LIMIT_FIELD_VALUE':
        message = 'Field value is too long';
        break;
      case 'LIMIT_FIELD_COUNT':
        message = 'Too many fields in the upload';
        break;
      default:
        message = err.message || 'Unknown upload error';
    }
    
    logger.warn('Multer error:', {
      code: err.code,
      field: err.field,
      message
    });
    
    return res.status(statusCode).json({
      success: false,
      message,
      code: err.code
    });
  } else if (err) {
    // Other errors (validation, file filter, etc.)
    logger.error('Upload error:', err);
    
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload failed'
    });
  }
  
  next();
};

/**
 * Cleanup middleware - removes uploaded files on error
 */
const cleanupOnError = (err, req, res, next) => {
  // Clean up uploaded files if an error occurred
  if (err) {
    const filesToCleanup = [];

    if (req.file) {
      filesToCleanup.push(req.file.path);
    }

    if (req.files) {
      if (Array.isArray(req.files)) {
        req.files.forEach(file => filesToCleanup.push(file.path));
      } else {
        Object.values(req.files).forEach(fileArray => {
          fileArray.forEach(file => filesToCleanup.push(file.path));
        });
      }
    }

    // Delete files
    filesToCleanup.forEach(filePath => {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) {
            logger.error('Failed to cleanup file:', {
              path: filePath,
              error: unlinkErr.message
            });
          } else {
            logger.debug('Cleaned up file:', filePath);
          }
        });
      }
    });
  }

  next(err);
};

/**
 * Request logging middleware
 */
const logUploadRequest = (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    if (req.file || req.files) {
      const fileCount = req.file ? 1 : (
        Array.isArray(req.files) ? req.files.length : 
        Object.values(req.files).reduce((sum, arr) => sum + arr.length, 0)
      );

      logger.info('Upload request completed:', {
        method: req.method,
        path: req.path,
        fileCount,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userId: req.user?.userId || req.user?.id
      });
    }
  });

  next();
};

/**
 * Temporary file cleanup utility
 * Call this periodically to remove old temp files
 */
const cleanupTempFiles = async (maxAge = uploadConfig.temp.cleanupInterval || 3600000) => {
  const tempDir = path.resolve(process.cwd(), uploadConfig.temp.dir);
  
  try {
    if (!fs.existsSync(tempDir)) {
      return;
    }

    const files = fs.readdirSync(tempDir);
    const now = Date.now();
    let cleaned = 0;

    for (const file of files) {
      const filePath = path.join(tempDir, file);
      
      try {
        const stats = fs.statSync(filePath);
        const age = now - stats.mtimeMs;

        if (age > maxAge) {
          fs.unlinkSync(filePath);
          cleaned++;
        }
      } catch (error) {
        logger.error('Error cleaning up temp file:', {
          file,
          error: error.message
        });
      }
    }

    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} temporary file(s)`);
    }
  } catch (error) {
    logger.error('Failed to cleanup temp files:', error);
  }
};

// Schedule periodic cleanup
if (uploadConfig.temp.cleanupInterval) {
  setInterval(cleanupTempFiles, uploadConfig.temp.cleanupInterval);
  logger.debug('Scheduled temp file cleanup');
}

/**
 * Export upload configurations and utilities
 */
module.exports = {
  // Main upload instance
  upload,
  
  // Predefined configurations
  ...uploadConfigs,
  
  // Error handling
  handleUploadError,
  cleanupOnError,
  
  // Utilities
  logUploadRequest,
  cleanupTempFiles,
  initializeDirectories,
  
  // Legacy export for backward compatibility
  _upload: upload
};