import fs from 'node:fs';
import path from 'node:path';

// Supported file extensions and their language mapping
export const LANGUAGE_MAP = {
  '.js': 'javascript',
  '.jsx': 'javascript-react',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript-react',
  '.mts': 'typescript',
  '.cts': 'typescript',
  '.py': 'python',
  '.java': 'java',
  '.go': 'go',
  '.rs': 'rust',
};

// Ignore directories and patterns
const IGNORE_DIRS = new Set([
  'node_modules',
  'target',
  'dist',
  'build',
  '.git',
  '.mvn',
  '.idea',
  '.vscode',
  '.kilo',
  '.gemini',
  '__pycache__',
  '.pytest_cache',
  '.next',
  '.turbo',
  'vendor',
  'bin',
  'obj',
  'coverage',
  '.venv',
  'venv',
  'env',
  '.graphify',
]);

const SENSITIVE_PATTERNS = [
  /\.env(\..+)?$/i,
  /secret/i,
  /credential/i,
  /password/i,
  /token/i,
  /auth/i,
  /jwt/i,
  /apikey/i,
  /payment/i,
];

/**
 * Scans repository and returns list of relevant source files and metadata
 */
export function scanDirectory(rootDir) {
  const normalizedRoot = path.resolve(rootDir);
  const files = [];

  function walk(currentDir) {
    let entries = [];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(normalizedRoot, fullPath).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
          walk(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        const language = LANGUAGE_MAP[ext];

        if (language) {
          try {
            const stats = fs.statSync(fullPath);
            const isSensitive = SENSITIVE_PATTERNS.some((pattern) => pattern.test(relativePath));

            files.push({
              path: relativePath,
              fullPath,
              name: entry.name,
              extension: ext,
              language,
              sizeBytes: stats.size,
              isSensitive,
            });
          } catch {
            // ignore unreadable files
          }
        }
      }
    }
  }

  walk(normalizedRoot);
  return { rootDir: normalizedRoot, files };
}
