// controllers/UploadController.js
const UploadService = require('../services/UploadService');
const logger = require('../utils/logger');
const { validateFileType, validateImageDimensions } = require('../utils/file-validator');

/**
 * UploadController
 * Handles file upload operations with validation and processing
 */

/**
 * Upload single file
 * POST /uploads/single
 */
const uploadSingle = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Determine file type from request or auto-detect
    const fileType = req.body.fileType || 'document';

    // Validate file
    const validation = await validateFileType(req.file, fileType);
    if (!validation.valid) {
      // Clean up uploaded file
      if (req.file.path) {
        const fs = require('fs').promises;
        await fs.unlink(req.file.path).catch(() => {});
      }

      return res.status(400).json({
        success: false,
        message: 'File validation failed',
        error: validation.error
      });
    }

    // Upload file
    const result = await UploadService.upload(req.file, {
      fileType,
      userId: req.user?.userId || req.user?.id,
      metadata: req.body.metadata ? JSON.parse(req.body.metadata) : {}
    });

    logger.info('File uploaded successfully', {
      filename: result.filename,
      userId: req.user?.userId
    });

    return res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: result
    });
  } catch (error) {
    logger.error('Single file upload failed:', error);
    return res.status(500).json({
      success: false,
      message: 'File upload failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Upload multiple files
 * POST /uploads/multiple
 */
const uploadMultiple = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const fileType = req.body.fileType || 'document';

    // Validate all files first
    const validationResults = [];
    const validFiles = [];

    for (const file of req.files) {
      const validation = await validateFileType(file, fileType);
      
      if (validation.valid) {
        validFiles.push(file);
      } else {
        validationResults.push({
          filename: file.originalname,
          error: validation.error
        });
        
        // Clean up invalid file
        if (file.path) {
          const fs = require('fs').promises;
          await fs.unlink(file.path).catch(() => {});
        }
      }
    }

    if (validFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'All files failed validation',
        errors: validationResults
      });
    }

    // Upload valid files
    const result = await UploadService.uploadMultiple(validFiles, {
      fileType,
      userId: req.user?.userId || req.user?.id
    });

    logger.info('Multiple files uploaded', {
      totalUploaded: result.totalUploaded,
      totalFailed: result.totalFailed,
      userId: req.user?.userId
    });

    return res.status(201).json({
      success: true,
      message: `Uploaded ${result.totalUploaded} file(s)`,
      data: result,
      validationErrors: validationResults.length > 0 ? validationResults : undefined
    });
  } catch (error) {
    logger.error('Multiple file upload failed:', error);
    return res.status(500).json({
      success: false,
      message: 'File upload failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Upload image with dimension validation
 * POST /uploads/image
 */
const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image uploaded'
      });
    }

    // Validate as image
    const validation = await validateFileType(req.file, 'image');
    if (!validation.valid) {
      // Clean up
      if (req.file.path) {
        const fs = require('fs').promises;
        await fs.unlink(req.file.path).catch(() => {});
      }

      return res.status(400).json({
        success: false,
        message: 'Image validation failed',
        error: validation.error
      });
    }

    // Validate dimensions if constraints provided
    if (req.body.minWidth || req.body.maxWidth || req.body.minHeight || req.body.maxHeight) {
      const dimensionValidation = await validateImageDimensions(req.file, {
        minWidth: req.body.minWidth ? parseInt(req.body.minWidth) : undefined,
        maxWidth: req.body.maxWidth ? parseInt(req.body.maxWidth) : undefined,
        minHeight: req.body.minHeight ? parseInt(req.body.minHeight) : undefined,
        maxHeight: req.body.maxHeight ? parseInt(req.body.maxHeight) : undefined
      });

      if (!dimensionValidation.valid) {
        // Clean up
        if (req.file.path) {
          const fs = require('fs').promises;
          await fs.unlink(req.file.path).catch(() => {});
        }

        return res.status(400).json({
          success: false,
          message: 'Image dimension validation failed',
          error: dimensionValidation.error
        });
      }
    }

    // Upload image
    const result = await UploadService.upload(req.file, {
      fileType: 'image',
      userId: req.user?.userId || req.user?.id,
      generateThumbnails: req.body.generateThumbnails !== 'false'
    });

    logger.info('Image uploaded successfully', {
      filename: result.filename,
      userId: req.user?.userId
    });

    return res.status(201).json({
      success: true,
      message: 'Image uploaded successfully',
      data: result
    });
  } catch (error) {
    logger.error('Image upload failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Image upload failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Delete file
 * DELETE /uploads/:filename
 */
const deleteFile = async (req, res) => {
  try {
    const { filename } = req.params;

    if (!filename) {
      return res.status(400).json({
        success: false,
        message: 'Filename is required'
      });
    }

    // In production, you should verify that the user owns this file
    // or has permission to delete it
    // Example: Check database for file ownership

    // For this example, we'll construct basic file data
    // In production, fetch this from your database
    const fileData = {
      filename,
      provider: process.env.UPLOAD_PROVIDER || 'local',
      // Add other necessary fields based on provider
    };

    await UploadService.delete(fileData);

    logger.info('File deleted successfully', {
      filename,
      userId: req.user?.userId
    });

    return res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    logger.error('File deletion failed:', error);
    
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'File deletion failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get upload statistics
 * GET /uploads/stats
 */
const getStats = async (req, res) => {
  try {
    const stats = await UploadService.getStats();

    return res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Failed to get upload stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Upload avatar/profile picture
 * POST /uploads/avatar
 */
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No avatar image uploaded'
      });
    }

    // Validate as image
    const validation = await validateFileType(req.file, 'image');
    if (!validation.valid) {
      // Clean up
      if (req.file.path) {
        const fs = require('fs').promises;
        await fs.unlink(req.file.path).catch(() => {});
      }

      return res.status(400).json({
        success: false,
        message: 'Avatar validation failed',
        error: validation.error
      });
    }

    // Validate dimensions (avatars should be square-ish)
    const dimensionValidation = await validateImageDimensions(req.file, {
      minWidth: 100,
      maxWidth: 2000,
      minHeight: 100,
      maxHeight: 2000
    });

    if (!dimensionValidation.valid) {
      // Clean up
      if (req.file.path) {
        const fs = require('fs').promises;
        await fs.unlink(req.file.path).catch(() => {});
      }

      return res.status(400).json({
        success: false,
        message: 'Avatar dimension validation failed',
        error: dimensionValidation.error
      });
    }

    // Upload avatar
    const result = await UploadService.upload(req.file, {
      fileType: 'image',
      userId: req.user?.userId || req.user?.id,
      generateThumbnails: true,
      folder: 'avatars'
    });

    // In production, update user's avatar field in database here
    // Example: await User.update({ avatar: result.url }, { where: { id: req.user.userId } });

    logger.info('Avatar uploaded successfully', {
      filename: result.filename,
      userId: req.user?.userId
    });

    return res.status(201).json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: result
    });
  } catch (error) {
    logger.error('Avatar upload failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Avatar upload failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Upload document with specific validation
 * POST /uploads/document
 */
const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No document uploaded'
      });
    }

    // Validate as document
    const validation = await validateFileType(req.file, 'document');
    if (!validation.valid) {
      // Clean up
      if (req.file.path) {
        const fs = require('fs').promises;
        await fs.unlink(req.file.path).catch(() => {});
      }

      return res.status(400).json({
        success: false,
        message: 'Document validation failed',
        error: validation.error
      });
    }

    // Upload document
    const result = await UploadService.upload(req.file, {
      fileType: 'document',
      userId: req.user?.userId || req.user?.id,
      metadata: {
        title: req.body.title,
        description: req.body.description,
        category: req.body.category
      }
    });

    logger.info('Document uploaded successfully', {
      filename: result.filename,
      userId: req.user?.userId
    });

    return res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: result
    });
  } catch (error) {
    logger.error('Document upload failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Document upload failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get file info/metadata
 * GET /uploads/info/:filename
 */
const getFileInfo = async (req, res) => {
  try {
    const { filename } = req.params;

    if (!filename) {
      return res.status(400).json({
        success: false,
        message: 'Filename is required'
      });
    }

    // In production, fetch file metadata from database
    // For now, we'll return basic info
    
    const fs = require('fs').promises;
    const path = require('path');
    const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || './public/uploads');
    const filePath = path.join(uploadDir, filename);

    try {
      const stats = await fs.stat(filePath);
      
      return res.json({
        success: true,
        data: {
          filename,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          url: `${process.env.UPLOAD_PUBLIC_PATH || '/uploads'}/${filename}`
        }
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }
      throw error;
    }
  } catch (error) {
    logger.error('Failed to get file info:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get file information',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  uploadImage,
  uploadAvatar,
  uploadDocument,
  deleteFile,
  getStats,
  getFileInfo
};