// modules/selector.js

export function initSelector({
  canvas, ctx, toolbar, grid,
  getShapes, onSelect, onDrag
}) {
  let isActive = false;
  let selectedTypes = new Set(['pen', 'highlighter', 'text']);
  let selectedIndices = new Set();

  // Drag selection state
  let dragStart = null;
  let dragging = false;

  // 1) UI: button + type menu
  const btn = document.createElement('button');
  btn.textContent = 'Select';
  btn.classList.add('tool');
  toolbar.appendChild(btn);

  const menu = document.createElement('div');
  menu.classList.add('selector-menu');
  menu.style.display = 'none';
  menu.innerHTML = `
    <label><input type="checkbox" name="selType" value="pen" checked>Pen</label>
    <label><input type="checkbox" name="selType" value="highlighter" checked>Highlighter</label>
    <label><input type="checkbox" name="selType" value="text" checked>Text</label>
  `;
  toolbar.appendChild(menu);

  btn.addEventListener('click', () => {
    isActive = !isActive;
    btn.classList.toggle('active', isActive);
    menu.style.display = isActive ? 'flex' : 'none';
    if (!isActive) {
      selectedIndices.clear();
      onSelect(new Set());
      if (onDrag) onDrag(null);
    }
  });

  menu.querySelectorAll('input[name="selType"]').forEach(cb => {
    cb.addEventListener('change', e => {
      if (e.target.checked) selectedTypes.add(e.target.value);
      else selectedTypes.delete(e.target.value);
    });
  });

  // deactivate selector when switching to other tools
  toolbar.addEventListener('click', e => {
    if (!e.target.matches('button.tool')) return;
    if (e.target !== btn) {
      isActive = false;
      btn.classList.remove('active');
      menu.style.display = 'none';
      selectedIndices.clear();
      onSelect(new Set());
      if (onDrag) onDrag(null);
    }
  });
  

  // Helper to convert mouse event to grid coordinates
  function toGrid(e) {
    return {
      x: (e.clientX - grid.originX) / grid.scale,
      y: (e.clientY - grid.originY) / grid.scale
    };
  }

  function rectsIntersect(r1, r2) {
    return !(r2.x1 > r1.x2 || r2.x2 < r1.x1 || r2.y1 > r1.y2 || r2.y2 < r1.y1);
  }

  // 2) Drag selection
  canvas.addEventListener('mousedown', e => {
    if (!isActive || e.button !== 0 || menu.style.display !== 'flex') return;
    dragStart = toGrid(e);
    dragging = false;
    if (onDrag) onDrag(null);
  });

  canvas.addEventListener('mousemove', e => {
    if (!isActive || dragStart === null) return;
    dragging = true;
    const p = toGrid(e);
    const rect = {
      x1: Math.min(dragStart.x, p.x),
      y1: Math.min(dragStart.y, p.y),
      x2: Math.max(dragStart.x, p.x),
      y2: Math.max(dragStart.y, p.y)
    };
    if (onDrag) onDrag(rect);
  });

  // 3) Mouseup: handle both drag and click selection
  canvas.addEventListener('mouseup', e => {
    if (!isActive || e.button !== 0) return;
    const p = toGrid(e);
    const shapesArr = getShapes();
    const sel = new Set();
    if (dragging) {
      // Rectangle selection
      const rect = {
        x1: Math.min(dragStart.x, p.x),
        y1: Math.min(dragStart.y, p.y),
        x2: Math.max(dragStart.x, p.x),
        y2: Math.max(dragStart.y, p.y)
      };
      shapesArr.forEach((shape, i) => {
        if (!selectedTypes.has(shape.type)) return;
        let box;
        if (shape.type === 'text') {
          box = {
            x1: shape.x,
            y1: shape.y,
            x2: shape.x + shape.width,
            y2: shape.y + shape.height
          };
        } else if (Array.isArray(shape.points)) {
          const xs = shape.points.map(pt => pt.x);
          const ys = shape.points.map(pt => pt.y);
          box = {
            x1: Math.min(...xs),
            y1: Math.min(...ys),
            x2: Math.max(...xs),
            y2: Math.max(...ys)
          };
        } else return;
        if (rectsIntersect(rect, box)) sel.add(i);
      });
    } else {
      // Click selection
      shapesArr.forEach((shape, i) => {
        if (!selectedTypes.has(shape.type)) return;
        if (shape.type === 'text') {
          if (
            p.x >= shape.x &&
            p.x <= shape.x + shape.width &&
            p.y >= shape.y &&
            p.y <= shape.y + shape.height
          ) sel.add(i);
        } else if (Array.isArray(shape.points)) {
          for (let j = 0; j < shape.points.length - 1; j++) {
            const v = shape.points[j], w = shape.points[j + 1];
            const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
            let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
            t = Math.max(0, Math.min(1, t));
            const ix = v.x + t * (w.x - v.x);
            const iy = v.y + t * (w.y - v.y);
            const dist = Math.hypot(p.x - ix, p.y - iy);
            if (dist <= 5 / grid.scale) {
              sel.add(i);
              break;
            }
          }
        }
      });
    }

    selectedIndices = sel;
    onSelect(sel);
    if (onDrag) onDrag(null);
    dragging = false;
    dragStart = null;
  });

  // 4) Cancel on leave
  canvas.addEventListener('mouseleave', () => {
    if (!isActive) return;
    if (dragging) {
      dragging = false;
      dragStart = null;
      if (onDrag) onDrag(null);
    }
  });

  return {
    getSelected: () => new Set(selectedIndices)
  };
}
