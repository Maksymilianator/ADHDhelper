// Przełączanie narzędzia
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
    // w trybie pointer pozwalamy zarówno na obiekty, jak i na canvas (pan/zoom)
    objectLayer.style.pointerEvents = 'auto';
    canvas.       style.pointerEvents = 'auto';
  }
  else if (['circle','square','triangle','sticky','placeImage','text']
           .includes(currentTool)) {
    // rysowanie/edycja obiektów: tylko obiektLayer
    objectLayer.style.pointerEvents = 'auto';
    canvas.       style.pointerEvents = 'none';
  }
  else {
    // pen, highlighter, eraser: tylko canvas
    objectLayer.style.pointerEvents = 'none';
    canvas.       style.pointerEvents = 'auto';
  }
  
  // wybór warstwy do interakcji
  const objTools = ['pointer','circle','square','triangle','sticky','placeImage','text'];
  objectLayer.style.pointerEvents = objTools.includes(currentTool)? 'auto':'none';
  canvas.    style.pointerEvents = objTools.includes(currentTool)? 'none':'auto';
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
    draw(); saveState();
  }
};

// Eventy warstwy obiektów
objectLayer.onmousedown = e=>{
  if (e.target===objectLayer && currentTool==='pointer') deselectElement();
  if (['circle','square','triangle'].includes(currentTool)) {
    isDrawing = true;
    const w = screenToWorld(e.clientX, e.clientY);
    startShape(currentTool, w.x, w.y);
  }
  if (currentTool==='sticky') addSticky(e.clientX, e.clientY);
  if (currentTool==='placeImage' && pendingImage) placeImage(e.clientX, e.clientY);
  if (currentTool==='text') addText(e.clientX, e.clientY);
};
objectLayer.onmousemove = e=>{
  if (isMoving && selectedElement) {
    const x = e.clientX - moveOffset.x;
    const y = e.clientY - moveOffset.y;
    selectedElement.style.left = x+'px';
    selectedElement.style.top  = y+'px';
    positionHandles(selectedElement.getBoundingClientRect());
  }
};
objectLayer.onmouseup = e=>{
  if (isMoving) { isMoving=false; updateDescriptorFromElement(selectedElement); }
  if (isDrawing) {
    isDrawing=false;
    const w2 = screenToWorld(e.clientX,e.clientY);
    endShape(w2.x, w2.y);
  }
};

// Eventy canvas (ścieżki + gumka + zoom)
let isPathDrawing = false;
canvas.onmousedown = e=>{
  if (e.button===1) {
    // (opcjonalnie) pan logic
  } else if (currentTool==='pen' || currentTool==='highlighter') {
    isPathDrawing = true;
    pushState();
    const w = screenToWorld(e.clientX, e.clientY);
    paths.push({
      type: currentTool,
      size: currentTool==='highlighter'
             ? parseInt(highlighterSizeInput.value)
             : parseInt(penSizeInput.value),
      points: [w]
    });
  } else if (currentTool==='eraser') {
    isErasing = true;
    pushState();
    applyEraser(e.clientX, e.clientY);
  }
};
canvas.onmousemove = e=>{
  if (isPathDrawing) {
    const w = screenToWorld(e.clientX, e.clientY);
    paths[paths.length-1].points.push(w);
    draw();
  }
  if (isErasing) applyEraser(e.clientX, e.clientY);
};
canvas.onmouseup = e=>{
  if (isPathDrawing) { isPathDrawing=false; saveState(); }
  if (isErasing)    { isErasing=false; saveState(); }
};
canvas.onwheel = e=>{
  e.preventDefault();
  const m = screenToWorld(e.clientX, e.clientY);
  const d = -e.deltaY * 0.001;
  const newScale = clampScale(scale * (1 + d));
  translateX = e.clientX - m.x * newScale;
  translateY = e.clientY - m.y * newScale;
  scale = newScale;
  draw();
  saveState();
};
// obsługa pan + zoom
let isPanning = false, panStart = null, panOrigin = null;

// na mousedown środkowym przyciskiem (button===1) włączamy pan
canvas.addEventListener('mousedown', e => {
  if (e.button === 1) {
    isPanning = true;
    panStart  = { x: e.clientX, y: e.clientY };
    panOrigin = { x: translateX, y: translateY };
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  }
});

// na mousemove: jeśli pan, to przesuwamy viewport
canvas.addEventListener('mousemove', e => {
  if (isPanning) {
    translateX = panOrigin.x + (e.clientX - panStart.x);
    translateY = panOrigin.y + (e.clientY - panStart.y);
    draw();
  }
});

// na mouseup kończymy pan i zapisujemy stan
canvas.addEventListener('mouseup', e => {
  if (isPanning) {
    isPanning = false;
    canvas.style.cursor = 'default';
    saveState();
  }
});

// wheel: zoom w miejscu kursora (zachowując translateY)
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const world = screenToWorld(e.clientX, e.clientY);
  const delta = -e.deltaY * 0.001;
  const newScale = clampScale(scale * (1 + delta));
  // obliczamy nowy translate tak, by punkt pod kursorem został na miejscu
  translateX = e.clientX - world.x * newScale;
  translateY = e.clientY - world.y * newScale;
  scale = newScale;
  draw();
  saveState();
});

// czekamy na załadowanie DOM i dopiero wtedy inicjujemy
document.addEventListener('DOMContentLoaded', function() {
  updateActiveTool();
  loadState();
  window.addEventListener('beforeunload', saveState);
});

// ====== obsługa dotyku ======
let pinchStartDist = 0;
let pinchStartScale, pinchStartTranslate;

// utility: dystans między dwoma palcami
function getDist(t1, t2) {
  const dx = t2.clientX - t1.clientX;
  const dy = t2.clientY - t1.clientY;
  return Math.hypot(dx, dy);
}

// touchstart
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  if (e.touches.length === 1) {
    // jedna kropka = myszka
    const t = e.touches[0];
    canvas.dispatchEvent(new MouseEvent('mousedown', {
      clientX: t.clientX, clientY: t.clientY, button: 0
    }));
  }
  else if (e.touches.length === 2) {
    // początek pinch
    pinchStartDist     = getDist(e.touches[0], e.touches[1]);
    pinchStartScale    = scale;
    pinchStartTranslate= { x: translateX, y: translateY };
  }
}, { passive: false });

// touchmove
canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  if (e.touches.length === 1) {
    const t = e.touches[0];
    canvas.dispatchEvent(new MouseEvent('mousemove', {
      clientX: t.clientX, clientY: t.clientY
    }));
  }
  else if (e.touches.length === 2) {
    // pinch-to-zoom
    const dist = getDist(e.touches[0], e.touches[1]);
    const factor = dist / pinchStartDist;
    const newScale = clampScale(pinchStartScale * factor);
    // przybliżenie wokół środka palców
    const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    const world = screenToWorld(midX, midY);
    translateX = midX - world.x * newScale;
    translateY = midY - world.y * newScale;
    scale = newScale;
    draw();
  }
}, { passive: false });

// touchend
canvas.addEventListener('touchend', e => {
  e.preventDefault();
  if (e.touches.length === 0) {
    // zakończenie single-touch sesji
    canvas.dispatchEvent(new MouseEvent('mouseup', {}));
    saveState();
  }
}, { passive: false });

// i na objectLayer też:
objectLayer.addEventListener('touchstart', e => {
  e.preventDefault();
  if (e.touches.length === 1) {
    const t = e.touches[0];
    objectLayer.dispatchEvent(new MouseEvent('mousedown', {
      clientX: t.clientX, clientY: t.clientY, button: 0
    }));
  }
}, { passive: false });
objectLayer.addEventListener('touchmove', e => {
  e.preventDefault();
  if (e.touches.length === 1) {
    const t = e.touches[0];
    objectLayer.dispatchEvent(new MouseEvent('mousemove', {
      clientX: t.clientX, clientY: t.clientY
    }));
  }
}, { passive: false });
objectLayer.addEventListener('touchend', e => {
  e.preventDefault();
  if (e.touches.length === 0) {
    objectLayer.dispatchEvent(new MouseEvent('mouseup', {}));
  }
}, { passive: false });

