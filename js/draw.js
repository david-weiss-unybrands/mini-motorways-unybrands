import { ctx, isDark, pillColors, edgeColor, textMain, textSub, signBg, signBorder, nodeShadow } from './config.js';

// === Edge Drawing ===

export function drawEdge(ep) {
  const { sx, sy, dx, dy } = ep;
  const cpOffset = (dx - sx) * 0.4;

  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.bezierCurveTo(sx + cpOffset, sy, dx - cpOffset, dy, dx, dy);
  ctx.strokeStyle = edgeColor;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Arrowhead
  const t = 0.98;
  const mt = 1 - t;
  const ax = mt*mt*mt*sx + 3*mt*mt*t*(sx+cpOffset) + 3*mt*t*t*(dx-cpOffset) + t*t*t*dx;
  const ay = mt*mt*mt*sy + 3*mt*mt*t*sy + 3*mt*t*t*dy + t*t*t*dy;
  const dt = 0.02;
  const t2 = t - dt;
  const mt2 = 1 - t2;
  const bx = mt2*mt2*mt2*sx + 3*mt2*mt2*t2*(sx+cpOffset) + 3*mt2*t2*t2*(dx-cpOffset) + t2*t2*t2*dx;
  const by = mt2*mt2*mt2*sy + 3*mt2*mt2*t2*sy + 3*mt2*t2*t2*dy + t2*t2*t2*dy;
  const angle = Math.atan2(ay - by, ax - bx);
  const sz = 5;

  ctx.save();
  ctx.translate(dx, dy);
  ctx.rotate(angle);
  ctx.fillStyle = edgeColor;
  ctx.beginPath();
  ctx.moveTo(1, 0);
  ctx.lineTo(-sz, -sz * 0.5);
  ctx.lineTo(-sz, sz * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// === Node Drawing ===

export function drawNode(l) {
  const dim = l.dim;
  const r = 12;

  ctx.globalAlpha = dim ? 0.35 : 1;

  // Shadow
  ctx.save();
  ctx.shadowColor = nodeShadow;
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = l.tableau ? (isDark ? '#2a2d33' : '#ffffff') : l.color;
  ctx.beginPath();
  ctx.roundRect(l.x, l.y, l.w, l.h, r);
  ctx.fill();
  ctx.restore();

  // Border
  ctx.strokeStyle = l.tableau ? (isDark ? 'rgba(78,121,167,0.5)' : 'rgba(78,121,167,0.35)') : l.accent;
  ctx.lineWidth = l.tableau ? 1.5 : 2;
  ctx.beginPath();
  ctx.roundRect(l.x, l.y, l.w, l.h, r);
  ctx.stroke();

  // Stacked indicator
  if (l.stacked && !dim) {
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = l.color;
    ctx.beginPath();
    ctx.roundRect(l.x + 3, l.y - 3, l.w, l.h, r);
    ctx.fill();
    ctx.strokeStyle = l.accent;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(l.x + 3, l.y - 3, l.w, l.h, r);
    ctx.stroke();
    ctx.globalAlpha = dim ? 0.35 : 1;
  }

  // Tableau badge
  if (l.tableau) {
    const bx = l.x + l.w - 14, by = l.y + 5;
    ctx.fillStyle = isDark ? '#A0CBE8' : '#4E79A7';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('T', bx + 4, by + 5);
  }

  // Label text
  const lines = l.label.split('\n');
  const lineH = 14;
  const grainH = l.grains.length > 0 ? 20 : 0;
  const textBlockH = lines.length * lineH;
  const totalContentH = textBlockH + grainH;
  const textStartY = l.y + (l.h - totalContentH) / 2 + 6;

  ctx.fillStyle = l.tableau ? (isDark ? '#A0CBE8' : '#374151') : textMain;
  ctx.font = '600 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cx = l.x + l.w / 2;
  lines.forEach((ln, i) => {
    ctx.fillText(ln, cx, textStartY + i * lineH);
  });

  // Grain pills inside node
  if (l.grains.length > 0) {
    ctx.font = '600 8px sans-serif';
    const pg = 3;
    const pillWidths = l.grains.map(g => ctx.measureText(g).width + 8);
    const totalPillW = pillWidths.reduce((a, b) => a + b, 0) + (l.grains.length - 1) * pg;
    const pillY = textStartY + textBlockH + 2;
    let pillX = cx - totalPillW / 2;

    l.grains.forEach((g, i) => {
      const pw = pillWidths[i];
      const ph = 14;
      const pc = pillColors[g];
      ctx.fillStyle = pc.bg;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY - ph / 2, pw, ph, 7);
      ctx.fill();
      ctx.fillStyle = pc.text;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(g, pillX + pw / 2, pillY);
      pillX += pw + pg;
    });
  }

  ctx.globalAlpha = 1;
}

// === Legend ===

export function drawLegend() {
  const x = 16, y = 14;
  const rowH = 22, swatchW = 16, swatchH = 12, pad = 12;
  const items = [
    { color: '#85B7EB', accent: '#185FA5', label: 'Brand Management' },
    { color: '#AFA9EC', accent: '#534AB7', label: 'Demand Planning' },
    { color: '#FAC775', accent: '#8B6914', label: 'Supply Chain' },
    { color: '#ffffff', accent: 'rgba(78,121,167,0.35)', label: 'Tableau Report' },
  ];
  const cardW = 155, cardH = pad + items.length * rowH + 4;

  ctx.fillStyle = signBg;
  ctx.beginPath();
  ctx.roundRect(x, y, cardW, cardH, 8);
  ctx.fill();
  ctx.strokeStyle = signBorder;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(x, y, cardW, cardH, 8);
  ctx.stroke();

  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  items.forEach((item, i) => {
    const ry = y + pad + i * rowH;
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.roundRect(x + pad, ry, swatchW, swatchH, 4);
    ctx.fill();
    ctx.strokeStyle = item.accent;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x + pad, ry, swatchW, swatchH, 4);
    ctx.stroke();
    ctx.fillStyle = textMain;
    ctx.fillText(item.label, x + pad + swatchW + 8, ry + swatchH / 2);
  });
}
