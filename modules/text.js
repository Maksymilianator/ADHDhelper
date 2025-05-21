// modules/text.js

export function initText({
  canvas,
  textLayer,
  toolbar,
  grid,
  getShapes,
  setShapes,
  onUpdate,
  onComplete,
  onDragRect
}) {
  let active = false;
  let dragStart = null;
  let dragging = false;
  let region = null;
  let currentInput = null;

  let fontSize   = 16;
  let fontFamily = 'Arial';
  let color      = '#000000';
  let inputType  = 'text';      // 'text' or 'checkbox'
  let textAlign  = 'left';      // 'left' | 'center' | 'right'
  let textVAlign = 'top';       // 'top' | 'middle' | 'bottom'

  // 1) UI: przycisk + menu
  const btn = document.createElement('button');
  btn.textContent = 'Text';
  btn.classList.add('tool');
  toolbar.appendChild(btn);

  const menu = document.createElement('div');
  menu.classList.add('text-menu');
  menu.style.display = 'none';
  menu.innerHTML = `
<label>Typ:
  <select id="textType">
    <option value="text">Text</option>
    <option value="checkbox">Checkbox</option>
  </select>
</label>
<label>Kolor tekstu: <input type="color" id="textColor" value="${color}"></label>
<label>Font size: <input type="number" id="textSize" value="${fontSize}" min="8" max="72"></label>
<label>Font family:
  <select id="textFamily">
    <option>Arial</option>
    <option>Helvetica</option>
    <option>Times New Roman</option>
    <option>Courier New</option>
  </select>
</label>
<label>Font weight:
  <select id="textWeight">
    <option value="normal">Normal</option>
    <option value="bold">Bold</option>
    <option value="bolder">Bolder</option>
  </select>
</label>
<label>Horiz. align:
  <select id="textAlign">
    <option value="left">Left</option>
    <option value="center">Center</option>
    <option value="right">Right</option>
  </select>
</label>
<label>Vert. align:
  <select id="textVAlign">
    <option value="top">Top</option>
    <option value="middle">Middle</option>
    <option value="bottom">Bottom</option>
  </select>
</label>
  `;
  toolbar.appendChild(menu);

  // toggle menu
  btn.addEventListener('click', () => {
    active = !active;
    btn.classList.toggle('active', active);
    menu.style.display = active ? 'flex' : 'none';
    if (!active && currentInput) finishEditing();
  });

  // menu listeners
  menu.querySelector('#textType').addEventListener('change', e => inputType = e.target.value);
  menu.querySelector('#textColor').addEventListener('input', e => color = e.target.value);
  menu.querySelector('#textSize').addEventListener('input', e => fontSize = +e.target.value);
  menu.querySelector('#textFamily').addEventListener('input', e => fontFamily = e.target.value);
  menu.querySelector('#textWeight').addEventListener('change', e => {}); // możesz użyć później
  menu.querySelector('#textAlign').addEventListener('change', e => textAlign  = e.target.value);
  menu.querySelector('#textVAlign').addEventListener('change', e => textVAlign = e.target.value);

  function toGrid(e) {
    return {
      x: (e.clientX - grid.originX) / grid.scale,
      y: (e.clientY - grid.originY) / grid.scale
    };
  }

  function finishEditing() {
    if (!currentInput || !region) return;
    const value = currentInput.textContent;
    onComplete({
      type:      inputType,
      x:         region.x1,
      y:         region.y1,
      width:     region.x2 - region.x1,
      height:    region.y2 - region.y1,
      fontSize,
      fontFamily,
      color,
      align:     textAlign,
      valign:    textVAlign,
      value
    });
    textLayer.classList.remove('editing');
    textLayer.removeChild(currentInput);
    currentInput = null;
    region = null;
    if (onDragRect) onDragRect(null);
    onUpdate();
  }

  // obsługa drag do regionu
  canvas.addEventListener('mousedown', e => {
    if (!active || currentInput || e.button !== 0) return;
    dragStart = toGrid(e);
    dragging = false;
    region = null;
    if (onDragRect) onDragRect(null);
  });
  canvas.addEventListener('mousemove', e => {
    if (!active || currentInput || !dragStart) return;
    const p = toGrid(e);
    dragging = true;
    region = {
      x1: Math.min(dragStart.x, p.x),
      y1: Math.min(dragStart.y, p.y),
      x2: Math.max(dragStart.x, p.x),
      y2: Math.max(dragStart.y, p.y)
    };
    if (onDragRect) onDragRect(region);
  });
  canvas.addEventListener('mouseup', e => {
    if (!active || e.button !== 0 || !dragStart) return;
    if (!dragging) {
      // pojedynczy klik: małe pole
      const def = fontSize / grid.scale * 5;
      const p = toGrid(e);
      region = { x1: p.x, y1: p.y, x2: p.x + def, y2: p.y + def };
      if (onDragRect) onDragRect(region);
    }
    // wstaw input do regionu
    currentInput = document.createElement('div');
    currentInput.contentEditable = true;
    currentInput.textContent = '';
    currentInput.style.position = 'absolute';
    currentInput.style.left     = `${region.x1 * grid.scale + grid.originX}px`;
    currentInput.style.top      = `${region.y1 * grid.scale + grid.originY}px`;
    currentInput.style.width    = `${(region.x2 - region.x1) * grid.scale}px`;
    currentInput.style.height   = `${(region.y2 - region.y1) * grid.scale}px`;
    currentInput.style.fontSize = `${fontSize}px`;
    currentInput.style.fontFamily = fontFamily;
    currentInput.style.color = color;
     // ---- live horizontal + vertical align ----
   // poziome wyrównanie
   currentInput.style.textAlign = textAlign;
   // pionowe wyrównanie przez flexbox
   currentInput.style.display       = 'flex';
   currentInput.style.flexDirection = 'column';
   switch(textVAlign) {
     case 'middle':
       currentInput.style.justifyContent = 'center';
       break;
       case 'bottom':
       currentInput.style.justifyContent = 'flex-end';
       break;
     default:
       currentInput.style.justifyContent = 'flex-start';
   }
   
    currentInput.style.textAlign = textAlign;
    currentInput.style.verticalAlign = textVAlign;
    textLayer.classList.add('editing');
    textLayer.appendChild(currentInput);
    currentInput.focus();
    // czyść stan
    dragStart = null;
    dragging = false;
  });

  // commit on blur/Enter
  textLayer.addEventListener('blur', e => {
    if (currentInput && !currentInput.contains(e.relatedTarget)) finishEditing();
  }, true);
  textLayer.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finishEditing();
    }
  });
}
