// Konwersja ekran→świat
function screenToWorld(x, y) {
    return { x: (x - translateX) / scale, y: (y - translateY) / scale };
  }
  // Ograniczenie skalowania
  function clampScale(s) {
    return Math.min(1.5, Math.max(0.5, s));
  }
  