# GreyCodeJS File Upload System

Complete guide to file uploads in GreyCodeJS with support for local storage, AWS S3, and Cloudinary.

## 🚀 Quick Start

```bash
# Run the setup wizard
npm run cli -- setup-uploads

# Or specify a provider
npm run cli -- setup-uploads --provider s3
```

## 📋 Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)
- [Upload Endpoints](#upload-endpoints)
- [File Validation](#file-validation)
- [Image Processing](#image-processing)
- [Storage Providers](#storage-providers)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)

## 🔧 Installation

### Automatic Setup

```bash
npm run cli -- setup-uploads
```

### Manual Setup

1. Install dependencies:
```bash
npm install multer sharp
```

2. For AWS S3:
```bash
npm install aws-sdk
```

3. For Cloudinary:
```bash
npm install cloudinary
```

4. Create required directories:
```bash
mkdir -p public/uploads tmp/uploads
```

## ⚙️ Configuration

### Environment Variables

Add to your `.env` file:

```bash
# Provider: local, s3, cloudinary
UPLOAD_PROVIDER=local

# Local Storage
UPLOAD_DIR=./public/uploads
UPLOAD_PUBLIC_PATH=/uploads
UPLOAD_SUBDIRS=true
UPLOAD_MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_MAX_FILES=10

# Image Processing
IMAGE_PROCESSING_ENABLED=true
IMAGE_MAX_WIDTH=2000
IMAGE_MAX_HEIGHT=2000
IMAGE_QUALITY=85
GENERATE_THUMBNAILS=true
```

### AWS S3 Configuration

```bash
UPLOAD_PROVIDER=s3
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_ACL=public-read
AWS_CLOUDFRONT_URL=https://cdn.example.com
```

### Cloudinary Configuration

```bash
UPLOAD_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_FOLDER=uploads
```

## 📝 Usage Examples

### Register Routes

Add to `app.js`:

```javascript
const uploadRoutes = require('./routes/upload');
app.use('/uploads', uploadRoutes.router);
```

### Frontend Upload Form

```html
<form action="/uploads/single" method="POST" enctype="multipart/form-data">
  <input type="file" name="file" required>
  <input type="hidden" name="fileType" value="image">
  <button type="submit">Upload</button>
</form>
```

### JavaScript/Fetch API

```javascript
async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileType', 'image');

  const response = await fetch('/uploads/single', {
    method: 'POST',
    body: formData
  });

  return await response.json();
}
```

### Using with Axios

```javascript
import axios from 'axios';

async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post('/uploads/single', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: (progressEvent) => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      console.log(`Upload Progress: ${percentCompleted}%`);
    }
  });

  return response.data;
}
```

## 🔗 Upload Endpoints

### Upload Single File

```http
POST /uploads/single
Content-Type: multipart/form-data

file: [binary]
fileType: "image" | "document" | "video" | "audio" | "archive"
```

**Response:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "provider": "local",
    "filename": "image_1234567890_abc123.jpg",
    "originalName": "photo.jpg",
    "url": "/uploads/2024/01/15/image_1234567890_abc123.jpg",
    "size": 245678,
    "mimetype": "image/jpeg",
    "uploadedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Upload Multiple Files

```http
POST /uploads/multiple
Content-Type: multipart/form-data

files: [binary array]
fileType: "document"
```

**Response:**
```json
{
  "success": true,
  "message": "Uploaded 3 file(s)",
  "data": {
    "success": [...],
    "failed": [],
    "totalUploaded": 3,
    "totalFailed": 0
  }
}
```

### Upload Image

```http
POST /uploads/image
Content-Type: multipart/form-data

image: [binary]
generateThumbnails: true
minWidth: 100
maxWidth: 2000
```

### Upload Avatar

```http
POST /uploads/avatar
Content-Type: multipart/form-data

avatar: [binary]
```

Validates:
- Minimum dimensions: 100x100
- Maximum dimensions: 2000x2000
- Generates thumbnails automatically

### Upload Document

```http
POST /uploads/document
Content-Type: multipart/form-data

document: [binary]
title: "Report 2024"
description: "Annual report"
category: "reports"
```

### Delete File

```http
DELETE /uploads/:filename
```

### Get File Info

```http
GET /uploads/info/:filename
```

**Response:**
```json
{
  "success": true,
  "data": {
    "filename": "document.pdf",
    "size": 1048576,
    "created": "2024-01-15T10:30:00.000Z",
    "modified": "2024-01-15T10:30:00.000Z",
    "url": "/uploads/document.pdf"
  }
}
```

### Health Check

```http
GET /uploads/health
```

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "checks": {
    "tempDirExists": true,
    "tempDirWritable": true,
    "uploadDirExists": true,
    "uploadDirWritable": true,
    "provider": "local"
  }
}
```

## 🔒 File Validation

### Allowed File Types

The system supports validation for:

- **Images**: JPG, PNG, GIF, WebP, SVG (max 5MB)
- **Documents**: PDF, DOC, DOCX, XLS, XLSX, TXT, CSV (max 10MB)
- **Videos**: MP4, MPEG, MOV, AVI, WebM (max 100MB)
- **Audio**: MP3, WAV, OGG, WebM (max 20MB)
- **Archives**: ZIP, RAR, 7Z, GZ (max 50MB)

### Validation Features

1. **File Extension Check** - Validates against allowed extensions
2. **MIME Type Verification** - Checks actual file type
3. **Magic Number Validation** - Verifies file header signatures
4. **Size Limits** - Enforces maximum file sizes
5. **Filename Sanitization** - Removes dangerous characters
6. **Double Extension Detection** - Prevents `.jpg.exe` attacks

### Custom Validation

```javascript
const { validateFileType } = require('./utils/file-validator');

// In your controller
const validation = await validateFileType(file, 'image');
if (!validation.valid) {
  return res.status(400).json({
    success: false,
    error: validation.error
  });
}
```

## 🖼️ Image Processing

### Features

- **Automatic Resizing** - Scale down large images
- **Format Conversion** - Convert to WebP for smaller sizes
- **Thumbnail Generation** - Create multiple sizes
- **Quality Optimization** - Reduce file size while maintaining quality

### Configuration

```javascript
// config/upload.js
imageProcessing: {
  enabled: true,
  resize: {
    enabled: true,
    maxWidth: 2000,
    maxHeight: 2000,
    quality: 85
  },
  thumbnails: {
    enabled: true,
    sizes: [
      { name: 'small', width: 150, height: 150 },
      { name: 'medium', width: 300, height: 300 },
      { name: 'large', width: 800, height: 800 }
    ]
  },
  format: {
    convert: true,
    to: 'webp'
  }
}
```

### Using in Code

```javascript
const result = await UploadService.upload(file, {
  fileType: 'image',
  generateThumbnails: true
});

// Access thumbnails
console.log(result.thumbnails);
// [
//   { size: 'small', width: 150, height: 150, url: '...' },
//   { size: 'medium', width: 300, height: 300, url: '...' }
// ]
```

## ☁️ Storage Providers

### Local Storage

Files stored on your server filesystem.

**Pros:**
- No external dependencies
- No additional costs
- Full control

**Cons:**
- Limited scalability
- No CDN
- Manual backups needed

**Configuration:**
```bash
UPLOAD_PROVIDER=local
UPLOAD_DIR=./public/uploads
UPLOAD_PUBLIC_PATH=/uploads
UPLOAD_SUBDIRS=true
```

### AWS S3

Store files in Amazon S3 buckets.

**Pros:**
- Highly scalable
- Built-in CDN (CloudFront)
- Reliable and durable
- Cost-effective at scale

**Cons:**
- Requires AWS account
- Additional costs
- More complex setup

**Setup:**
1. Create S3 bucket in AWS console
2. Create IAM user with S3 access
3. Configure credentials:

```bash
UPLOAD_PROVIDER=s3
AWS_S3_BUCKET=my-app-uploads
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_S3_ACL=public-read
```

**IAM Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-app-uploads/*",
        "arn:aws:s3:::my-app-uploads"
      ]
    }
  ]
}
```

### Cloudinary

Specialized media management platform.

**Pros:**
- Automatic optimization
- Advanced image transformations
- Built-in CDN
- Video support
- Free tier available

**Cons:**
- Requires Cloudinary account
- Costs scale with usage
- Vendor lock-in

**Setup:**
1. Create account at cloudinary.com
2. Get credentials from dashboard
3. Configure:

```bash
UPLOAD_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=demo
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz12
CLOUDINARY_FOLDER=uploads
```

## 🔐 Security Best Practices

### 1. Validate Everything

```javascript
// Always validate on the server
const validation = await validateFileType(file, 'image');
if (!validation.valid) {
  // Reject the upload
}
```

### 2. Check File Headers

```javascript
// Enable magic number validation
UPLOAD_CHECK_FILE_HEADER=true
```

This prevents attackers from uploading malicious files with fake extensions.

### 3. Sanitize Filenames

```javascript
// Remove dangerous characters
UPLOAD_SANITIZE_FILENAMES=true
```

### 4. Set Size Limits

```javascript
// Prevent DoS attacks
UPLOAD_MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_MAX_FILES=10
```

### 5. Reject Double Extensions

```javascript
// Prevent .jpg.exe attacks
UPLOAD_REJECT_DOUBLE_EXT=true
```

### 6. Use Authentication

```javascript
// Protect upload endpoints
const { authenticate } = require('./middlewares/auth');

router.post('/single', 
  authenticate,
  upload.single,
  controller.uploadSingle
);
```

### 7. Implement Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10 // 10 uploads per window
});

router.post('/single', uploadLimiter, controller.uploadSingle);
```

### 8. Virus Scanning (Production)

```javascript
// Enable virus scanning
VIRUS_SCAN_ENABLED=true
VIRUS_SCAN_PROVIDER=clamav
```

### 9. Use HTTPS

Always use HTTPS in production to encrypt file uploads in transit.

### 10. Store Metadata in Database

```javascript
// After upload, store file info
await FileUpload.create({
  userId: req.user.id,
  filename: result.filename,
  originalName: result.originalName,
  mimetype: result.mimetype,
  size: result.size,
  url: result.url,
  provider: result.provider
});
```

## 🐛 Troubleshooting

### Upload Directory Not Writable

**Error:** `EACCES: permission denied`

**Solution:**
```bash
chmod 755 public/uploads
chmod 755 tmp/uploads
```

### File Too Large

**Error:** `File too large. Maximum size: 10MB`

**Solution:**
Increase limit in `.env`:
```bash
UPLOAD_MAX_FILE_SIZE=20971520  # 20MB
```

### Invalid File Type

**Error:** `File type image/heic not allowed`

**Solution:**
Add to allowed types in `config/upload.js`:
```javascript
mimeTypes: [
  'image/jpeg',
  'image/png',
  'image/heic'  // Add this
]
```

### S3 Access Denied

**Error:** `Access Denied`

**Solution:**
1. Check IAM permissions
2. Verify bucket exists
3. Confirm credentials are correct
4. Check bucket policy

### Cloudinary Upload Failed

**Error:** `Invalid signature`

**Solution:**
1. Verify API credentials
2. Check cloud name
3. Ensure API secret is correct

### Image Processing Fails

**Error:** `Failed to process image`

**Solution:**
1. Install sharp: `npm install sharp`
2. Check image is valid
3. Try disabling: `IMAGE_PROCESSING_ENABLED=false`

## 📚 Advanced Usage

### Custom File Storage

```javascript
// services/CustomStorageService.js
class CustomStorageService {
  async upload(file, options) {
    // Your custom upload logic
  }
  
  async delete(fileData) {
    // Your custom delete logic
  }
}
```

### Upload Progress Tracking

```javascript
// Frontend
const xhr = new XMLHttpRequest();

xhr.upload.addEventListener('progress', (e) => {
  if (e.lengthComputable) {
    const percentComplete = (e.loaded / e.total) * 100;
    console.log(`${percentComplete}%`);
  }
});

xhr.open('POST', '/uploads/single');
xhr.send(formData);
```

### Direct to S3 Upload

```javascript
// Generate presigned URL
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

const params = {
  Bucket: 'my-bucket',
  Key: filename,
  Expires: 60,
  ContentType: mimetype
};

const uploadURL = await s3.getSignedUrlPromise('putObject', params);

// Frontend uploads directly to S3
await fetch(uploadURL, {
  method: 'PUT',
  body: file,
  headers: {
    'Content-Type': mimetype
  }
});
```

## 🧪 Testing

```javascript
// test/upload.test.js
const request = require('supertest');
const app = require('../app');

describe('Upload Endpoints', () => {
  it('should upload a file', async () => {
    const response = await request(app)
      .post('/uploads/single')
      .attach('file', 'test/fixtures/test-image.jpg')
      .field('fileType', 'image');

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('filename');
  });

  it('should reject invalid file type', async () => {
    const response = await request(app)
      .post('/uploads/single')
      .attach('file', 'test/fixtures/test.exe');

    expect(response.status).toBe(400);
  });
});
```

## 📖 API Reference

See the full API documentation for detailed endpoint specifications and examples.

## 🤝 Contributing

Contributions are welcome! Please see CONTRIBUTING.md for guidelines.

## 📄 License

This project is licensed under the MIT License.

---

Generated by GreyCodeJS CLI • [Documentation](https://github.com/kculz/greycodejs)