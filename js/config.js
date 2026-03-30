// === Theme ===
export const isDark = false;

// === Pill Colors (grain type color map) ===
export const pillColors = {
  ASIN:{bg:'#EEEDFE',text:'#534AB7'},
  SKU:{bg:'#E6F1FB',text:'#185FA5'},
  USIN:{bg:'#FAEEDA',text:'#854F0B'},
  Country:{bg:'#E1F5EE',text:'#0F6E56'},
  Region:{bg:'#FAECE7',text:'#993C1D'},
  Channel:{bg:'#FDE7F0',text:'#B51D5E'},
  MSKU:{bg:'#EDEDF0',text:'#555566'},
  FNSKU:{bg:'#E6F5E6',text:'#2D7A2D'},
  'Location Code':{bg:'#E2F4F8',text:'#0C6980'},
  'Snapshot Month':{bg:'#FFF5D6',text:'#806810'},
};

// === Category Colors ===
export const categories = {
  brand: { bg: '#A3CBF0', border: '#185FA5', label: 'Brand Management' },
  demand: { bg: '#AFA9EC', border: '#534AB7', label: 'Demand Planning' },
  supply: { bg: '#FAC775', border: '#854F0B', label: 'Supply Chain' },
  tableau: { bg: '#ffffff', border: '#4E79A7', label: 'Tableau Report' },
  dtc: { bg: '#c4ceaf', border: '#8a9a70', label: 'DTC (Coming Soon)' },
};

// Original positions (with 350px x-offset already applied)
const X_OFF = 350;

// === Nodes ===
export const nodes = [
  // DTC (dimmed)
  {id:'shopify', label:'Shopify Sales', grains:[], x:385+X_OFF, y:80, cat:'dtc', dim:true},
  {id:'tiktok', label:'Tiktok', grains:[], x:265+X_OFF, y:75, cat:'dtc', dim:true},
  {id:'walmart', label:'Walmart', grains:[], x:325+X_OFF, y:10, cat:'dtc', dim:true},
  // Demand Planning
  {id:'forecast', label:'Forecast\n(UB Legacy)', grains:['Channel','Region','ASIN'], x:25+X_OFF, y:470, cat:'demand'},
  {id:'forecast_rf', label:'Forecast\n(Redfits)', grains:['Channel','Region','MSKU'], x:40+X_OFF, y:270, cat:'demand'},
  {id:'forecast_actuals', label:'Forecast\nActuals', grains:['ASIN','Country'], x:470+X_OFF, y:450, cat:'demand', stacked:true},
  {id:'flieber', label:'Flieber Monthly\nSnapshots', grains:['Snapshot Month','Channel','Region','ASIN'], x:100+X_OFF, y:370, cat:'demand', stacked:true},
  // Brand Management
  {id:'orders', label:'Orders', grains:['ASIN','MSKU','Country'], x:760+X_OFF, y:695, cat:'brand'},
  {id:'returns', label:'Returns', grains:['ASIN','MSKU','Country'], x:935+X_OFF, y:635, cat:'brand'},
  {id:'sales', label:'ft_usd_sales', grains:['ASIN','MSKU','Country'], x:635+X_OFF, y:550, cat:'brand', stacked:true},
  {id:'rgm', label:'Report Global\nMetrics', grains:['ASIN','Country'], x:820+X_OFF, y:270, cat:'brand', stacked:true},
  {id:'traffic', label:'Traffic', grains:['ASIN','Country'], x:995+X_OFF, y:355, cat:'brand'},
  {id:'bsr', label:'BSR', grains:['ASIN','Country'], x:995+X_OFF, y:180, cat:'brand'},
  {id:'ads', label:'Advertising', grains:['ASIN','MSKU','Country'], x:895+X_OFF, y:510, cat:'brand'},
  {id:'bm_primary', label:'BM Primary\nReport', grains:['ASIN','Country'], x:820+X_OFF, y:15, cat:'tableau'},
  // Supply Chain
  {id:'pov', label:'PO Visibility\n3PLs (UB Legacy)', grains:['USIN','Region'], x:-20+X_OFF, y:615, cat:'supply', stacked:true},
  {id:'inventory', label:'Inventory\n(UB Legacy)\nNetsuite', grains:['Location Code','MSKU'], x:-155+X_OFF, y:780, cat:'supply'},
  {id:'erp', label:'ERP Mapping\n(Netsuite)', grains:['USIN','MSKU','FNSKU','Channel','Country'], x:120+X_OFF, y:775, cat:'supply'},
  {id:'inventory_tradepeg', label:'Inventory\nTradePeg', grains:['Location Code','MSKU'], x:-130+X_OFF, y:160, cat:'supply'},
  {id:'po_visibility_rf', label:'PO Visibility\nRF', grains:['MSKU','Region'], x:-130+X_OFF, y:285, cat:'supply'},
  {id:'days_of_supply', label:'Days of\nSupply', grains:['USIN','Region'], x:-150+X_OFF, y:460, cat:'supply', stacked:true},
  {id:'inventory_detail', label:'Inventory\nDetail', grains:['USIN','Region'], x:-300+X_OFF, y:460, cat:'tableau'},
  // Tableau
  {id:'fcst_vis', label:'Forecast\nVisibility', grains:['Snapshot Month','ASIN','Country'], x:310+X_OFF, y:355, cat:'tableau'},
];

// === Transformation Nodes ===
// Small inline nodes representing grain transformations along edges
export const transforms = [
  {id:'t_f_fa',    label:'Region→Country',  x:564, y:462,  from:'forecast',    to:'forecast_actuals'},
  {id:'t_rf_fa_1', label:'SKU→ASIN',        x:493, y:313,  from:'forecast_rf', to:'t_rf_fa_2'},
  {id:'t_rf_fa_2', label:'Region→Country',  x:631, y:371,  from:'t_rf_fa_1',   to:'forecast_actuals'},
  {id:'t_s_pov',   label:'Country→Region',  x:828, y:566,  from:'sales',       to:'pov'},
  {id:'t_s_fa',    label:'SKU→ASIN',        x:915, y:507,  from:'sales',       to:'forecast_actuals'},
  {id:'t_s_rgm',   label:'SKU→ASIN',        x:1064,y:431,  from:'sales',       to:'rgm'},
];

// === Edges ===
export const edges = [
  // Brand Management flows
  ['ads','sales'], ['orders','sales'], ['returns','sales'],
  ['bsr','rgm'], ['traffic','rgm'],
  ['rgm','bm_primary'],
  // Demand Planning flows (with transforms spliced in)
  ['forecast','t_f_fa'], ['t_f_fa','forecast_actuals'],
  ['forecast_rf','t_rf_fa_1'], ['t_rf_fa_2','forecast_actuals'],
  ['sales','t_s_fa'], ['t_s_fa','forecast_actuals'],
  ['pov','forecast_actuals'],
  ['forecast','flieber'], ['forecast_rf','flieber'],
  // Brand Management flows (with transforms)
  ['sales','t_s_rgm'], ['t_s_rgm','rgm'],
  // Supply Chain flows
  ['forecast','pov'], ['sales','t_s_pov'], ['t_s_pov','pov'], ['inventory','pov'],
  ['inventory_tradepeg','po_visibility_rf'], ['forecast_rf','po_visibility_rf'],
  ['pov','days_of_supply'], ['forecast','days_of_supply'],
  ['po_visibility_rf','days_of_supply'], ['forecast_rf','days_of_supply'],
  ['days_of_supply','inventory_detail'],
  // ERP enrichment
  ['erp','pov'],
  // Tableau flows
  ['flieber','fcst_vis'], ['forecast_actuals','fcst_vis'],
];
