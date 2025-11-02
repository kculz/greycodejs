#!/usr/bin/env node

/**
 * Automated CLI Fixer for GreyCodeJS
 * This script diagnoses and fixes common CLI issues
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset}  ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}${'='.repeat(50)}${colors.reset}\n${colors.cyan}${msg}${colors.reset}\n${colors.cyan}${'='.repeat(50)}${colors.reset}\n`)
};

let issuesFound = 0;
let issuesFixed = 0;

/**
 * Check if a file exists
 */
function fileExists(filepath) {
  return fs.existsSync(path.resolve(process.cwd(), filepath));
}

/**
 * Read file content
 */
function readFile(filepath) {
  try {
    return fs.readFileSync(path.resolve(process.cwd(), filepath), 'utf8');
  } catch (error) {
    return null;
  }
}

/**
 * Write file content
 */
function writeFile(filepath, content) {
  try {
    fs.writeFileSync(path.resolve(process.cwd(), filepath), content);
    return true;
  } catch (error) {
    log.error(`Failed to write ${filepath}: ${error.message}`);
    return false;
  }
}

/**
 * Check 1: Main CLI file exists
 */
function checkMainCLIFile() {
  log.section('Check 1: Main CLI File');
  
  if (!fileExists('bin/cli.js')) {
    issuesFound++;
    log.error('bin/cli.js does not exist!');
    
    log.info('Creating bin/cli.js...');
    const cliContent = `#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

const program = new Command();

program
  .name('greycodejs')
  .description('GreyCodeJS CLI - Build Express.js applications faster')
  .version('0.0.2');

// Load all command modules
const commandsPath = path.join(__dirname, 'cli', 'commands');

if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  
  commandFiles.forEach(file => {
    try {
      const commandModule = require(path.join(commandsPath, file));
      if (typeof commandModule === 'function') {
        commandModule(program);
      } else {
        console.warn(chalk.yellow(\`Warning: \${file} does not export a function\`));
      }
    } catch (error) {
      console.error(chalk.red(\`Failed to load command \${file}:\`), error.message);
    }
  });
} else {
  console.error(chalk.red(\`Commands directory not found at \${commandsPath}\`));
}

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
`;
    
    if (writeFile('bin/cli.js', cliContent)) {
      // Make executable
      try {
        fs.chmodSync(path.resolve(process.cwd(), 'bin/cli.js'), '755');
        log.success('Created and made bin/cli.js executable');
        issuesFixed++;
      } catch (error) {
        log.warning('Created bin/cli.js but could not make it executable. Run: chmod +x bin/cli.js');
      }
    }
  } else {
    log.success('bin/cli.js exists');
    
    // Check if executable
    try {
      const stats = fs.statSync(path.resolve(process.cwd(), 'bin/cli.js'));
      const isExecutable = (stats.mode & 0o111) !== 0;
      
      if (!isExecutable) {
        issuesFound++;
        log.warning('bin/cli.js is not executable');
        try {
          fs.chmodSync(path.resolve(process.cwd(), 'bin/cli.js'), '755');
          log.success('Made bin/cli.js executable');
          issuesFixed++;
        } catch (error) {
          log.error('Could not make executable. Run: chmod +x bin/cli.js');
        }
      }
    } catch (error) {
      log.warning('Could not check file permissions');
    }
  }
}

/**
 * Check 2: Commands directory exists
 */
function checkCommandsDirectory() {
  log.section('Check 2: Commands Directory');
  
  if (!fileExists('bin/cli/commands')) {
    issuesFound++;
    log.error('bin/cli/commands directory does not exist!');
    log.info('Creating bin/cli/commands directory...');
    
    try {
      fs.mkdirSync(path.resolve(process.cwd(), 'bin/cli/commands'), { recursive: true });
      log.success('Created bin/cli/commands directory');
      issuesFixed++;
    } catch (error) {
      log.error(`Failed to create directory: ${error.message}`);
    }
  } else {
    log.success('bin/cli/commands directory exists');
    
    // List command files
    const commandsPath = path.resolve(process.cwd(), 'bin/cli/commands');
    const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
    
    if (files.length === 0) {
      log.warning('No command files found in bin/cli/commands/');
    } else {
      log.info(`Found ${files.length} command file(s):`);
      files.forEach(f => console.log(`   - ${f}`));
    }
  }
}

/**
 * Check 3: package.json configuration
 */
function checkPackageJson() {
  log.section('Check 3: package.json Configuration');
  
  if (!fileExists('package.json')) {
    log.error('package.json not found!');
    issuesFound++;
    return;
  }
  
  const pkgContent = readFile('package.json');
  if (!pkgContent) {
    log.error('Could not read package.json');
    issuesFound++;
    return;
  }
  
  let pkg;
  try {
    pkg = JSON.parse(pkgContent);
  } catch (error) {
    log.error('Invalid JSON in package.json');
    issuesFound++;
    return;
  }
  
  let needsUpdate = false;
  
  // Check bin path
  if (!pkg.bin || pkg.bin.greycodejs !== './bin/cli.js') {
    issuesFound++;
    log.warning('Incorrect bin path in package.json');
    if (!pkg.bin) pkg.bin = {};
    pkg.bin.greycodejs = './bin/cli.js';
    needsUpdate = true;
  }
  
  // Check scripts
  if (!pkg.scripts || !pkg.scripts.cli) {
    issuesFound++;
    log.warning('Missing "cli" script in package.json');
    if (!pkg.scripts) pkg.scripts = {};
    pkg.scripts.cli = 'node bin/cli.js';
    needsUpdate = true;
  }
  
  // Check dependencies
  const requiredDeps = {
    'chalk': '^4.1.2',
    'commander': '^12.1.0'
  };
  
  if (!pkg.dependencies) pkg.dependencies = {};
  
  for (const [dep, version] of Object.entries(requiredDeps)) {
    if (!pkg.dependencies[dep]) {
      issuesFound++;
      log.warning(`Missing dependency: ${dep}`);
      pkg.dependencies[dep] = version;
      needsUpdate = true;
    }
  }
  
  if (needsUpdate) {
    log.info('Updating package.json...');
    if (writeFile('package.json', JSON.stringify(pkg, null, 2) + '\n')) {
      log.success('Updated package.json');
      issuesFixed++;
      
      log.info('Installing dependencies...');
      try {
        execSync('npm install', { stdio: 'inherit' });
        log.success('Dependencies installed');
      } catch (error) {
        log.error('Failed to install dependencies. Run: npm install');
      }
    }
  } else {
    log.success('package.json is configured correctly');
  }
}

/**
 * Check 4: Command file structure
 */
function checkCommandFiles() {
  log.section('Check 4: Command File Structure');
  
  const commandsPath = path.resolve(process.cwd(), 'bin/cli/commands');
  
  if (!fs.existsSync(commandsPath)) {
    log.warning('Commands directory does not exist, skipping command file check');
    return;
  }
  
  const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
  
  if (files.length === 0) {
    log.warning('No command files to check');
    return;
  }
  
  let invalidFiles = 0;
  
  files.forEach(file => {
    const content = readFile(path.join('bin/cli/commands', file));
    if (!content) {
      log.error(`Could not read ${file}`);
      invalidFiles++;
      return;
    }
    
    // Check if exports a function
    if (!content.includes('module.exports') || !content.includes('(program)')) {
      log.error(`${file} does not export a function that accepts program`);
      invalidFiles++;
      issuesFound++;
    }
  });
  
  if (invalidFiles === 0) {
    log.success(`All ${files.length} command files are structured correctly`);
  } else {
    log.error(`${invalidFiles} command file(s) have invalid structure`);
  }
}

/**
 * Check 5: Test CLI execution
 */
function testCLIExecution() {
  log.section('Check 5: CLI Execution Test');
  
  try {
    const output = execSync('node bin/cli.js --version', { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    log.success(`CLI executes successfully: ${output.trim()}`);
  } catch (error) {
    issuesFound++;
    log.error('CLI execution failed!');
    log.error(error.message);
  }
  
  try {
    const output = execSync('node bin/cli.js list-commands', { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    log.success('list-commands executes successfully');
  } catch (error) {
    log.warning('list-commands may not be available');
  }
}

/**
 * Main execution
 */
function main() {
  console.log(`
${colors.cyan}╔════════════════════════════════════════════════╗
║     GreyCodeJS CLI Diagnostic & Fixer         ║
╚════════════════════════════════════════════════╝${colors.reset}
`);

  checkMainCLIFile();
  checkCommandsDirectory();
  checkPackageJson();
  checkCommandFiles();
  testCLIExecution();

  log.section('Summary');
  
  if (issuesFound === 0) {
    log.success('✨ No issues found! Your CLI is properly configured.');
  } else {
    log.warning(`Found ${issuesFound} issue(s)`);
    log.success(`Fixed ${issuesFixed} issue(s)`);
    
    if (issuesFixed < issuesFound) {
      log.warning(`${issuesFound - issuesFixed} issue(s) require manual attention`);
    }
  }
  
  console.log(`
${colors.blue}Next steps:${colors.reset}
1. Run: npm run cli -- list-commands
2. Test a command: npm run cli -- create-controller Test
3. If errors persist, check: bin/cli/commands/ for invalid files

${colors.cyan}For detailed help, see: CLI_SETUP_FIX.md${colors.reset}
`);

  process.exit(issuesFound > issuesFixed ? 1 : 0);
}

// Run the fixer
main();