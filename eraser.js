// Podział ścieżki na segmenty po częściowej gumce
function splitPath(points, w, r) {
    const segments = [];
    let cur = [];
    for (let p of points) {
      if (Math.hypot(p.x - w.x, p.y - w.y) > r) {
        cur.push(p);
      } else {
        if (cur.length > 1) segments.push(cur);
        cur = [];
      }
    }
    if (cur.length > 1) segments.push(cur);
    return segments;
  }
  
  // Zastosowanie gumki
  function applyEraser(x, y) {
      const w = screenToWorld(x, y);
      const r = parseInt(eraserSizeInput.value) / scale;
      const mode   = eraserModeSelect.value;
      const target = eraserTargetSelect.value;
      const newPaths = [];
      paths.forEach(obj => {
        if (target !== 'both' && obj.type !== target) {
          newPaths.push(obj);
        } else if (mode === 'whole') {
          if (!obj.points.some(p => Math.hypot(p.x - w.x, p.y - w.y) <= r)) {
            newPaths.push(obj);
          }
        } else {
          const segs = splitPath(obj.points, w, r);
          segs.forEach(seg => newPaths.push({ type: obj.type, size: obj.size, points: seg }));
        }
      });
      paths = newPaths;
      draw();
    }
  