// config/upload.js
const path = require('path');

/**
 * File Upload Configuration
 * Supports: Local Storage, AWS S3, Cloudinary
 */

module.exports = {
  // Storage provider: 'local', 's3', 'cloudinary'
  provider: process.env.UPLOAD_PROVIDER || 'local',

  // Local storage configuration
  local: {
    // Upload directory relative to project root
    uploadDir: process.env.UPLOAD_DIR || './public/uploads',
    
    // Public URL path for uploaded files
    publicPath: process.env.UPLOAD_PUBLIC_PATH || '/uploads',
    
    // Create subdirectories by date (YYYY/MM/DD)
    useSubdirectories: process.env.UPLOAD_SUBDIRS === 'true',
    
    // Preserve original filename (add timestamp if false)
    preserveFilename: process.env.UPLOAD_PRESERVE_FILENAME === 'true'
  },

  // AWS S3 configuration
  s3: {
    bucket: process.env.AWS_S3_BUCKET,
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    
    // S3 specific options
    acl: process.env.AWS_S3_ACL || 'public-read', // 'private', 'public-read', 'public-read-write'
    
    // CloudFront CDN URL (optional)
    cdnUrl: process.env.AWS_CLOUDFRONT_URL,
    
    // Folder prefix in bucket
    prefix: process.env.AWS_S3_PREFIX || 'uploads/'
  },

  // Cloudinary configuration
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    
    // Cloudinary folder
    folder: process.env.CLOUDINARY_FOLDER || 'uploads',
    
    // Upload preset (optional)
    uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET
  },

  // File size limits (in bytes)
  limits: {
    fileSize: parseInt(process.env.UPLOAD_MAX_FILE_SIZE || (10 * 1024 * 1024)), // 10MB default
    files: parseInt(process.env.UPLOAD_MAX_FILES || '10'), // Max files per upload
  },

  // Allowed file types
  allowedTypes: {
    // Image uploads
    image: {
      mimeTypes: [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml'
      ],
      extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
      maxSize: 5 * 1024 * 1024 // 5MB
    },
    
    // Document uploads
    document: {
      mimeTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv'
      ],
      extensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv'],
      maxSize: 10 * 1024 * 1024 // 10MB
    },
    
    // Video uploads
    video: {
      mimeTypes: [
        'video/mp4',
        'video/mpeg',
        'video/quicktime',
        'video/x-msvideo',
        'video/webm'
      ],
      extensions: ['.mp4', '.mpeg', '.mov', '.avi', '.webm'],
      maxSize: 100 * 1024 * 1024 // 100MB
    },
    
    // Audio uploads
    audio: {
      mimeTypes: [
        'audio/mpeg',
        'audio/wav',
        'audio/ogg',
        'audio/webm'
      ],
      extensions: ['.mp3', '.wav', '.ogg', '.webm'],
      maxSize: 20 * 1024 * 1024 // 20MB
    },
    
    // Archive uploads
    archive: {
      mimeTypes: [
        'application/zip',
        'application/x-rar-compressed',
        'application/x-7z-compressed',
        'application/gzip'
      ],
      extensions: ['.zip', '.rar', '.7z', '.gz'],
      maxSize: 50 * 1024 * 1024 // 50MB
    }
  },

  // Image processing options
  imageProcessing: {
    enabled: process.env.IMAGE_PROCESSING_ENABLED === 'true',
    
    // Resize options
    resize: {
      enabled: true,
      maxWidth: parseInt(process.env.IMAGE_MAX_WIDTH || '2000'),
      maxHeight: parseInt(process.env.IMAGE_MAX_HEIGHT || '2000'),
      quality: parseInt(process.env.IMAGE_QUALITY || '85')
    },
    
    // Thumbnail generation
    thumbnails: {
      enabled: process.env.GENERATE_THUMBNAILS === 'true',
      sizes: [
        { name: 'small', width: 150, height: 150 },
        { name: 'medium', width: 300, height: 300 },
        { name: 'large', width: 800, height: 800 }
      ]
    },
    
    // Format conversion
    format: {
      convert: process.env.IMAGE_CONVERT === 'true',
      to: process.env.IMAGE_FORMAT || 'webp' // 'jpeg', 'png', 'webp'
    }
  },

  // Virus scanning (if enabled)
  virusScan: {
    enabled: process.env.VIRUS_SCAN_ENABLED === 'true',
    provider: process.env.VIRUS_SCAN_PROVIDER || 'clamav', // 'clamav', 'virustotal'
    
    // ClamAV configuration
    clamav: {
      host: process.env.CLAMAV_HOST || 'localhost',
      port: parseInt(process.env.CLAMAV_PORT || '3310')
    },
    
    // VirusTotal configuration
    virustotal: {
      apiKey: process.env.VIRUSTOTAL_API_KEY
    }
  },

  // Upload validation
  validation: {
    // Check file header (magic numbers) to verify actual file type
    checkFileHeader: process.env.UPLOAD_CHECK_FILE_HEADER !== 'false',
    
    // Reject files with double extensions (.jpg.exe)
    rejectDoubleExtensions: process.env.UPLOAD_REJECT_DOUBLE_EXT !== 'false',
    
    // Sanitize filenames (remove special characters)
    sanitizeFilenames: process.env.UPLOAD_SANITIZE_FILENAMES !== 'false'
  },

  // Cleanup old files
  cleanup: {
    enabled: process.env.UPLOAD_CLEANUP_ENABLED === 'true',
    
    // Delete files older than (in days)
    maxAge: parseInt(process.env.UPLOAD_CLEANUP_MAX_AGE || '30'),
    
    // Delete orphaned files (not in database)
    deleteOrphaned: process.env.UPLOAD_CLEANUP_ORPHANED === 'true'
  },

  // Temporary upload directory
  temp: {
    dir: process.env.UPLOAD_TEMP_DIR || './tmp/uploads',
    cleanupInterval: 3600000 // 1 hour
  },

  // URL signing (for private files)
  urlSigning: {
    enabled: process.env.UPLOAD_URL_SIGNING === 'true',
    secret: process.env.UPLOAD_URL_SIGNING_SECRET,
    expiresIn: parseInt(process.env.UPLOAD_URL_EXPIRY || '3600') // 1 hour
  },

  // Logging
  logging: {
    enabled: true,
    logUploads: true,
    logDownloads: process.env.UPLOAD_LOG_DOWNLOADS === 'true',
    logErrors: true
  }
};