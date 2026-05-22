const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const skip = new Set([
  'components/common/AppText.tsx',
  'components/common/AppTextInput.tsx',
]);

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === '.git') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(ent.name)) out.push(p);
  }
  return out;
}

function removeFromImport(src, symbol) {
  return src.replace(
    /import\s*\{([\s\S]*?)\}\s*from\s*'react-native';/g,
    (match, inner) => {
      if (!new RegExp(`\\b${symbol}\\b`).test(inner)) return match;
      const parts = inner
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((p) => !new RegExp(`^type\\s+${symbol}$`).test(p) && p !== symbol);
      if (parts.length === 0) return '';
      return `import { ${parts.join(', ')} } from 'react-native';`;
    },
  );
}

function insertAfterFirstRnImport(src, line) {
  const idx = src.search(/from 'react-native'/);
  if (idx < 0) return line + src;
  const end = src.indexOf(';', idx) + 1;
  if (src.includes(line.trim())) return src;
  return src.slice(0, end) + '\n' + line + src.slice(end);
}

let count = 0;
for (const file of walk(root)) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  if (skip.has(rel)) continue;

  let src = fs.readFileSync(file, 'utf8');
  if (!/\bText\b/.test(src) || !/from 'react-native'/.test(src)) continue;
  if (/from '@\/components\/common\/AppText'/.test(src)) continue;

  const orig = src;
  const usesText = /\bText\b/.test(src);
  const usesTextInput = /\bTextInput\b/.test(src);

  if (usesText) src = removeFromImport(src, 'Text');
  if (usesTextInput) src = removeFromImport(src, 'TextInput');

  if (usesText) {
    src = insertAfterFirstRnImport(src, "import Text from '@/components/common/AppText';\n");
  }
  if (usesTextInput) {
    src = insertAfterFirstRnImport(
      src,
      "import TextInput from '@/components/common/AppTextInput';\n",
    );
  }

  if (src !== orig) {
    fs.writeFileSync(file, src);
    count += 1;
    console.log('updated', rel);
  }
}

console.log('total', count);
