// Rysowanie kształtów w canvas
function startShape(type, sx, sy) {
    objectStart = { x: sx, y: sy, type };
  }
  function endShape(ex, ey) {
    if (!objectStart) return;
    const { x: sx, y: sy, type } = objectStart;
    const x = Math.min(sx, ex), y = Math.min(sy, ey);
    const w = Math.abs(ex - sx), h = Math.abs(ey - sy);
    pushState();
    createDescriptor({ type, x, y, w, h, rotation: 0 });
    objectStart = null;
  }
 
  