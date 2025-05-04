// Cofanie / ponawianie i przechowywanie w localStorage
function pushState() {
    undoStack.push(JSON.stringify({ paths, objects: objectsDescriptors, translateX, translateY, scale }));
    if (undoStack.length > 100) undoStack.shift();
    redoStack.length = 0;
    saveState();
  }
  function applyState(s) {
    const st = JSON.parse(s);
    paths             = st.paths;
    objectsDescriptors = st.objects;
    translateX        = st.translateX;
    translateY          = st.translateY; 
    scale             = st.scale;
    recreateObjects();
    draw();
    saveState();
  }
  function undo() {
    if (!undoStack.length) return;
    redoStack.push(JSON.stringify({ paths, objects: objectsDescriptors, translateX, translateY, scale }));
    applyState(undoStack.pop());
  }
  function redo() {
    if (!redoStack.length) return;
    undoStack.push(JSON.stringify({ paths, objects: objectsDescriptors, translateX, translateY, scale }));
    applyState(redoStack.pop());
  }
  function saveState() {
    localStorage.setItem('canvasState', JSON.stringify({
      paths,
      objects: objectsDescriptors,
      translateX,
      translateY,
      scale,
      bg: bgSelect.value,
      lastView
    }));
  }
  function loadState() {
    const s = localStorage.getItem('canvasState');
    if (s) {
      try {
        const st = JSON.parse(s);
        paths              = st.paths || [];
        objectsDescriptors = st.objects || [];
        translateX         = st.translateX || 0;
        translateY         = st.translateY || 0;
        scale              = st.scale || 1;
        bgSelect.value     = st.bg || bgSelect.value;
        lastView           = st.lastView || lastView;
      } catch (e) { console.error(e); }
    }
    recreateObjects();
    draw();
  }
  