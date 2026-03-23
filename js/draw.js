import { ctx, isDark, pillColors, countries, roadColor, roadLine, signBg, signBorder, textMain, stackShadow, nodeMap, boothW, boothH, tabRoadColor, tabRoadLine, tabRoadArrow } from './config.js';
import { getRoadCurve, getPosAngle, getMergeXYForRoad } from './math.js';

// === Vehicle Drawing Primitives ===

export function drawBus(x,y,angle,grain){
  const gc=pillColors[grain];
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);
  ctx.fillStyle=gc.bg;
  ctx.beginPath();ctx.roundRect(-10,-5,20,10,2);ctx.fill();
  ctx.strokeStyle=gc.text;ctx.lineWidth=0.8;
  ctx.beginPath();ctx.roundRect(-10,-5,20,10,2);ctx.stroke();
  ctx.fillStyle=gc.text;ctx.font='bold 6px sans-serif';
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(grain,0,0);
  ctx.restore();
}

export function drawDualBus(x,y,angle,grainLeft,grainRight){
  const gl=pillColors[grainLeft], gr=pillColors[grainRight];
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);
  ctx.save();
  ctx.beginPath();ctx.roundRect(-14,-5,28,10,2);ctx.clip();
  ctx.fillStyle=gl.bg;
  ctx.fillRect(-14,-5,14,10);
  ctx.fillStyle=gr.bg;
  ctx.fillRect(0,-5,14,10);
  ctx.restore();
  ctx.strokeStyle=isDark?'rgba(255,255,255,0.3)':'rgba(0,0,0,0.2)';ctx.lineWidth=0.8;
  ctx.beginPath();ctx.roundRect(-14,-5,28,10,2);ctx.stroke();
  ctx.strokeStyle=isDark?'rgba(255,255,255,0.15)':'rgba(0,0,0,0.08)';ctx.lineWidth=0.5;
  ctx.beginPath();ctx.moveTo(0,-4);ctx.lineTo(0,4);ctx.stroke();
  ctx.font='bold 5px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle=gl.text;ctx.fillText(grainLeft,-7,0);
  ctx.fillStyle=gr.text;ctx.fillText(grainRight,7,0);
  ctx.restore();
}

export function drawSparkles(x,y,sparkT,color1,color2){
  for(let i=0;i<4;i++){
    const sa=i*Math.PI*2/4+sparkT*Math.PI;
    const sr=6+Math.sin(sparkT*Math.PI*3+i)*3;
    ctx.globalAlpha=0.5+Math.sin(sparkT*Math.PI)*0.3;
    ctx.fillStyle=i%2===0?color1:color2;
    ctx.beginPath();ctx.arc(x+Math.cos(sa)*sr,y+Math.sin(sa)*sr,1.5,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
}

export function drawMiniDual(x,y,angle,prodGrain,geoLabel,geoType){
  geoType=geoType||'Country';
  const pl=pillColors[prodGrain], pr=pillColors[geoType];
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);
  ctx.save();
  ctx.beginPath();ctx.roundRect(-9,-3.5,18,7,1.5);ctx.clip();
  ctx.fillStyle=pl.bg;ctx.fillRect(-9,-3.5,9,7);
  ctx.fillStyle=pr.bg;ctx.fillRect(0,-3.5,9,7);
  ctx.restore();
  ctx.strokeStyle=isDark?'rgba(255,255,255,0.25)':'rgba(0,0,0,0.15)';ctx.lineWidth=0.5;
  ctx.beginPath();ctx.roundRect(-9,-3.5,18,7,1.5);ctx.stroke();
  ctx.strokeStyle=isDark?'rgba(255,255,255,0.12)':'rgba(0,0,0,0.06)';ctx.lineWidth=0.4;
  ctx.beginPath();ctx.moveTo(0,-3);ctx.lineTo(0,3);ctx.stroke();
  ctx.font='bold 4px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle=pl.text;ctx.fillText(prodGrain,-4.5,0);
  ctx.fillStyle=pr.text;ctx.fillText(geoLabel,4.5,0);
  ctx.restore();
}

export function drawCountrySedans(x,y,angle,postT,prodGrain){
  prodGrain=prodGrain||'ASIN';
  const perpX=Math.cos(angle+Math.PI/2);
  const perpY=Math.sin(angle+Math.PI/2);
  const spreadT=Math.min(postT*2,1);
  const ease=1-Math.pow(1-spreadT,3);
  const maxSpread=14;
  countries.forEach((ct,i)=>{
    const lane=(i-1.5)*maxSpread*ease/(countries.length-1);
    const sx=x+perpX*lane;
    const sy=y+perpY*lane;
    drawMiniDual(sx,sy,angle,prodGrain,ct.code);
  });
}

// === Road Drawing ===

export function drawRoad(a,b,width){
  const c=getRoadCurve(a,b);
  ctx.beginPath();ctx.moveTo(c.sx,c.sy);ctx.quadraticCurveTo(c.cx,c.cy,c.dx,c.dy);
  ctx.strokeStyle=roadColor;ctx.lineWidth=width;ctx.lineCap='round';ctx.stroke();
  ctx.beginPath();ctx.moveTo(c.sx,c.sy);ctx.quadraticCurveTo(c.cx,c.cy,c.dx,c.dy);
  ctx.strokeStyle=roadLine;ctx.lineWidth=1;ctx.setLineDash([6,8]);ctx.stroke();ctx.setLineDash([]);
  const t=0.85;
  const ax=(1-t)*(1-t)*c.sx+2*(1-t)*t*c.cx+t*t*c.dx;
  const ay=(1-t)*(1-t)*c.sy+2*(1-t)*t*c.cy+t*t*c.dy;
  const ttx=2*(1-t)*(c.cx-c.sx)+2*t*(c.dx-c.cx);
  const tty=2*(1-t)*(c.cy-c.sy)+2*t*(c.dy-c.cy);
  const angle=Math.atan2(tty,ttx);
  const arrowSize=width*0.6;
  ctx.save();ctx.translate(ax,ay);ctx.rotate(angle);
  ctx.fillStyle=roadLine;ctx.beginPath();
  ctx.moveTo(arrowSize,0);ctx.lineTo(-arrowSize,-arrowSize*0.7);ctx.lineTo(-arrowSize,arrowSize*0.7);ctx.closePath();
  ctx.fill();ctx.restore();
}

export function drawTableauRoad(a,b,width){
  const c=getRoadCurve(a,b);
  ctx.beginPath();ctx.moveTo(c.sx,c.sy);ctx.quadraticCurveTo(c.cx,c.cy,c.dx,c.dy);
  ctx.strokeStyle=tabRoadColor;ctx.lineWidth=width;ctx.lineCap='round';ctx.stroke();
  ctx.beginPath();ctx.moveTo(c.sx,c.sy);ctx.quadraticCurveTo(c.cx,c.cy,c.dx,c.dy);
  ctx.strokeStyle=tabRoadLine;ctx.lineWidth=1.2;ctx.setLineDash([4,6]);ctx.stroke();ctx.setLineDash([]);
  const t=0.85;
  const ax=(1-t)*(1-t)*c.sx+2*(1-t)*t*c.cx+t*t*c.dx;
  const ay=(1-t)*(1-t)*c.sy+2*(1-t)*t*c.cy+t*t*c.dy;
  const ttx=2*(1-t)*(c.cx-c.sx)+2*t*(c.dx-c.cx);
  const tty=2*(1-t)*(c.cy-c.sy)+2*t*(c.dy-c.cy);
  const angle=Math.atan2(tty,ttx);
  const arrowSize=width*0.6;
  ctx.save();ctx.translate(ax,ay);ctx.rotate(angle);
  ctx.fillStyle=tabRoadArrow;ctx.beginPath();
  ctx.moveTo(arrowSize,0);ctx.lineTo(-arrowSize,-arrowSize*0.7);ctx.lineTo(-arrowSize,arrowSize*0.7);ctx.closePath();
  ctx.fill();ctx.restore();
}

export function drawMergeLane(roadSrc,roadDst,mp_t){
  const erp=nodeMap['erp'];
  const mp=getMergeXYForRoad(roadSrc,roadDst,mp_t);
  ctx.beginPath();ctx.moveTo(erp.cx,erp.cy);ctx.lineTo(mp.x,mp.y);
  ctx.strokeStyle=roadColor;ctx.lineWidth=6;ctx.lineCap='round';ctx.stroke();
  ctx.beginPath();ctx.moveTo(erp.cx,erp.cy);ctx.lineTo(mp.x,mp.y);
  ctx.strokeStyle=roadLine;ctx.lineWidth=0.8;ctx.setLineDash([4,6]);ctx.stroke();ctx.setLineDash([]);
}

// === Building / Sign Drawing ===

export function drawBuilding(l){
  const dim = l.dim;
  if(l.stacked){
    for(let i=2;i>=1;i--){
      ctx.fillStyle=stackShadow;
      ctx.fillRect(l.x+i*4,l.y-i*4,l.w,l.h);
      ctx.fillStyle=dim?l.color:l.color;
      ctx.globalAlpha=dim?0.3:0.6;
      ctx.fillRect(l.x+i*4,l.y-i*4,l.w,l.h);
      ctx.strokeStyle=l.accent;ctx.lineWidth=1;ctx.globalAlpha=dim?0.3:0.5;
      ctx.strokeRect(l.x+i*4,l.y-i*4,l.w,l.h);
      ctx.globalAlpha=1;
    }
  }

  ctx.globalAlpha=dim?0.4:1;

  if(l.tableau){
    const tx=l.x, ty=l.y, tw=l.w, th=l.h;
    const titleH=10;
    const r=4;

    ctx.save();
    ctx.shadowColor=isDark?'rgba(180,210,255,0.25)':'rgba(100,140,200,0.15)';
    ctx.shadowBlur=12;
    ctx.fillStyle=isDark?'#2a2d33':'#ffffff';
    ctx.beginPath();ctx.roundRect(tx,ty,tw,th,r);ctx.fill();
    ctx.restore();

    ctx.strokeStyle=isDark?'rgba(255,255,255,0.2)':'rgba(0,0,0,0.12)';
    ctx.lineWidth=1;
    ctx.beginPath();ctx.roundRect(tx,ty,tw,th,r);ctx.stroke();

    ctx.fillStyle=isDark?'#383b42':'#f0f0f2';
    ctx.beginPath();ctx.roundRect(tx,ty,tw,titleH,[r,r,0,0]);ctx.fill();
    ctx.fillStyle='#FF5F57';ctx.beginPath();ctx.arc(tx+7,ty+titleH/2,1.8,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#FFBD2E';ctx.beginPath();ctx.arc(tx+13,ty+titleH/2,1.8,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#28C840';ctx.beginPath();ctx.arc(tx+19,ty+titleH/2,1.8,0,Math.PI*2);ctx.fill();

    const contentX=tx+6, contentY=ty+titleH+4, cw=tw-12, ch=th-titleH-8;

    const barW=4, barGap=2.5;
    const barColors=['#4E79A7','#E15759','#F28E2B','#59A14F','#EDC948','#76B7B2'];
    const barHeights=[0.7,0.45,0.85,0.55,0.65,0.4];
    const barAreaW=cw*0.45;
    const barX=contentX+2;
    for(let i=0;i<6;i++){
      const bh=barHeights[i]*(ch-8);
      ctx.fillStyle=barColors[i];
      ctx.globalAlpha=0.85;
      ctx.fillRect(barX+i*(barW+barGap), contentY+ch-4-bh, barW, bh);
    }
    ctx.globalAlpha=1;

    const lineX=contentX+barAreaW+6, lineW=cw-barAreaW-8;
    const pts=[0.6,0.35,0.7,0.45,0.8,0.5,0.75];
    ctx.strokeStyle='#4E79A7';ctx.lineWidth=1.2;
    ctx.beginPath();
    pts.forEach((p,i)=>{
      const px=lineX+i*(lineW/(pts.length-1));
      const py=contentY+ch-4-p*(ch-10);
      i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);
    });
    ctx.stroke();
    const pts2=[0.3,0.5,0.4,0.6,0.55,0.7,0.65];
    ctx.strokeStyle='#E15759';ctx.lineWidth=1;
    ctx.beginPath();
    pts2.forEach((p,i)=>{
      const px=lineX+i*(lineW/(pts2.length-1));
      const py=contentY+ch-4-p*(ch-10);
      i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);
    });
    ctx.stroke();

    const logoS=2.2;
    const lx=tx+tw-14, ly=ty+th-12;
    const tCross=(cx2,cy2,color,sz)=>{
      ctx.fillStyle=color;
      ctx.fillRect(cx2-sz*0.3,cy2-sz,sz*0.6,sz*2);
      ctx.fillRect(cx2-sz,cy2-sz*0.3,sz*2,sz*0.6);
    };
    const lsp=logoS*1.8;
    ctx.globalAlpha=0.7;
    tCross(lx-lsp*0.4,ly-lsp*0.5,'#4574A7',logoS*0.5);
    tCross(lx+lsp*0.4,ly-lsp*0.5,'#E8743B',logoS*0.5);
    tCross(lx-lsp*0.4,ly+lsp*0.5,'#A0CBE8',logoS*0.5);
    tCross(lx+lsp*0.4,ly+lsp*0.5,'#59A14F',logoS*0.5);
    ctx.globalAlpha=1;

  } else {
    ctx.fillStyle=l.color;ctx.fillRect(l.x,l.y,l.w,l.h);
    ctx.strokeStyle=l.accent;ctx.lineWidth=1.5;ctx.strokeRect(l.x,l.y,l.w,l.h);
    const winW=6,winH=5,gap=4;
    const cols=Math.floor((l.w-gap*2)/(winW+gap));const rows=Math.floor((l.h-gap*2)/(winH+gap));
    const sx=l.x+(l.w-cols*(winW+gap)+gap)/2;const sy=l.y+(l.h-rows*(winH+gap)+gap)/2;
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
      ctx.fillStyle=isDark?'rgba(255,255,255,0.2)':'rgba(255,255,255,0.5)';
      ctx.fillRect(sx+c*(winW+gap),sy+r*(winH+gap),winW,winH);
    }
  }
  ctx.globalAlpha=1;
}

export function drawPill(text,x,y,colors){
  ctx.font='600 9px sans-serif';const m=ctx.measureText(text);const pw=m.width+10;const ph=16;
  ctx.fillStyle=colors.bg;ctx.beginPath();ctx.roundRect(x-pw/2,y,pw,ph,8);ctx.fill();
  ctx.fillStyle=colors.text;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,x,y+ph/2);return pw;
}

export function drawSign(l){
  const dim = l.dim;
  const cx=l.x+l.w/2;const sy=l.y+l.h+5;

  ctx.globalAlpha=dim?0.4:1;
  ctx.fillStyle=l.accent;ctx.fillRect(cx-1,sy,2,12);

  const lf='600 10px sans-serif';ctx.font=lf;
  const lines = l.label.split('\n');
  ctx.font='600 9px sans-serif';const pg=4;
  const pw2=l.grains.map(g=>ctx.measureText(g).width+10);
  const prw=pw2.length>0?(pw2.reduce((a,b)=>a+b,0)+(l.grains.length-1)*pg):0;

  ctx.font=lf;
  const maxLineW = Math.max(...lines.map(ln=>ctx.measureText(ln).width));
  const pw=Math.max(maxLineW+12,prw+12);
  const lineH = 14;
  const grainH = l.grains.length > 0 ? 20 : 0;
  const ph = lines.length * lineH + 4 + grainH;
  const px=cx-pw/2;const py=sy+10;

  ctx.fillStyle=signBg;ctx.strokeStyle=signBorder;ctx.lineWidth=1;
  ctx.beginPath();ctx.roundRect(px,py,pw,ph,5);ctx.fill();ctx.stroke();
  ctx.fillStyle=textMain;ctx.font=lf;ctx.textAlign='center';ctx.textBaseline='top';
  lines.forEach((ln,i)=>{
    ctx.fillText(ln,cx,py+3+i*lineH);
  });

  if(l.grains.length > 0){
    const pillY=py+lines.length*lineH+4;
    let pillX=cx-prw/2;
    l.grains.forEach((g,i)=>{const w=pw2[i];drawPill(g,pillX+w/2,pillY,pillColors[g]);pillX+=w+pg;});
  }
  ctx.globalAlpha=1;
}

// === Overlay Drawing ===

export function drawBoothAt(road, t_mid, label, entryColor, exitColor, targetGrain){
  targetGrain=targetGrain||'ASIN';
  const tg=pillColors[targetGrain];
  const c=getRoadCurve(road[0],road[1]);
  const bx=(1-t_mid)*(1-t_mid)*c.sx+2*(1-t_mid)*t_mid*c.cx+t_mid*t_mid*c.dx;
  const by=(1-t_mid)*(1-t_mid)*c.sy+2*(1-t_mid)*t_mid*c.cy+t_mid*t_mid*c.dy;
  const ttx=2*(1-t_mid)*(c.cx-c.sx)+2*t_mid*(c.dx-c.cx);
  const tty=2*(1-t_mid)*(c.cy-c.sy)+2*t_mid*(c.dy-c.cy);
  const angle=Math.atan2(tty,ttx);
  ctx.save();ctx.translate(bx,by);ctx.rotate(angle);
  ctx.fillStyle=tg.bg;ctx.globalAlpha=isDark?0.7:0.85;
  ctx.beginPath();ctx.roundRect(-boothW/2,-boothH,boothW,boothH*2,3);ctx.fill();
  ctx.globalAlpha=1;
  ctx.strokeStyle=tg.text;ctx.lineWidth=1.5;ctx.globalAlpha=0.6;
  ctx.beginPath();ctx.roundRect(-boothW/2,-boothH,boothW,boothH*2,3);ctx.stroke();
  ctx.globalAlpha=1;
  ctx.strokeStyle=entryColor;ctx.lineWidth=1;ctx.globalAlpha=0.5;
  ctx.beginPath();ctx.moveTo(-boothW/2,-boothH+4);ctx.lineTo(-boothW/2+4,-boothH+8);ctx.lineTo(-boothW/2,-boothH+12);ctx.stroke();
  ctx.strokeStyle=exitColor;
  ctx.beginPath();ctx.moveTo(boothW/2,-boothH+4);ctx.lineTo(boothW/2-4,-boothH+8);ctx.lineTo(boothW/2,-boothH+12);ctx.stroke();
  ctx.globalAlpha=1;
  ctx.fillStyle=tg.text;ctx.font='bold 5px sans-serif';
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(label,0,0);
  ctx.restore();
}

export function drawAMZGate(road,t_pos){
  const p=getPosAngle(road,t_pos);
  const perpX=Math.cos(p.angle+Math.PI/2);
  const perpY=Math.sin(p.angle+Math.PI/2);
  ctx.fillStyle='#232F3E';
  ctx.beginPath();ctx.arc(p.x+perpX*8,p.y+perpY*8,2,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(p.x-perpX*8,p.y-perpY*8,2,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#232F3E';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(p.x+perpX*8,p.y+perpY*8);ctx.lineTo(p.x-perpX*8,p.y-perpY*8);ctx.stroke();
  ctx.save();ctx.translate(p.x,p.y);
  ctx.fillStyle='#FF9900';
  ctx.beginPath();ctx.roundRect(-14,-8,28,16,3);ctx.fill();
  ctx.strokeStyle='rgba(200,120,0,0.5)';ctx.lineWidth=0.8;
  ctx.beginPath();ctx.roundRect(-14,-8,28,16,3);ctx.stroke();
  ctx.fillStyle='#232F3E';ctx.font='bold 6px sans-serif';
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('amz',0,-1);
  ctx.strokeStyle='#232F3E';ctx.lineWidth=0.8;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(-6,4);ctx.quadraticCurveTo(0,8,6,4);ctx.stroke();
  ctx.beginPath();ctx.moveTo(4,3);ctx.lineTo(6,4);ctx.lineTo(4,5);ctx.stroke();
  ctx.restore();
}

export function drawTableauDataSource(dsX, dsY){
  const r=14;
  ctx.save();
  ctx.shadowColor=isDark?'rgba(78,121,167,0.4)':'rgba(78,121,167,0.25)';
  ctx.shadowBlur=10;
  ctx.fillStyle=isDark?'#2a2d33':'#ffffff';
  ctx.beginPath();ctx.arc(dsX,dsY,r,0,Math.PI*2);ctx.fill();
  ctx.restore();
  ctx.strokeStyle=isDark?'rgba(78,121,167,0.6)':'rgba(78,121,167,0.4)';
  ctx.lineWidth=1.5;
  ctx.beginPath();ctx.arc(dsX,dsY,r,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle=isDark?'#A0CBE8':'#4E79A7';
  ctx.font='bold 12px sans-serif';
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('⋈',dsX,dsY);
  ctx.font='600 5px sans-serif';
  ctx.fillStyle=isDark?'rgba(160,203,232,0.6)':'rgba(78,121,167,0.5)';
  ctx.fillText('Tableau DS',dsX,dsY+r+7);
}
