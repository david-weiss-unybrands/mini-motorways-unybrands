import { ctx, isDark, pillColors, roadColor, roadLine, signBg, signBorder, textMain, nodeMap, tabRoadColor, tabRoadArrow } from './config.js';
import { getRoadCurve } from './math.js';

// === Edge Drawing ===

export function drawEdge(a, b) {
  const c = getRoadCurve(a, b);
  ctx.beginPath();
  ctx.moveTo(c.sx, c.sy);
  ctx.quadraticCurveTo(c.cx, c.cy, c.dx, c.dy);
  ctx.strokeStyle = roadColor;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Arrowhead at t=0.85
  const t = 0.85;
  const ax = (1 - t) * (1 - t) * c.sx + 2 * (1 - t) * t * c.cx + t * t * c.dx;
  const ay = (1 - t) * (1 - t) * c.sy + 2 * (1 - t) * t * c.cy + t * t * c.dy;
  const ttx = 2 * (1 - t) * (c.cx - c.sx) + 2 * t * (c.dx - c.cx);
  const tty = 2 * (1 - t) * (c.cy - c.sy) + 2 * t * (c.dy - c.cy);
  const angle = Math.atan2(tty, ttx);
  const sz = 5;
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(angle);
  ctx.fillStyle = roadColor;
  ctx.beginPath();
  ctx.moveTo(sz, 0);
  ctx.lineTo(-sz, -sz * 0.6);
  ctx.lineTo(-sz, sz * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawTableauEdge(a, b) {
  const c = getRoadCurve(a, b);
  ctx.beginPath();
  ctx.moveTo(c.sx, c.sy);
  ctx.quadraticCurveTo(c.cx, c.cy, c.dx, c.dy);
  ctx.strokeStyle = tabRoadColor;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.stroke();

  const t = 0.85;
  const ax = (1 - t) * (1 - t) * c.sx + 2 * (1 - t) * t * c.cx + t * t * c.dx;
  const ay = (1 - t) * (1 - t) * c.sy + 2 * (1 - t) * t * c.cy + t * t * c.dy;
  const ttx = 2 * (1 - t) * (c.cx - c.sx) + 2 * t * (c.dx - c.cx);
  const tty = 2 * (1 - t) * (c.cy - c.sy) + 2 * t * (c.dy - c.cy);
  const angle = Math.atan2(tty, ttx);
  const sz = 4;
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(angle);
  ctx.fillStyle = tabRoadArrow;
  ctx.beginPath();
  ctx.moveTo(sz, 0);
  ctx.lineTo(-sz, -sz * 0.6);
  ctx.lineTo(-sz, sz * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// === Node Drawing ===

export function drawNode(l) {
  const dim = l.dim;
  const cx = l.x + l.w / 2;
  const cy = l.y + l.h / 2;
  const r = Math.max(l.w, l.h) / 2 + 4;

  ctx.globalAlpha = dim ? 0.35 : 1;

  // Circle
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = l.color;
  ctx.fill();
  ctx.strokeStyle = l.accent;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Tableau indicator
  if (l.tableau) {
    ctx.fillStyle = isDark ? '#A0CBE8' : '#4E79A7';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('T', cx, cy);
  }

  // Stacked indicator (double ring)
  if (l.stacked) {
    ctx.beginPath();
    ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
    ctx.strokeStyle = l.accent;
    ctx.lineWidth = 1;
    ctx.globalAlpha = dim ? 0.2 : 0.35;
    ctx.stroke();
    ctx.globalAlpha = dim ? 0.35 : 1;
  }

  ctx.globalAlpha = 1;
}

export function drawPill(text, x, y, colors) {
  ctx.font = '600 9px sans-serif';
  const m = ctx.measureText(text);
  const pw = m.width + 10;
  const ph = 16;
  ctx.fillStyle = colors.bg;
  ctx.beginPath();
  ctx.roundRect(x - pw / 2, y, pw, ph, 8);
  ctx.fill();
  ctx.fillStyle = colors.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + ph / 2);
  return pw;
}

export function drawLabel(l) {
  const dim = l.dim;
  const cx = l.x + l.w / 2;
  const r = Math.max(l.w, l.h) / 2 + 4;
  const sy = l.y + l.h / 2 + r + 4;

  ctx.globalAlpha = dim ? 0.4 : 1;

  const lf = '600 10px sans-serif';
  ctx.font = lf;
  const lines = l.label.split('\n');
  ctx.font = '600 9px sans-serif';
  const pg = 4;
  const pw2 = l.grains.map(g => ctx.measureText(g).width + 10);
  const prw = pw2.length > 0 ? (pw2.reduce((a, b) => a + b, 0) + (l.grains.length - 1) * pg) : 0;

  ctx.font = lf;
  const maxLineW = Math.max(...lines.map(ln => ctx.measureText(ln).width));
  const pw = Math.max(maxLineW + 12, prw + 12);
  const lineH = 14;
  const grainH = l.grains.length > 0 ? 20 : 0;
  const ph = lines.length * lineH + 4 + grainH;
  const px = cx - pw / 2;
  const py = sy + 2;

  ctx.fillStyle = signBg;
  ctx.strokeStyle = signBorder;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = textMain;
  ctx.font = lf;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  lines.forEach((ln, i) => {
    ctx.fillText(ln, cx, py + 3 + i * lineH);
  });

  if (l.grains.length > 0) {
    const pillY = py + lines.length * lineH + 4;
    let pillX = cx - prw / 2;
    l.grains.forEach((g, i) => {
      const w = pw2[i];
      drawPill(g, pillX + w / 2, pillY, pillColors[g]);
      pillX += w + pg;
    });
  }
  ctx.globalAlpha = 1;
}

// === Tableau Data Source Hub ===

export function drawTableauDataSource(dsX, dsY) {
  const r = 10;
  ctx.save();
  ctx.shadowColor = isDark ? 'rgba(78,121,167,0.4)' : 'rgba(78,121,167,0.25)';
  ctx.shadowBlur = 8;
  ctx.fillStyle = isDark ? '#2a2d33' : '#ffffff';
  ctx.beginPath();
  ctx.arc(dsX, dsY, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = isDark ? 'rgba(78,121,167,0.6)' : 'rgba(78,121,167,0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(dsX, dsY, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = isDark ? '#A0CBE8' : '#4E79A7';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('\u22C8', dsX, dsY);
  ctx.font = '600 5px sans-serif';
  ctx.fillStyle = isDark ? 'rgba(160,203,232,0.6)' : 'rgba(78,121,167,0.5)';
  ctx.fillText('Tableau DS', dsX, dsY + r + 7);
}

// === Legend ===

export function drawLegend() {
  const x = -330, y = 14;
  const rowH = 18, swatchR = 6, pad = 10;
  const items = [
    { color: '#85B7EB', accent: '#185FA5', label: 'Brand Management' },
    { color: '#AFA9EC', accent: '#534AB7', label: 'Demand Planning' },
    { color: '#FAC775', accent: '#8B6914', label: 'Supply Chain' },
  ];
  const cardW = 140, cardH = pad + items.length * rowH + 4;
  ctx.fillStyle = signBg;
  ctx.beginPath();
  ctx.roundRect(x - pad, y - pad + 2, cardW, cardH, 6);
  ctx.fill();
  ctx.strokeStyle = signBorder;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(x - pad, y - pad + 2, cardW, cardH, 6);
  ctx.stroke();
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  items.forEach((item, i) => {
    const ry = y + i * rowH + swatchR / 2;
    ctx.beginPath();
    ctx.arc(x + swatchR, ry, swatchR, 0, Math.PI * 2);
    ctx.fillStyle = item.color;
    ctx.fill();
    ctx.strokeStyle = item.accent;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = textMain;
    ctx.fillText(item.label, x + swatchR * 2 + 6, ry);
  });
}
