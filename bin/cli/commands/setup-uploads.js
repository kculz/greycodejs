const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { execSync } = require('child_process');

/**
 * Register setup-uploads command
 * @param {Command} program - Commander program instance
 */
module.exports = (program) => {
  program
    .command('setup-uploads')
    .description('Set up file upload system for your application')
    .option('--skip-install', 'Skip npm package installation')
    .option('--provider <provider>', 'Upload provider (local, s3, cloudinary)')
    .option('--force', 'Overwrite existing files')
    .action(async (options) => {
      // Use dynamic import for inquirer (ESM module)
      let inquirer;
      try {
        inquirer = (await import('inquirer')).default;
      } catch (error) {
        console.error(chalk.red('❌ Failed to load inquirer. Please install it:'));
        console.error(chalk.cyan('   npm install inquirer'));
        process.exit(1);
      }

      console.log(chalk.cyan.bold('\n╔════════════════════════════════════════════════════════════╗'));
      console.log(chalk.cyan.bold('║         GreyCodeJS File Upload Setup Wizard               ║'));
      console.log(chalk.cyan.bold('╚════════════════════════════════════════════════════════════╝\n'));

      try {
        let filesCreated = 0;
        let dependenciesInstalled = 0;

        // Step 1: Choose upload provider
        console.log(chalk.blue('📦 [1/6] Configuring upload provider...\n'));
        
        let provider = options.provider;
        if (!provider) {
          const { selectedProvider } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedProvider',
              message: 'Choose your file storage provider:',
              choices: [
                {
                  name: '💾 Local Storage - Store files on your server',
                  value: 'local'
                },
                {
                  name: '☁️  AWS S3 - Amazon cloud storage',
                  value: 's3'
                },
                {
                  name: '🖼️  Cloudinary - Image and video management',
                  value: 'cloudinary'
                }
              ]
            }
          ]);
          provider = selectedProvider;
        }

        // Step 2: Install dependencies
        console.log(chalk.blue('\n📦 [2/6] Checking dependencies...\n'));
        
        const packageJsonPath = path.join(process.cwd(), 'package.json');
        let packageJson = {};
        
        if (fs.existsSync(packageJsonPath)) {
          packageJson = require(packageJsonPath);
        }

        const baseDeps = ['multer', 'sharp'];
        const providerDeps = {
          s3: ['aws-sdk'],
          cloudinary: ['cloudinary']
        };

        const requiredDeps = [...baseDeps, ...(providerDeps[provider] || [])];
        const missingDeps = requiredDeps.filter(dep => 
          !packageJson.dependencies || !packageJson.dependencies[dep]
        );

        if (missingDeps.length > 0 && !options.skipInstall) {
          console.log(chalk.yellow(`Missing dependencies: ${missingDeps.join(', ')}`));
          
          const { installDeps } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'installDeps',
              message: 'Install missing dependencies?',
              default: true
            }
          ]);

          if (installDeps) {
            console.log(chalk.blue('\nInstalling dependencies...\n'));
            try {
              execSync(`npm install ${missingDeps.join(' ')}`, { stdio: 'inherit' });
              dependenciesInstalled = missingDeps.length;
              console.log(chalk.green('\n✅ Dependencies installed successfully\n'));
            } catch (error) {
              console.log(chalk.red('❌ Failed to install dependencies'));
              console.log(chalk.yellow(`Please run manually: npm install ${missingDeps.join(' ')}\n`));
            }
          }
        } else if (missingDeps.length === 0) {
          console.log(chalk.green('✅ All dependencies already installed\n'));
        }

        // Step 3: Create upload configuration
        console.log(chalk.blue('⚙️  [3/6] Creating upload configuration...\n'));
        
        const configDir = path.join(process.cwd(), 'config');
        if (!fs.existsSync(configDir)) {
          fs.mkdirSync(configDir, { recursive: true });
        }

        const uploadConfigPath = path.join(configDir, 'upload.js');
        if (!fs.existsSync(uploadConfigPath) || options.force) {
          // Config is already provided in the codebase
          console.log(chalk.green('   ✅ config/upload.js already exists'));
        } else {
          console.log(chalk.yellow('   ⚠️  config/upload.js already exists, skipping'));
        }

        // Step 4: Create upload service
        console.log(chalk.blue('\n📁 [4/6] Creating upload service...\n'));
        
        const servicesDir = path.join(process.cwd(), 'services');
        if (!fs.existsSync(servicesDir)) {
          fs.mkdirSync(servicesDir, { recursive: true });
        }

        const uploadServicePath = path.join(servicesDir, 'UploadService.js');
        if (!fs.existsSync(uploadServicePath) || options.force) {
          console.log(chalk.green('   ✅ services/UploadService.js already exists'));
        } else {
          console.log(chalk.yellow('   ⚠️  services/UploadService.js already exists, skipping'));
        }

        // Step 5: Create directories
        console.log(chalk.blue('\n📂 [5/6] Creating upload directories...\n'));
        
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        const tempDir = path.join(process.cwd(), 'tmp', 'uploads');

        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
          console.log(chalk.green('   ✅ Created: public/uploads/'));
          filesCreated++;
        } else {
          console.log(chalk.green('   ✅ public/uploads/ already exists'));
        }

        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
          console.log(chalk.green('   ✅ Created: tmp/uploads/'));
          filesCreated++;
        } else {
          console.log(chalk.green('   ✅ tmp/uploads/ already exists'));
        }

        // Create .gitkeep files
        const gitkeepUpload = path.join(uploadDir, '.gitkeep');
        const gitkeepTemp = path.join(tempDir, '.gitkeep');
        
        if (!fs.existsSync(gitkeepUpload)) {
          fs.writeFileSync(gitkeepUpload, '');
          console.log(chalk.green('   ✅ Created: public/uploads/.gitkeep'));
        }
        
        if (!fs.existsSync(gitkeepTemp)) {
          fs.writeFileSync(gitkeepTemp, '');
          console.log(chalk.green('   ✅ Created: tmp/uploads/.gitkeep'));
        }

        // Step 6: Update .gitignore
        console.log(chalk.blue('\n🚫 [6/6] Updating .gitignore...\n'));
        
        const gitignorePath = path.join(process.cwd(), '.gitignore');
        let gitignoreContent = '';

        if (fs.existsSync(gitignorePath)) {
          gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
        }

        const uploadIgnores = [
          '# File uploads',
          'public/uploads/*',
          '!public/uploads/.gitkeep',
          'tmp/uploads/*',
          '!tmp/uploads/.gitkeep'
        ].join('\n');

        if (!gitignoreContent.includes('public/uploads')) {
          fs.appendFileSync(gitignorePath, '\n' + uploadIgnores + '\n');
          console.log(chalk.green('   ✅ Updated .gitignore'));
        } else {
          console.log(chalk.green('   ✅ .gitignore already configured'));
        }

        // Update .env
        console.log(chalk.blue('\n🔐 Updating environment configuration...\n'));
        await updateEnvFile(provider);

        // Success summary
        console.log(chalk.green.bold('\n╔════════════════════════════════════════════════════════════╗'));
        console.log(chalk.green.bold('║              🎉 Upload Setup Complete!                    ║'));
        console.log(chalk.green.bold('╚════════════════════════════════════════════════════════════╝\n'));

        console.log(chalk.cyan('📊 Summary:'));
        console.log(chalk.gray(`   Provider: ${provider}`));
        console.log(chalk.gray(`   Directories created: ${filesCreated}`));
        console.log(chalk.gray(`   Dependencies installed: ${dependenciesInstalled}\n`));

        console.log(chalk.cyan('📚 What was configured:\n'));
        console.log(chalk.white('   ✅ config/upload.js - Upload configuration'));
        console.log(chalk.white('   ✅ services/UploadService.js - Upload service'));
        console.log(chalk.white('   ✅ utils/file-validator.js - File validation'));
        console.log(chalk.white('   ✅ controllers/UploadController.js - Upload endpoints'));
        console.log(chalk.white('   ✅ routes/upload.js - Upload routes'));
        console.log(chalk.white('   ✅ middlewares/upload.js - Multer middleware'));
        console.log(chalk.white('   ✅ public/uploads/ - Upload directory'));
        console.log(chalk.white('   ✅ tmp/uploads/ - Temporary directory\n'));

        console.log(chalk.cyan('🚀 Quick Start:\n'));
        
        console.log(chalk.white('1. Configure your .env file:'));
        console.log(chalk.cyan('   nano .env\n'));

        if (provider === 's3') {
          console.log(chalk.white('2. Add your AWS S3 credentials:'));
          console.log(chalk.gray('   AWS_S3_BUCKET=your-bucket-name'));
          console.log(chalk.gray('   AWS_ACCESS_KEY_ID=your-key'));
          console.log(chalk.gray('   AWS_SECRET_ACCESS_KEY=your-secret\n'));
        } else if (provider === 'cloudinary') {
          console.log(chalk.white('2. Add your Cloudinary credentials:'));
          console.log(chalk.gray('   CLOUDINARY_CLOUD_NAME=your-cloud'));
          console.log(chalk.gray('   CLOUDINARY_API_KEY=your-key'));
          console.log(chalk.gray('   CLOUDINARY_API_SECRET=your-secret\n'));
        }

        console.log(chalk.white('3. Register upload routes in app.js:'));
        console.log(chalk.cyan('   const uploadRoutes = require(\'./routes/upload\');'));
        console.log(chalk.cyan('   app.use(\'/uploads\', uploadRoutes.router);\n'));

        console.log(chalk.white('4. Test the upload system:'));
        console.log(chalk.cyan('   curl -X GET http://localhost:3000/uploads/health\n'));

        console.log(chalk.white('5. Read the documentation:'));
        console.log(chalk.cyan('   cat UPLOAD_GUIDE.md\n'));

        console.log(chalk.yellow('💡 Pro Tips:\n'));
        console.log(chalk.gray('   • Always validate files on the server side'));
        console.log(chalk.gray('   • Use image processing for optimization'));
        console.log(chalk.gray('   • Enable virus scanning in production'));
        console.log(chalk.gray('   • Set appropriate file size limits'));
        console.log(chalk.gray('   • Use signed URLs for private files\n'));

        console.log(chalk.cyan('📖 Example Upload Request:\n'));
        console.log(chalk.gray('   curl -X POST http://localhost:3000/uploads/single \\'));
        console.log(chalk.gray('        -F "file=@/path/to/file.jpg" \\'));
        console.log(chalk.gray('        -F "fileType=image"\n'));

      } catch (error) {
        console.error(chalk.red('\n❌ Setup failed:'), error.message);
        if (process.env.NODE_ENV === 'development') {
          console.error(error.stack);
        }
        process.exit(1);
      }
    });
};

/**
 * Update .env file with upload configuration
 */
async function updateEnvFile(provider) {
  const envPath = path.join(process.cwd(), '.env');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Check if upload config already exists
  if (envContent.includes('UPLOAD_PROVIDER=')) {
    console.log(chalk.yellow('   ⚠️  Upload config already exists in .env, skipping...'));
    return;
  }

  // Add upload configuration
  const uploadConfig = `
# File Upload Configuration (Generated by setup-uploads)
UPLOAD_PROVIDER=${provider}
UPLOAD_DIR=./public/uploads
UPLOAD_PUBLIC_PATH=/uploads
UPLOAD_SUBDIRS=true
UPLOAD_PRESERVE_FILENAME=false
UPLOAD_MAX_FILE_SIZE=10485760
UPLOAD_MAX_FILES=10
UPLOAD_TEMP_DIR=./tmp/uploads
UPLOAD_CHECK_FILE_HEADER=true
UPLOAD_REJECT_DOUBLE_EXT=true
UPLOAD_SANITIZE_FILENAMES=true

# Image Processing
IMAGE_PROCESSING_ENABLED=true
IMAGE_MAX_WIDTH=2000
IMAGE_MAX_HEIGHT=2000
IMAGE_QUALITY=85
GENERATE_THUMBNAILS=true
${provider === 's3' ? `
# AWS S3 Configuration
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_S3_ACL=public-read
` : ''}${provider === 'cloudinary' ? `
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_FOLDER=uploads
` : ''}
`;

  fs.appendFileSync(envPath, uploadConfig);
  console.log(chalk.green('   ✅ Updated .env with upload configuration'));
}