// === Canvas Setup ===
const canvas = document.getElementById('mm');
export const ctx = canvas.getContext('2d');
const dpr = window.devicePixelRatio || 1;
export const W = 1450, H = 900;
canvas.width = W * dpr;
canvas.height = H * dpr;
canvas.style.aspectRatio = `${W}/${H}`;
ctx.scale(dpr, dpr);
ctx.translate(350, 0);

export const frameCount = { value: 0 };

// === Theme Colors ===
export const isDark = false;
export const bg = isDark ? '#1a1a1a' : '#f0ece4';
export const roadColor = isDark ? '#3a3a3a' : '#d5d0c4';
export const roadLine = isDark ? '#555' : '#c0baa8';
export const textMain = isDark ? '#e8e8e8' : '#2c2c2a';
export const signBg = isDark ? 'rgba(30,30,30,0.92)' : 'rgba(255,255,255,0.95)';
export const signBorder = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
export const pitBg = isDark ? '#444441' : '#F1EFE8';
export const pitBorder = isDark ? '#888780' : '#B4B2A9';
export const pitAccent = isDark ? '#B4B2A9' : '#5F5E5A';
export const warnYellow = isDark ? '#BA7517' : '#EF9F27';
export const dpZoneBg = isDark ? 'rgba(127,119,221,0.07)' : 'rgba(127,119,221,0.06)';
export const dpZoneBorder = isDark ? 'rgba(127,119,221,0.2)' : 'rgba(127,119,221,0.14)';
export const dpZoneLabel = isDark ? 'rgba(127,119,221,0.5)' : 'rgba(127,119,221,0.4)';
export const cdtZoneBg = isDark ? 'rgba(55,138,221,0.07)' : 'rgba(55,138,221,0.06)';
export const cdtZoneBorder = isDark ? 'rgba(55,138,221,0.2)' : 'rgba(55,138,221,0.12)';
export const cdtZoneLabel = isDark ? 'rgba(55,138,221,0.5)' : 'rgba(55,138,221,0.35)';
export const dtcZoneBg = isDark ? 'rgba(99,153,34,0.07)' : 'rgba(99,153,34,0.06)';
export const dtcZoneBorder = isDark ? 'rgba(99,153,34,0.2)' : 'rgba(99,153,34,0.14)';
export const dtcZoneLabel = isDark ? 'rgba(99,153,34,0.5)' : 'rgba(99,153,34,0.4)';
export const dtcDimText = isDark ? 'rgba(99,153,34,0.35)' : 'rgba(99,153,34,0.3)';
export const riverColor = isDark ? 'rgba(55,138,221,0.12)' : 'rgba(55,138,221,0.10)';
export const riverStroke = isDark ? 'rgba(55,138,221,0.25)' : 'rgba(55,138,221,0.18)';
export const stackShadow = isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.08)';
export const hwSignBg = isDark ? '#1B5E30' : '#006B3F';
export const hwSignBorder = isDark ? '#E8E8E8' : '#FFFFFF';
export const hwSignText = '#FFFFFF';
export const hwPostColor = isDark ? '#666' : '#888';
export const tableauBlue = isDark ? '#6BA0C7' : '#4E79A7';
export const tableauBorder = isDark ? '#8BB8D9' : '#2C5F8A';

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
  // DTC Island (dormant)
  {id:'shopify',label:'Shopify Sales',grains:[],x:385,y:80,color:isDark?'#4a5a30':'#c4ceaf',accent:isDark?'#3a4a22':'#8a9a70',w:52,h:34,dim:true},
  {id:'tiktok',label:'Tiktok',grains:[],x:265,y:75,color:isDark?'#4a5a30':'#c4ceaf',accent:isDark?'#3a4a22':'#8a9a70',w:45,h:34,dim:true},
  {id:'walmart',label:'Walmart',grains:[],x:325,y:10,color:isDark?'#4a5a30':'#c4ceaf',accent:isDark?'#3a4a22':'#8a9a70',w:52,h:36,dim:true},
  // Forecast (UB Legacy)
  {id:'forecast',label:'Forecast\n(UB Legacy)',grains:['Channel','Region','ASIN'],x:25,y:470,color:isDark?'#7F77DD':'#AFA9EC',accent:'#534AB7',w:55,h:35},
  // Forecast (Redfits)
  {id:'forecast_rf',label:'Forecast\n(Redfits)',grains:['Channel','Region','MSKU'],x:40,y:270,color:isDark?'#9F77DD':'#CECBF6',accent:'#3C3489',w:55,h:35},
  // Forecast_actuals (stacked)
  {id:'forecast_actuals',label:'Forecast_actuals',grains:['ASIN','Country'],x:470,y:450,color:isDark?'#7F77DD':'#C5C1F0',accent:'#534AB7',w:68,h:60,stacked:true},
  // Orders & Returns
  {id:'orders',label:'Orders',grains:['ASIN','MSKU','Country'],x:760,y:695,color:isDark?'#378ADD':'#A3CBF0',accent:'#185FA5',w:50,h:34},
  {id:'returns',label:'Returns',grains:['ASIN','MSKU','Country'],x:935,y:635,color:isDark?'#378ADD':'#A3CBF0',accent:'#185FA5',w:50,h:34},
  // ft_usd_sales
  {id:'sales',label:'ft_usd_sales',grains:['ASIN','MSKU','Country'],x:635,y:550,color:isDark?'#378ADD':'#85B7EB',accent:'#185FA5',w:62,h:46,stacked:true},
  // Report global metrics (stacked)
  {id:'rgm',label:'Report global\nmetrics',grains:['ASIN','Country'],x:820,y:270,color:isDark?'#378ADD':'#A3CBF0',accent:'#185FA5',w:72,h:64,stacked:true},
  // Traffic
  {id:'traffic',label:'Traffic',grains:['ASIN','Country'],x:995,y:355,color:isDark?'#378ADD':'#A3CBF0',accent:'#185FA5',w:45,h:30},
  // BSR
  {id:'bsr',label:'BSR',grains:['ASIN','Country'],x:995,y:180,color:isDark?'#378ADD':'#A3CBF0',accent:'#185FA5',w:40,h:28},
  // Advertising
  {id:'ads',label:'Advertising',grains:['ASIN','MSKU','Country'],x:895,y:510,color:isDark?'#378ADD':'#A3CBF0',accent:'#185FA5',w:52,h:32},
  // po_visibility_3pls (stacked)
  {id:'pov',label:'po_visibility_3pls\n(UB Legacy)',grains:['USIN','Region'],x:-20,y:615,color:isDark?'#BA7517':'#F0D08A',accent:'#854F0B',w:72,h:62,stacked:true},
  // Inventory
  {id:'inventory',label:'Inventory\n(UB Legacy)\nNetsuite',grains:['Location Code','MSKU'],x:-155,y:780,color:isDark?'#BA7517':'#FAC775',accent:'#854F0B',w:60,h:40},
  // ERP Mapping
  {id:'erp',label:'ERP Mapping\n(Netsuite)',grains:['USIN','MSKU','FNSKU','Channel','Country'],x:120,y:775,color:isDark?'#BA7517':'#FAC775',accent:'#854F0B',w:55,h:35},
  // Supply chain detail nodes
  {id:'inventory_tradepeg',label:'Inventory\nTradePeg',grains:['Location Code','MSKU'],x:-130,y:160,color:isDark?'#BA7517':'#FAC775',accent:'#854F0B',w:55,h:35},
  {id:'po_visibility_rf',label:'PO Visibility RF',grains:['MSKU','Region'],x:-130,y:285,color:isDark?'#BA7517':'#FAC775',accent:'#854F0B',w:55,h:35},
  {id:'days_of_supply',label:'Days of\nSupply',grains:['USIN','Region'],x:-150,y:460,color:isDark?'#BA7517':'#F0D08A',accent:'#854F0B',w:55,h:45,stacked:true},
  {id:'inventory_detail',label:'Inventory\nDetail',grains:['USIN','Region'],x:-300,y:460,color:'#ffffff',accent:isDark?'rgba(255,255,255,0.25)':'rgba(0,0,0,0.15)',w:95,h:78,tableau:true},
  // Flieber Monthly Snapshots
  {id:'flieber',label:'Flieber Monthly\nSnapshots',grains:['Snapshot Month','Channel','Region','ASIN'],x:100,y:370,color:isDark?'#7F77DD':'#C5C1F0',accent:'#534AB7',w:65,h:50,stacked:true},
  // Tableau Reports
  {id:'bm_primary',label:'BM Primary\nreport',grains:['ASIN','Country'],x:820,y:15,color:'#ffffff',accent:isDark?'rgba(255,255,255,0.25)':'rgba(0,0,0,0.15)',w:95,h:78,tableau:true},
  {id:'fcst_vis',label:'Forecast\nVisibility',grains:['Snapshot Month','ASIN','Country'],x:310,y:355,color:'#ffffff',accent:isDark?'rgba(255,255,255,0.25)':'rgba(0,0,0,0.15)',w:95,h:78,tableau:true},
];

// === Sign-Aware Spacing ===
const MIN_GAP = 15;

function getNodeBounds(l){
  const cx=l.x+l.w/2;
  const lines=l.label.split('\n');
  const grainH=l.grains.length>0?20:0;
  // Measure sign width using canvas context
  ctx.font='600 10px sans-serif';
  const maxLineW=Math.max(...lines.map(ln=>ctx.measureText(ln).width));
  ctx.font='600 9px sans-serif';
  const pg=4;
  const pw2=l.grains.map(g=>ctx.measureText(g).width+10);
  const prw=pw2.length>0?(pw2.reduce((a,b)=>a+b,0)+(l.grains.length-1)*pg):0;
  const pw=Math.max(maxLineW+12,prw+12);
  const topY=l.y;
  const bottomY=l.y+l.h+15+lines.length*14+4+grainH;
  const leftX=Math.min(l.x,cx-pw/2);
  const rightX=Math.max(l.x+l.w,cx+pw/2);
  return {topY,bottomY,leftX,rightX,node:l};
}

function resolveOverlaps(){
  const bounds=locations.map(getNodeBounds);
  for(let pass=0;pass<5;pass++){
    let changed=false;
    bounds.sort((a,b)=>a.topY-b.topY);
    for(let i=0;i<bounds.length;i++){
      for(let j=i+1;j<bounds.length;j++){
        const a=bounds[i],b=bounds[j];
        if(a.rightX<=b.leftX||b.rightX<=a.leftX) continue;
        const overlap=(a.bottomY+MIN_GAP)-b.topY;
        if(overlap>0){
          const shift=overlap/2;
          a.node.y-=shift; b.node.y+=shift;
          a.topY-=shift; a.bottomY-=shift;
          b.topY+=shift; b.bottomY+=shift;
          changed=true;
        }
      }
    }
    if(!changed) break;
  }
}
resolveOverlaps();

// === Routes ===
export const villageRoads = [
  ['ads','sales'],['bsr','rgm'],['traffic','rgm'],
];

export const r_f_fa = [['forecast','forecast_actuals']];
export const r_rf_fa = [['forecast_rf','forecast_actuals']];
export const r_s_fa = [['sales','forecast_actuals']];
export const r_s_rgm = [['sales','rgm']];
export const r_rgm_fa = [['rgm','forecast_actuals']];
export const r_f_pov = [['forecast','pov']];
export const r_s_pov = [['sales','pov']];
export const r_i_pov = [['inventory','pov']];
export const r_pov_fa = [['pov','forecast_actuals']];
export const r_ord_s = [['orders','sales']];
export const r_ret_s = [['returns','sales']];
export const r_rgm_bm = [['rgm','bm_primary']];
export const r_f_flieber = [['forecast','flieber']];
export const r_rf_flieber = [['forecast_rf','flieber']];
export const r_it_povrf = [['inventory_tradepeg','po_visibility_rf']];
export const r_rf_povrf = [['forecast_rf','po_visibility_rf']];
export const r_pov_dos = [['pov','days_of_supply']];
export const r_f_dos = [['forecast','days_of_supply']];
export const r_povrf_dos = [['po_visibility_rf','days_of_supply']];
export const r_rf_dos = [['forecast_rf','days_of_supply']];
export const r_dos_id = [['days_of_supply','inventory_detail']];

export const tableauRoutes = [['flieber','fcst_vis'],['forecast_actuals','fcst_vis']];

export const cleanRoutes = [...r_s_rgm,...r_f_pov,...r_ord_s,...r_ret_s,...r_rgm_bm,...r_f_flieber,...r_rf_flieber,...r_it_povrf,...r_rf_povrf,...r_pov_dos,...r_f_dos,...r_povrf_dos,...r_rf_dos];

// === Node Map ===
export const nodeMap = {};
locations.forEach(l => nodeMap[l.id] = {cx:l.x+l.w/2, cy:l.y+l.h/2, accent:l.accent});

export const curveOverrides = {
  'forecast_rf→forecast_actuals': {cx:420, cy:240},
};

// Tableau Data Source hub position
export const tabDSx = 310, tabDSy = 430;
nodeMap['tab_ds_fcst'] = {cx:tabDSx, cy:tabDSy, accent:'#4E79A7'};

// === Countries ===
export const countries = [
  {code:'DE',color:pillColors.Country.bg,text:pillColors.Country.text},
  {code:'FR',color:pillColors.Country.bg,text:pillColors.Country.text},
  {code:'ES',color:pillColors.Country.bg,text:pillColors.Country.text},
  {code:'IT',color:pillColors.Country.bg,text:pillColors.Country.text},
];

// === Animation Phase Constants ===
export const splitPoint = 0.45;
export const ub_b1_entry = 0.35, ub_b1_exit = 0.50;
export const rf_b1_entry = 0.18, rf_b1_exit = 0.30, rf_b2_entry = 0.50, rf_b2_exit = 0.62;
export const sfa_b1_entry = 0.35, sfa_b1_exit = 0.50;
export const sp_compact_entry = 0.18, sp_compact_exit = 0.30;
export const sp_merge = 0.50;
export const mergePoint = 0.4;
export const feederLeadUp = 0.25;
export const boothW = 20, boothH = 16;

// === Route Grains ===
export const routeGrains = {
  'sales,rgm':['ASIN','Country'],
  'forecast,pov':['ASIN','Region'],
  'orders,sales':['ASIN','Country'],
  'returns,sales':['ASIN','Country'],
  'rgm,bm_primary':['ASIN','Country'],
  'forecast,flieber':['ASIN','Region'],
  'forecast_rf,flieber':['SKU','Region'],
  'flieber,fcst_vis':['ASIN','SKU'],
  'forecast_actuals,fcst_vis':['ASIN','Country'],
};

// === Tableau Road Colors ===
export const tabRoadColor = isDark ? 'rgba(78,121,167,0.35)' : 'rgba(78,121,167,0.25)';
export const tabRoadLine = isDark ? 'rgba(78,121,167,0.7)' : 'rgba(78,121,167,0.5)';
export const tabRoadArrow = isDark ? 'rgba(78,121,167,0.8)' : 'rgba(78,121,167,0.6)';

// === Canal / Rowboat Data ===
export const boatChannels = ['SPF','Tiktok','WMT'];
export const canalFull = [{x:52,y:495},{x:67,y:280},{x:280,y:165}];
export const canalFromRF = [{x:67,y:280},{x:280,y:165}];
