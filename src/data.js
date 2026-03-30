const X_OFF = 350;

// Category accent colors
export const categories = {
  brand:   { accent: '#6366f1' },
  demand:  { accent: '#8b5cf6' },
  supply:  { accent: '#d97706' },
  tableau: { accent: '#0891b2' },
  dtc:     { accent: '#9ca3af' },
};

// Raw node definitions
const rawNodes = [
  // DTC (dimmed)
  {id:'shopify', label:'Shopify Sales', grains:[], x:385+X_OFF, y:80, cat:'dtc', dim:true},
  {id:'tiktok', label:'Tiktok', grains:[], x:265+X_OFF, y:75, cat:'dtc', dim:true},
  {id:'walmart', label:'Walmart', grains:[], x:325+X_OFF, y:10, cat:'dtc', dim:true},
  // Demand Planning
  {id:'forecast', label:'flbr_raw_forecast_** (UB Legacy)', grains:['Date','Snapshot Date','Channel','ASIN','Region'], x:25+X_OFF, y:470, cat:'demand', tag:'Amazon only'},
  {id:'forecast_rf', label:'flbr_raw_forecast_** (Redfits)', grains:['Date','Snapshot Date','Channel','SKU','Region'], x:40+X_OFF, y:270, cat:'demand', tag:'Amazon only'},
  {id:'forecast_actuals', label:'forecast_actuals', grains:['Date','ASIN','Country'], x:470+X_OFF, y:450, cat:'demand', stacked:true},
  {id:'flieber', label:'flbr_monthly_snapshots', grains:['Date','Snapshot Month','Channel','SKU','Region'], x:100+X_OFF, y:370, cat:'demand', stacked:true},
  // Brand Management
  {id:'orders', label:'fact_order_item', grains:['OrderId','SKU','Date'], attrs:['ASIN','Country'], x:760+X_OFF, y:695, cat:'brand', tag:'Amazon only'},
  {id:'returns', label:'fact_returns', grains:['OrderId','SKU','Date'], attrs:['ASIN','Country'], x:935+X_OFF, y:635, cat:'brand', tag:'Amazon only'},
  {id:'sales', label:'ft_usd_sales', grains:['Date','SKU','Country'], attrs:['ASIN'], x:635+X_OFF, y:550, cat:'brand', stacked:true, tag:'Amazon only'},
  {id:'rgm', label:'report_global_metrics', grains:['Date','ASIN','Country'], x:820+X_OFF, y:270, cat:'brand', stacked:true, tag:'Amazon only'},
  {id:'traffic', label:'SalesTrafficByChildAsin', grains:['ASIN','Country','Date'], x:995+X_OFF, y:355, cat:'brand', tag:'Amazon only'},
  {id:'bsr', label:'keepa_bsr_uny', grains:['ASIN','Country','BSR Level','Date'], x:995+X_OFF, y:180, cat:'brand', tag:'Amazon only'},
  {id:'ads', label:'fact_ads_data', grains:['Country','SKU','Adtype','Date'], attrs:['ASIN'], x:895+X_OFF, y:510, cat:'brand', tag:'Amazon only'},
  {id:'bm_primary', label:'BM Primary Report', grains:['Date','ASIN','Country'], x:820+X_OFF, y:15, cat:'tableau'},
  // Supply Chain
  {id:'pov', label:'po_visibility_3pls (UB Legacy)', grains:['USIN','SKU','Region','ASIN'], x:-20+X_OFF, y:615, cat:'supply', stacked:true},
  {id:'inventory', label:'consolidated_inventory', grains:['Location Code','SKU'], attrs:['USIN','ASIN'], x:-155+X_OFF, y:780, cat:'supply'},
  {id:'erp', label:'erp_mapping (Netsuite)', grains:['SKU','FNSKU','Country','ASIN','MPN','Channel','USIN','Date Created'], x:120+X_OFF, y:775, cat:'supply'},
  {id:'erp_item_master', label:'erp_item_master (Netsuite)', grains:['SKU','USIN','Vendor','Vendor Country'], attrs:['UPC'], x:120+X_OFF, y:890, cat:'supply'},
  {id:'inventory_tradepeg', label:'consolidated_inventory_rf', grains:['SKU','Location Code'], attrs:['ASIN'], x:-130+X_OFF, y:160, cat:'supply'},
  {id:'po_visibility_rf', label:'po_visibility_rf', grains:['SKU','Region'], attrs:['ASIN'], x:-130+X_OFF, y:285, cat:'supply'},
  {id:'days_of_supply', label:'vw_scm_days_of_supply', grains:['USIN','Region'], attrs:['ASIN'], x:-150+X_OFF, y:460, cat:'supply', stacked:true},
  {id:'inventory_detail', label:'Inventory Detail', grains:['USIN','Region'], attrs:['ASIN'], x:-300+X_OFF, y:460, cat:'tableau'},
  // Tableau
  {id:'fcst_vis', label:'Forecast Visibility', grains:['Snapshot Month','ASIN','Country'], x:310+X_OFF, y:355, cat:'tableau'},
];

// Transform nodes (inline on edges)
const rawTransforms = [
  {id:'t_f_fa',    label:'Region → Country',              x:564, y:462},
  {id:'t_rf_fa',   label:'MSKU → ASIN, Region → Country', x:560, y:340},
  {id:'t_s_pov',   label:'ASIN→USIN, Country→Region', x:828, y:566},
  {id:'t_s_fa',    label:'AGG drop MSKU',              x:915, y:507},
  {id:'t_s_rgm',   label:'AGG drop MSKU',              x:1064,y:431},
  {id:'t_f_pov',   label:'ASIN→USIN, Country→Region',  x:352, y:542},
];

// Scale positions to give cards breathing room
// Original positions were designed for tiny icons, cards need more space
const SCALE = 1.4;
const allRawPositions = [...rawNodes, ...rawTransforms];
const cx = allRawPositions.reduce((s, n) => s + n.x, 0) / allRawPositions.length;
const cy = allRawPositions.reduce((s, n) => s + n.y, 0) / allRawPositions.length;
function spread(x, y) {
  return { x: cx + (x - cx) * SCALE, y: cy + (y - cy) * SCALE };
}

// Collect all unique grains
export const allGrains = [...new Set(rawNodes.flatMap(n => n.grains))].sort();

// Set of transform node IDs for path highlighting
export const transformIds = new Set(rawTransforms.map(t => t.id));

// Build React Flow nodes
export const initialNodes = [
  ...rawNodes.map(n => ({
    id: n.id,
    type: 'dataNode',
    position: spread(n.x, n.y),
    data: {
      label: n.label,
      grains: n.grains,
      cat: n.cat,
      accent: categories[n.cat].accent,
      dim: n.dim || false,
      stacked: n.stacked || false,
      tag: n.tag || null,
      attrs: n.attrs || [],
    },
  })),
  ...rawTransforms.map(t => ({
    id: t.id,
    type: 'transformNode',
    position: spread(t.x, t.y),
    data: { label: t.label },
  })),
];

// Build React Flow edges
const rawEdges = [
  ['ads','sales'], ['orders','sales'], ['returns','sales'],
  ['bsr','rgm'], ['traffic','rgm'],
  ['rgm','bm_primary'],
  ['forecast','t_f_fa'], ['t_f_fa','forecast_actuals'],
  ['forecast_rf','t_rf_fa'], ['t_rf_fa','forecast_actuals'],
  ['sales','t_s_fa'], ['t_s_fa','forecast_actuals'],
  ['pov','forecast_actuals'],
  ['forecast','flieber'], ['forecast_rf','flieber'],
  ['sales','t_s_rgm'], ['t_s_rgm','rgm'],
  ['forecast','t_f_pov'], ['t_f_pov','pov'], ['sales','t_s_pov'], ['t_s_pov','pov'], ['inventory','pov'],
  ['inventory_tradepeg','po_visibility_rf'], ['forecast_rf','po_visibility_rf'],
  ['pov','days_of_supply'], ['forecast','days_of_supply'],
  ['po_visibility_rf','days_of_supply'], ['forecast_rf','days_of_supply'],
  ['days_of_supply','inventory_detail'],
  ['erp','t_s_pov','lookup'], ['erp','t_f_pov','lookup'],
  ['erp_item_master','erp'],
  ['flieber','fcst_vis'], ['forecast_actuals','fcst_vis'],
];

// Build a position lookup for computing best handle pairs (using scaled positions)
const posMap = {};
rawNodes.forEach(n => { posMap[n.id] = spread(n.x, n.y); });
rawTransforms.forEach(t => { posMap[t.id] = spread(t.x, t.y); });

// Rank handle options by direction preference
function rankedHandles(dx, dy) {
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  const options = [];

  // Primary: dominant direction
  if (absX > absY) {
    if (dx > 0) {
      options.push({ s: 's-right', t: 't-left' });
      options.push(dy > 0 ? { s: 's-bottom', t: 't-top' } : { s: 's-top', t: 't-bottom' });
      options.push(dy > 0 ? { s: 's-top', t: 't-bottom' } : { s: 's-bottom', t: 't-top' });
      options.push({ s: 's-left', t: 't-right' });
    } else {
      options.push({ s: 's-left', t: 't-right' });
      options.push(dy > 0 ? { s: 's-bottom', t: 't-top' } : { s: 's-top', t: 't-bottom' });
      options.push(dy > 0 ? { s: 's-top', t: 't-bottom' } : { s: 's-bottom', t: 't-top' });
      options.push({ s: 's-right', t: 't-left' });
    }
  } else {
    if (dy > 0) {
      options.push({ s: 's-bottom', t: 't-top' });
      options.push(dx > 0 ? { s: 's-right', t: 't-left' } : { s: 's-left', t: 't-right' });
      options.push(dx > 0 ? { s: 's-left', t: 't-right' } : { s: 's-right', t: 't-left' });
      options.push({ s: 's-top', t: 't-bottom' });
    } else {
      options.push({ s: 's-top', t: 't-bottom' });
      options.push(dx > 0 ? { s: 's-right', t: 't-left' } : { s: 's-left', t: 't-right' });
      options.push(dx > 0 ? { s: 's-left', t: 't-right' } : { s: 's-right', t: 't-left' });
      options.push({ s: 's-bottom', t: 't-top' });
    }
  }
  return options;
}

// Track handle usage per node: only one edge per side unless all 4 are taken
const handleUsage = {}; // nodeId -> { 'top': count, 'bottom': count, ... }
function getUsage(nodeId) {
  if (!handleUsage[nodeId]) handleUsage[nodeId] = { top: 0, bottom: 0, left: 0, right: 0 };
  return handleUsage[nodeId];
}
function sideOf(handle) {
  return handle.split('-')[1]; // 's-right' -> 'right', 't-top' -> 'top'
}
function canUseSide(nodeId, side) {
  const usage = getUsage(nodeId);
  if (usage[side] === 0) return true;
  // All 4 sides full — allow doubling up
  return usage.top > 0 && usage.bottom > 0 && usage.left > 0 && usage.right > 0;
}
function markUsage(nodeId, side) {
  getUsage(nodeId)[side]++;
}

function assignHandles(srcId, dstId) {
  const s = posMap[srcId], d = posMap[dstId];
  if (!s || !d) return {};
  const dx = d.x - s.x;
  const dy = d.y - s.y;
  const options = rankedHandles(dx, dy);

  for (const opt of options) {
    const sSide = sideOf(opt.s);
    const tSide = sideOf(opt.t);
    if (canUseSide(srcId, sSide) && canUseSide(dstId, tSide)) {
      markUsage(srcId, sSide);
      markUsage(dstId, tSide);
      return { sourceHandle: opt.s, targetHandle: opt.t };
    }
  }
  // Fallback: use best option regardless (all sides overloaded)
  const best = options[0];
  markUsage(srcId, sideOf(best.s));
  markUsage(dstId, sideOf(best.t));
  return { sourceHandle: best.s, targetHandle: best.t };
}

const rawInitialEdges = rawEdges.map(([src, dst, style], i) => {
  const isLookup = style === 'lookup';
  let handles;
  if (isLookup) {
    // Lookup edges: prefer left-left but respect the constraint
    handles = { sourceHandle: 's-left', targetHandle: 't-left' };
    markUsage(src, 'left');
    markUsage(dst, 'left');
  } else {
    handles = assignHandles(src, dst);
  }
  return {
    id: `e${i}`,
    source: src,
    target: dst,
    type: 'offsetEdge',
    ...handles,
    ...(isLookup ? {
      style: { stroke: '#d97706', strokeWidth: 1.5, strokeDasharray: '4 3' },
      markerEnd: undefined,
      data: { lookup: true },
    } : {}),
  };
});

// Post-process: detect overlapping edge corridors and assign offsets
function assignOffsets(edges) {
  const SPACING = 14;

  // Group edges by corridor signature
  const corridors = {};
  edges.forEach(e => {
    const sp = posMap[e.source];
    const tp = posMap[e.target];
    if (!sp || !tp) return;

    const sh = e.sourceHandle || 's-bottom';
    const th = e.targetHandle || 't-top';
    const handlePair = `${sh.split('-')[1]}-${th.split('-')[1]}`;

    // Quantize corridor: for same-axis handle pairs, use the midpoint range
    let corridorKey;
    if (handlePair === 'left-left' || handlePair === 'right-right') {
      // Vertical corridor — group by overlapping Y ranges
      const minY = Math.min(sp.y, tp.y);
      const maxY = Math.max(sp.y, tp.y);
      const xBand = Math.round(Math.min(sp.x, tp.x) / 100);
      corridorKey = `${handlePair}-x${xBand}-y${Math.round(minY / 200)}`;
    } else if (handlePair === 'top-top' || handlePair === 'bottom-bottom') {
      const minX = Math.min(sp.x, tp.x);
      const maxX = Math.max(sp.x, tp.x);
      const yBand = Math.round(Math.min(sp.y, tp.y) / 100);
      corridorKey = `${handlePair}-y${yBand}-x${Math.round(minX / 200)}`;
    } else if (handlePair === 'bottom-top' || handlePair === 'top-bottom') {
      // Vertical flow — corridor is the horizontal midpoint band
      const midX = Math.round(((sp.x + tp.x) / 2) / 60);
      corridorKey = `${handlePair}-mx${midX}`;
    } else if (handlePair === 'right-left' || handlePair === 'left-right') {
      // Horizontal flow
      const midY = Math.round(((sp.y + tp.y) / 2) / 60);
      corridorKey = `${handlePair}-my${midY}`;
    } else {
      // Mixed
      const midX = Math.round(((sp.x + tp.x) / 2) / 80);
      const midY = Math.round(((sp.y + tp.y) / 2) / 80);
      corridorKey = `${handlePair}-${midX}-${midY}`;
    }

    if (!corridors[corridorKey]) corridors[corridorKey] = [];
    corridors[corridorKey].push(e);
  });

  // Assign offsets within each corridor group
  Object.values(corridors).forEach(group => {
    if (group.length <= 1) {
      group[0].data = { ...group[0].data, offset: 0 };
      return;
    }
    // Sort by source position for consistent ordering
    group.sort((a, b) => {
      const ap = posMap[a.source];
      const bp = posMap[b.source];
      return (ap.x + ap.y) - (bp.x + bp.y);
    });
    const mid = (group.length - 1) / 2;
    group.forEach((e, i) => {
      e.data = { ...e.data, offset: (i - mid) * SPACING };
    });
  });

  return edges;
}

export const initialEdges = assignOffsets(rawInitialEdges);
