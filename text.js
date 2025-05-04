// Dodawanie tekstu
function addText(cx, cy) {
    const world = screenToWorld(cx, cy);
    pushState();
    createDescriptor({
      type: 'text',
      x: world.x,
      y: world.y,
      w: 100/scale,
      h: 30/scale,
      rotation: 0,
      text: 'Text',
      fontSize: parseInt(textSizeInput.value),
      color: textColorInput.value
    });
    currentTool = 'pointer'; updateActiveTool();
  }
  