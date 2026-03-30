import { nodes, edges, transforms, categories, pillColors } from './config.js';

// Build Cytoscape elements — data table nodes
const cyNodes = nodes.map(n => {
  const cat = categories[n.cat];
  // Full label for sizing (rendered invisible — HTML overlay handles display)
  const grainStr = n.grains.length > 0 ? '\n' + n.grains.join('  ') : '';
  return {
    data: {
      id: n.id,
      label: n.label.replace(/\n/g, '\n'),
      grains: n.grains,
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
    // --- Default node style ---
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
        'color': 'transparent',  // hidden — HTML overlay handles rendering
        'text-max-width': '120px',
        'line-height': 1.5,
        'corner-radius': 8,
        // Card shadow
        'shadow-blur': 15,
        'shadow-offset-x': 0,
        'shadow-offset-y': 4,
        'shadow-color': 'rgba(0, 0, 0, 0.18)',
        'shadow-opacity': 1,
        'border-width': 1,
        'border-color': '#e5e7eb',
        'border-opacity': 1,
        'underlay-color': 'data(accent)',
        'underlay-padding': 0,
        'underlay-opacity': 0,
      },
    },
    // --- Category accent border ---
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
        'color': '#6b7280',  // transforms keep native label (small, simple)
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
        'width': 2.5,
        'line-color': '#6b7280',
        'target-arrow-color': '#6b7280',
        'target-arrow-shape': 'triangle',
        'arrow-scale': 1.2,
        'curve-style': 'bezier',
        'opacity': 0.7,
      },
    },
  ],
  userZoomingEnabled: true,
  userPanningEnabled: true,
  boxSelectionEnabled: false,
  autoungrabify: false,
  minZoom: 0.3,
  maxZoom: 3,
});

// HTML label overlays for rich typography
cy.nodeHtmlLabel([
  {
    query: 'node[!isTransform]',
    halign: 'center',
    valign: 'center',
    cssClass: 'node-label',
    tpl: data => {
      if (data.dim) return '';  // dimmed nodes keep native label
      const lines = data.label.split('\n');
      const name = lines.map(l => `<div>${l}</div>`).join('');
      const grains = data.grains && data.grains.length > 0
        ? `<div class="grains">${data.grains.join('<span class="sep"> · </span>')}</div>`
        : '';
      return `<div class="node-html">${name}${grains}</div>`;
    },
  },
]);

// Fit to view
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
    'width': 3,
    'line-color': accent,
    'target-arrow-color': accent,
    'opacity': 0.85,
  });
});

cy.on('mouseout', 'node[!isTransform]', evt => {
  const node = evt.target;
  const isStacked = node.data('stacked');
  const accent = node.data('accent');
  node.style({
    'border-opacity': 0.5,
    'border-width': '1 1 1 3',
    'shadow-blur': isStacked ? 0 : 15,
    'shadow-color': isStacked ? accent : 'rgba(0, 0, 0, 0.18)',
    'shadow-opacity': isStacked ? 0.15 : 1,
    'shadow-offset-x': isStacked ? 3 : 0,
    'shadow-offset-y': isStacked ? -3 : 4,
  });
  node.connectedEdges().style({
    'width': 2.5,
    'line-color': '#6b7280',
    'target-arrow-color': '#6b7280',
    'opacity': 0.7,
  });
});
