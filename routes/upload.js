// routes/upload.js
const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const uploadConfig = require('../config/upload');
const UploadController = require('../controllers/UploadController');
const logger = require('../utils/logger');

/**
 * Upload Routes
 * Handles file upload endpoints with multer middleware
 */

// Configure multer for temporary storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.resolve(process.cwd(), uploadConfig.temp.dir);
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    // Temporary filename with timestamp and random string
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter for basic validation
const fileFilter = (req, file, cb) => {
  // Get file type from request or default
  const fileType = req.body.fileType || req.query.fileType || 'document';
  const allowedTypes = uploadConfig.allowedTypes[fileType];

  if (!allowedTypes) {
    logger.warn(`Unknown file type requested: ${fileType}`);
    return cb(new Error(`Invalid file type: ${fileType}`), false);
  }

  // Check MIME type
  if (!allowedTypes.mimeTypes.includes(file.mimetype)) {
    logger.warn(`Rejected file with MIME type: ${file.mimetype}`);
    return cb(new Error(`File type ${file.mimetype} not allowed`), false);
  }

  // Check extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedTypes.extensions.includes(ext)) {
    logger.warn(`Rejected file with extension: ${ext}`);
    return cb(new Error(`File extension ${ext} not allowed`), false);
  }

  cb(null, true);
};

// Multer upload configurations for different use cases
const uploads = {
  // Single file upload
  single: multer({
    storage,
    fileFilter,
    limits: {
      fileSize: uploadConfig.limits.fileSize,
      files: 1
    }
  }).single('file'),

  // Multiple files upload
  multiple: multer({
    storage,
    fileFilter,
    limits: {
      fileSize: uploadConfig.limits.fileSize,
      files: uploadConfig.limits.files
    }
  }).array('files', uploadConfig.limits.files),

  // Image-specific upload
  image: multer({
    storage,
    fileFilter: (req, file, cb) => {
      // Only allow image MIME types
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files are allowed'), false);
      }
      
      const imageTypes = uploadConfig.allowedTypes.image;
      if (!imageTypes.mimeTypes.includes(file.mimetype)) {
        return cb(new Error(`Image type ${file.mimetype} not allowed`), false);
      }
      
      cb(null, true);
    },
    limits: {
      fileSize: uploadConfig.allowedTypes.image.maxSize,
      files: 1
    }
  }).single('image'),

  // Avatar upload (single image)
  avatar: multer({
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
  }).single('avatar'),

  // Document upload
  document: multer({
    storage,
    fileFilter: (req, file, cb) => {
      const docTypes = uploadConfig.allowedTypes.document;
      
      if (!docTypes.mimeTypes.includes(file.mimetype)) {
        return cb(new Error(`Document type ${file.mimetype} not allowed`), false);
      }
      
      cb(null, true);
    },
    limits: {
      fileSize: uploadConfig.allowedTypes.document.maxSize,
      files: 1
    }
  }).single('document')
};

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    let message = 'File upload error';
    
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        message = `File too large. Maximum size: ${uploadConfig.limits.fileSize / (1024 * 1024)}MB`;
        break;
      case 'LIMIT_FILE_COUNT':
        message = `Too many files. Maximum: ${uploadConfig.limits.files}`;
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected field name in upload';
        break;
      case 'LIMIT_PART_COUNT':
        message = 'Too many parts in upload';
        break;
      case 'LIMIT_FIELD_KEY':
        message = 'Field name too long';
        break;
      case 'LIMIT_FIELD_VALUE':
        message = 'Field value too long';
        break;
      case 'LIMIT_FIELD_COUNT':
        message = 'Too many fields';
        break;
      default:
        message = err.message;
    }
    
    logger.warn('Multer error:', { code: err.code, message });
    
    return res.status(400).json({
      success: false,
      message,
      code: err.code
    });
  } else if (err) {
    // Other errors (from file filter, etc.)
    logger.error('Upload error:', err);
    
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload failed'
    });
  }
  
  next();
};

// Optional authentication middleware placeholder
// Replace this with your actual authentication middleware
const optionalAuth = (req, res, next) => {
  // If you have authentication middleware, use it here
  // Example: const { authenticate } = require('../middlewares/auth');
  // For now, we'll just pass through
  next();
};

/**
 * Routes
 */

// Upload single file
router.post(
  '/single',
  optionalAuth,
  uploads.single,
  handleMulterError,
  UploadController.uploadSingle
);

// Upload multiple files
router.post(
  '/multiple',
  optionalAuth,
  uploads.multiple,
  handleMulterError,
  UploadController.uploadMultiple
);

// Upload image with validation
router.post(
  '/image',
  optionalAuth,
  uploads.image,
  handleMulterError,
  UploadController.uploadImage
);

// Upload avatar/profile picture
router.post(
  '/avatar',
  optionalAuth,
  uploads.avatar,
  handleMulterError,
  UploadController.uploadAvatar
);

// Upload document
router.post(
  '/document',
  optionalAuth,
  uploads.document,
  handleMulterError,
  UploadController.uploadDocument
);

// Delete file
router.delete(
  '/:filename',
  optionalAuth,
  UploadController.deleteFile
);

// Get file info
router.get(
  '/info/:filename',
  optionalAuth,
  UploadController.getFileInfo
);

// Get upload statistics
router.get(
  '/stats',
  optionalAuth,
  UploadController.getStats
);

/**
 * Example usage with custom field names
 */

// Upload with custom field name
router.post(
  '/custom/:fieldName',
  optionalAuth,
  (req, res, next) => {
    const fieldName = req.params.fieldName;
    const upload = multer({
      storage,
      fileFilter,
      limits: {
        fileSize: uploadConfig.limits.fileSize,
        files: 1
      }
    }).single(fieldName);
    
    upload(req, res, (err) => {
      if (err) {
        return handleMulterError(err, req, res, next);
      }
      next();
    });
  },
  UploadController.uploadSingle
);

/**
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    const fs = require('fs');
    const tempDir = path.resolve(process.cwd(), uploadConfig.temp.dir);
    const uploadDir = path.resolve(process.cwd(), uploadConfig.local.uploadDir);

    const checks = {
      tempDirExists: fs.existsSync(tempDir),
      tempDirWritable: false,
      uploadDirExists: fs.existsSync(uploadDir),
      uploadDirWritable: false,
      provider: uploadConfig.provider,
      config: {
        maxFileSize: uploadConfig.limits.fileSize,
        maxFiles: uploadConfig.limits.files,
        imageProcessing: uploadConfig.imageProcessing.enabled
      }
    };

    // Test write access
    try {
      const testFile = path.join(tempDir, '.write-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      checks.tempDirWritable = true;
    } catch (e) {
      logger.error('Temp directory not writable:', e);
    }

    try {
      const testFile = path.join(uploadDir, '.write-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      checks.uploadDirWritable = true;
    } catch (e) {
      logger.error('Upload directory not writable:', e);
    }

    const isHealthy = checks.tempDirExists && 
                      checks.tempDirWritable && 
                      checks.uploadDirExists && 
                      checks.uploadDirWritable;

    return res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      status: isHealthy ? 'healthy' : 'unhealthy',
      checks
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    return res.status(503).json({
      success: false,
      status: 'error',
      message: error.message
    });
  }
});

/**
 * Configuration info endpoint (for debugging)
 */
router.get('/config', (req, res) => {
  // Only show config in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      message: 'Config endpoint disabled in production'
    });
  }

  return res.json({
    success: true,
    config: {
      provider: uploadConfig.provider,
      limits: uploadConfig.limits,
      allowedTypes: Object.keys(uploadConfig.allowedTypes),
      imageProcessing: {
        enabled: uploadConfig.imageProcessing.enabled,
        resize: uploadConfig.imageProcessing.resize.enabled,
        thumbnails: uploadConfig.imageProcessing.thumbnails.enabled
      }
    }
  });
});

module.exports = { router };