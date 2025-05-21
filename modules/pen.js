// modules/pen.js

export function initPen({
  canvas, ctx, toolbar, grid,
  onUpdate, onComplete, onPreview
}) {
  let drawing = false;
  let mode    = 'pen';   // 'pen' lub 'brush'
  let color   = '#000000';
  let size    = 4;       // bazowa grubość pióra
  let pts     = [];      // {x,y,timestamp}

  // —— UI ————————————————————————————————————————————————————————————
  const btn = document.createElement('button');
  btn.textContent = 'Pen';
  btn.classList.add('tool');
  toolbar.appendChild(btn);

  const menu = document.createElement('div');
  menu.classList.add('pen-menu');
  menu.innerHTML = `
    <label>
      Narzędzie:
      <select id="penToolType">
        <option value="pen">Pen</option>
        <option value="brush">Brush</option>
      </select>
    </label>
    <label>Kolor: <input type="color" value="${color}" id="penColor"></label>
    <label>Rozmiar bazowy: <input type="range" min="1" max="30" value="${size}" id="penSize"></label>
  `;
  toolbar.appendChild(menu);

  btn.addEventListener('click', () => {
    menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
  });

  menu.querySelector('#penToolType').addEventListener('change', e => {
    mode = e.target.value;
  });
  menu.querySelector('#penColor').addEventListener('input', e => {
    color = e.target.value;
  });
  menu.querySelector('#penSize').addEventListener('input', e => {
    size = +e.target.value;
  });
  // ————————————————————————————————————————————————————————————————

  function toGrid(e) {
    return {
      x: (e.clientX - grid.originX) / grid.scale,
      y: (e.clientY - grid.originY) / grid.scale,
      t: performance.now()
    };
  }

  function strokePath(points, col, sz) {
    if (points.length < 2) return;
    ctx.save();
    ctx.strokeStyle = col;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      const p0 = points[i-1];
      const p1 = points[i];
      let w = sz;

      if (mode === 'brush') {
        // prędkość: odległość / czas
        const dt = (p1.t - p0.t) / 1000; // w sekundach
        const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
        const speed = dist / (dt || 0.001);
        // im szybszy ruch, tym cieńsza linia (min 1px) 
        w = Math.max(1, sz * Math.max(0.1, Math.min(1, 1 - speed / 1000)));
        // jitter:
        const jitter = w * 0.3;
        p1.x += (Math.random() - 0.5) * jitter;
        p1.y += (Math.random() - 0.5) * jitter;
      }

      ctx.lineWidth = w / grid.scale;
      ctx.lineTo(p1.x, p1.y);
    }

    ctx.stroke();
    ctx.restore();
  }

  // — EVENTS —————————————————————————————————————————————————————————
  canvas.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    if (menu.style.display !== 'flex') return;
    drawing = true;
    pts = [ toGrid(e) ];
    onPreview({ type: mode, color, size, points: pts.map(p=>({x:p.x,y:p.y})) });
    onUpdate({ type: mode, color, size, points: pts.map(p=>({x:p.x,y:p.y})) });
  });

  canvas.addEventListener('mousemove', e => {
    const p = toGrid(e);
    if (!drawing) {
      // tylko podgląd kółka
      if (menu.style.display === 'flex') {
        onPreview({ type: mode, color, size, points: [ {x:p.x,y:p.y}, {x:p.x,y:p.y} ] });
      }
      return;
    }
    if (mode === 'pen' && e.ctrlKey) {
    pts = [pts[0], p];
    } else {
     pts.push(p);
    }
    pts.push(p);
    const stroke = {
      type:  mode,
      color: color,
      size:  size,
      points: pts.map(pp=>({ x:pp.x, y:pp.y }))
    };
    onPreview(stroke);
    onUpdate(stroke);
  });

  function finish() {
    if (drawing) {
      drawing = false;
      onComplete({
        type:  mode,
        color: color,
        size:  size,
        points: pts.map(pp=>({ x:pp.x, y:pp.y }))
      });
    }
    onPreview(null);
  }

  canvas.addEventListener('mouseup',    finish);
  canvas.addEventListener('mouseleave', finish);
}
