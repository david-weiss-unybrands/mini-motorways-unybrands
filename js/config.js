// === Canvas Setup ===
const canvas = document.getElementById('mm');
export const ctx = canvas.getContext('2d');
const dpr = window.devicePixelRatio || 1;
export const W = 1450, H = 900;
canvas.width = W * dpr;
canvas.height = H * dpr;
canvas.style.aspectRatio = `${W}/${H}`;
ctx.scale(dpr, dpr);

export const frameCount = { value: 0 };

// === Theme Colors ===
export const isDark = false;
export const bg = isDark ? '#1a1a1a' : '#f8f9fb';
export const edgeColor = isDark ? '#555' : '#c0c4cc';
export const textMain = isDark ? '#e8e8e8' : '#2c2c2a';
export const textSub = isDark ? '#aaa' : '#6b7280';
export const signBg = isDark ? 'rgba(30,30,30,0.92)' : 'rgba(255,255,255,0.95)';
export const signBorder = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)';
export const nodeShadow = isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.08)';

// === Pill Colors (grain type color map) ===
export const pillColors = {
  ASIN:{bg:isDark?'#3C3489':'#EEEDFE',text:isDark?'#CECBF6':'#534AB7'},
  SKU:{bg:isDark?'#0C447C':'#E6F1FB',text:isDark?'#B5D4F4':'#185FA5'},
  USIN:{bg:isDark?'#633806':'#FAEEDA',text:isDark?'#FAC775':'#854F0B'},
  Country:{bg:isDark?'#085041':'#E1F5EE',text:isDark?'#9FE1CB':'#0F6E56'},
  Region:{bg:isDark?'#4A1B0C':'#FAECE7',text:isDark?'#F5C4B3':'#993C1D'},
  Channel:{bg:isDark?'#7C1044':'#FDE7F0',text:isDark?'#F5A0C4':'#B51D5E'},
  MSKU:{bg:isDark?'#3D3D3D':'#EDEDF0',text:isDark?'#C0C0C8':'#555566'},
  FNSKU:{bg:isDark?'#1A4D1A':'#E6F5E6',text:isDark?'#8FD98F':'#2D7A2D'},
  'Location Code':{bg:isDark?'#0A4A5C':'#E2F4F8',text:isDark?'#7DD4E8':'#0C6980'},
  'Snapshot Month':{bg:isDark?'#5C4A0A':'#FFF5D6',text:isDark?'#E8D47D':'#806810'},
};

// === Locations ===
export const locations = [
  // DTC (dormant / isolated)
  {id:'shopify',label:'Shopify Sales',grains:[],x:0,y:0,color:isDark?'#4a5a30':'#c4ceaf',accent:isDark?'#3a4a22':'#8a9a70',w:52,h:34,dim:true},
  {id:'tiktok',label:'Tiktok',grains:[],x:0,y:0,color:isDark?'#4a5a30':'#c4ceaf',accent:isDark?'#3a4a22':'#8a9a70',w:45,h:34,dim:true},
  {id:'walmart',label:'Walmart',grains:[],x:0,y:0,color:isDark?'#4a5a30':'#c4ceaf',accent:isDark?'#3a4a22':'#8a9a70',w:52,h:36,dim:true},
  // ERP (isolated)
  {id:'erp',label:'ERP Mapping\n(Netsuite)',grains:['USIN','MSKU','FNSKU','Channel','Country'],x:0,y:0,color:isDark?'#BA7517':'#FAC775',accent:'#854F0B',w:55,h:35},
  // Demand Planning (purple)
  {id:'forecast',label:'Forecast\n(UB Legacy)',grains:['Channel','Region','ASIN'],x:0,y:0,color:isDark?'#7F77DD':'#AFA9EC',accent:'#534AB7',w:55,h:35},
  {id:'forecast_rf',label:'Forecast\n(Redfits)',grains:['Channel','Region','MSKU'],x:0,y:0,color:isDark?'#9F77DD':'#CECBF6',accent:'#3C3489',w:55,h:35},
  {id:'forecast_actuals',label:'Forecast\nActuals',grains:['ASIN','Country'],x:0,y:0,color:isDark?'#7F77DD':'#C5C1F0',accent:'#534AB7',w:68,h:60,stacked:true},
  {id:'flieber',label:'Flieber Monthly\nSnapshots',grains:['Snapshot Month','Channel','Region','ASIN'],x:0,y:0,color:isDark?'#7F77DD':'#C5C1F0',accent:'#534AB7',w:65,h:50,stacked:true},
  // Brand Management (blue)
  {id:'orders',label:'Orders',grains:['ASIN','MSKU','Country'],x:0,y:0,color:isDark?'#378ADD':'#A3CBF0',accent:'#185FA5',w:50,h:34},
  {id:'returns',label:'Returns',grains:['ASIN','MSKU','Country'],x:0,y:0,color:isDark?'#378ADD':'#A3CBF0',accent:'#185FA5',w:50,h:34},
  {id:'sales',label:'ft_usd_sales',grains:['ASIN','MSKU','Country'],x:0,y:0,color:isDark?'#378ADD':'#85B7EB',accent:'#185FA5',w:62,h:46,stacked:true},
  {id:'rgm',label:'Report Global\nMetrics',grains:['ASIN','Country'],x:0,y:0,color:isDark?'#378ADD':'#A3CBF0',accent:'#185FA5',w:72,h:64,stacked:true},
  {id:'traffic',label:'Traffic',grains:['ASIN','Country'],x:0,y:0,color:isDark?'#378ADD':'#A3CBF0',accent:'#185FA5',w:45,h:30},
  {id:'bsr',label:'BSR',grains:['ASIN','Country'],x:0,y:0,color:isDark?'#378ADD':'#A3CBF0',accent:'#185FA5',w:40,h:28},
  {id:'ads',label:'Advertising',grains:['ASIN','MSKU','Country'],x:0,y:0,color:isDark?'#378ADD':'#A3CBF0',accent:'#185FA5',w:52,h:32},
  {id:'bm_primary',label:'BM Primary\nReport',grains:['ASIN','Country'],x:0,y:0,color:'#ffffff',accent:isDark?'rgba(255,255,255,0.25)':'rgba(0,0,0,0.15)',w:95,h:78,tableau:true},
  // Supply Chain (orange)
  {id:'pov',label:'PO Visibility\n3PLs (UB Legacy)',grains:['USIN','Region'],x:0,y:0,color:isDark?'#BA7517':'#F0D08A',accent:'#854F0B',w:72,h:62,stacked:true},
  {id:'inventory',label:'Inventory\n(UB Legacy)',grains:['Location Code','MSKU'],x:0,y:0,color:isDark?'#BA7517':'#FAC775',accent:'#854F0B',w:60,h:40},
  {id:'inventory_tradepeg',label:'Inventory\nTradePeg',grains:['Location Code','MSKU'],x:0,y:0,color:isDark?'#BA7517':'#FAC775',accent:'#854F0B',w:55,h:35},
  {id:'po_visibility_rf',label:'PO Visibility\nRF',grains:['MSKU','Region'],x:0,y:0,color:isDark?'#BA7517':'#FAC775',accent:'#854F0B',w:55,h:35},
  {id:'days_of_supply',label:'Days of\nSupply',grains:['USIN','Region'],x:0,y:0,color:isDark?'#BA7517':'#F0D08A',accent:'#854F0B',w:55,h:45,stacked:true},
  {id:'inventory_detail',label:'Inventory\nDetail',grains:['USIN','Region'],x:0,y:0,color:'#ffffff',accent:isDark?'rgba(255,255,255,0.25)':'rgba(0,0,0,0.15)',w:95,h:78,tableau:true},
  // Tableau Reports
  {id:'fcst_vis',label:'Forecast\nVisibility',grains:['Snapshot Month','ASIN','Country'],x:0,y:0,color:'#ffffff',accent:isDark?'rgba(255,255,255,0.25)':'rgba(0,0,0,0.15)',w:95,h:78,tableau:true},
];

// === All Edges ===
export const allEdges = [
  // Brand Management
  ['ads','sales'], ['orders','sales'], ['returns','sales'],
  ['bsr','rgm'], ['traffic','rgm'],
  ['sales','rgm'],
  ['rgm','bm_primary'],
  // Demand Planning
  ['forecast','forecast_actuals'], ['forecast_rf','forecast_actuals'],
  ['sales','forecast_actuals'],
  ['pov','forecast_actuals'],
  ['forecast','flieber'], ['forecast_rf','flieber'],
  // Supply Chain
  ['forecast','pov'], ['sales','pov'], ['inventory','pov'],
  ['inventory_tradepeg','po_visibility_rf'], ['forecast_rf','po_visibility_rf'],
  ['pov','days_of_supply'], ['forecast','days_of_supply'],
  ['po_visibility_rf','days_of_supply'], ['forecast_rf','days_of_supply'],
  ['days_of_supply','inventory_detail'],
  // Tableau
  ['flieber','fcst_vis'], ['forecast_actuals','fcst_vis'],
];
