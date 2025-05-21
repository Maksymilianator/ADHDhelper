// modules/textEditor.js

export function initTextEditor({
  canvas,
  toolbar,
  grid,
  getShapes,
  setShapes,
  onUpdate,
  getSelectedIndex,
}) {
  let editingIndex = null;
  let mode = null;       // 'resize' | 'rotate' | null
  let handle = null;     // 'nw','ne','se','sw','rotate'
  let startPos = null;
  let originalShape = null;

  // 1) Contextual attribute menu
  const menu = document.createElement('div');
  menu.id = 'textAttrMenu';
  menu.style.position = 'absolute';
  menu.style.display  = 'none';
  menu.innerHTML = `
    <label><input type="checkbox" id="attrBgVis"> Background</label>
    <label>Bg color: <input type="color" id="attrBgColor"></label>
    <label>Bg opacity: <input type="range" id="attrBgOpacity" min="0" max="1" step="0.05"></label>
    <label><input type="checkbox" id="attrBorderVis"> Border</label>
    <label>Border color: <input type="color" id="attrBorderColor"></label>
    <label>Border width: <input type="number" id="attrBorderWidth" min="1" max="10"></label>
  `;
  toolbar.parentElement.appendChild(menu);

  function openEditor(i) {
    editingIndex = i;
    const shape = getShapes()[i];
    if (shape.type !== 'text') return closeEditor();
    originalShape = { ...shape };
    // position menu to the top-right of the text box
    const px = shape.x * grid.scale + grid.originX + shape.width * grid.scale + 10;
    const py = shape.y * grid.scale + grid.originY;
    menu.style.left = `${px}px`;
    menu.style.top  = `${py}px`;
    // populate inputs
    menu.querySelector('#attrBgVis').checked    = !!shape.backgroundVisible;
    menu.querySelector('#attrBgColor').value     = shape.backgroundColor || '#ffffff';
    menu.querySelector('#attrBgOpacity').value   = shape.backgroundOpacity ?? 1;
    menu.querySelector('#attrBorderVis').checked = !!shape.borderVisible;
    menu.querySelector('#attrBorderColor').value = shape.borderColor || '#000000';
    menu.querySelector('#attrBorderWidth').value = shape.borderWidth ?? 1;
    menu.style.display = 'block';
  }

  function closeEditor() {
    menu.style.display = 'none';
    editingIndex = null;
    mode = null;
    handle = null;
    startPos = null;
    originalShape = null;
    onUpdate();
  }

  // 2) Attribute change handlers
  ['attrBgVis','attrBgColor','attrBgOpacity','attrBorderVis','attrBorderColor','attrBorderWidth']
    .forEach(id => {
      menu.querySelector('#'+id).addEventListener('input', () => {
        if (editingIndex === null) return;
        const shapes = getShapes();
        const s = { ...shapes[editingIndex] };
        s.backgroundVisible = menu.querySelector('#attrBgVis').checked;
        s.backgroundColor   = menu.querySelector('#attrBgColor').value;
        s.backgroundOpacity = parseFloat(menu.querySelector('#attrBgOpacity').value);
        s.borderVisible     = menu.querySelector('#attrBorderVis').checked;
        s.borderColor       = menu.querySelector('#attrBorderColor').value;
        s.borderWidth       = parseInt(menu.querySelector('#attrBorderWidth').value, 10);
        const ns = [...shapes];
        ns[editingIndex] = s;
        setShapes(ns);
        onUpdate();
      });
    });

  // 3) Resize/rotate handles mousedown
  canvas.addEventListener('mousedown', e => {
    const idx = getSelectedIndex();
    if (idx === null) return;
    const shape = getShapes()[idx];
    if (shape.type !== 'text') return;
    const p = { x: (e.clientX - grid.originX) / grid.scale, y: (e.clientY - grid.originY) / grid.scale };
    const hs = 6 / grid.scale;
    const corners = {
      nw: [shape.x, shape.y],
      ne: [shape.x + shape.width, shape.y],
      sw: [shape.x, shape.y + shape.height],
      se: [shape.x + shape.width, shape.y + shape.height]
    };
    for (let h in corners) {
      const [cx, cy] = corners[h];
      if (Math.hypot(p.x - cx, p.y - cy) <= hs) {
        mode = 'resize'; handle = h; startPos = p; originalShape = { ...shape }; editingIndex = idx;
        return;
      }
    }
    // rotate handle above top-center
    const rx = shape.x + shape.width / 2;
    const ry = shape.y - 20 / grid.scale;
    if (Math.hypot(p.x - rx, p.y - ry) <= hs) {
      mode = 'rotate'; handle = 'rotate'; startPos = p; originalShape = { ...shape }; editingIndex = idx;
      return;
    }
  });

  // 4) Resize/rotate mousemove
  canvas.addEventListener('mousemove', e => {
    if (!mode) return;
    const p = { x: (e.clientX - grid.originX) / grid.scale, y: (e.clientY - grid.originY) / grid.scale };
    const shapes = getShapes();
    const s = { ...originalShape };
    const idx = editingIndex;
    if (mode === 'resize') {
      const dx = p.x - startPos.x;
      const dy = p.y - startPos.y;
      if (handle === 'se') {
        s.width = Math.max(10 / grid.scale, originalShape.width + dx);
        s.height = Math.max(10 / grid.scale, originalShape.height + dy);
      }
      // TODO: implement other corners if needed
    } else if (mode === 'rotate') {
      const cx = originalShape.x + originalShape.width / 2;
      const cy = originalShape.y + originalShape.height / 2;
      s.rotation = Math.atan2(p.y - cy, p.x - cx);
    }
    const ns = [...shapes];
    ns[idx] = s;
    setShapes(ns);
    onUpdate();
  });

  // 5) End transform on mouseup/leave
  function finish() {
    mode = null;
    handle = null;
    startPos = null;
    originalShape = null;
  }
  canvas.addEventListener('mouseup', finish);
  canvas.addEventListener('mouseleave', finish);

  // 6) Close editor when selecting other tools (except Text)
  toolbar.addEventListener('click', e => {
    if (!e.target.matches('button.tool')) return;
    if (e.target.textContent !== 'Text') closeEditor();
  });

  return { openEditor, closeEditor };
}
