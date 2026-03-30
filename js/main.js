import { nodes, edges, transforms, categories, pillColors } from './config.js';

// Build Cytoscape elements — data table nodes
const cyNodes = nodes.map(n => {
  const cat = categories[n.cat];
  // Grains as a lighter secondary line
  const grainStr = n.grains.length > 0 ? '\n' + n.grains.join('  ') : '';
  return {
    data: {
      id: n.id,
      label: n.label.replace(/\n/g, '\n'),
      fullLabel: n.label.replace(/\n/g, '\n') + grainStr,
      cat: n.cat,
      accent: cat.accent,
      dim: n.dim || false,
      stacked: n.stacked || false,
      isTransform: false,
    },
    position: { x: n.x, y: n.y },
  };
});

// Build transform nodes
const cyTransforms = transforms.map(t => ({
  data: {
    id: t.id,
    fullLabel: t.label,
    cat: 'transform',
    accent: '#9ca3af',
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
    // --- Default node style: white card with colored left accent ---
    {
      selector: 'node',
      style: {
        'shape': 'round-rectangle',
        'width': 'label',
        'height': 'label',
        'padding': '12px',
        'background-color': '#ffffff',
        'border-width': 0,
        'label': 'data(fullLabel)',
        'text-wrap': 'wrap',
        'text-valign': 'center',
        'text-halign': 'center',
        'font-size': '10px',
        'font-weight': 400,
        'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif',
        'color': '#374151',
        'text-max-width': '120px',
        'line-height': 1.5,
        'corner-radius': 8,
        // Soft shadow for card effect
        'shadow-blur': 12,
        'shadow-offset-x': 0,
        'shadow-offset-y': 2,
        'shadow-color': 'rgba(0, 0, 0, 0.06)',
        'shadow-opacity': 1,
        // Colored left accent stripe via border
        'border-width': 1,
        'border-color': '#e5e7eb',
        'border-opacity': 1,
        // Overlay colored indicator
        'underlay-color': 'data(accent)',
        'underlay-padding': 0,
        'underlay-opacity': 0,
      },
    },
    // --- Category accent: thin left-colored border ---
    // Since Cytoscape can't do left-only borders, use a thin
    // bottom underlay stripe effect
    {
      selector: 'node[!isTransform]',
      style: {
        'border-width': '1 1 1 3',
        'border-color': 'data(accent)',
        'border-opacity': 0.5,
      },
    },
    // --- Transform nodes ---
    {
      selector: 'node[?isTransform]',
      style: {
        'padding': '3px 6px',
        'background-color': '#fafafa',
        'border-width': 1,
        'border-color': '#d1d5db',
        'border-opacity': 0.6,
        'border-style': 'dashed',
        'font-size': '7px',
        'font-weight': 500,
        'color': '#6b7280',
        'text-max-width': '70px',
        'corner-radius': 6,
        'shadow-blur': 0,
        'shadow-opacity': 0,
        'opacity': 0.9,
      },
    },
    // --- Dimmed nodes (DTC) ---
    {
      selector: 'node[?dim]',
      style: {
        'opacity': 0.3,
        'border-opacity': 0.2,
      },
    },
    // --- Stacked nodes ---
    {
      selector: 'node[?stacked]',
      style: {
        'shadow-blur': 0,
        'shadow-offset-x': 3,
        'shadow-offset-y': -3,
        'shadow-color': 'data(accent)',
        'shadow-opacity': 0.15,
      },
    },
    // --- Tableau nodes ---
    {
      selector: 'node[cat="tableau"]',
      style: {
        'border-style': 'dashed',
      },
    },
    // --- Edge style ---
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': '#9ca3af',
        'target-arrow-color': '#9ca3af',
        'target-arrow-shape': 'triangle',
        'arrow-scale': 0.9,
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

// Hover effects
cy.on('mouseover', 'node[!isTransform]', evt => {
  const node = evt.target;
  const accent = node.data('accent');
  node.style({
    'border-opacity': 1,
    'border-width': '1 1 1 4',
    'shadow-blur': 16,
    'shadow-color': accent,
    'shadow-opacity': 0.12,
    'shadow-offset-x': 0,
    'shadow-offset-y': 4,
  });
  node.connectedEdges().style({
    'width': 1.5,
    'line-color': accent,
    'target-arrow-color': accent,
    'opacity': 0.7,
  });
});

cy.on('mouseout', 'node[!isTransform]', evt => {
  const node = evt.target;
  const isStacked = node.data('stacked');
  const accent = node.data('accent');
  node.style({
    'border-opacity': 0.5,
    'border-width': '1 1 1 3',
    'shadow-blur': isStacked ? 0 : 12,
    'shadow-color': isStacked ? accent : 'rgba(0, 0, 0, 0.06)',
    'shadow-opacity': isStacked ? 0.15 : 1,
    'shadow-offset-x': isStacked ? 3 : 0,
    'shadow-offset-y': isStacked ? -3 : 2,
  });
  node.connectedEdges().style({
    'width': 2,
    'line-color': '#9ca3af',
    'target-arrow-color': '#9ca3af',
    'opacity': 0.6,
  });
});
