// ======================= interactions.js =======================

// ——— grupowa selekcja prostokątna ———
let isSelecting     = false;
let selectStart     = { x:0, y:0 };
let selectionRectEl = null;
let selectedPaths = [];


// Pobiera zaznaczone typy z checkboxów
function getSelectionFilter() {
  return Array.from(document.querySelectorAll('.select-filter'))
    .filter(cb => cb.checked)
    .map(cb => cb.value);
}

let previewEl = null;
let drawStartScreen = { x: 0, y: 0 };

// 1. Przełączanie narzędzia
let currentTool = 'pointer';
function updateActiveTool() {
  // wyczyszczenie podświetleń
  [pointerBtn, penBtn, highlighterBtn, eraserBtn,
   circleBtn, squareBtn, triangleBtn,
   stickyBtn, imageBtn, textBtn]
    .forEach(b => b.classList.remove('active'));

  // aktywacja przycisku
  if (currentTool === 'pointer')    pointerBtn.classList.add('active');
  if (currentTool === 'pen')        penBtn.classList.add('active');
  if (currentTool === 'highlighter')highlighterBtn.classList.add('active');
  if (currentTool === 'eraser')     eraserBtn.classList.add('active');
  if (currentTool === 'circle')     circleBtn.classList.add('active');
  if (currentTool === 'square')     squareBtn.classList.add('active');
  if (currentTool === 'triangle')   triangleBtn.classList.add('active');
  if (currentTool === 'sticky')     stickyBtn.classList.add('active');
  if (currentTool === 'placeImage' || currentTool === 'image')
                                     imageBtn.classList.add('active');
  if (currentTool === 'text')       textBtn.classList.add('active');

  // nowa logika pointerEvents:
  if (currentTool === 'pointer') {
    objectLayer.style.pointerEvents = 'auto';
    canvas.       style.pointerEvents = 'auto';
  }
  else if (['circle','square','triangle','sticky','placeImage','text']
           .includes(currentTool)) {
    objectLayer.style.pointerEvents = 'auto';
    canvas.       style.pointerEvents = 'none';
  }
  else {
    objectLayer.style.pointerEvents = 'none';
    canvas.       style.pointerEvents = 'auto';
  }

  // wybór warstwy do interakcji (stara, ale działała najlepsza)
  const objTools = ['pointer','circle','square','triangle','sticky','placeImage','text'];
  objectLayer.style.pointerEvents = objTools.includes(currentTool)? 'auto':'none';
  canvas.       style.pointerEvents = objTools.includes(currentTool)? 'none':'auto';
}

// Kliknięcia w toolbar
pointerBtn.onclick      = ()=>{ currentTool='pointer';    updateActiveTool(); };
penBtn.onclick          = ()=>{ currentTool='pen';        updateActiveTool(); };
highlighterBtn.onclick  = ()=>{ currentTool='highlighter';updateActiveTool(); };
eraserBtn.onclick       = ()=>{ currentTool='eraser';     updateActiveTool(); };
circleBtn.onclick       = ()=>{ currentTool='circle';     updateActiveTool(); };
squareBtn.onclick       = ()=>{ currentTool='square';     updateActiveTool(); };
triangleBtn.onclick     = ()=>{ currentTool='triangle';   updateActiveTool(); };
stickyBtn.onclick       = ()=>{ currentTool='sticky';     updateActiveTool(); };
textBtn.onclick         = ()=>{ currentTool='text';       updateActiveTool(); };
undoBtnEl.onclick       = ()=>undo();
redoBtnEl.onclick       = ()=>redo();
bgSelect.onchange       = ()=>{ draw(); saveState(); };
returnBtnEl.onclick     = ()=>{
  if (lastView.pos) {
    scale      = lastView.scale;
    translateX = width/2 - lastView.pos.x*scale;
    translateY = height/2 - lastView.pos.y*scale;
    draw();
    recreateObjects();     // ← dodane
    updateActiveTool();    // ← dodane
    saveState();
  }
};

// 2. Eventy warstwy obiektów
objectLayer.onmousedown = e => {
  // 1) Środek myszy ignorujemy (Pan globalny)
  if (e.button === 1) return;

  // 2) Jeśli pointer — to albo deselect tła, albo prostokąt zaznaczania
  if (currentTool === 'pointer') {
    if (e.target === objectLayer) {
      deselectElement();
      return;
    }
    // start selekcji prostokątnej
    isSelecting = true;
    selectStart = { x: e.clientX, y: e.clientY };
    selectionRectEl = document.createElement('div');
    selectionRectEl.id = 'selection-rect';
    document.body.appendChild(selectionRectEl);
    return;
  }

  // 3) W narzędziach shape: circle/square/triangle – uruchamiamy rysowanie
  if (['circle','square','triangle'].includes(currentTool)) {
    isDrawing = true;
    drawStartScreen = { x: e.clientX, y: e.clientY };
    const w = screenToWorld(e.clientX, e.clientY);
    startShape(currentTool, w.x, w.y);
    // … tutaj Twój kod tworzenia previewEl …
    return;
  }

  // 4) Inne narzędzia (sticky, image, text) zachowują się jak wcześniej
  if (currentTool === 'sticky')    { addSticky(e.clientX, e.clientY); return; }
  if (currentTool === 'placeImage' && pendingImage) { placeImage(e.clientX, e.clientY); return; }
  if (currentTool === 'text')      { addText(e.clientX, e.clientY); return; }
};


objectLayer.onmousemove = e => {
  // 1) przesuwanie wybranych obiektów (istniejący kod) …
  if (isMoving && selectedElement) {
    const x = e.clientX - moveOffset.x;
    const y = e.clientY - moveOffset.y;
    selectedElement.style.left = x+'px';
    selectedElement.style.top  = y+'px';
    positionHandles(selectedElement.getBoundingClientRect());
  }

  // 2) live‐preview kształtu podczas rysowania
  if (isDrawing && previewEl) {
    const dx = e.clientX - drawStartScreen.x;
    const dy = e.clientY - drawStartScreen.y;
    // pozycja i rozmiary prostokąta w screen px
    const left   = Math.min(drawStartScreen.x, e.clientX);
    const top    = Math.min(drawStartScreen.y, e.clientY);
    const width  = Math.abs(dx);
    const height = Math.abs(dy);
    previewEl.style.left   = `${left}px`;
    previewEl.style.top    = `${top}px`;
    previewEl.style.width  = `${width}px`;
    previewEl.style.height = `${height}px`;
  }
};

// ─── live aktualizacja prostokąta selekcji ───
document.addEventListener('mousemove', e => {
  if (!isSelecting) return;
  const x = Math.min(e.clientX, selectStart.x);
  const y = Math.min(e.clientY, selectStart.y);
  const w = Math.abs(e.clientX - selectStart.x);
  const h = Math.abs(e.clientY - selectStart.y);
  Object.assign(selectionRectEl.style, {
    left:   `${x}px`,
    top:    `${y}px`,
    width:  `${w}px`,
    height: `${h}px`
  });
});

// ─── zakończenie selekcji i wybór obiektów ───
document.addEventListener('mouseup', e => {
  if (!isSelecting) return;
  isSelecting = false;
  const rect = selectionRectEl.getBoundingClientRect();
  selectionRectEl.remove();
  selectionRectEl = null;

  const filter = getSelectionFilter();
  document.querySelectorAll('.object').forEach(el => {
    const type = el.dataset.type;
    const r    = el.getBoundingClientRect();
    if (!filter.includes(type)) {
      el.classList.remove('selected');
      return;
    }
    const overlap = !(
      r.right  < rect.left  ||
      r.left   > rect.right ||
      r.bottom < rect.top   ||
      r.top    > rect.bottom
    );
    if (overlap) el.classList.add('selected');
    else         el.classList.remove('selected');
  });
});


objectLayer.onmouseup = e => {
  // zakończenie przesuwania obiektów
  if (isMoving) {
    isMoving = false;
    updateDescriptorFromElement(selectedElement);
  }

  // zakończenie rysowania kształtu
  if (isDrawing) {
    isDrawing = false;
    // usuń preview
    if (previewEl) {
      previewEl.remove();
      previewEl = null;
    }
    // utwórz właściwy kształt
    const w2 = screenToWorld(e.clientX, e.clientY);
    endShape(w2.x, w2.y);
  }
};


// 3. Eventy canvas (pen/highlighter/eraser)
let isPathDrawing = false;
canvas.onmousedown = e => {
  // jeśli nie lewy przycisk, nie rysujemy
  if (e.button !== 0) return;

  if (currentTool === 'pen' || currentTool === 'highlighter') {
    isPathDrawing = true;
    pushState();
    const w = screenToWorld(e.clientX, e.clientY);
    paths.push({
      type: currentTool,
      size: currentTool === 'highlighter'
             ? parseInt(highlighterSizeInput.value)
             : parseInt(penSizeInput.value),
      points: [w]
    });
  }
  else if (currentTool === 'eraser') {
    isErasing = true;
    pushState();
    applyEraser(e.clientX, e.clientY);
  }
  // jeśli tool to pointer/shape/text/image, znów możesz
  // zaznaczać/przesuwać obiekty – to działa na warstwie objectLayer
};

canvas.onmousemove = e=>{
  if (isPathDrawing) {
    const w = screenToWorld(e.clientX, e.clientY);
    paths[paths.length-1].points.push(w);
    draw();
  }
  if (isErasing) {
    applyEraser(e.clientX, e.clientY);
    draw();
  }
};

canvas.onmouseup = e => {
  if (isPathDrawing) {
    isPathDrawing = false;

    // zapisz ostatni punkt ścieżki
    const world = screenToWorld(e.clientX, e.clientY);
    lastView.pos   = world;
    lastView.scale = scale;

    saveState();
  }
  if (isErasing) {
    isErasing = false;
    saveState();
  }
};

// 4. Zoom na kółko canvas
canvas.onwheel = e=>{
  e.preventDefault();
  const m = screenToWorld(e.clientX, e.clientY);
  const d = -e.deltaY * 0.001;
  const newScale = clampScale(scale * (1 + d));
  translateX = e.clientX - m.x * newScale;
  translateY = e.clientY - m.y * newScale;
  scale = newScale;
  draw();
  recreateObjects();       // ← dodane
  saveState();
};

// ─── Globalny Pan & Zoom dla wszystkich narzędzi ───

let isPanning = false, panStart = null, panOrigin = null;

// Pan start — środkowy przycisk gdziekolwiek na stronie
document.addEventListener('mousedown', e => {
  if (e.button === 1) {
    isPanning  = true;
    panStart   = { x: e.clientX, y: e.clientY };
    panOrigin  = { x: translateX, y: translateY };
    document.body.style.cursor = 'grabbing';
    e.preventDefault();
  }
});

// Pan move — cały dokument
document.addEventListener('mousemove', e => {
  if (isPanning) {
    translateX = panOrigin.x + (e.clientX - panStart.x);
    translateY = panOrigin.y + (e.clientY - panStart.y);
    draw();
    recreateObjects();
  }
});

// Pan end
document.addEventListener('mouseup', e => {
  if (isPanning && e.button === 1) {
    isPanning = false;
    document.body.style.cursor = 'default';
    saveState();
  }
});

// Zoom kółkiem — cały dokument
document.addEventListener('wheel', e => {
  e.preventDefault();
  const world   = screenToWorld(e.clientX, e.clientY);
  const factor  = 1 - e.deltaY * 0.001;
  const newScale= clampScale(scale * factor);
  translateX = e.clientX - world.x * newScale;
  translateY = e.clientY - world.y * newScale;
  scale      = newScale;
  draw();
  recreateObjects();
  saveState();
}, { passive: false });


// 6. Inicjalizacja po starcie
document.addEventListener('DOMContentLoaded', function() {
  updateActiveTool();
  loadState();
  draw();
  recreateObjects();

  // ——— Tutaj wklejamy resize/rotate ———

  // 1) Mousedown na uchwycie
  objectLayer.addEventListener('mousedown', e => {
    if (e.button !== 0) return;                // tylko lewy przycisk
    if (!selectedElement) return;
    if (e.target.classList.contains('handle')) {
      e.stopPropagation();
      isResizing   = true;
      activeHandle = e.target.dataset.dir;
      const idx    = +selectedElement.dataset.index;
      const desc   = objectsDescriptors[idx];
      resizeStart  = {
        x0: e.clientX, y0: e.clientY,
        x : desc.x,   y : desc.y,
        w : desc.w,   h : desc.h
      };
      return;
    }
    if (e.target.classList.contains('rotate-handle')) {
      e.stopPropagation();
      isRotating = true;
      const rect = selectedElement.getBoundingClientRect();
      const cx   = rect.left + rect.width/2;
      const cy   = rect.top  + rect.height/2;
      const idx  = +selectedElement.dataset.index;
      rotateStart = {
        cx,
        cy,
        startAngle: Math.atan2(e.clientY - cy, e.clientX - cx),
        origRot    : objectsDescriptors[idx].rotation
      };
    }
  });

  // 2) Mousemove – resize lub rotate
  document.addEventListener('mousemove', e => {
    if (isResizing && selectedElement) {
      const idx  = +selectedElement.dataset.index;
      const desc = objectsDescriptors[idx];
      const dx   = (e.clientX - resizeStart.x0)/scale;
      const dy   = (e.clientY - resizeStart.y0)/scale;
      let nx = resizeStart.x, ny = resizeStart.y,
          nw = resizeStart.w, nh = resizeStart.h;
      if (activeHandle.includes('e')) nw = resizeStart.w + dx;
      if (activeHandle.includes('s')) nh = resizeStart.h + dy;
      if (activeHandle.includes('w')) { nx += dx; nw -= dx; }
      if (activeHandle.includes('n')) { ny += dy; nh -= dy; }
      desc.x = nx; desc.y = ny; desc.w = nw; desc.h = nh;
      draw(); recreateObjects(); updateActiveTool();
    }
    if (isRotating && selectedElement) {
      const rs = rotateStart;
      const idx = +selectedElement.dataset.index;
      const desc = objectsDescriptors[idx];
      const newAngle = Math.atan2(e.clientY - rs.cy, e.clientX - rs.cx);
      let deg = (newAngle - rs.startAngle) * 180/Math.PI + rs.origRot;
      desc.rotation = ((deg % 360) + 360) % 360;
      draw(); recreateObjects(); updateActiveTool();
    }
  });

  // 3) Mouseup – zakończenie operacji
  document.addEventListener('mouseup', e => {
    if (isResizing) {
      isResizing = false;
      activeHandle = null;
      saveState();
    }
    if (isRotating) {
      isRotating = false;
      saveState();
    }
  });

  // ——— koniec resize/rotate

  window.addEventListener('beforeunload', saveState);
});

// ——— klawisz Delete usuwa zaznaczony obiekt ———
document.addEventListener('keydown', e => {
  const tag = document.activeElement.tagName.toLowerCase();
  if (tag==='input' || tag==='textarea' || document.activeElement.isContentEditable) return;
  if (e.key === 'Delete' || e.key === 'Del') {
    // jeżeli są obiekty zaznaczone w grupie → usuwamy je wszystkie
    const anySelected = document.querySelector('.object.selected');
    if (anySelected) {
      deleteSelectedObjects();
    } else {
      deleteSelectedObject();
    }
  }
});



// ——— usuń wszystkie zaznaczone obiekty ———
function deleteSelectedObjects() {
  const selectedEls = Array.from(document.querySelectorAll('.object.selected'));
  if (!selectedEls.length) return;

  // snapshot przed usunięciem
  pushState();

  // zbierz wszystkie indeksy opisów do usunięcia
  const toRemove = new Set(selectedEls.map(el => parseInt(el.dataset.index, 10)));
  // filtruj opis
  objectsDescriptors = objectsDescriptors.filter((desc, idx) => !toRemove.has(idx));

  // odśwież warstwę i czyść zaznaczenia
  recreateObjects();
  selectedEls.forEach(el => el.classList.remove('selected'));
  selectedElement = null;

  // narysuj i zapisz stan
  draw();
  saveState();
}


  document.addEventListener('mousedown', e => {
    // tylko w trybie pointer i lewy przycisk
    if (currentTool !== 'pointer' || e.button !== 0) return;
  
    // klik na obszarze canvas lub objectLayer zaczyna selekcję
    if (e.target === canvas || e.target === objectLayer) {
      isSelecting = true;
      selectStart = { x: e.clientX, y: e.clientY };
  
      // utwórz wizualny prostokąt selekcji
      selectionRectEl = document.createElement('div');
      selectionRectEl.id = 'selection-rect';
      Object.assign(selectionRectEl.style, {
        position: 'absolute',
        border:   '1px dashed #007BFF',
        background:'rgba(0,123,255,0.1)',
        left:     `${selectStart.x}px`,
        top:      `${selectStart.y}px`,
        width:    '0px',
        height:   '0px',
        pointerEvents: 'none',
        zIndex:   9999
      });
      document.body.appendChild(selectionRectEl);
    }
  });
  
  document.addEventListener('mousemove', e => {
    if (!isSelecting || !selectionRectEl) return;
  
    const x = Math.min(e.clientX, selectStart.x);
    const y = Math.min(e.clientY, selectStart.y);
    const w = Math.abs(e.clientX - selectStart.x);
    const h = Math.abs(e.clientY - selectStart.y);
  
    Object.assign(selectionRectEl.style, {
      left:   `${x}px`,
      top:    `${y}px`,
      width:  `${w}px`,
      height: `${h}px`
    });
  });
  
  document.addEventListener('mouseup', e => {
    if (!isSelecting) return;
    isSelecting = false;
  
    // pobierz prostokąt selekcji i usuń go z DOM
    const selRect = selectionRectEl.getBoundingClientRect();
    selectionRectEl.remove();
    selectionRectEl = null;
  
    // pobierz filtr typów (checkboxy .select-filter)
    const filter = getSelectionFilter();
  
    // wyczyść dotychczasowe zaznaczenia
    document.querySelectorAll('.object.selected').forEach(el => {
      el.classList.remove('selected');
    });
    // ——— zaznaczanie ścieżek Pen/Highlighter ———
    selectedPaths = [];
    // jeśli w filtrze mamy pen/highlighter
    if (filter.includes('pen') || filter.includes('highlighter')) {
      paths.forEach((path, idx) => {
        // pomiń, jeśli typ ścieżki nie jest w filtrze
        if (!filter.includes(path.type)) return;
        // bounding box ścieżki w px ekranu
        let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
        path.points.forEach(p => {
          const sx = p.x*scale + translateX;
          const sy = p.y*scale + translateY;
          minX = Math.min(minX, sx);
          minY = Math.min(minY, sy);
          maxX = Math.max(maxX, sx);
          maxY = Math.max(maxY, sy);
        });
        // prostokąty nachodzą na siebie?
        const overlaps = !(maxX < selRect.left
                       || minX > selRect.right
                       || maxY < selRect.top
                       || minY > selRect.bottom);
        if (overlaps) selectedPaths.push(idx);
      });
    }
    // ——— koniec selekcji ścieżek ———
  
    // aktualizacja widoku
    draw(); recreateObjects(); updateActiveTool();
  
    // zaznacz nowe: obiekty przecinające prostokąt i zgodne z filtrem
    document.querySelectorAll('.object').forEach(el => {
      const type = el.dataset.type;
      if (!filter.includes(type)) return;
  
      const r = el.getBoundingClientRect();
      const intersects = !(
        r.right  < selRect.left  ||
        r.left   > selRect.right ||
        r.bottom < selRect.top   ||
        r.top    > selRect.bottom
      );
      if (intersects) el.classList.add('selected');
    });
  });
  