// -------------------------------------------------------------------------------------------------
// Global state & elementy DOM (muszą być dostępne dla wszystkich modułów)
// -------------------------------------------------------------------------------------------------
const canvas            = document.getElementById('canvas');
const ctx               = canvas.getContext('2d');
let width    = window.innerWidth,  height   = window.innerHeight;
let scale    = 1,                  translateX = 0,           translateY = 0;
let paths    = [],                 objectsDescriptors = [];
let lastView = { pos: null, scale: 1 };
const undoStack = [],              redoStack = [];
let dotPattern = null, dotPatternGrid = null;

// Flagi dla rysowania i interakcji
let isDrawing = false, isErasing = false, isMoving = false, isResizing = false, isRotating = false;
let objectStart = null, selectedElement = null, activeHandle = null;
let moveOffset = null, resizeStart = null, rotateStart = null;

// Przyciski / inputy toolbaru
const pointerBtn         = document.getElementById('pointerBtn');
const penBtn             = document.getElementById('penBtn');
const highlighterBtn     = document.getElementById('highlighterBtn');
const eraserBtn          = document.getElementById('eraserBtn');
const circleBtn          = document.getElementById('circleBtn');
const squareBtn          = document.getElementById('squareBtn');
const triangleBtn        = document.getElementById('triangleBtn');
const stickyBtn          = document.getElementById('stickyBtn');
const stickyColorInput   = document.getElementById('stickyColor');
const imageBtn           = document.getElementById('imageBtn');
const imageLoader        = document.getElementById('imageLoader');
const textBtn            = document.getElementById('textBtn');
const penSizeInput       = document.getElementById('penSize');
const highlighterSizeInput = document.getElementById('highlighterSize');
const eraserSizeInput    = document.getElementById('eraserSize');
const eraserModeSelect   = document.getElementById('eraserMode');
const eraserTargetSelect = document.getElementById('eraserTarget');
const textSizeInput      = document.getElementById('textSize');
const textColorInput     = document.getElementById('textColor');
const bgSelect           = document.getElementById('bgSelect');
const undoBtnEl          = document.getElementById('undoBtn');
const redoBtnEl          = document.getElementById('redoBtn');
const returnBtnEl        = document.getElementById('returnBtn');
const objectLayer        = document.getElementById('objectLayer');
const cursorIndicator    = document.getElementById('cursorIndicator');

// Inicjalizacja rozmiaru canvas + resize listener
canvas.width  = width;
canvas.height = height;
window.addEventListener('resize', () => {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
  draw();
});

// Skróty klawiaturowe
document.addEventListener('keydown', e => {
  if (e.ctrlKey && !e.shiftKey && e.key === 'z') { e.preventDefault(); undo(); }
  if (e.ctrlKey && !e.shiftKey && e.key === 'v') { e.preventDefault(); redo(); }
});

// Uruchomienie na starcie
updateActiveTool();
loadState();

// auto‐save przed zamknięciem/odświeżeniem
window.addEventListener('beforeunload', saveState);
