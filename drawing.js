// Tło (czyste/grid/kropki)
const gridSize = 20;
function drawBackground() {
  if (bgSelect.value === 'grid') {
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth   = 1 / scale;
    const sx = -translateX / scale, sy = -translateY / scale;
    const ex = sx + width / scale,    ey = sy + height / scale;
    for (let x = Math.floor(sx / gridSize) * gridSize; x < ex; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, sy); ctx.lineTo(x, ey); ctx.stroke();
    }
    for (let y = Math.floor(sy / gridSize) * gridSize; y < ey; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(ex, y); ctx.stroke();
    }
  } else if (bgSelect.value === 'dots') {
    if (dotPatternGrid !== gridSize) {
      const pc = document.createElement('canvas'); pc.width = gridSize; pc.height = gridSize;
      const pct = pc.getContext('2d');
      pct.fillStyle = '#ccc'; pct.beginPath();
      pct.arc(gridSize/2, gridSize/2, 1, 0, Math.PI*2); pct.fill();
      dotPattern     = ctx.createPattern(pc, 'repeat');
      dotPatternGrid = gridSize;
    }
    ctx.fillStyle = dotPattern;
    const sx = -translateX / scale, sy = -translateY / scale;
    ctx.fillRect(sx, sy, width / scale, height / scale);
  }
}

// Rysowanie ścieżek (pen/highlighter)
function drawPaths() {
  paths.forEach(obj => {
    ctx.beginPath();
    ctx.lineCap   = 'round';
    ctx.lineJoin  = 'round';
    ctx.lineWidth = obj.size / scale;
    ctx.strokeStyle = obj.type === 'highlighter'
      ? 'rgba(255,255,0,0.5)'
      : 'black';
    obj.points.forEach((p, i) =>
      i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)
    );
    ctx.stroke();
  });
}

// Główna pętla rysowania
function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.setTransform(scale, 0, 0, scale, translateX, translateY);
  drawBackground();
  drawPaths();
}
