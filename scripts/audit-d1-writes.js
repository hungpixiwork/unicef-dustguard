import fs from 'node:fs';
import path from 'node:path';

const targetDirs = [
  'server',
  'app/server',
  'apps/server/src',
  'dustguard-operations/apps/server/src'
];

function scanDir(dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
        files = files.concat(scanDir(fullPath));
      }
    } else if (/\.(js|ts)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

let allFiles = [];
for (const d of targetDirs) {
  allFiles = allFiles.concat(scanDir(d));
}

const writePattern = /\b(INSERT\s+INTO|UPDATE\s+|DELETE\s+FROM|REPLACE\s+INTO)\b/i;

const results = [];

for (const filePath of allFiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Track current endpoint or function context
  let currentRoute = 'Global/Module';
  let currentMethod = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect route definitions (Hono or Express)
    const routeMatch = line.match(/(?:app|router)\.(get|post|put|patch|delete|all|use)\s*\(\s*['"`]([^'"`]+)['"`]/i);
    if (routeMatch) {
      currentMethod = routeMatch[1].toUpperCase();
      currentRoute = `${currentMethod} ${routeMatch[2]}`;
    }

    // Also detect function definitions
    const funcMatch = line.match(/(?:async\s+)?function\s+([a-zA-Z0-9_]+)|(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\(/);
    let funcName = '';
    if (funcMatch) {
      funcName = funcMatch[1] || funcMatch[2] || '';
    }

    if (writePattern.test(line) || /d1\.batch|\.batch\(|\.exec\(|run\(\s*d1|\.run\(/.test(line)) {
      // Check if it's an actual write query or just run()
      // Capture multi-line query string if needed
      let fullSnippet = line.trim();
      let startIdx = Math.max(0, i - 2);
      let endIdx = Math.min(lines.length - 1, i + 6);
      let snippet = lines.slice(startIdx, endIdx + 1).join('\n');

      // Check if it matches write keywords
      const match = fullSnippet.match(writePattern) || snippet.match(writePattern);
      const isBatch = /\.batch\(/.test(line);
      const isExec = /\.exec\(/.test(line);

      if (match || isBatch || isExec) {
        results.push({
          file: filePath,
          line: i + 1,
          endpoint: currentRoute,
          method: currentMethod,
          func: funcName,
          code: line.trim(),
          contextSnippet: snippet
        });
      }
    }
  }
}

fs.writeFileSync('audit-d1-writes.json', JSON.stringify(results, null, 2), 'utf8');
console.log(`Scan completed. Found ${results.length} write occurrences.`);
