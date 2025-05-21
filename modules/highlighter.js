// modules/highlighter.js

export function initHighlighter({
  canvas, ctx, toolbar, grid,
  onUpdate, onComplete, onPreview
}) {
  let drawing   = false;
  let startPos  = null;
  let points    = [];
  let color     = '#ffff00';
  let size      = 20;

  // 1) UI: przycisk + menu
  const btn = document.createElement('button');
  btn.textContent = 'Highlighter';
  btn.classList.add('tool');
  toolbar.appendChild(btn);

  const menu = document.createElement('div');
  menu.classList.add('highlighter-menu');
  menu.innerHTML = `
    <label>Kolor:   <input type="color"   value="${color}" id="hlColor"></label>
    <label>Grubość: <input type="range"  min="5" max="100" value="${size}" id="hlSize"></label>
  `;
  toolbar.appendChild(menu);

  btn.addEventListener('click', () => {
    menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
  });
  menu.querySelector('#hlColor')
      .addEventListener('input', e => color = e.target.value);
  menu.querySelector('#hlSize')
      .addEventListener('input', e => size  = +e.target.value);

  // 2) Helpers
  function toGrid(e) {
    return {
      x: (e.clientX - grid.originX) / grid.scale,
      y: (e.clientY - grid.originY) / grid.scale
    };
  }

  // 3) Mouse events – live‐highlight + ctrl‐straight‐line
  canvas.addEventListener('mousedown', e => {
    if (e.button !== 0 || menu.style.display !== 'flex') return;
    drawing  = true;
    startPos = toGrid(e);
    points   = [ startPos ];
    const stroke = { type:'highlighter', color, size, points:[...points] };
    onPreview(stroke);
    onUpdate(stroke);
  });

  canvas.addEventListener('mousemove', e => {
    const p = toGrid(e);
    if (!drawing) {
      // tylko pokaz kółko
      if (menu.style.display === 'flex') {
        onPreview({ type:'highlighter', color, size, points:[p,p] });
      }
      return;
    }
    if (e.ctrlKey) {
      // linia prosta od startPos do p
      points = [ startPos, p ];
    } else {
      points.push(p);
    }
    const stroke = { type:'highlighter', color, size, points:[...points] };
    onPreview(stroke);
    onUpdate(stroke);
  });

  function finish() {
    if (drawing) {
      drawing = false;
      onComplete({ type:'highlighter', color, size, points:[...points] });
    }
    onPreview(null);
  }
  canvas.addEventListener('mouseup',    finish);
  canvas.addEventListener('mouseleave', finish);
}
