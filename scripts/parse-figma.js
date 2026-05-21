const fs = require('fs');
const j = JSON.parse(fs.readFileSync('./figma_components.json', 'utf8'));

function rgba(color, opacity) {
  if (!color) return '';
  return `rgba(${Math.round(color.r * 255)},${Math.round(color.g * 255)},${Math.round(color.b * 255)},${(opacity ?? 1).toFixed(2)})`;
}

function printNode(n, depth) {
  const pad = '  '.repeat(depth);
  const bb = n.absoluteBoundingBox;
  const size = bb ? `${bb.width.toFixed(0)}x${bb.height.toFixed(0)}` : '';

  const fills = (n.fills || [])
    .filter(f => f.visible !== false && f.type === 'SOLID')
    .map(f => `fill:${rgba(f.color, f.opacity)}`)
    .join(' ');

  const strokes = (n.strokes || [])
    .filter(s => s.type === 'SOLID')
    .map(s => `stroke:${rgba(s.color, 1)} sw:${n.strokeWeight}`)
    .join(' ');

  const style = n.style
    ? `[${n.style.fontFamily} ${n.style.fontSize}px w:${n.style.fontWeight} lh:${n.style.lineHeightPx?.toFixed(0)} ls:${n.style.letterSpacing}]`
    : '';

  const chars = n.characters ? `"${n.characters.slice(0, 30)}"` : '';
  const pad2 = n.paddingTop != null
    ? `pad:T${n.paddingTop} R${n.paddingRight} B${n.paddingBottom} L${n.paddingLeft}`
    : '';
  const gap = n.itemSpacing != null ? `gap:${n.itemSpacing}` : '';
  const radius = n.cornerRadius != null
    ? `r:${n.cornerRadius}`
    : (n.rectangleCornerRadii ? `r:[${n.rectangleCornerRadii.join(',')}]` : '');
  const layout = n.layoutMode ? `layout:${n.layoutMode}` : '';
  const main = n.primaryAxisAlignItems ? `main:${n.primaryAxisAlignItems} cross:${n.counterAxisAlignItems}` : '';
  const sizing = n.primaryAxisSizingMode
    ? `sizing:${n.primaryAxisSizingMode}/${n.counterAxisSizingMode}`
    : '';

  const parts = [size, fills, strokes, pad2, gap, radius, layout, main, sizing, style, chars]
    .filter(Boolean).join('  ');

  console.log(`${pad}[${n.type}] ${n.name}  ${parts}`);
  if (depth < 5) (n.children || []).forEach(c => printNode(c, depth + 1));
}

Object.entries(j.nodes).forEach(([id, data]) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`NODE: ${id}`);
  console.log('='.repeat(60));
  printNode(data.document, 0);
});
