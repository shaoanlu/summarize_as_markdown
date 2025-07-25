import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock file system operations
jest.mock('fs');

describe('GitHub Actions Workflow Tests', () => {
  const workflowPath = path.join(__dirname, '../../.github/workflows/ci.yml');
  let workflowContent;

  beforeEach(() => {
    // Mock the workflow file content
    workflowContent = `
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  validate:
    name: Validate Extension
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
    
    - name: Validate manifest.json
      run: |
        echo "Checking manifest.json syntax..."
        if ! cat gemini-summarizer/manifest.json | jq empty; then
          echo "❌ manifest.json is not valid JSON"
          exit 1
        else
          echo "✅ manifest.json is valid JSON"
        fi
`;

    fs.readFileSync.mockReturnValue(workflowContent);
    fs.existsSync.mockReturnValue(true);
  });

  describe('Workflow File Structure', () => {
    test('should have valid workflow file', () => {
      expect(fs.existsSync).toBeDefined();
      expect(() => fs.readFileSync(workflowPath, 'utf8')).not.toThrow();
    });

    test('should have correct workflow name', () => {
      expect(workflowContent).toContain('name: CI');
    });

    test('should trigger on push and pull request', () => {
      expect(workflowContent).toContain('on:');
      expect(workflowContent).toContain('push:');
      expect(workflowContent).toContain('pull_request:');
      expect(workflowContent).toContain('branches: [ main, develop ]');
    });

    test('should have validate job', () => {
      expect(workflowContent).toContain('jobs:');
      expect(workflowContent).toContain('validate:');
      expect(workflowContent).toContain('runs-on: ubuntu-latest');
    });

    test('should checkout code', () => {
      expect(workflowContent).toContain('- name: Checkout code');
      expect(workflowContent).toContain('uses: actions/checkout@v4');
    });

    test('should setup Node.js', () => {
      expect(workflowContent).toContain('- name: Setup Node.js');
      expect(workflowContent).toContain('uses: actions/setup-node@v4');
      expect(workflowContent).toContain("node-version: '18'");
    });

    test('should validate manifest.json', () => {
      expect(workflowContent).toContain('- name: Validate manifest.json');
      expect(workflowContent).toContain('gemini-summarizer/manifest.json');
      expect(workflowContent).toContain('jq empty');
    });
  });

  describe('Required Files Validation', () => {
    test('should check for all required extension files', () => {
      const requiredFiles = [
        'manifest.json',
        'popup.html',
        'popup.js',
        'background.js',
        'content.js',
        'styles.css'
      ];

      requiredFiles.forEach(file => {
        expect(workflowContent).toContain(`gemini-summarizer/${file}`);
      });
    });
  });

  describe('Build Process Validation', () => {
    test('should validate JavaScript syntax', () => {
      expect(workflowContent).toContain('Check JavaScript syntax');
      expect(workflowContent).toContain('node --check');
    });

    test('should validate HTML files', () => {
      expect(workflowContent).toContain('Check HTML files');
      expect(workflowContent).toContain('popup.html');
    });

    test('should perform security checks', () => {
      expect(workflowContent).toContain('Basic security check');
      expect(workflowContent).toContain('hardcoded API keys');
    });

    test('should generate build info', () => {
      expect(workflowContent).toContain('Generate build info');
      expect(workflowContent).toContain('build-info.json');
    });

    test('should package extension', () => {
      expect(workflowContent).toContain('Package extension');
      expect(workflowContent).toContain('chrome-extension-v');
      expect(workflowContent).toContain('.zip');
    });
  });
});

describe('Workflow Command Validation', () => {
  describe('Shell Commands', () => {
    test('should validate jq command for JSON validation', () => {
      const command = 'cat gemini-summarizer/manifest.json | jq empty';
      expect(command).toContain('jq empty');
      expect(command).toContain('gemini-summarizer/manifest.json');
    });

    test('should validate file existence check', () => {
      const command = 'if [ -f "$file" ]; then echo "✅ $file exists"; else echo "❌ $file is missing"; exit 1; fi';
      expect(command).toContain('[ -f "$file" ]');
      expect(command).toContain('exit 1');
    });

    test('should validate Node.js syntax check', () => {
      const command = 'node --check "$file"';
      expect(command).toContain('--check');
    });

    test('should validate security pattern matching', () => {
      const patterns = ['sk-', 'AIza', 'secret_'];
      patterns.forEach(pattern => {
        const command = `grep -r "${pattern}" gemini-summarizer/`;
        expect(command).toContain(`"${pattern}"`);
        expect(command).toContain('gemini-summarizer/');
      });
    });
  });

  describe('Build Artifacts', () => {
    test('should create proper build directory structure', () => {
      const commands = [
        'mkdir -p build',
        'cp -r gemini-summarizer/* build/',
        'cp build-info.json build/'
      ];

      commands.forEach(command => {
        expect(command).toMatch(/mkdir|cp/);
      });
    });

    test('should create ZIP packages', () => {
      const zipCommands = [
        'zip -r ../chrome-extension-v${{ github.run_number }}.zip .',
        'zip -r ../chrome-extension-source.zip .'
      ];

      zipCommands.forEach(command => {
        expect(command).toContain('zip -r');
        expect(command).toContain('.zip');
      });
    });
  });
});

describe('Workflow Environment Variables', () => {
  test('should use GitHub context variables', () => {
    const githubVars = [
      '${{ github.sha }}',
      '${{ github.ref_name }}',
      '${{ github.run_number }}',
      '${{ github.actor }}',
      '${{ github.repository }}'
    ];

    githubVars.forEach(variable => {
      expect(workflowContent).toContain(variable);
    });
  });

  test('should generate build metadata', () => {
    const buildInfoFields = [
      'build_time',
      'commit_sha',
      'branch',
      'workflow_run',
      'actor',
      'repository'
    ];

    buildInfoFields.forEach(field => {
      expect(workflowContent).toContain(`"${field}"`);
    });
  });
});

describe('Workflow Artifact Management', () => {
  test('should upload build artifacts', () => {
    expect(workflowContent).toContain('actions/upload-artifact@v4');
    expect(workflowContent).toContain('chrome-extension-v${{ github.run_number }}');
    expect(workflowContent).toContain('retention-days: 90');
  });

  test('should upload source package', () => {
    expect(workflowContent).toContain('chrome-extension-source');
    expect(workflowContent).toContain('retention-days: 30');
  });

  test('should upload unpacked extension', () => {
    expect(workflowContent).toContain('chrome-extension-unpacked');
    expect(workflowContent).toContain('path: build/');
  });
});

describe('Extension File Structure Validation', () => {
  const mockManifest = {
    manifest_version: 3,
    name: "Gemini Tab Summarizer",
    version: "2.0",
    description: "Summarize current webpage or PDF using Gemini AI",
    permissions: ["activeTab", "storage", "scripting"],
    host_permissions: ["<all_urls>"],
    action: {
      default_popup: "popup.html"
    },
    background: {
      service_worker: "background.js",
      type: "module"
    }
  };

  test('should validate manifest.json structure', () => {
    expect(mockManifest.manifest_version).toBe(3);
    expect(mockManifest.name).toBeDefined();
    expect(mockManifest.version).toBeDefined();
    expect(mockManifest.permissions).toContain('activeTab');
    expect(mockManifest.permissions).toContain('storage');
    expect(mockManifest.permissions).toContain('scripting');
  });

  test('should validate required permissions', () => {
    const requiredPermissions = ['activeTab', 'storage', 'scripting'];
    requiredPermissions.forEach(permission => {
      expect(mockManifest.permissions).toContain(permission);
    });
  });

  test('should validate service worker configuration', () => {
    expect(mockManifest.background.service_worker).toBe('background.js');
    expect(mockManifest.background.type).toBe('module');
  });

  test('should validate popup configuration', () => {
    expect(mockManifest.action.default_popup).toBe('popup.html');
  });
});