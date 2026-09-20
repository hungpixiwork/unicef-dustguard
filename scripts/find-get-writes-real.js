import fs from 'node:fs';

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
    const fullPath = (dir + '/' + entry.name).replace(/\\/g, '/');
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

const writePattern = /\b(INSERT\s+INTO|UPDATE\s+|DELETE\s+FROM|REPLACE\s+INTO)\b/i;

for (const dir of targetDirs) {
  const files = scanDir(dir);
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    
    // Check for app.get or router.get
    // Match pattern: (app|router).get\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(?:async\s*)?\(([^)]*)\)\s*=>\s*\{([\s\S]*?)\}\s*\);
    // Let's do line-by-line block matching
    const lines = content.split('\n');
    let insideGet = false;
    let getStartLine = 0;
    let getEndpoint = '';
    let braceCount = 0;
    let getBodyLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const getMatch = line.match(/(?:app|router|legalRouter|contractorRouter|iotRouter|staffRouter|caseRouter)\.get\s*\(\s*['"`]([^'"`]+)['"`]/i);
      
      if (getMatch && !insideGet) {
        insideGet = true;
        getStartLine = i + 1;
        getEndpoint = getMatch[1];
        braceCount = 0;
        getBodyLines = [];
      }

      if (insideGet) {
        getBodyLines.push({ lineNum: i + 1, text: line });
        for (const char of line) {
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
        }
        if (braceCount === 0 && line.includes(';')) {
          // Finished GET handler
          insideGet = false;
          // Check if getBodyLines contain write queries
          for (const item of getBodyLines) {
            if (writePattern.test(item.text) || /run\(|\.run\(|exec\(|\.exec\(|\.batch\(/.test(item.text)) {
              // verify if it's a real write
              if (writePattern.test(item.text) || /INSERT|UPDATE|DELETE/i.test(getBodyLines.map(l => l.text).join('\n'))) {
                if (writePattern.test(item.text)) {
                  console.log(`REAL GET WRITE: ${file}:${item.lineNum} [GET ${getEndpoint}] -> ${item.text.trim()}`);
                }
              }
            }
          }
        }
      }
    }
  }
}
