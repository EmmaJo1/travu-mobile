const fs = require('fs');
const j = JSON.parse(fs.readFileSync('./figma_nodes.json', 'utf8'));

if (j.err) { console.log('ERR:', j.err); process.exit(1); }

const page = j.nodes['3:4'];

function extractText(node, depth, parentName) {
  if (depth > 8) return;
  if (node.type === 'TEXT' && node.style) {
    const s = node.style;
    const lh = s.lineHeightPx != null ? s.lineHeightPx.toFixed(0) : s.lineHeightPercent + '%';
    const chars = (node.characters || '').slice(0, 35);
    console.log(
      '  '.repeat(depth) +
      `[TEXT] "${chars}"  font:${s.fontFamily} ${s.fontSize}px w:${s.fontWeight} lh:${lh} ls:${s.letterSpacing||0}`
    );
  }
  const fills = (node.fills || []).filter(f => f.type === 'SOLID');
  const fillStr = fills.length
    ? ' fills:' + fills.map(f => `rgba(${Math.round(f.color.r*255)},${Math.round(f.color.g*255)},${Math.round(f.color.b*255)},${(f.opacity||1).toFixed(2)})`).join('/')
    : '';

  const bb = node.absoluteBoundingBox;
  const sizeStr = bb ? ` ${bb.width.toFixed(0)}x${bb.height.toFixed(0)}` : '';
  const padStr = node.paddingTop != null
    ? ` pad:${node.paddingTop}/${node.paddingRight}/${node.paddingBottom}/${node.paddingLeft}`
    : '';
  const gapStr = node.itemSpacing != null ? ` gap:${node.itemSpacing}` : '';
  const rStr = node.cornerRadius != null ? ` r:${node.cornerRadius}` : '';
  const strokeStr = (node.strokes || []).filter(s => s.type === 'SOLID').length > 0
    ? ` sw:${node.strokeWeight}` : '';

  if (node.type !== 'TEXT') {
    console.log(
      '  '.repeat(depth) +
      `[${node.type}] ${node.name}${sizeStr}${fillStr}${padStr}${gapStr}${rStr}${strokeStr}`
    );
  }
  (node.children || []).forEach(c => extractText(c, depth + 1, node.name));
}

page.document.children.forEach(section => {
  const isMVP = section.name.includes('Travu MVP');
  const isText = section.name.includes('Text Style');
  const isRadius = section.name.includes('Radius') || section.name.includes('Rectangle');
  if (isMVP || isText) {
    console.log('\n' + '='.repeat(60));
    console.log('SECTION: ' + section.name + ' (' + section.id + ')');
    console.log('='.repeat(60));
    extractText(section, 0, section.name);
  }
});
