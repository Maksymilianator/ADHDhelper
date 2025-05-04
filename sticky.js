// Dodawanie karteczek
function addSticky(cx, cy) {
    const world = screenToWorld(cx, cy);
    const size = 150 / scale;
    pushState();
    createDescriptor({
      type: 'sticky',
      x: world.x,
      y: world.y,
      w: size,
      h: size,
      rotation: 0,
      color: stickyColorInput.value,
      text: ''
    });
    currentTool = 'pointer'; updateActiveTool();
  }
  