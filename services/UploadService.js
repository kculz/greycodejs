// services/UploadService.js
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const uploadConfig = require('../config/upload');
const logger = require('../utils/logger');

/**
 * UploadService
 * Handles file uploads with support for multiple storage providers
 * Supports: Local Storage, AWS S3, Cloudinary
 */
class UploadService {
  constructor() {
    this.config = uploadConfig;
    this.provider = uploadConfig.provider;
    this.initialized = false;
  }

  /**
   * Initialize upload service
   */
  async initialize() {
    if (this.initialized) return;

    try {
      switch (this.provider) {
        case 'local':
          await this.initializeLocal();
          break;
        case 's3':
          await this.initializeS3();
          break;
        case 'cloudinary':
          await this.initializeCloudinary();
          break;
        default:
          throw new Error(`Unsupported upload provider: ${this.provider}`);
      }

      this.initialized = true;
      logger.info(`Upload service initialized with provider: ${this.provider}`);
    } catch (error) {
      logger.error('Failed to initialize upload service:', error);
      throw error;
    }
  }

  /**
   * Initialize local storage
   */
  async initializeLocal() {
    const uploadDir = path.resolve(process.cwd(), this.config.local.uploadDir);
    
    // Create upload directory if it doesn't exist
    if (!fsSync.existsSync(uploadDir)) {
      await fs.mkdir(uploadDir, { recursive: true });
      logger.debug(`Created upload directory: ${uploadDir}`);
    }

    // Create temp directory
    const tempDir = path.resolve(process.cwd(), this.config.temp.dir);
    if (!fsSync.existsSync(tempDir)) {
      await fs.mkdir(tempDir, { recursive: true });
      logger.debug(`Created temp directory: ${tempDir}`);
    }

    logger.debug('Local storage initialized');
  }

  /**
   * Initialize AWS S3
   */
  async initializeS3() {
    const AWS = require('aws-sdk');
    
    if (!this.config.s3.bucket || !this.config.s3.accessKeyId || !this.config.s3.secretAccessKey) {
      throw new Error('AWS S3 configuration incomplete');
    }

    AWS.config.update({
      accessKeyId: this.config.s3.accessKeyId,
      secretAccessKey: this.config.s3.secretAccessKey,
      region: this.config.s3.region
    });

    this.s3Client = new AWS.S3();
    
    // Verify bucket exists
    try {
      await this.s3Client.headBucket({ Bucket: this.config.s3.bucket }).promise();
      logger.debug('AWS S3 initialized and bucket verified');
    } catch (error) {
      throw new Error(`S3 bucket ${this.config.s3.bucket} not accessible: ${error.message}`);
    }
  }

  /**
   * Initialize Cloudinary
   */
  async initializeCloudinary() {
    const cloudinary = require('cloudinary').v2;
    
    if (!this.config.cloudinary.cloudName || !this.config.cloudinary.apiKey || !this.config.cloudinary.apiSecret) {
      throw new Error('Cloudinary configuration incomplete');
    }

    cloudinary.config({
      cloud_name: this.config.cloudinary.cloudName,
      api_key: this.config.cloudinary.apiKey,
      api_secret: this.config.cloudinary.apiSecret
    });

    this.cloudinaryClient = cloudinary;
    logger.debug('Cloudinary initialized');
  }

  /**
   * Upload single file
   * @param {Object} file - Multer file object
   * @param {Object} options - Upload options
   * @returns {Promise<Object>}
   */
  async upload(file, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Validate file
      await this.validateFile(file, options);

      // Process image if needed
      let processedFile = file;
      if (this.isImage(file) && this.config.imageProcessing.enabled) {
        processedFile = await this.processImage(file, options);
      }

      // Upload to provider
      let result;
      switch (this.provider) {
        case 'local':
          result = await this.uploadLocal(processedFile, options);
          break;
        case 's3':
          result = await this.uploadS3(processedFile, options);
          break;
        case 'cloudinary':
          result = await this.uploadCloudinary(processedFile, options);
          break;
      }

      // Generate thumbnails if needed
      if (this.isImage(file) && this.config.imageProcessing.thumbnails.enabled) {
        result.thumbnails = await this.generateThumbnails(file, options);
      }

      logger.info(`File uploaded successfully: ${result.filename}`);
      return result;

    } catch (error) {
      logger.error('File upload failed:', error);
      throw error;
    }
  }

  /**
   * Upload multiple files
   * @param {Array} files - Array of multer file objects
   * @param {Object} options - Upload options
   * @returns {Promise<Array>}
   */
  async uploadMultiple(files, options = {}) {
    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        const result = await this.upload(file, options);
        results.push(result);
      } catch (error) {
        errors.push({
          filename: file.originalname,
          error: error.message
        });
      }
    }

    return {
      success: results,
      failed: errors,
      totalUploaded: results.length,
      totalFailed: errors.length
    };
  }

  /**
   * Upload to local storage
   */
  async uploadLocal(file, options = {}) {
    const uploadDir = path.resolve(process.cwd(), this.config.local.uploadDir);
    
    // Generate subdirectory if enabled
    let targetDir = uploadDir;
    if (this.config.local.useSubdirectories) {
      const date = new Date();
      const subdir = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
      targetDir = path.join(uploadDir, subdir);
      
      if (!fsSync.existsSync(targetDir)) {
        await fs.mkdir(targetDir, { recursive: true });
      }
    }

    // Generate unique filename
    const filename = this.generateFilename(file, options);
    const filepath = path.join(targetDir, filename);

    // Move file from temp to upload directory
    await fs.copyFile(file.path, filepath);
    await fs.unlink(file.path); // Delete temp file

    // Calculate relative path for URL
    const relativePath = path.relative(uploadDir, filepath);
    const publicUrl = `${this.config.local.publicPath}/${relativePath.replace(/\\/g, '/')}`;

    return {
      provider: 'local',
      filename,
      originalName: file.originalname,
      path: filepath,
      url: publicUrl,
      size: file.size,
      mimetype: file.mimetype,
      uploadedAt: new Date()
    };
  }

  /**
   * Upload to AWS S3
   */
  async uploadS3(file, options = {}) {
    const filename = this.generateFilename(file, options);
    const key = `${this.config.s3.prefix}${filename}`;

    // Read file buffer
    const fileBuffer = await fs.readFile(file.path);

    const params = {
      Bucket: this.config.s3.bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: file.mimetype,
      ACL: this.config.s3.acl
    };

    const result = await this.s3Client.upload(params).promise();

    // Delete temp file
    await fs.unlink(file.path);

    // Use CloudFront URL if configured
    const url = this.config.s3.cdnUrl
      ? `${this.config.s3.cdnUrl}/${key}`
      : result.Location;

    return {
      provider: 's3',
      filename,
      originalName: file.originalname,
      key: result.Key,
      url,
      bucket: result.Bucket,
      size: file.size,
      mimetype: file.mimetype,
      uploadedAt: new Date()
    };
  }

  /**
   * Upload to Cloudinary
   */
  async uploadCloudinary(file, options = {}) {
    const uploadOptions = {
      folder: this.config.cloudinary.folder,
      resource_type: 'auto',
      use_filename: true,
      unique_filename: true
    };

    if (this.config.cloudinary.uploadPreset) {
      uploadOptions.upload_preset = this.config.cloudinary.uploadPreset;
    }

    const result = await this.cloudinaryClient.uploader.upload(file.path, uploadOptions);

    // Delete temp file
    await fs.unlink(file.path);

    return {
      provider: 'cloudinary',
      filename: result.public_id,
      originalName: file.originalname,
      url: result.secure_url,
      publicId: result.public_id,
      size: result.bytes,
      mimetype: file.mimetype,
      format: result.format,
      width: result.width,
      height: result.height,
      uploadedAt: new Date()
    };
  }

  /**
   * Delete file
   * @param {Object} fileData - File data from upload
   * @returns {Promise<Boolean>}
   */
  async delete(fileData) {
    try {
      switch (fileData.provider || this.provider) {
        case 'local':
          await fs.unlink(fileData.path);
          break;
        case 's3':
          await this.s3Client.deleteObject({
            Bucket: this.config.s3.bucket,
            Key: fileData.key
          }).promise();
          break;
        case 'cloudinary':
          await this.cloudinaryClient.uploader.destroy(fileData.publicId);
          break;
      }

      logger.info(`File deleted: ${fileData.filename}`);
      return true;
    } catch (error) {
      logger.error('File deletion failed:', error);
      throw error;
    }
  }

  /**
   * Validate file
   */
  async validateFile(file, options = {}) {
    // Check file size
    const maxSize = options.maxSize || this.config.limits.fileSize;
    if (file.size > maxSize) {
      throw new Error(`File too large. Maximum size: ${this.formatBytes(maxSize)}`);
    }

    // Check file type
    const fileType = options.fileType || 'document';
    const allowedTypes = this.config.allowedTypes[fileType];

    if (allowedTypes) {
      const ext = path.extname(file.originalname).toLowerCase();
      
      if (!allowedTypes.extensions.includes(ext)) {
        throw new Error(`File type not allowed. Allowed types: ${allowedTypes.extensions.join(', ')}`);
      }

      if (!allowedTypes.mimeTypes.includes(file.mimetype)) {
        throw new Error(`Invalid file MIME type: ${file.mimetype}`);
      }

      if (file.size > allowedTypes.maxSize) {
        throw new Error(`File too large for ${fileType}. Maximum: ${this.formatBytes(allowedTypes.maxSize)}`);
      }
    }

    // Check file header if enabled
    if (this.config.validation.checkFileHeader) {
      await this.validateFileHeader(file);
    }

    return true;
  }

  /**
   * Validate file header (magic numbers)
   */
  async validateFileHeader(file) {
    const fileBuffer = await fs.readFile(file.path);
    const header = fileBuffer.slice(0, 8).toString('hex');

    const signatures = {
      'ffd8ff': ['image/jpeg'],
      '89504e47': ['image/png'],
      '47494638': ['image/gif'],
      '25504446': ['application/pdf'],
      '504b0304': ['application/zip', 'application/vnd.openxmlformats-officedocument']
    };

    let isValid = false;
    for (const [sig, mimeTypes] of Object.entries(signatures)) {
      if (header.startsWith(sig)) {
        isValid = mimeTypes.some(mime => file.mimetype.startsWith(mime));
        break;
      }
    }

    if (!isValid && this.config.validation.checkFileHeader) {
      throw new Error('File header does not match MIME type (possible file type spoofing)');
    }
  }

  /**
   * Process image (resize, optimize, convert)
   */
  async processImage(file, options = {}) {
    try {
      const config = this.config.imageProcessing;
      let image = sharp(file.path);

      // Get image metadata
      const metadata = await image.metadata();

      // Resize if needed
      if (config.resize.enabled) {
        const { maxWidth, maxHeight, quality } = config.resize;
        
        if (metadata.width > maxWidth || metadata.height > maxHeight) {
          image = image.resize(maxWidth, maxHeight, {
            fit: 'inside',
            withoutEnlargement: true
          });
        }

        image = image.jpeg({ quality });
      }

      // Convert format if needed
      if (config.format.convert) {
        switch (config.format.to) {
          case 'webp':
            image = image.webp({ quality: config.resize.quality });
            break;
          case 'jpeg':
            image = image.jpeg({ quality: config.resize.quality });
            break;
          case 'png':
            image = image.png({ quality: config.resize.quality });
            break;
        }
      }

      // Save processed image
      const processedPath = file.path + '.processed';
      await image.toFile(processedPath);

      // Replace original with processed
      await fs.unlink(file.path);
      await fs.rename(processedPath, file.path);

      // Update file stats
      const stats = await fs.stat(file.path);
      file.size = stats.size;

      logger.debug(`Image processed: ${file.originalname}`);
      return file;
    } catch (error) {
      logger.error('Image processing failed:', error);
      // Return original file if processing fails
      return file;
    }
  }

  /**
   * Generate thumbnails
   */
  async generateThumbnails(file, options = {}) {
    const thumbnails = [];
    const config = this.config.imageProcessing.thumbnails;

    for (const size of config.sizes) {
      try {
        const thumbnail = await sharp(file.path)
          .resize(size.width, size.height, {
            fit: 'cover',
            position: 'center'
          })
          .toBuffer();

        // Generate thumbnail filename
        const ext = path.extname(file.originalname);
        const basename = path.basename(file.originalname, ext);
        const thumbFilename = `${basename}_${size.name}${ext}`;

        // Save thumbnail (method depends on provider)
        const thumbFile = {
          ...file,
          originalname: thumbFilename,
          buffer: thumbnail,
          size: thumbnail.length
        };

        const result = await this.saveThumbnail(thumbFile, size.name);
        thumbnails.push(result);

      } catch (error) {
        logger.error(`Failed to generate ${size.name} thumbnail:`, error);
      }
    }

    return thumbnails;
  }

  /**
   * Save thumbnail
   */
  async saveThumbnail(thumbFile, sizeName) {
    // Implementation depends on provider
    // For now, just return metadata
    return {
      size: sizeName,
      width: thumbFile.width,
      height: thumbFile.height,
      url: thumbFile.url
    };
  }

  /**
   * Generate unique filename
   */
  generateFilename(file, options = {}) {
    if (this.config.local.preserveFilename && !options.uniqueFilename) {
      return this.sanitizeFilename(file.originalname);
    }

    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    
    return this.sanitizeFilename(`${basename}_${timestamp}_${random}${ext}`);
  }

  /**
   * Sanitize filename
   */
  sanitizeFilename(filename) {
    if (!this.config.validation.sanitizeFilenames) {
      return filename;
    }

    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  /**
   * Check if file is an image
   */
  isImage(file) {
    return file.mimetype.startsWith('image/');
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get upload statistics
   */
  async getStats() {
    // Return basic stats
    return {
      provider: this.provider,
      initialized: this.initialized,
      config: {
        maxFileSize: this.formatBytes(this.config.limits.fileSize),
        maxFiles: this.config.limits.files,
        imageProcessing: this.config.imageProcessing.enabled,
        virusScan: this.config.virusScan.enabled
      }
    };
  }
}

// Export singleton instance
module.exports = new UploadService();