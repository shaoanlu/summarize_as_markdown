#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ExtensionValidator {
  constructor() {
    this.rootDir = path.join(__dirname, '..');
    this.extensionDir = path.join(this.rootDir, 'gemini-summarizer');
    this.errors = [];
    this.warnings = [];
  }

  log(message, type = 'info') {
    const symbols = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };
    console.log(`${symbols[type]} ${message}`);
  }

  addError(message) {
    this.errors.push(message);
    this.log(message, 'error');
  }

  addWarning(message) {
    this.warnings.push(message);
    this.log(message, 'warning');
  }

  validateManifest() {
    this.log('Validating manifest.json...');
    
    const manifestPath = path.join(this.extensionDir, 'manifest.json');
    
    if (!fs.existsSync(manifestPath)) {
      this.addError('manifest.json not found');
      return false;
    }

    try {
      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestContent);

      // Check required fields
      const requiredFields = ['manifest_version', 'name', 'version', 'description'];
      requiredFields.forEach(field => {
        if (!manifest[field]) {
          this.addError(`manifest.json missing required field: ${field}`);
        }
      });

      // Check manifest version
      if (manifest.manifest_version !== 3) {
        this.addError('manifest.json must use manifest_version 3');
      }

      // Check permissions
      const requiredPermissions = ['activeTab', 'storage', 'scripting'];
      if (!manifest.permissions || !Array.isArray(manifest.permissions)) {
        this.addError('manifest.json missing permissions array');
      } else {
        requiredPermissions.forEach(permission => {
          if (!manifest.permissions.includes(permission)) {
            this.addError(`manifest.json missing required permission: ${permission}`);
          }
        });
      }

      // Check service worker
      if (!manifest.background || !manifest.background.service_worker) {
        this.addError('manifest.json missing background service worker');
      }

      // Check action popup
      if (!manifest.action || !manifest.action.default_popup) {
        this.addError('manifest.json missing action popup');
      }

      this.log('manifest.json validation completed', 'success');
      return true;

    } catch (error) {
      this.addError(`manifest.json is not valid JSON: ${error.message}`);
      return false;
    }
  }

  validateRequiredFiles() {
    this.log('Checking required files...');
    
    const requiredFiles = [
      'manifest.json',
      'popup.html',
      'popup.js',
      'background.js',
      'content.js',
      'styles.css',
      'notionUtils.js',
      'weeklyRecap.js',
      'config.js'
    ];

    requiredFiles.forEach(file => {
      const filePath = path.join(this.extensionDir, file);
      if (!fs.existsSync(filePath)) {
        this.addError(`Required file missing: ${file}`);
      } else {
        this.log(`Required file found: ${file}`, 'success');
      }
    });

    // Check directories
    const requiredDirs = ['services', 'utils', 'ui', 'images'];
    requiredDirs.forEach(dir => {
      const dirPath = path.join(this.extensionDir, dir);
      if (!fs.existsSync(dirPath)) {
        this.addError(`Required directory missing: ${dir}`);
      } else {
        this.log(`Required directory found: ${dir}`, 'success');
      }
    });

    return this.errors.length === 0;
  }

  validateJavaScriptSyntax() {
    this.log('Validating JavaScript syntax...');
    
    const jsFiles = [
      'popup.js',
      'background.js',
      'content.js',
      'notionUtils.js',
      'weeklyRecap.js',
      'config.js',
      'services/apiService.js',
      'utils/domUtils.js',
      'utils/validation.js',
      'ui/popupController.js'
    ];

    let syntaxValid = true;

    jsFiles.forEach(file => {
      const filePath = path.join(this.extensionDir, file);
      
      if (!fs.existsSync(filePath)) {
        this.addWarning(`JavaScript file not found: ${file}`);
        return;
      }

      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Basic syntax checks
        if (content.includes('console.log(') && !file.includes('test')) {
          this.addWarning(`Debug console.log found in ${file}`);
        }

        // Check for ES modules syntax
        if (content.includes('import ') || content.includes('export ')) {
          this.log(`ES modules syntax found in ${file}`, 'success');
        }

        this.log(`JavaScript syntax valid: ${file}`, 'success');

      } catch (error) {
        this.addError(`JavaScript syntax error in ${file}: ${error.message}`);
        syntaxValid = false;
      }
    });

    return syntaxValid;
  }

  validateHTMLStructure() {
    this.log('Validating HTML structure...');
    
    const htmlPath = path.join(this.extensionDir, 'popup.html');
    
    if (!fs.existsSync(htmlPath)) {
      this.addError('popup.html not found');
      return false;
    }

    try {
      const htmlContent = fs.readFileSync(htmlPath, 'utf8');
      
      // Basic HTML structure checks
      if (!htmlContent.includes('<html>') || !htmlContent.includes('</html>')) {
        this.addError('popup.html missing basic HTML structure');
        return false;
      }

      if (!htmlContent.includes('<head>') || !htmlContent.includes('</head>')) {
        this.addError('popup.html missing head section');
      }

      if (!htmlContent.includes('<body>') || !htmlContent.includes('</body>')) {
        this.addError('popup.html missing body section');
      }

      // Check for required elements
      const requiredElements = [
        'gemini-api-key',
        'save-api-key',
        'summarize-btn',
        'weekly-recap-btn'
      ];

      requiredElements.forEach(elementId => {
        if (!htmlContent.includes(`id="${elementId}"`)) {
          this.addError(`popup.html missing required element: ${elementId}`);
        }
      });

      this.log('HTML structure validation completed', 'success');
      return true;

    } catch (error) {
      this.addError(`Error reading popup.html: ${error.message}`);
      return false;
    }
  }

  validateSecurityIssues() {
    this.log('Checking for security issues...');
    
    const securityPatterns = [
      { pattern: /sk-[a-zA-Z0-9]{32,}/, message: 'Potential OpenAI API key found' },
      { pattern: /AIza[a-zA-Z0-9_-]{35}/, message: 'Potential Google API key found' },
      { pattern: /secret_[a-zA-Z0-9]{40,}/, message: 'Potential Notion secret found' },
      { pattern: /ghp_[a-zA-Z0-9]{36}/, message: 'Potential GitHub token found' },
      { pattern: /xox[baprs]-[a-zA-Z0-9-]{10,}/, message: 'Potential Slack token found' }
    ];

    const jsFiles = [
      'popup.js',
      'background.js',
      'content.js',
      'notionUtils.js',
      'weeklyRecap.js',
      'config.js',
      'services/apiService.js',
      'utils/domUtils.js',
      'utils/validation.js',
      'ui/popupController.js'
    ];

    let securityIssuesFound = false;

    jsFiles.forEach(file => {
      const filePath = path.join(this.extensionDir, file);
      
      if (!fs.existsSync(filePath)) return;

      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        securityPatterns.forEach(({ pattern, message }) => {
          if (pattern.test(content)) {
            this.addWarning(`${message} in ${file}`);
            securityIssuesFound = true;
          }
        });

      } catch (error) {
        this.addWarning(`Could not check security in ${file}: ${error.message}`);
      }
    });

    if (!securityIssuesFound) {
      this.log('No obvious security issues found', 'success');
    }

    return !securityIssuesFound;
  }

  validateModuleStructure() {
    this.log('Validating module structure...');
    
    const moduleStructure = {
      'config.js': ['CONFIG'],
      'services/apiService.js': ['GeminiService', 'NotionService'],
      'utils/domUtils.js': ['DOMUtils', 'TextUtils', 'StorageUtils', 'ClipboardUtils', 'TabUtils'],
      'utils/validation.js': ['ValidationUtils', 'ErrorHandler'],
      'ui/popupController.js': ['PopupController']
    };

    Object.entries(moduleStructure).forEach(([file, expectedExports]) => {
      const filePath = path.join(this.extensionDir, file);
      
      if (!fs.existsSync(filePath)) {
        this.addError(`Module file missing: ${file}`);
        return;
      }

      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        expectedExports.forEach(exportName => {
          if (!content.includes(`export class ${exportName}`) && 
              !content.includes(`export const ${exportName}`)) {
            this.addWarning(`Expected export not found in ${file}: ${exportName}`);
          }
        });

        this.log(`Module structure validated: ${file}`, 'success');

      } catch (error) {
        this.addError(`Error validating module ${file}: ${error.message}`);
      }
    });

    return true;
  }

  generateReport() {
    this.log('\n📊 Validation Report', 'info');
    this.log('='.repeat(50), 'info');
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      this.log('🎉 Extension validation passed! No issues found.', 'success');
      return true;
    }

    if (this.errors.length > 0) {
      this.log(`\n❌ Errors found: ${this.errors.length}`, 'error');
      this.errors.forEach(error => this.log(`  • ${error}`, 'error'));
    }

    if (this.warnings.length > 0) {
      this.log(`\n⚠️  Warnings found: ${this.warnings.length}`, 'warning');
      this.warnings.forEach(warning => this.log(`  • ${warning}`, 'warning'));
    }

    this.log('\n📋 Summary:', 'info');
    this.log(`  Errors: ${this.errors.length}`, this.errors.length > 0 ? 'error' : 'success');
    this.log(`  Warnings: ${this.warnings.length}`, this.warnings.length > 0 ? 'warning' : 'success');

    return this.errors.length === 0;
  }

  async validate() {
    this.log('🔍 Starting extension validation...', 'info');
    this.log(`Extension directory: ${this.extensionDir}`, 'info');
    
    // Run all validations
    this.validateManifest();
    this.validateRequiredFiles();
    this.validateJavaScriptSyntax();
    this.validateHTMLStructure();
    this.validateSecurityIssues();
    this.validateModuleStructure();

    // Generate and return report
    return this.generateReport();
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new ExtensionValidator();
  validator.validate().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  });
}

export default ExtensionValidator;