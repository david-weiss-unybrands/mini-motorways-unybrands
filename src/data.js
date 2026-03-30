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
  {id:'forecast', label:'Forecast (UB Legacy)', grains:['Channel','Region','ASIN'], x:25+X_OFF, y:470, cat:'demand'},
  {id:'forecast_rf', label:'Forecast (Redfits)', grains:['Channel','Region','MSKU'], x:40+X_OFF, y:270, cat:'demand'},
  {id:'forecast_actuals', label:'Forecast Actuals', grains:['ASIN','Country'], x:470+X_OFF, y:450, cat:'demand', stacked:true},
  {id:'flieber', label:'Flieber Monthly Snapshots', grains:['Snapshot Month','Channel','Region','ASIN'], x:100+X_OFF, y:370, cat:'demand', stacked:true},
  // Brand Management
  {id:'orders', label:'Orders', grains:['ASIN','MSKU','Country'], x:760+X_OFF, y:695, cat:'brand'},
  {id:'returns', label:'Returns', grains:['ASIN','MSKU','Country'], x:935+X_OFF, y:635, cat:'brand'},
  {id:'sales', label:'ft_usd_sales', grains:['ASIN','MSKU','Country'], x:635+X_OFF, y:550, cat:'brand', stacked:true},
  {id:'rgm', label:'Report Global Metrics', grains:['ASIN','Country'], x:820+X_OFF, y:270, cat:'brand', stacked:true},
  {id:'traffic', label:'Traffic', grains:['ASIN','Country'], x:995+X_OFF, y:355, cat:'brand'},
  {id:'bsr', label:'BSR', grains:['ASIN','Country'], x:995+X_OFF, y:180, cat:'brand'},
  {id:'ads', label:'Advertising', grains:['ASIN','MSKU','Country'], x:895+X_OFF, y:510, cat:'brand'},
  {id:'bm_primary', label:'BM Primary Report', grains:['ASIN','Country'], x:820+X_OFF, y:15, cat:'tableau'},
  // Supply Chain
  {id:'pov', label:'PO Visibility 3PLs (UB Legacy)', grains:['USIN','Region'], x:-20+X_OFF, y:615, cat:'supply', stacked:true},
  {id:'inventory', label:'Inventory (UB Legacy) Netsuite', grains:['Location Code','MSKU'], x:-155+X_OFF, y:780, cat:'supply'},
  {id:'erp', label:'ERP Mapping (Netsuite)', grains:['USIN','MSKU','FNSKU','Channel','Country'], x:120+X_OFF, y:775, cat:'supply'},
  {id:'inventory_tradepeg', label:'Inventory TradePeg', grains:['Location Code','MSKU'], x:-130+X_OFF, y:160, cat:'supply'},
  {id:'po_visibility_rf', label:'PO Visibility RF', grains:['MSKU','Region'], x:-130+X_OFF, y:285, cat:'supply'},
  {id:'days_of_supply', label:'Days of Supply', grains:['USIN','Region'], x:-150+X_OFF, y:460, cat:'supply', stacked:true},
  {id:'inventory_detail', label:'Inventory Detail', grains:['USIN','Region'], x:-300+X_OFF, y:460, cat:'tableau'},
  // Tableau
  {id:'fcst_vis', label:'Forecast Visibility', grains:['Snapshot Month','ASIN','Country'], x:310+X_OFF, y:355, cat:'tableau'},
];

// Transform nodes (inline on edges)
const rawTransforms = [
  {id:'t_f_fa',    label:'Region → Country', x:564, y:462},
  {id:'t_rf_fa_1', label:'SKU → ASIN',       x:493, y:313},
  {id:'t_rf_fa_2', label:'Region → Country', x:631, y:371},
  {id:'t_s_pov',   label:'Country → Region', x:828, y:566},
  {id:'t_s_fa',    label:'SKU → ASIN',       x:915, y:507},
  {id:'t_s_rgm',   label:'SKU → ASIN',       x:1064,y:431},
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
  ['forecast_rf','t_rf_fa_1'], ['t_rf_fa_1','t_rf_fa_2'], ['t_rf_fa_2','forecast_actuals'],
  ['sales','t_s_fa'], ['t_s_fa','forecast_actuals'],
  ['pov','forecast_actuals'],
  ['forecast','flieber'], ['forecast_rf','flieber'],
  ['sales','t_s_rgm'], ['t_s_rgm','rgm'],
  ['forecast','pov'], ['sales','t_s_pov'], ['t_s_pov','pov'], ['inventory','pov'],
  ['inventory_tradepeg','po_visibility_rf'], ['forecast_rf','po_visibility_rf'],
  ['pov','days_of_supply'], ['forecast','days_of_supply'],
  ['po_visibility_rf','days_of_supply'], ['forecast_rf','days_of_supply'],
  ['days_of_supply','inventory_detail'],
  ['erp','pov'],
  ['flieber','fcst_vis'], ['forecast_actuals','fcst_vis'],
];

// Build a position lookup for computing best handle pairs (using scaled positions)
const posMap = {};
rawNodes.forEach(n => { posMap[n.id] = spread(n.x, n.y); });
rawTransforms.forEach(t => { posMap[t.id] = spread(t.x, t.y); });

function bestHandles(srcId, dstId) {
  const s = posMap[srcId], d = posMap[dstId];
  if (!s || !d) return {};
  const dx = d.x - s.x;
  const dy = d.y - s.y;
  // Pick handle based on dominant direction
  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal dominant
    if (dx > 0) return { sourceHandle: 's-right', targetHandle: 't-left' };
    return { sourceHandle: 's-left', targetHandle: 't-right' };
  } else {
    // Vertical dominant
    if (dy > 0) return { sourceHandle: 's-bottom', targetHandle: 't-top' };
    return { sourceHandle: 's-top', targetHandle: 't-bottom' };
  }
}

export const initialEdges = rawEdges.map(([src, dst], i) => ({
  id: `e${i}`,
  source: src,
  target: dst,
  type: 'straight',
  ...bestHandles(src, dst),
}));
