import { BaseEdge } from '@xyflow/react';

const RADIUS = 5;

function arc(dx, dy) {
  // Small arc for rounded corners
  const sweep = (dx > 0 && dy > 0) || (dx < 0 && dy < 0) ? 1 : 0;
  return `A ${RADIUS} ${RADIUS} 0 0 ${sweep} `;
}

function buildPath(sx, sy, tx, ty, sPos, tPos, offset) {
  // offset shifts the intermediate corridor perpendicular to the main axis
  const r = RADIUS;
  const points = [];
  points.push({ x: sx, y: sy });

  if (
    (sPos === 'left' && tPos === 'left') ||
    (sPos === 'right' && tPos === 'right')
  ) {
    // Side-to-side (same side): go out horizontally, travel vertically, come back in
    const dir = sPos === 'left' ? -1 : 1;
    const baseX = dir * Math.max(30, Math.abs(Math.min(sx, tx) - Math.max(sx, tx)) * 0.3 + 30);
    const cx = (sPos === 'left' ? Math.min(sx, tx) : Math.max(sx, tx)) + baseX + offset * dir;
    points.push({ x: cx, y: sy });
    points.push({ x: cx, y: ty });
    points.push({ x: tx, y: ty });
  } else if (
    (sPos === 'top' && tPos === 'top') ||
    (sPos === 'bottom' && tPos === 'bottom')
  ) {
    const dir = sPos === 'top' ? -1 : 1;
    const baseY = dir * Math.max(30, Math.abs(Math.min(sy, ty) - Math.max(sy, ty)) * 0.3 + 30);
    const cy = (sPos === 'top' ? Math.min(sy, ty) : Math.max(sy, ty)) + baseY + offset * dir;
    points.push({ x: sx, y: cy });
    points.push({ x: tx, y: cy });
    points.push({ x: tx, y: ty });
  } else if (
    (sPos === 'bottom' && tPos === 'top') ||
    (sPos === 'top' && tPos === 'bottom')
  ) {
    // Vertical flow: go down/up, bend horizontally at midpoint, continue to target
    const midY = (sy + ty) / 2 + offset;
    points.push({ x: sx, y: midY });
    points.push({ x: tx, y: midY });
    points.push({ x: tx, y: ty });
  } else if (
    (sPos === 'right' && tPos === 'left') ||
    (sPos === 'left' && tPos === 'right')
  ) {
    // Horizontal flow
    const midX = (sx + tx) / 2 + offset;
    points.push({ x: midX, y: sy });
    points.push({ x: midX, y: ty });
    points.push({ x: tx, y: ty });
  } else {
    // Mixed (e.g., bottom to left, right to top): use two midpoints
    if ((sPos === 'bottom' || sPos === 'top') && (tPos === 'left' || tPos === 'right')) {
      const midY = ty + offset;
      points.push({ x: sx, y: midY });
      points.push({ x: tx, y: midY });
    } else {
      const midX = tx + offset;
      points.push({ x: midX, y: sy });
      points.push({ x: midX, y: ty });
    }
    points.push({ x: tx, y: ty });
  }

  // Build SVG path with rounded corners
  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    if (!next) {
      // Last point
      d += ` L ${curr.x} ${curr.y}`;
      break;
    }

    // Direction into this point
    const dxIn = curr.x - prev.x;
    const dyIn = curr.y - prev.y;
    // Direction out of this point
    const dxOut = next.x - curr.x;
    const dyOut = next.y - curr.y;

    // If there's a turn, add rounded corner
    if ((dxIn !== 0 && dyOut !== 0) || (dyIn !== 0 && dxOut !== 0)) {
      const lenIn = Math.sqrt(dxIn * dxIn + dyIn * dyIn);
      const lenOut = Math.sqrt(dxOut * dxOut + dyOut * dyOut);
      const maxR = Math.min(r, lenIn / 2, lenOut / 2);

      if (maxR > 0.5) {
        // Point just before the corner
        const bx = curr.x - (dxIn / lenIn) * maxR;
        const by = curr.y - (dyIn / lenIn) * maxR;
        // Point just after the corner
        const ax = curr.x + (dxOut / lenOut) * maxR;
        const ay = curr.y + (dyOut / lenOut) * maxR;

        const cross = dxIn * dyOut - dyIn * dxOut;
        const sweep = cross > 0 ? 1 : 0;

        d += ` L ${bx} ${by}`;
        d += ` A ${maxR} ${maxR} 0 0 ${sweep} ${ax} ${ay}`;
      } else {
        d += ` L ${curr.x} ${curr.y}`;
      }
    } else {
      d += ` L ${curr.x} ${curr.y}`;
    }
  }

  return d;
}

const HANDLE_POS_MAP = {
  's-top': 'top', 's-bottom': 'bottom', 's-left': 'left', 's-right': 'right',
  't-top': 'top', 't-bottom': 'bottom', 't-left': 'left', 't-right': 'right',
};

export default function OffsetEdge({
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  sourceHandleId, targetHandleId,
  style, markerEnd, markerStart, data,
}) {
  const offset = data?.offset || 0;
  const sPos = HANDLE_POS_MAP[sourceHandleId] || sourcePosition;
  const tPos = HANDLE_POS_MAP[targetHandleId] || targetPosition;

  const path = buildPath(sourceX, sourceY, targetX, targetY, sPos, tPos, offset);

  return <BaseEdge path={path} style={style} markerEnd={markerEnd} markerStart={markerStart} />;
}
