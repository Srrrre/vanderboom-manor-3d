/** 简化方位图只显示空间关系，不把未经证实的布局标为官方地图。 */
export function drawMinimap(canvas: HTMLCanvasElement, x: number, z: number, yaw: number) {
  const ctx = canvas.getContext('2d'); if (!ctx) return;
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
  ctx.translate(x, z); ctx.rotate(yaw); ctx.fillStyle = '#ede2ae';
  ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(-3.4, 4.5); ctx.lineTo(0, 2.5); ctx.lineTo(3.4, 4.5); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#d8dbb34d'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}
