import { ctx, frameCount, isDark, pillColors, nodeMap, splitPoint, ub_b1_entry, ub_b1_exit, rf_b1_entry, rf_b1_exit, rf_b2_entry, rf_b2_exit, sfa_b1_entry, sfa_b1_exit, srgm_b1_entry, srgm_b1_exit, sp_compact_entry, sp_compact_exit, sp_merge, mergePoint, feederLeadUp, countries, r_f_fa, r_rf_fa, r_s_fa, r_s_rgm, r_i_pov, r_s_pov, r_pov_fa, villageRoads, cleanRoutes, routeGrains, boatChannels, canalFull, canalFromRF } from './config.js';
import { getRoadCurve, getPosAngle, getMergeXYForRoad, getCanalLen, getCanalPos } from './math.js';
import { drawDualBus, drawCountrySedans, drawSparkles, drawMiniDual } from './draw.js';

// === SplitCar ===
class SplitCar{
  constructor(road,offset){
    this.road=road;
    this.progress=offset;
    this.speed=0.0012+Math.random()*0.0006;
    this.burstTimer=0;
  }
  update(){
    this.progress+=this.speed;
    if(this.progress>1){this.progress=0;this.burstTimer=0;}
    if(this.progress>=splitPoint && this.burstTimer===0) this.burstTimer=1;
    if(this.burstTimer>0 && this.burstTimer<30) this.burstTimer++;
  }
  draw(){
    const c=getRoadCurve(this.road[0],this.road[1]);
    const t=this.progress;
    const x=(1-t)*(1-t)*c.sx+2*(1-t)*t*c.cx+t*t*c.dx;
    const y=(1-t)*(1-t)*c.sy+2*(1-t)*t*c.cy+t*t*c.dy;
    const ttx=2*(1-t)*(c.cx-c.sx)+2*t*(c.dx-c.cx);
    const tty=2*(1-t)*(c.cy-c.sy)+2*t*(c.dy-c.cy);
    const angle=Math.atan2(tty,ttx);

    if(t<splitPoint){
      drawDualBus(x,y,angle,'ASIN','Region');
    } else {
      const postT=(t-splitPoint)/(1-splitPoint);
      drawCountrySedans(x,y,angle,postT,'ASIN');

      if(this.burstTimer>0 && this.burstTimer<20){
        const splitX=(1-splitPoint)*(1-splitPoint)*c.sx+2*(1-splitPoint)*splitPoint*c.cx+splitPoint*splitPoint*c.dx;
        const splitY=(1-splitPoint)*(1-splitPoint)*c.sy+2*(1-splitPoint)*splitPoint*c.cy+splitPoint*splitPoint*c.dy;
        const alpha=Math.max(0,1-this.burstTimer/20);
        ctx.globalAlpha=alpha*0.6;
        for(let i=0;i<6;i++){
          const a2=i*Math.PI/3+this.burstTimer*0.1;
          const r=this.burstTimer*1.2;
          ctx.fillStyle=pillColors.Region.text;
          ctx.beginPath();ctx.arc(splitX+Math.cos(a2)*r,splitY+Math.sin(a2)*r,1.5,0,Math.PI*2);ctx.fill();
        }
        ctx.globalAlpha=1;
      }
    }
  }
}

export const splitCars=[];
for(let i=0;i<3;i++) splitCars.push(new SplitCar(r_pov_fa[0], i*0.33));

// === UBBoothCar ===
class UBBoothCar{
  constructor(road,offset){
    this.road=road;this.progress=offset;this.speed=0.0012+Math.random()*0.0005;
  }
  update(){this.progress+=this.speed;if(this.progress>1)this.progress=0;}
  draw(){
    const t=this.progress;
    const p=getPosAngle(this.road,t);
    if(t<ub_b1_entry){
      drawDualBus(p.x,p.y,p.angle,'ASIN','Region');
    } else if(t<ub_b1_exit){
      drawSparkles(p.x,p.y,(t-ub_b1_entry)/(ub_b1_exit-ub_b1_entry),pillColors.Region.text,pillColors.Country.text);
    } else {
      drawCountrySedans(p.x,p.y,p.angle,(t-ub_b1_exit)/(1-ub_b1_exit),'ASIN');
    }
  }
}

export const ubBoothCars=[];
for(let i=0;i<3;i++) ubBoothCars.push(new UBBoothCar(r_f_fa[0], i*0.33));

// === RFBoothCar ===
class RFBoothCar{
  constructor(road,offset){
    this.road=road;this.progress=offset;this.speed=0.0010+Math.random()*0.0004;
  }
  update(){this.progress+=this.speed;if(this.progress>1)this.progress=0;}
  draw(){
    const t=this.progress;
    const p=getPosAngle(this.road,t);
    if(t<rf_b1_entry){
      drawDualBus(p.x,p.y,p.angle,'SKU','Region');
    } else if(t<rf_b1_exit){
      drawSparkles(p.x,p.y,(t-rf_b1_entry)/(rf_b1_exit-rf_b1_entry),pillColors.SKU.text,pillColors.ASIN.text);
    } else if(t<rf_b2_entry){
      drawDualBus(p.x,p.y,p.angle,'ASIN','Region');
    } else if(t<rf_b2_exit){
      drawSparkles(p.x,p.y,(t-rf_b2_entry)/(rf_b2_exit-rf_b2_entry),pillColors.Region.text,pillColors.Country.text);
    } else {
      drawCountrySedans(p.x,p.y,p.angle,(t-rf_b2_exit)/(1-rf_b2_exit),'ASIN');
    }
  }
}

export const rfBoothCars=[];
for(let i=0;i<3;i++) rfBoothCars.push(new RFBoothCar(r_rf_fa[0], i*0.33));

// === SalesFABoothCar ===
class SalesFABoothCar{
  constructor(road,offset){
    this.road=road;this.progress=offset;this.speed=0.0012+Math.random()*0.0005;
  }
  update(){this.progress+=this.speed;if(this.progress>1)this.progress=0;}
  draw(){
    const t=this.progress;
    const p=getPosAngle(this.road,t);
    if(t<sfa_b1_entry){
      drawDualBus(p.x,p.y,p.angle,'SKU','Country');
    } else if(t<sfa_b1_exit){
      drawSparkles(p.x,p.y,(t-sfa_b1_entry)/(sfa_b1_exit-sfa_b1_entry),pillColors.SKU.text,pillColors.ASIN.text);
    } else {
      drawMiniDual(p.x,p.y,p.angle,'ASIN','Country','Country');
    }
  }
}

export const salesFABoothCars=[];
for(let i=0;i<3;i++) salesFABoothCars.push(new SalesFABoothCar(r_s_fa[0], i*0.33));

// === SalesRGMBoothCar ===
class SalesRGMBoothCar{
  constructor(road,offset){
    this.road=road;this.progress=offset;this.speed=0.0012+Math.random()*0.0005;
  }
  update(){this.progress+=this.speed;if(this.progress>1)this.progress=0;}
  draw(){
    const t=this.progress;
    const p=getPosAngle(this.road,t);
    if(t<srgm_b1_entry){
      drawDualBus(p.x,p.y,p.angle,'SKU','Country');
    } else if(t<srgm_b1_exit){
      drawSparkles(p.x,p.y,(t-srgm_b1_entry)/(srgm_b1_exit-srgm_b1_entry),pillColors.SKU.text,pillColors.ASIN.text);
    } else {
      drawMiniDual(p.x,p.y,p.angle,'ASIN','Country','Country');
    }
  }
}

export const salesRGMBoothCars=[];
for(let i=0;i<3;i++) salesRGMBoothCars.push(new SalesRGMBoothCar(r_s_rgm[0], i*0.33));

// === SidecarCar ===
class SidecarCar{
  constructor(road,offset,mainGrain,geoGrain,sidecarGrain){
    this.road=road;
    this.progress=offset;
    this.speed=0.0012+Math.random()*0.0005;
    this.snapTimer=0;
    this.mainGrain=mainGrain;
    this.geoGrain=geoGrain;
    this.sidecarGrain=sidecarGrain;
  }
  update(){
    this.progress+=this.speed;
    if(this.progress>1){this.progress=0;this.snapTimer=0;}
    if(this.progress>=mergePoint && this.snapTimer===0) this.snapTimer=1;
    if(this.snapTimer>0 && this.snapTimer<25) this.snapTimer++;
  }
  draw(){
    const mc=pillColors[this.mainGrain];
    const sc=pillColors[this.sidecarGrain];
    const c=getRoadCurve(this.road[0],this.road[1]);
    const t=this.progress;
    const x=(1-t)*(1-t)*c.sx+2*(1-t)*t*c.cx+t*t*c.dx;
    const y=(1-t)*(1-t)*c.sy+2*(1-t)*t*c.cy+t*t*c.dy;
    const ttx=2*(1-t)*(c.cx-c.sx)+2*t*(c.dx-c.cx);
    const tty=2*(1-t)*(c.cy-c.sy)+2*t*(c.dy-c.cy);
    const angle=Math.atan2(tty,ttx);
    const perpX=Math.cos(angle+Math.PI/2);
    const perpY=Math.sin(angle+Math.PI/2);

    drawDualBus(x,y,angle,this.mainGrain,this.geoGrain);

    // Feeder car from ERP
    const feederStart = mergePoint - feederLeadUp;
    if(t >= feederStart && t < mergePoint){
      const feederT = (t - feederStart) / feederLeadUp;
      const erp = nodeMap['erp'];
      const mp = getMergeXYForRoad(this.road[0], this.road[1]);
      const fx = erp.cx + (mp.x - erp.cx) * feederT;
      const fy = erp.cy + (mp.y - erp.cy) * feederT;
      const fAngle = Math.atan2(mp.y - erp.cy, mp.x - erp.cx);

      ctx.globalAlpha = 0.7;
      ctx.save();ctx.translate(fx,fy);ctx.rotate(fAngle);
      ctx.fillStyle=sc.bg;
      ctx.beginPath();ctx.roundRect(-5,-3,10,6,1.5);ctx.fill();
      ctx.strokeStyle=sc.text;ctx.lineWidth=0.4;
      ctx.beginPath();ctx.roundRect(-5,-3,10,6,1.5);ctx.stroke();
      ctx.fillStyle=sc.text;ctx.font='bold 4px sans-serif';
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(this.sidecarGrain,0,0);
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // Sidecar attached phase
    if(t>=mergePoint){
      const attachT=Math.min(this.snapTimer/15,1);
      const ease=1-Math.pow(1-attachT,3);
      const slideStart=18;
      const slideEnd=7;
      const offset=slideStart-(slideStart-slideEnd)*ease;

      const scx=x-perpX*offset;
      const scy=y-perpY*offset;

      ctx.save();ctx.translate(scx,scy);ctx.rotate(angle);
      ctx.fillStyle=sc.bg;
      ctx.beginPath();ctx.roundRect(-6,-3.5,12,7,2);ctx.fill();
      ctx.strokeStyle=sc.text;ctx.lineWidth=0.6;
      ctx.beginPath();ctx.roundRect(-6,-3.5,12,7,2);ctx.stroke();
      ctx.fillStyle=sc.text;ctx.font='bold 5px sans-serif';
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(this.sidecarGrain,0,0);
      ctx.restore();

      if(this.snapTimer>0 && this.snapTimer<12){
        const alpha=Math.max(0,1-this.snapTimer/12)*0.5;
        ctx.globalAlpha=alpha;
        ctx.fillStyle=sc.text;
        ctx.beginPath();ctx.arc(x-perpX*slideEnd,y-perpY*slideEnd,6-this.snapTimer*0.3,0,Math.PI*2);ctx.fill();
        ctx.globalAlpha=1;
      }
    }
  }
}

export const sidecarCars=[];
for(let i=0;i<3;i++) sidecarCars.push(new SidecarCar(r_i_pov[0], i*0.33, 'USIN', 'Region', 'ASIN'));

// === SalesPOVCar ===
class SalesPOVCar{
  constructor(road,offset){
    this.road=road;this.progress=offset;
    this.speed=0.0010+Math.random()*0.0004;
    this.snapTimer=0;
  }
  update(){
    this.progress+=this.speed;
    if(this.progress>1){this.progress=0;this.snapTimer=0;}
    if(this.progress>=sp_merge && this.snapTimer===0) this.snapTimer=1;
    if(this.snapTimer>0 && this.snapTimer<25) this.snapTimer++;
  }
  draw(){
    const t=this.progress;
    const p=getPosAngle(this.road,t);
    const perpX=Math.cos(p.angle+Math.PI/2);
    const perpY=Math.sin(p.angle+Math.PI/2);

    if(t<sp_compact_entry){
      const convergeT=1-t/sp_compact_entry;
      const ease=1-Math.pow(1-convergeT,2);
      const maxSpread=14;
      countries.forEach((ct,i)=>{
        const lane=(i-1.5)*maxSpread*ease/(countries.length-1);
        const sx=p.x+perpX*lane;
        const sy=p.y+perpY*lane;
        drawMiniDual(sx,sy,p.angle,'ASIN',ct.code);
      });
    } else if(t<sp_compact_exit){
      drawSparkles(p.x,p.y,(t-sp_compact_entry)/(sp_compact_exit-sp_compact_entry),pillColors.Country.text,pillColors.Region.text);
    } else {
      drawDualBus(p.x,p.y,p.angle,'ASIN','Region');

      // Feeder from ERP
      const feederStart=sp_merge-feederLeadUp;
      if(t>=feederStart && t<sp_merge){
        const feederT=(t-feederStart)/feederLeadUp;
        const erp=nodeMap['erp'];
        const mp=getMergeXYForRoad(this.road[0],this.road[1],sp_merge);
        const fx=erp.cx+(mp.x-erp.cx)*feederT;
        const fy=erp.cy+(mp.y-erp.cy)*feederT;
        const fAngle=Math.atan2(mp.y-erp.cy,mp.x-erp.cx);
        ctx.globalAlpha=0.7;
        ctx.save();ctx.translate(fx,fy);ctx.rotate(fAngle);
        ctx.fillStyle=pillColors.USIN.bg;
        ctx.beginPath();ctx.roundRect(-5,-3,10,6,1.5);ctx.fill();
        ctx.strokeStyle=pillColors.USIN.text;ctx.lineWidth=0.4;
        ctx.beginPath();ctx.roundRect(-5,-3,10,6,1.5);ctx.stroke();
        ctx.fillStyle=pillColors.USIN.text;ctx.font='bold 4px sans-serif';
        ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText('USIN',0,0);
        ctx.restore();
        ctx.globalAlpha=1;
      }

      // USIN sidecar attached
      if(t>=sp_merge){
        const attachT=Math.min(this.snapTimer/15,1);
        const ease=1-Math.pow(1-attachT,3);
        const slideStart=18,slideEnd=7;
        const offset=slideStart-(slideStart-slideEnd)*ease;
        const scx=p.x-perpX*offset;
        const scy=p.y-perpY*offset;
        ctx.save();ctx.translate(scx,scy);ctx.rotate(p.angle);
        ctx.fillStyle=pillColors.USIN.bg;
        ctx.beginPath();ctx.roundRect(-6,-3.5,12,7,2);ctx.fill();
        ctx.strokeStyle=pillColors.USIN.text;ctx.lineWidth=0.6;
        ctx.beginPath();ctx.roundRect(-6,-3.5,12,7,2);ctx.stroke();
        ctx.fillStyle=pillColors.USIN.text;ctx.font='bold 5px sans-serif';
        ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText('USIN',0,0);
        ctx.restore();
        if(this.snapTimer>0 && this.snapTimer<12){
          const alpha=Math.max(0,1-this.snapTimer/12)*0.5;
          ctx.globalAlpha=alpha;
          ctx.fillStyle=pillColors.USIN.text;
          ctx.beginPath();ctx.arc(p.x-perpX*slideEnd,p.y-perpY*slideEnd,6-this.snapTimer*0.3,0,Math.PI*2);ctx.fill();
          ctx.globalAlpha=1;
        }
      }
    }
  }
}

export const salesPOVCars=[];
for(let i=0;i<3;i++) salesPOVCars.push(new SalesPOVCar(r_s_pov[0], i*0.33));

// === Car (generic) ===
class Car{
  constructor(road,density,prodGrain,geoGrain){
    this.road=road;this.progress=Math.random();
    this.speed=density==='dense'?(0.002+Math.random()*0.003):density==='mid'?(0.0015+Math.random()*0.002):(0.001+Math.random()*0.0015);
    this.prodGrain=prodGrain||'ASIN';
    this.geoGrain=geoGrain||'Country';
  }
  update(){
    this.progress+=this.speed;
    if(this.progress>1) this.progress=0;
  }
  draw(){
    const src=nodeMap[this.road[0]],dst=nodeMap[this.road[1]];
    const sx=src.cx,sy=src.cy,dx=dst.cx,dy=dst.cy;
    const mx=(sx+dx)/2,my=(sy+dy)/2;
    const off=10*Math.sin(Math.atan2(dy-sy,dx-sx)+Math.PI/2);
    const bx=mx+off,by=my+off;const t=this.progress;
    let x=(1-t)*(1-t)*sx+2*(1-t)*t*bx+t*t*dx;
    let y=(1-t)*(1-t)*sy+2*(1-t)*t*by+t*t*dy;
    const ttx=2*(1-t)*(bx-sx)+2*t*(dx-bx);
    const tty=2*(1-t)*(by-sy)+2*t*(dy-by);
    const angle=Math.atan2(tty,ttx);
    drawMiniDual(x,y,angle,this.prodGrain,this.geoGrain,this.geoGrain);
  }
}

export const cars=[];
villageRoads.forEach(r=>{for(let i=0;i<4;i++)cars.push(new Car(r,'dense','ASIN','Country'));});
cleanRoutes.forEach(r=>{
  const key=r.join(',');
  const g=routeGrains[key]||['ASIN','Country'];
  for(let i=0;i<2;i++)cars.push(new Car(r,'sparse',g[0],g[1]));
});
[['flieber','tab_ds_fcst'],['forecast_actuals','tab_ds_fcst'],['tab_ds_fcst','fcst_vis']].forEach(r=>{
  for(let i=0;i<2;i++)cars.push(new Car(r,'sparse','ASIN','SKU'));
});
[['days_of_supply','inventory_detail']].forEach(r=>{
  for(let i=0;i<2;i++)cars.push(new Car(r,'sparse','USIN','Region'));
});

// === Rowboat ===
class Rowboat{
  constructor(offset,srcId){
    this.progress=offset;
    this.speed=0.0012;
    this.channelIdx=Math.floor(Math.random()*boatChannels.length);
    this.srcId=srcId;
    this.path=srcId==='forecast'?canalFull:canalFromRF;
  }
  update(){
    this.progress+=this.speed;
    if(this.progress>1){
      this.progress=0;
      this.channelIdx=(this.channelIdx+1)%boatChannels.length;
    }
  }
  draw(){
    const t=this.progress;
    const p=getCanalPos(this.path,t);
    const x=p.x,y=p.y,angle=p.angle;
    const bob=Math.sin(frameCount.value*0.08+t*20)*1.5;

    ctx.save();ctx.translate(x,y+bob);ctx.rotate(angle);

    // Wake trail
    ctx.globalAlpha=0.15;
    ctx.fillStyle=isDark?'rgba(60,140,220,0.5)':'rgba(40,120,200,0.3)';
    ctx.beginPath();ctx.moveTo(-4,0);ctx.lineTo(-14,4);ctx.lineTo(-14,-4);ctx.closePath();ctx.fill();
    ctx.globalAlpha=1;

    // Hull
    ctx.fillStyle=isDark?'#6B5030':'#8B6B40';
    ctx.beginPath();
    ctx.moveTo(-8,4);ctx.lineTo(10,4);ctx.lineTo(8,-2);ctx.lineTo(-8,-2);ctx.closePath();
    ctx.fill();
    ctx.strokeStyle=isDark?'#4A3520':'#6B5030';ctx.lineWidth=0.8;ctx.stroke();

    // Channel flag
    const ch=boatChannels[this.channelIdx];
    const flagX=2, flagY=-12;
    ctx.strokeStyle=isDark?'#8B7355':'#6B5030';ctx.lineWidth=0.8;
    ctx.beginPath();ctx.moveTo(flagX,-2);ctx.lineTo(flagX,flagY-6);ctx.stroke();
    const fw=14,fh=10;
    if(ch==='SPF'){
      ctx.fillStyle='#95BF47';
      ctx.beginPath();ctx.roundRect(flagX+1,flagY-6,fw,fh,1.5);ctx.fill();
      ctx.strokeStyle='#6E9B2E';ctx.lineWidth=0.5;
      ctx.beginPath();ctx.roundRect(flagX+1,flagY-6,fw,fh,1.5);ctx.stroke();
      ctx.fillStyle='#fff';ctx.font='bold 7px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('S',flagX+fw/2+1,flagY-1);
    } else if(ch==='Tiktok'){
      ctx.fillStyle='#010101';
      ctx.beginPath();ctx.roundRect(flagX+1,flagY-6,fw,fh,1.5);ctx.fill();
      ctx.fillStyle='#25F4EE';ctx.font='bold 4.5px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('Tik',flagX+fw/2-1,flagY-2);
      ctx.fillStyle='#FE2C55';
      ctx.fillText('Tok',flagX+fw/2+1,flagY+2);
    } else if(ch==='WMT'){
      ctx.fillStyle='#0071CE';
      ctx.beginPath();ctx.roundRect(flagX+1,flagY-6,fw,fh,1.5);ctx.fill();
      ctx.strokeStyle='#005BA1';ctx.lineWidth=0.5;
      ctx.beginPath();ctx.roundRect(flagX+1,flagY-6,fw,fh,1.5);ctx.stroke();
      const cx=flagX+fw/2+1,cy=flagY-1;
      ctx.strokeStyle='#FFC220';ctx.lineWidth=1.2;ctx.lineCap='round';
      for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*3.5,cy+Math.sin(a)*3.5);ctx.stroke();}
    }

    // Oar
    const oarAngle=Math.sin(frameCount.value*0.1)*0.4;
    ctx.save();ctx.translate(0,0);ctx.rotate(oarAngle);
    ctx.strokeStyle=isDark?'#8B7355':'#6B5030';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(-2,0);ctx.lineTo(-2,10);ctx.stroke();
    ctx.fillStyle=isDark?'#6B5030':'#8B6B40';
    ctx.beginPath();ctx.ellipse(-2,11,1.5,3,0,0,Math.PI*2);ctx.fill();
    ctx.restore();

    ctx.restore();
  }
}

export const rowboats=[];
rowboats.push(new Rowboat(0.0,'forecast'));
rowboats.push(new Rowboat(0.33,'forecast_rf'));
rowboats.push(new Rowboat(0.66,'forecast'));
