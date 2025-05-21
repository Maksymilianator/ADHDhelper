// app.js
import { initGrid }        from './modules/grid.js';
import { initPanZoom }     from './modules/panzoom.js';
import { initPen }         from './modules/pen.js';
import { initEraser }      from './modules/eraser.js';
import { initHighlighter } from './modules/highlighter.js';
import { initSelector }     from './modules/selector.js';
import { initText }      from './modules/text.js';
import { initTextEditor } from './modules/textEditor.js';

const gridCanvas   = document.getElementById('gridCanvas');
const shapeCanvas  = document.getElementById('shapeCanvas');
const toolbar      = document.getElementById('toolbar');
const zoomEl       = document.getElementById('zoomIndicator');

const gridCtx      = gridCanvas.getContext('2d');
const shapeCtx     = shapeCanvas.getContext('2d');
const dpr          = window.devicePixelRatio || 1;

// — stan aplikacji —
let shapes             = JSON.parse(localStorage.getItem('adhdhelper_shapes') || '[]');
let currentStroke      = null;
let currentPenPreview  = null;
let currentHighlighter = null;
let currentEraser      = null;
let lastMiddleDown     = 0;
let selectedIndices    = new Set();
let selectionRect      = null;
// dla Text-tool
let currentTextPreview = null;
let currentTextRect = null;

// ——————————————
// undo/redo stacks
const undoStack = [];
const redoStack = [];

// zapis obrazu do undoStack
function pushUndo() {
  // głęboka kopia bieżącego stanu
  undoStack.push(JSON.parse(JSON.stringify(shapes)));
  // wykasuj redo, bo mamy nową linię historii
  redoStack.length = 0;
}

function saveShapes() {
  localStorage.setItem('adhdhelper_shapes', JSON.stringify(shapes));
}
// helper do łamania tekstu NA POJEDYNCZYCH ZNAKACH
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  // najpierw respektujemy ręczne newline’y
  const paragraphs = text.split('\n');
  paragraphs.forEach((para, pi) => {
    let line = '';
    for (let ch of Array.from(para)) {
      const testLine = line + ch;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line !== '') {
        ctx.fillText(line, x, y);
        line = ch;
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    // ostatnia linia paragrafu
    if (line) {
      ctx.fillText(line, x, y);
      y += lineHeight;
    }
    // po każdym paragrafie zostaw dodatkowy odstęp
    if (pi < paragraphs.length - 1) {
      y += lineHeight;
    }
  });
}


function drawShapes() {
  // wyczyść tylko kształty
  shapeCtx.resetTransform();
  shapeCtx.clearRect(0, 0, shapeCanvas.width, shapeCanvas.height);

  const { scale, originX, originY } = grid;
  shapeCtx.setTransform(
    scale * dpr, 0,
    0, scale * dpr,
    originX * dpr, originY * dpr
  );
  
  // 1) Pen + smooth stroke
  function strokePath(points, color, size) {
    if (points.length < 2) return;
    shapeCtx.save();
    shapeCtx.strokeStyle = color;
    shapeCtx.lineWidth   = size / scale;
    shapeCtx.lineCap     = 'round';
    shapeCtx.beginPath();
    shapeCtx.moveTo(points[0].x, points[0].y);
    if (points.length === 2) {
      shapeCtx.lineTo(points[1].x, points[1].y);
    } else {
      for (let i = 1; i < points.length - 1; i++) {
        const prev = points[i], next = points[i+1];
        shapeCtx.quadraticCurveTo(
          prev.x, prev.y,
          (prev.x + next.x)/2, (prev.y + next.y)/2
        );
      }
      const last = points[points.length - 1];
      shapeCtx.lineTo(last.x, last.y);
    }
    shapeCtx.stroke();
    shapeCtx.restore();
  }
  
  // 2) Highlighter stroke (z przezroczystością)
  function drawHighlight(points, color, size) {
    if (points.length < 2) return;
    shapeCtx.save();
    shapeCtx.globalAlpha = 0.3;
    shapeCtx.strokeStyle = color;
    shapeCtx.lineWidth   = size / scale;
    shapeCtx.lineCap     = 'round';
    shapeCtx.beginPath();
    shapeCtx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      shapeCtx.lineTo(points[i].x, points[i].y);
    }
    shapeCtx.stroke();
    shapeCtx.restore();
  }

  // 3) zapisane kształty
  shapes.forEach((s, i) => {
    if (s.type === 'pen')          strokePath(s.points,      s.color, s.size);
    if (s.type === 'highlighter')  drawHighlight(s.points,   s.color, s.size);
  if (s.type === 'text') {+     shapeCtx.save();
     shapeCtx.font         = `${s.fontSize}px ${s.fontFamily}`;
     shapeCtx.fillStyle    = s.color;
     shapeCtx.textAlign    = s.align    || 'left';
     shapeCtx.textBaseline = s.valign   || 'top';

     // oblicz start (tx,ty)
     let tx = s.x;
     if (s.align === 'center') tx = s.x + s.width/2;
     else if (s.align === 'right') tx = s.x + s.width;
     let ty = s.y;
     if (s.valign === 'middle') ty = s.y + s.height/2;
     else if (s.valign === 'bottom') ty = s.y + s.height;

     // wrapText: maxWidth = s.width, lineHeight = 1.2×fontSize
     wrapText(shapeCtx, s.value, tx, ty, s.width, s.fontSize * 1.2);

     // ramka
     shapeCtx.strokeStyle = s.color;
     shapeCtx.lineWidth   = 1/scale;
     shapeCtx.strokeRect(s.x, s.y, s.width, s.height);
     shapeCtx.restore();
   }

 if (selectedIndices.has(i) && s.type === 'text') {
    const hs = 6 / scale;
    const corners = [
      [s.x, s.y], [s.x + s.width, s.y],
      [s.x, s.y + s.height], [s.x + s.width, s.y + s.height]
    ];
    shapeCtx.save();
    shapeCtx.setTransform(
      scale * dpr, 0,
      0, scale * dpr,
      originX * dpr, originY * dpr
    );
    shapeCtx.fillStyle   = 'white';
    shapeCtx.strokeStyle = 'black';
    corners.forEach(([cx, cy]) => {
      shapeCtx.beginPath();
      shapeCtx.rect(cx - hs, cy - hs, hs * 2, hs * 2);
      shapeCtx.fill();
      shapeCtx.stroke();
    });
    // rotate handle above top-center
    const rx = s.x + s.width / 2, ry = s.y - 20 / scale;
    shapeCtx.beginPath();
    shapeCtx.arc(rx, ry, hs, 0, Math.PI * 2);
    shapeCtx.fill();
    shapeCtx.stroke();
    shapeCtx.restore();
  }

  });
// rysuj resize‐handles i rotate‐handle dla text
selectedIndices.forEach(i => {
  const s = shapes[i];
  if (s.type !== 'text') return;
  const hs = 6/scale;
  const corners = [
    [s.x, s.y], [s.x+s.width, s.y],
    [s.x, s.y+s.height], [s.x+s.width, s.y+s.height]
  ];
  shapeCtx.save();
  shapeCtx.setTransform(scale*dpr,0,0,scale*dpr, originX*dpr,originY*dpr);
  shapeCtx.fillStyle   = '#fff';
  shapeCtx.strokeStyle = '#000';
  corners.forEach(([cx,cy])=>{
    shapeCtx.beginPath();
    shapeCtx.rect(cx-hs, cy-hs, hs*2, hs*2);
    shapeCtx.fill();
    shapeCtx.stroke();
  });
  // rotate handle
  const rx = s.x + s.width/2, ry = s.y - 20/scale;
  shapeCtx.beginPath();
  shapeCtx.arc(rx, ry, hs, 0, Math.PI*2);
  shapeCtx.fill();
  shapeCtx.stroke();
  shapeCtx.restore();
});

  // live‐preview regionu tekstu
  if (currentTextRect) {
    const { x1, y1, x2, y2 } = currentTextRect;
    shapeCtx.save();
    const { scale, originX, originY } = grid;
    shapeCtx.setTransform(
      scale * dpr, 0,
      0, scale * dpr,
      originX * dpr, originY * dpr
    );
    shapeCtx.fillStyle   = 'rgba(0,0,0,0.1)';
    shapeCtx.strokeStyle = 'rgba(0,0,0,0.5)';
    shapeCtx.lineWidth   = 1 / scale;
    shapeCtx.fillRect(x1, y1, x2 - x1, y2 - y1);
    shapeCtx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    shapeCtx.restore();
  }



  // podgląd live prostokąta zaznaczania
  if (selectionRect) {
  const { x1, y1, x2, y2 } = selectionRect;
  shapeCtx.save();
  const { scale, originX, originY } = grid;
  shapeCtx.setTransform(
    scale * dpr, 0, 0, scale * dpr,
    originX * dpr, originY * dpr
  );
  shapeCtx.fillStyle   = 'rgba(0,123,255,0.2)';
  shapeCtx.strokeStyle = 'rgba(0,123,255,0.8)';
  shapeCtx.lineWidth   = 1 / scale;
  shapeCtx.fillRect(x1, y1, x2 - x1, y2 - y1);
  shapeCtx.strokeRect(x1, y1, x2 - x1, y2 - y1);
  shapeCtx.restore();
  }


// highlight selected shapes
selectedIndices.forEach(i => {
  const s = shapes[i];

  // 1) wektory (pen/highlighter):
  // 1) wektory (pen/highlighter) – highlight jako zachowany obrys
  if (Array.isArray(s.points)) {
    shapeCtx.save();
    shapeCtx.setTransform(
      scale * dpr, 0,
      0, scale * dpr,
      originX * dpr, originY * dpr
    );
    shapeCtx.strokeStyle = 'rgba(0,123,255,0.8)';
    // grubość highlightu – trochę większa niż oryginalna linia
    shapeCtx.lineWidth   = (s.size || 1) / scale + 2 / scale;
    shapeCtx.lineCap     = 'round';
    shapeCtx.lineJoin    = 'round';
    shapeCtx.beginPath();
    // przenieś do pierwszego punktu
    shapeCtx.moveTo(s.points[0].x, s.points[0].y);
    // narysuj ścieżkę dokładnie tak jak w strokePath (bez wygładzania)
    for (let j = 1; j < s.points.length; j++) {
      shapeCtx.lineTo(s.points[j].x, s.points[j].y);
    }
    shapeCtx.stroke();
    shapeCtx.restore();

  // 2) tekst:
  } else if (s.type === 'text') {
    const minX = s.x;
    const minY = s.y;
    const maxX = s.x + s.width;
    const maxY = s.y + s.height;
    shapeCtx.save();
    shapeCtx.setTransform(
      scale * dpr, 0,
      0, scale * dpr,
      originX * dpr, originY * dpr
    );
    // podświetlenie innym kolorem, np. czerwonym
    shapeCtx.strokeStyle = 'rgba(255,0,0,0.8)';
    shapeCtx.lineWidth   = 2 / scale;
    shapeCtx.strokeRect(minX, minY, maxX - minX, maxY - minY);
    shapeCtx.restore();
  }
});



  // 4) live‐stroke Pen
  if (currentStroke) {
    strokePath(currentStroke.points, currentStroke.color, currentStroke.size);
  }

  // 5) podgląd Pen (kółko)
  if (currentPenPreview) {
    const s = currentPenPreview;
    shapeCtx.save();
    shapeCtx.strokeStyle = 'rgba(0,0,0,0.3)';
    shapeCtx.lineWidth   = 1/scale;
    shapeCtx.beginPath();
    shapeCtx.arc(s.points[0].x, s.points[0].y, s.size/scale, 0, Math.PI*2);
    shapeCtx.stroke();
    shapeCtx.restore();
  }

  // 6) live‐stroke Highlighter
  if (currentHighlighter) {
    drawHighlight(
      currentHighlighter.points,
      currentHighlighter.color,
      currentHighlighter.size
    );
  }

  // 7) podgląd Eraser (kółko)
  if (currentEraser) {
    shapeCtx.save();
    shapeCtx.strokeStyle = 'rgba(0,0,0,0.3)';
    shapeCtx.lineWidth   = 1/scale;
    shapeCtx.beginPath();
    shapeCtx.arc(
      currentEraser.point.x,
      currentEraser.point.y,
      currentEraser.size/scale,
      0, Math.PI*2
    );
    shapeCtx.stroke();
    shapeCtx.restore();
  }
}

// throttling z RAF
let drawScheduled = false;
function scheduleDraw() {
  if (drawScheduled) return;
  drawScheduled = true;
  requestAnimationFrame(() => {
    grid.draw();
    drawShapes();
    zoomEl.textContent = `${Math.round(grid.scale * 100)}%`;
    drawScheduled = false;
  });
}

function resizeCanvases() {
  [gridCanvas, shapeCanvas].forEach(c => {
    c.width  = window.innerWidth  * dpr;
    c.height = window.innerHeight * dpr;
    c.style.width  = `${window.innerWidth}px`;
    c.style.height = `${window.innerHeight}px`;
  });
  scheduleDraw();
}

// init Grid
const grid = initGrid({
  canvas:   gridCanvas,
  ctx:      gridCtx,
  baseStep: 40,
  minScale: 0.1,
  maxScale: 2,
  dpr
});

// init PanZoom
initPanZoom({
  canvas: shapeCanvas,
  grid,
  onDraw: scheduleDraw
});

// init Pen
initPen({
  canvas:     shapeCanvas,
  ctx:        shapeCtx,
  toolbar,
  grid,
  onUpdate:   stroke => { currentStroke = stroke;        scheduleDraw(); },
  onComplete: stroke => { 
    pushUndo(); shapes.push(stroke); currentStroke = null; saveShapes(); scheduleDraw(); },
  onPreview:  stroke => { currentPenPreview = stroke;     scheduleDraw(); }
});

// init Highlighter
initHighlighter({
  canvas:     shapeCanvas,
  ctx:        shapeCtx,
  toolbar,
  grid,
  onUpdate:   stroke => { currentHighlighter = stroke;       scheduleDraw(); },
  onComplete: stroke => { 
    pushUndo(); shapes.push(stroke); currentHighlighter = null; saveShapes(); scheduleDraw(); },
  onPreview:  stroke => { currentHighlighter = stroke;       scheduleDraw(); }
});

// init Eraser
initEraser({
  canvas:     shapeCanvas,
  toolbar,
  grid,
  getShapes:  () => shapes,
  setShapes:  ns => {
     pushUndo();
     shapes = ns;
     saveShapes();
     scheduleDraw();   // ← dodaj to, żeby narysować zaktualizowany stan
  },
  onUpdate:   scheduleDraw,
  onPreview:  (pt, sz) => { currentEraser = pt ? { point:pt, size:sz } : null; scheduleDraw(); }
});

// init Selector
initSelector({
  canvas:   shapeCanvas,
  ctx:      shapeCtx,
  toolbar,
  grid,
  getShapes: () => shapes,
  onSelect: sel => {
    selectedIndices = sel;
    scheduleDraw();
    // jeśli pojedynczy zaznaczony indeks i to tekst → openEditor
    const a = Array.from(sel);
    if (a.length===1 && shapes[a[0]].type==='text') {
      textEditor.openEditor(a[0]);
    } else {
      textEditor.closeEditor();
    }
  },
  onDrag: rect => {
    selectionRect = rect;
    scheduleDraw();
    textEditor.closeEditor();
  }
});


// init Text
initText({
  canvas:     shapeCanvas,
  textLayer:  document.getElementById('textLayer'),
  toolbar,
  grid,
  getShapes:  () => shapes,
  setShapes:  ns => { pushUndo(); shapes = ns; saveShapes(); scheduleDraw(); },
  onUpdate:   () => scheduleDraw(),
  onComplete: txtShape => { pushUndo(); shapes.push(txtShape); saveShapes(); scheduleDraw(); },
  onDragRect: rect => {
    currentTextRect = rect;
    scheduleDraw();
  }
});

// init Text-editor
const textEditor = initTextEditor({
  canvas:         shapeCanvas,
  toolbar,
  grid,
  getShapes:      () => shapes,
  setShapes:      ns => { pushUndo(); shapes = ns; saveShapes(); },
  onUpdate:       scheduleDraw,
  getSelectedIndex: () => {
    const a = Array.from(selectedIndices);
    return (a.length===1) ? a[0] : null;
  }
});


// funkcja centrująca ostatni rysowany kształt w widoku
function focusLastShape() {
  if (shapes.length === 0) return;
  const last = shapes[shapes.length - 1];
  const xs = last.points.map(p => p.x);
  const ys = last.points.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const cw = shapeCanvas.clientWidth;
  const ch = shapeCanvas.clientHeight;
  const s  = grid.scale;

  // ustawiamy originX, originY tak, aby środek kształtu był na środku canvasa
  const newOriginX = cw / 2 - centerX * s;
  const newOriginY = ch / 2 - centerY * s;
  grid.setTransform(s, newOriginX, newOriginY);
  scheduleDraw();
}

window.addEventListener('keydown', e => {
  // Ctrl+Z
  if (e.ctrlKey && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
    if (undoStack.length === 0) return;
    // przenieś bieżący stan do redo
    redoStack.push(JSON.parse(JSON.stringify(shapes)));
    // pobierz ostatni stan z undo
    shapes = undoStack.pop();
    saveShapes();
    scheduleDraw();
    e.preventDefault();
  }
  // Ctrl+Y (lub Ctrl+Shift+Z)
  else if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && (e.key === 'Z' || e.key === 'z')))) {
    if (redoStack.length === 0) return;
    undoStack.push(JSON.parse(JSON.stringify(shapes)));
    shapes = redoStack.pop();
    saveShapes();
    scheduleDraw();
    e.preventDefault();
  }
    // Delete — usuń zaznaczone kształty
  else if (e.key === 'Delete') {
    if (selectedIndices.size === 0) return;
    // zachowaj stan do undo
    pushUndo();
    // przefiltruj kształty, usuwając te o zaznaczonych indeksach
    shapes = shapes.filter((_, i) => !selectedIndices.has(i));
    // wyczyść selekcję
    selectedIndices.clear();
    saveShapes();
    scheduleDraw();
    e.preventDefault();
  }

});



window.addEventListener('resize', resizeCanvases);
resizeCanvases();

// tylko jedno narzędzie aktywne naraz
toolbar.addEventListener('click', e => {
  if (!e.target.matches('button.tool')) return;

  // 1) ukryj wszystkie menu i wyłącz wszystkie przyciski
  toolbar.querySelectorAll('button.tool').forEach(btn => {
    const m = btn.nextElementSibling;
    btn.classList.remove('active');
    if (m && m.style.display === 'flex') m.style.display = 'none';
  });

  // 2) włącz kliknięty
  e.target.classList.add('active');
  const menu = e.target.nextElementSibling;
  if (menu) menu.style.display = 'flex';

  // 3) zresetuj wszystkie preview
  currentPenPreview   = null;
  currentHighlighter  = null;
  currentEraser       = null;
  currentTextPreview  = null;
  selectionRect       = null;
  selectedIndices.clear();

    scheduleDraw();
});
