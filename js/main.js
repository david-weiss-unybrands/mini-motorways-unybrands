import { nodes, edges, transforms, categories, pillColors } from './config.js';

// Build Cytoscape elements — data table nodes
const cyNodes = nodes.map(n => {
  const cat = categories[n.cat];
  const grainStr = n.grains.length > 0 ? '\n' + n.grains.join(' · ') : '';
  return {
    data: {
      id: n.id,
      label: n.label.replace(/\n/g, '\n'),
      grains: grainStr,
      fullLabel: n.label.replace(/\n/g, '\n') + grainStr,
      cat: n.cat,
      bgColor: cat.bg,
      borderColor: cat.border,
      dim: n.dim || false,
      stacked: n.stacked || false,
      isTransform: false,
    },
    position: { x: n.x, y: n.y },
  };
});

// Build transform nodes — small inline transformation indicators
const cyTransforms = transforms.map(t => ({
  data: {
    id: t.id,
    fullLabel: t.label,
    cat: 'transform',
    bgColor: '#f5f0ff',
    borderColor: '#9b8ec4',
    dim: false,
    stacked: false,
    isTransform: true,
  },
  position: { x: t.x, y: t.y },
}));

// Build edges
const cyEdges = edges.map(([src, dst], i) => ({
  data: { id: `e${i}`, source: src, target: dst },
}));

// Initialize Cytoscape
const cy = cytoscape({
  container: document.getElementById('cy'),
  elements: [...cyNodes, ...cyTransforms, ...cyEdges],
  layout: { name: 'preset' },
  style: [
    // --- Default node style (data tables) ---
    {
      selector: 'node',
      style: {
        'shape': 'round-rectangle',
        'width': 'label',
        'height': 'label',
        'padding': '14px',
        'background-color': 'data(bgColor)',
        'border-width': 2,
        'border-color': 'data(borderColor)',
        'border-opacity': 0.8,
        'label': 'data(fullLabel)',
        'text-wrap': 'wrap',
        'text-valign': 'center',
        'text-halign': 'center',
        'font-size': '11px',
        'font-weight': 600,
        'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        'color': '#2c2c2a',
        'text-max-width': '130px',
        'line-height': 1.4,
        'corner-radius': 10,
      },
    },
    // --- Transform nodes (small, diamond-like pills) ---
    {
      selector: 'node[?isTransform]',
      style: {
        'shape': 'round-rectangle',
        'width': 'label',
        'height': 'label',
        'padding': '4px 8px',
        'background-color': '#f5f0ff',
        'border-width': 1,
        'border-color': '#9b8ec4',
        'border-opacity': 0.6,
        'font-size': '7px',
        'font-weight': 600,
        'color': '#6b5b95',
        'text-max-width': '80px',
        'corner-radius': 8,
        'opacity': 0.85,
      },
    },
    // --- Dimmed nodes (DTC) ---
    {
      selector: 'node[?dim]',
      style: {
        'opacity': 0.35,
      },
    },
    // --- Stacked nodes ---
    {
      selector: 'node[?stacked]',
      style: {
        'border-width': 3,
        'shadow-blur': 0,
        'shadow-offset-x': 3,
        'shadow-offset-y': -3,
        'shadow-color': 'data(borderColor)',
        'shadow-opacity': 0.3,
      },
    },
    // --- Tableau nodes ---
    {
      selector: 'node[cat="tableau"]',
      style: {
        'background-color': '#ffffff',
        'border-color': '#4E79A7',
        'border-width': 1.5,
        'border-style': 'solid',
      },
    },
    // --- Edge style ---
    {
      selector: 'edge',
      style: {
        'width': 1.5,
        'line-color': '#c0c4cc',
        'target-arrow-color': '#c0c4cc',
        'target-arrow-shape': 'triangle',
        'arrow-scale': 0.8,
        'curve-style': 'bezier',
        'opacity': 0.6,
      },
    },
  ],
  // Interaction
  userZoomingEnabled: true,
  userPanningEnabled: true,
  boxSelectionEnabled: false,
  autoungrabify: false,
  minZoom: 0.3,
  maxZoom: 3,
});

// Fit to view with padding
cy.fit(undefined, 40);

// Hover effects (only for non-transform nodes)
cy.on('mouseover', 'node[!isTransform]', evt => {
  const node = evt.target;
  node.style('border-width', 3);
  node.connectedEdges().style({
    'width': 2.5,
    'line-color': node.data('borderColor'),
    'target-arrow-color': node.data('borderColor'),
    'opacity': 1,
  });
});

cy.on('mouseout', 'node[!isTransform]', evt => {
  const node = evt.target;
  const isStacked = node.data('stacked');
  node.style('border-width', isStacked ? 3 : (node.data('cat') === 'tableau' ? 1.5 : 2));
  node.connectedEdges().style({
    'width': 1.5,
    'line-color': '#c0c4cc',
    'target-arrow-color': '#c0c4cc',
    'opacity': 0.6,
  });
});
