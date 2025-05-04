// Wczytywanie i wstawianie obrazków
let pendingImage = null;
imageBtn.onclick = () => imageLoader.click();
imageLoader.onchange = e => {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = ev => {
    pendingImage = ev.target.result;
    currentTool = 'placeImage';
    updateActiveTool();
  };
  reader.readAsDataURL(file);
};
function placeImage(cx, cy) {
  const world = screenToWorld(cx, cy);
  const size = 150 / scale;
  pushState();
  createDescriptor({
    type: 'image',
    x: world.x,
    y: world.y,
    w: size,
    h: size,
    rotation: 0,
    src: pendingImage
  });
  pendingImage = null;
  currentTool = 'pointer'; updateActiveTool();
}
