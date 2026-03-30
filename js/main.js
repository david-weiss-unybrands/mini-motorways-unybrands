import { ctx, bg, W, H, locations, allEdges } from './config.js';
import { computeLayout } from './layout.js';
import { drawEdge, drawNode, drawLegend } from './draw.js';

// Compute layout once
const { edgePaths } = computeLayout(locations, allEdges, W, H);

// Render
ctx.fillStyle = bg;
ctx.fillRect(0, 0, W, H);

// Edges first (behind nodes)
edgePaths.forEach(ep => drawEdge(ep));

// Nodes on top
locations.forEach(l => drawNode(l));

// Legend
drawLegend();
