import { ctx, frameCount, bg, W, H, locations, cleanRoutes, r_f_fa, r_rf_fa, r_pov_fa, r_i_pov, r_s_pov, r_s_fa, villageRoads, tabDSx, tabDSy, pillColors, ub_b1_entry, ub_b1_exit, rf_b1_entry, rf_b1_exit, rf_b2_entry, rf_b2_exit, sfa_b1_entry, sfa_b1_exit, sp_compact_entry, sp_compact_exit, sp_merge, r_f_flieber } from './config.js';
import { drawRoad, drawTableauRoad, drawMergeLane, drawBuilding, drawSign, drawBoothAt, drawAMZGate, drawTableauDataSource } from './draw.js';
import { drawRiver, drawZones } from './scenery.js';
import { splitCars, ubBoothCars, rfBoothCars, salesFABoothCars, sidecarCars, salesPOVCars, cars, rowboats } from './vehicles.js';

function frame(){
  ctx.fillStyle=bg;ctx.fillRect(-350,0,W,H);
  drawRiver();drawZones();
  // Roads
  cleanRoutes.forEach(([a,b])=>drawRoad(a,b,9));
  r_f_fa.forEach(([a,b])=>drawRoad(a,b,9));
  r_rf_fa.forEach(([a,b])=>drawRoad(a,b,9));
  r_pov_fa.forEach(([a,b])=>drawRoad(a,b,9));
  r_i_pov.forEach(([a,b])=>drawRoad(a,b,9));
  r_s_pov.forEach(([a,b])=>drawRoad(a,b,9));
  r_s_fa.forEach(([a,b])=>drawRoad(a,b,9));
  drawMergeLane('inventory','pov');
  drawMergeLane('sales','pov',sp_merge);
  villageRoads.forEach(([a,b])=>drawRoad(a,b,14));
  // Tableau roads
  drawTableauRoad('flieber','tab_ds_fcst',7);
  drawTableauRoad('forecast_actuals','tab_ds_fcst',7);
  drawTableauRoad('tab_ds_fcst','fcst_vis',7);
  drawTableauRoad('days_of_supply','inventory_detail',7);
  // Tableau Data Source hub
  drawTableauDataSource(tabDSx, tabDSy);
  // AMZ filter gates
  drawAMZGate(r_f_fa[0], 0.18);
  drawAMZGate(r_rf_fa[0], 0.12);
  drawAMZGate(r_f_flieber[0], 0.3);
  // Paint booths
  drawBoothAt(r_f_fa[0], (ub_b1_entry+ub_b1_exit)/2, 'Region→Country', pillColors.Region.text, pillColors.Country.text, 'Country');
  drawBoothAt(r_rf_fa[0], (rf_b1_entry+rf_b1_exit)/2, 'SKU→ASIN', pillColors.SKU.text, pillColors.ASIN.text, 'ASIN');
  drawBoothAt(r_rf_fa[0], (rf_b2_entry+rf_b2_exit)/2, 'Region→Country', pillColors.Region.text, pillColors.Country.text, 'Country');
  drawBoothAt(r_s_pov[0], (sp_compact_entry+sp_compact_exit)/2, 'Country→Region', pillColors.Country.text, pillColors.Region.text, 'Region');
  drawBoothAt(r_s_fa[0], (sfa_b1_entry+sfa_b1_exit)/2, 'SKU→ASIN', pillColors.SKU.text, pillColors.ASIN.text, 'ASIN');
  // Cars
  cars.forEach(c=>{c.update();c.draw();});
  splitCars.forEach(c=>{c.update();c.draw();});
  ubBoothCars.forEach(c=>{c.update();c.draw();});
  rfBoothCars.forEach(c=>{c.update();c.draw();});
  salesFABoothCars.forEach(c=>{c.update();c.draw();});
  sidecarCars.forEach(c=>{c.update();c.draw();});
  salesPOVCars.forEach(c=>{c.update();c.draw();});
  rowboats.forEach(c=>{c.update();c.draw();});
  // Buildings & signs
  locations.forEach(l=>{drawBuilding(l);drawSign(l);});
  frameCount.value++;
  requestAnimationFrame(frame);
}
frame();
