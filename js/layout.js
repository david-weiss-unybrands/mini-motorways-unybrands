import { ctx } from './config.js';

// === Sugiyama Layout Algorithm ===

function buildGraph(edges) {
  const adj = {}, radj = {}, nodeSet = new Set();
  edges.forEach(([s, d]) => {
    nodeSet.add(s); nodeSet.add(d);
    if (!adj[s]) adj[s] = [];
    if (!adj[d]) adj[d] = [];
    if (!radj[s]) radj[s] = [];
    if (!radj[d]) radj[d] = [];
    adj[s].push(d);
    radj[d].push(s);
  });
  return { adj, radj, nodeSet };
}

function assignLayers(nodeSet, adj, radj) {
  const layerMap = {};
  const nodes = [...nodeSet];

  // Initialize all to 0
  nodes.forEach(n => layerMap[n] = 0);

  // Topological sort via Kahn's algorithm
  const inDeg = {};
  nodes.forEach(n => inDeg[n] = (radj[n] || []).length);
  const queue = nodes.filter(n => inDeg[n] === 0);
  const order = [];

  while (queue.length > 0) {
    const n = queue.shift();
    order.push(n);
    (adj[n] || []).forEach(m => {
      inDeg[m]--;
      if (inDeg[m] === 0) queue.push(m);
    });
  }

  // Longest path from sources
  order.forEach(n => {
    (adj[n] || []).forEach(m => {
      layerMap[m] = Math.max(layerMap[m], layerMap[n] + 1);
    });
  });

  return layerMap;
}

function buildLayerArrays(layerMap) {
  const maxLayer = Math.max(...Object.values(layerMap));
  const layers = [];
  for (let i = 0; i <= maxLayer; i++) layers.push([]);
  Object.entries(layerMap).forEach(([n, l]) => layers[l].push(n));
  return layers;
}

function countCrossings(layerA, layerB, adj) {
  const posB = {};
  layerB.forEach((n, i) => posB[n] = i);
  const edges = [];
  layerA.forEach((u, i) => {
    (adj[u] || []).forEach(v => {
      if (posB[v] !== undefined) edges.push([i, posB[v]]);
    });
  });
  let crossings = 0;
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      if ((edges[i][0] - edges[j][0]) * (edges[i][1] - edges[j][1]) < 0) crossings++;
    }
  }
  return crossings;
}

function minimizeCrossings(layers, adj, radj) {
  let bestOrder = layers.map(l => [...l]);
  let bestCrossings = Infinity;

  for (let iter = 0; iter < 30; iter++) {
    // Forward sweep
    for (let i = 1; i < layers.length; i++) {
      const posInPrev = {};
      layers[i - 1].forEach((n, idx) => posInPrev[n] = idx);

      layers[i].sort((a, b) => {
        const predsA = (radj[a] || []).filter(p => posInPrev[p] !== undefined);
        const predsB = (radj[b] || []).filter(p => posInPrev[p] !== undefined);
        const baryA = predsA.length > 0 ? predsA.reduce((s, p) => s + posInPrev[p], 0) / predsA.length : 0;
        const baryB = predsB.length > 0 ? predsB.reduce((s, p) => s + posInPrev[p], 0) / predsB.length : 0;
        return baryA - baryB;
      });
    }

    // Backward sweep
    for (let i = layers.length - 2; i >= 0; i--) {
      const posInNext = {};
      layers[i + 1].forEach((n, idx) => posInNext[n] = idx);

      layers[i].sort((a, b) => {
        const succsA = (adj[a] || []).filter(s => posInNext[s] !== undefined);
        const succsB = (adj[b] || []).filter(s => posInNext[s] !== undefined);
        const baryA = succsA.length > 0 ? succsA.reduce((s, p) => s + posInNext[p], 0) / succsA.length : 0;
        const baryB = succsB.length > 0 ? succsB.reduce((s, p) => s + posInNext[p], 0) / succsB.length : 0;
        return baryA - baryB;
      });
    }

    // Count total crossings
    let totalCrossings = 0;
    for (let i = 0; i < layers.length - 1; i++) {
      totalCrossings += countCrossings(layers[i], layers[i + 1], adj);
    }

    if (totalCrossings < bestCrossings) {
      bestCrossings = totalCrossings;
      bestOrder = layers.map(l => [...l]);
    }
  }

  // Apply best ordering
  for (let i = 0; i < layers.length; i++) {
    layers[i] = bestOrder[i];
  }
}

function measureNode(loc) {
  const lines = loc.label.split('\n');
  ctx.font = '600 11px sans-serif';
  const maxLineW = Math.max(...lines.map(ln => ctx.measureText(ln).width));

  ctx.font = '600 8px sans-serif';
  const pg = 4;
  const pillWidths = loc.grains.map(g => ctx.measureText(g).width + 10);
  const totalPillW = pillWidths.length > 0
    ? pillWidths.reduce((a, b) => a + b, 0) + (loc.grains.length - 1) * pg
    : 0;

  const padX = 24;
  const padY = 16;
  const lineH = 15;
  const grainH = loc.grains.length > 0 ? 22 : 0;

  const w = Math.max(maxLineW + padX, totalPillW + padX, 80);
  const h = lines.length * lineH + grainH + padY;

  return { w, h };
}

export function computeLayout(locations, edges, canvasW, canvasH) {
  const { adj, radj, nodeSet } = buildGraph(edges);

  // Find connected vs isolated nodes
  const locMap = {};
  locations.forEach(l => locMap[l.id] = l);
  const connected = locations.filter(l => nodeSet.has(l.id));
  const isolated = locations.filter(l => !nodeSet.has(l.id));

  // Layer assignment
  const layerMap = assignLayers(nodeSet, adj, radj);
  const layers = buildLayerArrays(layerMap);

  // Crossing minimization
  minimizeCrossings(layers, adj, radj);

  // Measure all nodes
  const sizes = {};
  locations.forEach(l => sizes[l.id] = measureNode(l));

  // Compute positions
  const PADDING_LEFT = 60;
  const PADDING_TOP = 40;
  const numLayers = layers.length;
  const layerSpacing = (canvasW - PADDING_LEFT * 2) / Math.max(numLayers - 1, 1);

  const positions = {};

  layers.forEach((layer, li) => {
    const x = PADDING_LEFT + li * layerSpacing;

    // Find max node height in this layer to compute vertical spacing
    const totalH = layer.reduce((s, id) => s + (sizes[id]?.h || 40), 0);
    const nodeGap = 18;
    const totalWithGaps = totalH + (layer.length - 1) * nodeGap;
    const startY = Math.max(PADDING_TOP, (canvasH - totalWithGaps) / 2);

    let cy = startY;
    layer.forEach(id => {
      const s = sizes[id] || { w: 80, h: 40 };
      positions[id] = { x: x - s.w / 2, y: cy, w: s.w, h: s.h, cx: x, cy: cy + s.h / 2 };
      cy += s.h + nodeGap;
    });
  });

  // Vertical refinement: center nodes relative to neighbors (2 passes)
  for (let pass = 0; pass < 4; pass++) {
    layers.forEach((layer, li) => {
      layer.forEach(id => {
        const neighbors = [...(adj[id] || []), ...(radj[id] || [])];
        const neighborYs = neighbors.filter(n => positions[n]).map(n => positions[n].cy);
        if (neighborYs.length > 0) {
          const avgY = neighborYs.reduce((a, b) => a + b, 0) / neighborYs.length;
          const s = sizes[id] || { h: 40 };
          positions[id].y = avgY - s.h / 2;
          positions[id].cy = avgY;
        }
      });

      // Resolve overlaps within layer
      const sorted = [...layer].sort((a, b) => positions[a].cy - positions[b].cy);
      for (let i = 1; i < sorted.length; i++) {
        const prev = positions[sorted[i - 1]];
        const curr = positions[sorted[i]];
        const minGap = 18;
        const prevBottom = prev.y + (sizes[sorted[i - 1]]?.h || 40) + minGap;
        if (curr.y < prevBottom) {
          curr.y = prevBottom;
          curr.cy = curr.y + (sizes[sorted[i]]?.h || 40) / 2;
        }
      }
    });
  }

  // Place isolated nodes (DTC) at top-left
  let isoY = PADDING_TOP;
  isolated.forEach(l => {
    const s = sizes[l.id] || { w: 80, h: 40 };
    positions[l.id] = { x: PADDING_LEFT - s.w / 2, y: isoY, w: s.w, h: s.h, cx: PADDING_LEFT, cy: isoY + s.h / 2 };
    isoY += s.h + 14;
  });

  // Apply positions back to locations
  locations.forEach(l => {
    if (positions[l.id]) {
      l.x = positions[l.id].x;
      l.y = positions[l.id].y;
      l.w = positions[l.id].w;
      l.h = positions[l.id].h;
    }
  });

  // Build edge paths
  const edgePaths = edges.map(([src, dst]) => {
    const sp = positions[src], dp = positions[dst];
    if (!sp || !dp) return null;
    return {
      sx: sp.x + sp.w, sy: sp.cy,
      dx: dp.x, dy: dp.cy,
      src, dst
    };
  }).filter(Boolean);

  return { positions, edgePaths };
}
