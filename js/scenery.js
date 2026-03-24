import { ctx, frameCount, isDark, riverColor, riverStroke, cdtZoneBg, cdtZoneBorder, cdtZoneLabel } from './config.js';

export function drawRiver(){
  ctx.save();
  // Main river (vertical, right side)
  ctx.beginPath();
  ctx.moveTo(515,0);ctx.bezierCurveTo(491,117,538,234,503,351);
  ctx.bezierCurveTo(468,468,526,585,491,702);ctx.bezierCurveTo(475,790,500,860,491,900);
  ctx.lineTo(532,900);ctx.bezierCurveTo(541,860,516,790,532,702);
  ctx.bezierCurveTo(567,585,509,468,544,351);ctx.bezierCurveTo(579,234,532,117,556,0);
  ctx.closePath();ctx.fillStyle=riverColor;ctx.fill();
  ctx.strokeStyle=riverStroke;ctx.lineWidth=1;ctx.stroke();
  ctx.strokeStyle=riverStroke;ctx.lineWidth=0.5;
  for(let wy=30;wy<900;wy+=40){const wx=523+10*Math.sin(wy*0.01);
    ctx.beginPath();ctx.moveTo(wx-8,wy);ctx.quadraticCurveTo(wx,wy-4,wx+8,wy);ctx.stroke();}

  // Canal: straight line from Forecast UB Legacy -> Forecast Redfits -> DTC Island
  const cw=12;
  const s1={x1:52,y1:495,x2:67,y2:280};
  const a1=Math.atan2(s1.y2-s1.y1,s1.x2-s1.x1);
  const px1=Math.cos(a1+Math.PI/2)*cw, py1=Math.sin(a1+Math.PI/2)*cw;
  const s2={x1:67,y1:280,x2:280,y2:165};
  const a2=Math.atan2(s2.y2-s2.y1,s2.x2-s2.x1);
  const px2=Math.cos(a2+Math.PI/2)*cw, py2=Math.sin(a2+Math.PI/2)*cw;

  ctx.beginPath();
  ctx.moveTo(s1.x1+px1, s1.y1+py1);
  ctx.lineTo(s1.x2+px1, s1.y2+py1);
  ctx.lineTo(s2.x2+px2, s2.y2+py2);
  ctx.lineTo(s2.x1-px2, s2.y1-py2);
  ctx.lineTo(s1.x1-px1, s1.y1-py1);
  ctx.closePath();
  ctx.fillStyle=riverColor;ctx.fill();
  ctx.strokeStyle=riverStroke;ctx.lineWidth=1;ctx.stroke();

  // Canal wavelets
  ctx.strokeStyle=riverStroke;ctx.lineWidth=0.5;
  for(let i=0;i<10;i++){
    const t=i/9;
    let wx,wy;
    if(t<0.5){const st=t/0.5;wx=s1.x1+(s1.x2-s1.x1)*st;wy=s1.y1+(s1.y2-s1.y1)*st;}
    else{const st=(t-0.5)/0.5;wx=s2.x1+(s2.x2-s2.x1)*st;wy=s2.y1+(s2.y2-s2.y1)*st;}
    ctx.beginPath();ctx.moveTo(wx-5,wy);ctx.quadraticCurveTo(wx,wy-3,wx+5,wy);ctx.stroke();
  }

  ctx.restore();
}

function drawPalmTree(x,y,scale){
  ctx.save();ctx.translate(x,y);
  const s=scale;
  ctx.strokeStyle=isDark?'#6B5030':'#8B6B40';
  ctx.lineWidth=3*s;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(3*s,-15*s,-2*s,-35*s);ctx.stroke();
  ctx.strokeStyle=isDark?'rgba(90,70,40,0.4)':'rgba(120,90,50,0.3)';
  ctx.lineWidth=1;
  for(let i=1;i<5;i++){
    const ty=-7*s*i;const tx=2*s*Math.sin(i*0.5);
    ctx.beginPath();ctx.moveTo(tx-2*s,ty);ctx.lineTo(tx+2*s,ty);ctx.stroke();
  }
  const frondColor=isDark?'#3B6B20':'#5BA335';
  const frondDark=isDark?'#2A5015':'#4A8A28';
  const topX=-2*s,topY=-35*s;
  const sway=Math.sin(frameCount.value*0.015+x*0.1)*3*s;
  for(let f=0;f<5;f++){
    const angle=-Math.PI*0.8+f*Math.PI*0.4;
    const len=18*s+Math.sin(f*1.5)*4*s;
    const endX=topX+Math.cos(angle)*len+sway;
    const endY=topY+Math.sin(angle)*len*0.6;
    const cpX=topX+Math.cos(angle)*len*0.5+sway*0.5;
    const cpY=topY+Math.sin(angle)*len*0.2-5*s;
    ctx.strokeStyle=f%2===0?frondColor:frondDark;
    ctx.lineWidth=2*s;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(topX,topY);ctx.quadraticCurveTo(cpX,cpY,endX,endY);ctx.stroke();
    ctx.lineWidth=0.8*s;
    for(let l=0.3;l<0.9;l+=0.2){
      const lx=(1-l)*(1-l)*topX+2*(1-l)*l*cpX+l*l*endX;
      const ly=(1-l)*(1-l)*topY+2*(1-l)*l*cpY+l*l*endY;
      ctx.beginPath();ctx.moveTo(lx,ly);ctx.lineTo(lx+3*s*(f<2.5?-1:1),ly+3*s);ctx.stroke();
    }
  }
  ctx.fillStyle=isDark?'#5C4020':'#8B6B3D';
  ctx.beginPath();ctx.arc(topX-2*s,topY+3*s,2*s,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(topX+2*s,topY+4*s,1.8*s,0,Math.PI*2);ctx.fill();
  ctx.restore();
}

function drawIsland(){
  const cx=325, cy=95;
  ctx.save();

  // Ocean water
  ctx.fillStyle=isDark?'rgba(30,90,160,0.15)':'rgba(40,120,200,0.10)';
  ctx.beginPath();ctx.ellipse(cx,cy,185,110,0,0,Math.PI*2);ctx.fill();

  // Animated waves
  for(let w=0;w<3;w++){
    const waveR=160+w*18+Math.sin(frameCount.value*0.02+w*2)*5;
    const waveRy=95+w*12+Math.sin(frameCount.value*0.02+w*2)*3;
    ctx.strokeStyle=isDark?`rgba(60,140,220,${0.12-w*0.03})`:`rgba(40,120,200,${0.10-w*0.025})`;
    ctx.lineWidth=1.5;
    ctx.beginPath();ctx.ellipse(cx,cy,waveR,waveRy,0,0,Math.PI*2);ctx.stroke();
  }

  // Sandy island shape
  ctx.beginPath();
  ctx.moveTo(179,77);
  ctx.bezierCurveTo(185,19,266,-5,337,5);
  ctx.bezierCurveTo(407,-5,489,25,494,71);
  ctx.bezierCurveTo(500,124,454,171,372,177);
  ctx.bezierCurveTo(290,183,196,159,175,124);
  ctx.bezierCurveTo(161,107,170,89,179,77);
  ctx.closePath();
  const sandGrad=ctx.createRadialGradient(cx,cy,20,cx,cy,150);
  sandGrad.addColorStop(0,isDark?'#5C4A2A':'#F5E6C8');
  sandGrad.addColorStop(0.7,isDark?'#4A3B1F':'#E8D5A8');
  sandGrad.addColorStop(1,isDark?'#3D3018':'#D4C090');
  ctx.fillStyle=sandGrad;ctx.fill();
  ctx.strokeStyle=isDark?'rgba(180,160,100,0.3)':'rgba(160,130,60,0.25)';
  ctx.lineWidth=1.5;ctx.stroke();

  // Beach edge
  ctx.beginPath();
  ctx.moveTo(182,83);
  ctx.bezierCurveTo(190,28,272,5,337,13);
  ctx.bezierCurveTo(401,5,483,31,489,75);
  ctx.strokeStyle=isDark?'rgba(120,100,60,0.25)':'rgba(180,155,90,0.35)';
  ctx.lineWidth=2;ctx.setLineDash([3,5]);ctx.stroke();ctx.setLineDash([]);

  // Palm trees
  drawPalmTree(196, 60, 0.9);
  drawPalmTree(465, 66, 1.0);
  drawPalmTree(383, 16, 0.6);

  // "Coming Soon" sign
  const signX=442,signY=31;
  ctx.save();ctx.translate(signX,signY);ctx.rotate(-0.08);
  ctx.fillStyle=isDark?'#6B5B3A':'#8B7355';
  ctx.fillRect(-2,-28,4,30);
  ctx.fillStyle=isDark?'#4A3B1F':'#D4B876';
  ctx.beginPath();ctx.roundRect(-32,-42,64,18,3);ctx.fill();
  ctx.strokeStyle=isDark?'#6B5B3A':'#8B7355';ctx.lineWidth=1;
  ctx.beginPath();ctx.roundRect(-32,-42,64,18,3);ctx.stroke();
  ctx.fillStyle=isDark?'#C4A86A':'#6B5030';
  ctx.font='bold 8px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('COMING SOON',0,-33);
  ctx.restore();

  // Message in a bottle
  const bottleX=489+Math.sin(frameCount.value*0.03)*4;
  const bottleY=148+Math.cos(frameCount.value*0.025)*2;
  ctx.save();ctx.translate(bottleX,bottleY);ctx.rotate(0.3+Math.sin(frameCount.value*0.02)*0.1);
  ctx.fillStyle=isDark?'rgba(100,180,120,0.5)':'rgba(120,200,140,0.6)';
  ctx.beginPath();ctx.ellipse(0,0,6,3,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=isDark?'rgba(80,160,100,0.7)':'rgba(80,160,100,0.5)';
  ctx.lineWidth=0.5;ctx.stroke();
  ctx.fillStyle=isDark?'#8B7355':'#C4A86A';
  ctx.fillRect(5,-2,3,4);
  ctx.fillStyle=isDark?'#D4C8A0':'#FFF8E8';
  ctx.fillRect(7,-1,4,2);
  ctx.restore();

  // DTC Sales Island sign
  const dtcSignX=cx,dtcSignY=cy+12;
  ctx.fillStyle=isDark?'#6B5B3A':'#8B7355';
  ctx.fillRect(dtcSignX-1,dtcSignY-2,2,18);
  ctx.fillStyle=isDark?'#4A3B1F':'#D4B876';
  ctx.beginPath();ctx.roundRect(dtcSignX-52,dtcSignY-18,104,20,3);ctx.fill();
  ctx.strokeStyle=isDark?'#6B5B3A':'#8B7355';ctx.lineWidth=1;
  ctx.beginPath();ctx.roundRect(dtcSignX-52,dtcSignY-18,104,20,3);ctx.stroke();
  ctx.fillStyle=isDark?'#C4A86A':'#6B5030';
  ctx.font='bold 9px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('DTC Sales Island',dtcSignX,dtcSignY-8);

  ctx.restore();
}

export function drawZones(){
  drawIsland();

  // Commercial Amazon Data zone
  ctx.fillStyle=cdtZoneBg;ctx.strokeStyle=cdtZoneBorder;ctx.lineWidth=1.5;ctx.setLineDash([8,6]);
  ctx.beginPath();ctx.roundRect(573,129,490,655,16);ctx.fill();ctx.stroke();ctx.setLineDash([]);

  // Amazon Only sign
  const asx=583, asy=137, asw=72, ash=22, asr=4;
  ctx.fillStyle=isDark?'#FF9900':'#FF9900';
  ctx.beginPath();ctx.roundRect(asx,asy,asw,ash,asr);ctx.fill();
  ctx.strokeStyle=isDark?'rgba(255,153,0,0.6)':'rgba(200,120,0,0.5)';
  ctx.lineWidth=1;
  ctx.beginPath();ctx.roundRect(asx,asy,asw,ash,asr);ctx.stroke();
  ctx.fillStyle='#232F3E';
  ctx.font='bold 9px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('amazon only',asx+asw/2,asy+ash/2);
  ctx.strokeStyle='#232F3E';ctx.lineWidth=1.2;ctx.lineCap='round';
  ctx.beginPath();
  ctx.moveTo(asx+asw/2-12,asy+ash-5);
  ctx.quadraticCurveTo(asx+asw/2,asy+ash+1,asx+asw/2+12,asy+ash-5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(asx+asw/2+9,asy+ash-7);
  ctx.lineTo(asx+asw/2+12,asy+ash-5);
  ctx.lineTo(asx+asw/2+9,asy+ash-3);
  ctx.stroke();
}
