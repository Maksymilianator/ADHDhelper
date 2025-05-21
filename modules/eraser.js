// modules/eraser.js

export function initEraser({
  canvas, toolbar, grid,
  getShapes, setShapes,
  onUpdate, onPreview
}) {
  let size = 20;
  let mode = 'fragment';    // ← domyślnie fragment
    let targetTools = new Set(['pen','brush','highlighter']);
  let erasing = false;

  // 1) UI: przycisk + menu
  const btn = document.createElement('button');
  btn.textContent = 'Eraser';
  btn.classList.add('tool');
  toolbar.appendChild(btn);

  const menu = document.createElement('div');
  menu.classList.add('eraser-menu');
  menu.innerHTML = `
    <label>Wielkość: <input type="range" min="5" max="100" value="${size}" id="eraserSize"></label>
    <label>Tryb:</label>
    <label><input type="radio" name="eraseMode" value="whole">Cały obiekt</label>
    <label><input type="radio" name="eraseMode" value="fragment" checked>Fragment</label>
    <label>Typ narzędzia:</label>
      <label>Typ narzędzia (można zaznaczyć wiele):</label>
    <label><input type="checkbox" name="eraseTool" value="pen" checked>Pen</label>
     <label><input type="checkbox" name="eraseTool" value="brush" checked>Brush</label>
    <label><input type="checkbox" name="eraseTool" value="highlighter" checked>Highlighter</label>
  `;
  toolbar.appendChild(menu);

  btn.addEventListener('click', () => {
    menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
  });

    // wielkość gumki
    menu.querySelector('#eraserSize')
    .addEventListener('input', e => size = +e.target.value);

    // tryb usuwania (cały obiekt vs fragment)
    menu.querySelectorAll('input[name="eraseMode"]').forEach(r =>
     r.addEventListener('change', e => mode = e.target.value)
    );
    // teraz checkboxy narzędzi
    menu.querySelectorAll('input[name="eraseTool"]').forEach(cb => {
    cb.addEventListener('change', e => {
        if (e.target.checked) targetTools.add(e.target.value);
        else                   targetTools.delete(e.target.value);
        });
    });

  // 2) Helpers
  function toGrid(e) {
    return {
      x: (e.clientX - grid.originX) / grid.scale,
      y: (e.clientY - grid.originY) / grid.scale
    };
  }
  function dist(p, q) {
    return Math.hypot(p.x - q.x, p.y - q.y);
  }

  // 3) Erase logic for a single point
  function performErasePoint(ept) {
    const old = getShapes();
    let result = [];
    const r = size / grid.scale;

    old.forEach(shape => {
        if (!targetTools.has(shape.type)) {
         result.push(shape);
         return;
        }
      if (mode === 'whole') {
        const hit = shape.points.some(pt => dist(ept, pt) <= r);
        if (!hit) result.push(shape);
      } else {
        const pts = shape.points;
        let curr = [];
        for (let i = 0; i < pts.length - 1; i++) {
          const v = pts[i], w = pts[i + 1];
          const dx = w.x - v.x, dy = w.y - v.y;
          const fx = v.x - ept.x, fy = v.y - ept.y;
          const a = dx*dx + dy*dy;
          const b = 2*(fx*dx + fy*dy);
          const c = fx*fx + fy*fy - r*r;
          const disc = b*b - 4*a*c;

          if (disc < 0) {
            const outsideV = dist(v, ept) > r;
            const outsideW = dist(w, ept) > r;
            if (outsideV && outsideW) {
              if (curr.length === 0) curr.push(v);
              curr.push(w);
            } else {
              if (curr.length >= 2) result.push({ ...shape, points: curr });
              curr = [];
            }
          } else {
            const sqrtD = Math.sqrt(disc);
            let t1 = (-b - sqrtD) / (2*a);
            let t2 = (-b + sqrtD) / (2*a);
            const ts = [t1, t2].filter(t => t >= 0 && t <= 1).sort((u,v)=>u-v);

            if (ts.length === 2) {
              const p1 = { x: v.x + ts[0]*dx, y: v.y + ts[0]*dy };
              const p2 = { x: v.x + ts[1]*dx, y: v.y + ts[1]*dy };
              if (curr.length === 0) curr.push(v);
              curr.push(p1);
              if (curr.length >= 2) result.push({ ...shape, points: curr });
              curr = [p2, w];
            } else if (ts.length === 1) {
              const p = { x: v.x + ts[0]*dx, y: v.y + ts[0]*dy };
              const outsideV = dist(v, ept) > r;
              if (outsideV) {
                if (curr.length === 0) curr.push(v);
                curr.push(p);
                if (curr.length >= 2) result.push({ ...shape, points: curr });
                curr = [];
              } else {
                curr = [p, w];
              }
            } else {
              const outsideV = dist(v, ept) > r;
              const outsideW = dist(w, ept) > r;
              if (outsideV && outsideW) {
                if (curr.length === 0) curr.push(v);
                curr.push(w);
              } else {
                if (curr.length >= 2) result.push({ ...shape, points: curr });
                curr = [];
              }
            }
          }
        }
        if (curr.length >= 2) result.push({ ...shape, points: curr });
      }
    });

    // zachowaj każdy obiekt bez .points (np. tekst), a te z .points filtruj wg długości
    result = result.filter(s =>
    !Array.isArray(s.points) || s.points.length >= 2
  );
    setShapes(result);
  }

  // 4) Mouse events with live preview
  canvas.addEventListener('mousedown', e => {
    if (e.button !== 0 || menu.style.display !== 'flex') return;
    erasing = true;
    const p = toGrid(e);
    onPreview(p, size);
    performErasePoint(p);
    onUpdate();
  });
  canvas.addEventListener('mousemove', e => {
    if (!erasing) return;
    const p = toGrid(e);
    onPreview(p, size);
    performErasePoint(p);
    onUpdate();
  });
  function finish() {
    if (!erasing) return;
    erasing = false;
    onPreview(null);
    onUpdate();
  }
  canvas.addEventListener('mouseup', finish);
  canvas.addEventListener('mouseleave', finish);
}
