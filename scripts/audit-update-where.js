import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('audit-d1-writes.json', 'utf8'));
const updates = data.filter(d => /\bUPDATE\b/i.test(d.code) || /\bUPDATE\b/i.test(d.contextSnippet));

console.log('Total UPDATE entries found:', updates.length);

const findings = [];

for (const u of updates) {
  // Read actual lines around u.line from file to get full SQL statement
  try {
    const content = fs.readFileSync(u.file, 'utf8');
    const lines = content.split('\n');
    const start = Math.max(0, u.line - 2);
    const end = Math.min(lines.length - 1, u.line + 10);
    const snippet = lines.slice(start, end + 1).join('\n');

    // Extract UPDATE ...
    const updateMatch = snippet.match(/UPDATE\s+([a-zA-Z0-9_`"']+)([\s\S]*?)(?:WHERE([\s\S]*?))?(?:\.run|\.bind|\.execute|;|`|"|'\))/i);

    let whereClause = '';
    let hasWhere = false;
    let isBroad = false;

    if (/WHERE\b/i.test(snippet)) {
      hasWhere = true;
      const m = snippet.match(/WHERE\s+([^;`"'\)\n]+)/i);
      whereClause = m ? m[1].trim() : 'FOUND_WHERE';
      if (/1\s*=\s*1|true/i.test(whereClause)) {
        isBroad = true;
      }
    } else {
      isBroad = true;
    }

    findings.push({
      file: u.file,
      line: u.line,
      endpoint: u.endpoint,
      code: u.code,
      hasWhere,
      isBroad,
      whereClause,
      snippet: snippet.substring(0, 180).replace(/\s+/g, ' ')
    });
  } catch (e) {
    // ignore
  }
}

const broadUpdates = findings.filter(f => f.isBroad || !f.hasWhere);
console.log('Broad or missing WHERE updates:', broadUpdates.length);

broadUpdates.forEach((b, idx) => {
  console.log(`[${idx+1}] ${b.file}:${b.line} | hasWhere: ${b.hasWhere} | where: "${b.whereClause}" | snippet: ${b.snippet}`);
});
