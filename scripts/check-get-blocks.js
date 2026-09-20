import fs from 'node:fs';

function findFunctionsCalledInGet(file) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  
  // Find route handlers
  let currentGet = null;
  let getLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/\.(get|use)\s*\(\s*['"`]([^'"`]+)['"`]/);
    if (match) {
      currentGet = `${match[1].toUpperCase()} ${match[2]}`;
      getLines = [];
    }
    if (currentGet) {
      getLines.push({ line: i + 1, text: line });
      if (line.includes('});') || (line.includes('return c.json') && line.includes(';'))) {
        // check if any lines have .run( or run( or INSERT or UPDATE or DELETE
        const fullSnippet = getLines.map(l => l.text).join('\n');
        if (/\b(INSERT|UPDATE|DELETE|REPLACE)\b/i.test(fullSnippet)) {
          console.log(`[GET WRITE DETECTED in ${file}]: ${currentGet}`);
          getLines.forEach(l => {
            if (/\b(INSERT|UPDATE|DELETE|REPLACE)\b/i.test(l.text)) {
              console.log(`   line ${l.line}: ${l.text.trim()}`);
            }
          });
        }
        currentGet = null;
      }
    }
  }
}

const files = [
  'server/operations.ts',
  'server/community.ts',
  'server/iot.ts',
  'server/index.ts',
  'app/server/app.js',
  'app/server/routes/worker/health.routes.js',
  'app/server/routes/worker/staff.routes.js',
  'app/server/routes/worker/cases.routes.js',
  'app/server/routes/worker/sensors.routes.js',
  'app/server/routes/worker/sites.routes.js',
  'app/server/routes/worker/complaints.routes.js',
  'app/server/routes/worker/public.routes.js',
  'app/server/routes/worker/dashboard.routes.js',
  'app/server/routes/worker/helpers.js'
];

for (const f of files) {
  if (fs.existsSync(f)) {
    findFunctionsCalledInGet(f);
  }
}
