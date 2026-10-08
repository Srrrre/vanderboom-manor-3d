/** 简化方位图只显示空间关系，不把未经证实的布局标为官方地图。 */
export function drawMinimap(canvas: HTMLCanvasElement, x: number, z: number, yaw: number, floor?: number) {
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  if(floor !== undefined){
    ctx.clearRect(0,0,180,140);ctx.save();ctx.translate(61,68);ctx.scale(9,9);
    ctx.fillStyle='#bdc3a72a';ctx.strokeStyle='#c8ceb9';ctx.lineWidth=.07;
    const rect=(a:number,b:number,w:number,d:number)=>{ctx.fillRect(a,b,w,d);ctx.strokeRect(a,b,w,d);};
    if(floor>3.5){rect(-5.16,-3.56,1.36,7.32);rect(-3.62,-.45,5.48,4.21);}
    else{rect(-5.16,.55,3.66,3.21);rect(-1.5,.55,3.36,3.21);rect(-5.16,-3.56,7.02,4.11);rect(2.1,-.2,3.3,4.2);rect(5.52,-2.56,4.84,6.32);}
    ctx.strokeStyle='#debd85';
    for(let i=0;i<20;i++){const sx=-3.8+i*5.35/20;ctx.beginPath();ctx.moveTo(sx,-3.5);ctx.lineTo(sx,-2.15);ctx.stroke();}
    ctx.translate(x,z);ctx.rotate(-yaw);ctx.fillStyle='#f8e2a4';ctx.beginPath();ctx.moveTo(0,-.5);ctx.lineTo(-.27,.3);ctx.lineTo(.27,.3);ctx.closePath();ctx.fill();ctx.restore();return;
  }
  const scale = 0.8, ox = 96, oy = 66;
  ctx.clearRect(0, 0, 180, 140);
  ctx.strokeStyle = '#9eae9730'; ctx.lineWidth = 0.5;
  for (let i = 6; i < 180; i += 20) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 140); ctx.stroke(); }
  for (let i = 6; i < 140; i += 20) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(180, i); ctx.stroke(); }
  ctx.save(); ctx.translate(ox, oy); ctx.scale(scale, scale);
  ctx.fillStyle = '#8eb0b457'; ctx.beginPath(); ctx.ellipse(-48, -38, 32, 21, -0.1, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c7bb9966'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(0, 8); ctx.bezierCurveTo(0, 25, 20, 32, 10, 64); ctx.stroke();
  ctx.fillStyle = '#e0d6ba'; ctx.fillRect(-5.4, -3.8, 10.8, 7.8); ctx.fillRect(5.4, -2.8, 5.2, 6.8);
  ctx.fillStyle = '#b3c2a94d';
  for (let i = 0; i < 20; i++) { const tx = -80 + i * 8; const tz = -62 + Math.sin(i * 2.4) * 9; ctx.beginPath(); ctx.arc(tx, tz, 2, 0, Math.PI * 2); ctx.fill(); }
  ctx.translate(x, z); ctx.rotate(-yaw); ctx.fillStyle = '#ede2ae';
  ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(-3.4, 4.5); ctx.lineTo(0, 2.5); ctx.lineTo(3.4, 4.5); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#d8dbb34d'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}
