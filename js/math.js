import { nodeMap, curveOverrides, mergePoint } from './config.js';

export function getRoadCurve(a,b){
  const src=nodeMap[a],dst=nodeMap[b];
  const sx=src.cx,sy=src.cy,dx=dst.cx,dy=dst.cy;
  const key=a+'→'+b;
  const ovr=curveOverrides[key]||curveOverrides[b+'→'+a];
  if(ovr) return{sx,sy,dx,dy,cx:ovr.cx,cy:ovr.cy};
  const mx=(sx+dx)/2,my=(sy+dy)/2;
  const off=10*Math.sin(Math.atan2(dy-sy,dx-sx)+Math.PI/2);
  return{sx,sy,dx,dy,cx:mx+off,cy:my+off};
}

export function getPosAngle(road,t){
  const c=getRoadCurve(road[0],road[1]);
  const x=(1-t)*(1-t)*c.sx+2*(1-t)*t*c.cx+t*t*c.dx;
  const y=(1-t)*(1-t)*c.sy+2*(1-t)*t*c.cy+t*t*c.dy;
  const ttx=2*(1-t)*(c.cx-c.sx)+2*t*(c.dx-c.cx);
  const tty=2*(1-t)*(c.cy-c.sy)+2*t*(c.dy-c.cy);
  return{x,y,angle:Math.atan2(tty,ttx)};
}

export function getMergeXYForRoad(src,dst,mp_t){
  const t=mp_t||mergePoint;
  const c=getRoadCurve(src,dst);
  return {
    x:(1-t)*(1-t)*c.sx+2*(1-t)*t*c.cx+t*t*c.dx,
    y:(1-t)*(1-t)*c.sy+2*(1-t)*t*c.cy+t*t*c.dy
  };
}

export function getCanalLen(pts){
  let d=0;
  for(let i=1;i<pts.length;i++){
    const dx=pts[i].x-pts[i-1].x,dy=pts[i].y-pts[i-1].y;
    d+=Math.sqrt(dx*dx+dy*dy);
  }
  return d;
}

export function getCanalPos(pts,t){
  const totalLen=getCanalLen(pts);
  let target=t*totalLen, acc=0;
  for(let i=1;i<pts.length;i++){
    const dx=pts[i].x-pts[i-1].x,dy=pts[i].y-pts[i-1].y;
    const segLen=Math.sqrt(dx*dx+dy*dy);
    if(acc+segLen>=target){const st=(target-acc)/segLen;return{x:pts[i-1].x+dx*st,y:pts[i-1].y+dy*st,angle:Math.atan2(dy,dx)};}
    acc+=segLen;
  }
  const last=pts[pts.length-1],prev=pts[pts.length-2];
  return{x:last.x,y:last.y,angle:Math.atan2(last.y-prev.y,last.x-prev.x)};
}
