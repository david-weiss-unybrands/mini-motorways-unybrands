import { ctx, frameCount, bg, W, H, locations, cleanRoutes, r_f_fa, r_rf_fa, r_pov_fa, r_i_pov, r_s_pov, r_s_fa, r_s_rgm, villageRoads, tabDSx, tabDSy, r_dos_id, tableauRoutes } from './config.js';
import { drawEdge, drawTableauEdge, drawNode, drawLabel, drawTableauDataSource, drawLegend } from './draw.js';

function frame(){
  ctx.fillStyle=bg;ctx.fillRect(-350,0,W,H);

  // Edges
  const allRoutes = [...cleanRoutes, ...r_f_fa, ...r_rf_fa, ...r_pov_fa, ...r_i_pov, ...r_s_pov, ...r_s_fa, ...r_s_rgm, ...villageRoads];
  allRoutes.forEach(([a,b]) => drawEdge(a,b));

  // Tableau edges
  drawTableauEdge('flieber','tab_ds_fcst');
  drawTableauEdge('forecast_actuals','tab_ds_fcst');
  drawTableauEdge('tab_ds_fcst','fcst_vis');
  drawTableauEdge('days_of_supply','inventory_detail');

  // Tableau Data Source hub
  drawTableauDataSource(tabDSx, tabDSy);

  // Nodes & labels
  locations.forEach(l => { drawNode(l); drawLabel(l); });

  drawLegend();
  frameCount.value++;
  requestAnimationFrame(frame);
}
frame();
