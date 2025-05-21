// modules/grid.js

export function initGrid({ canvas, ctx, baseStep, minScale, maxScale, dpr }) {
  let scale = 1, originX = 0, originY = 0;

  const TH_OUT1   = 0.6, TH_OUT2 = 0.3;
  const FADE_OUT1 = TH_OUT1 - TH_OUT2;
  const FADE_OUT2 = TH_OUT2 - minScale;
  const TH_IN     = 1.5;
  const FADE_IN   = maxScale - TH_IN;
  const COARSE_MULT = 20;

  function setTransform(ns, nx, ny) {
    scale   = Math.max(minScale, Math.min(maxScale, ns));
    originX = nx;
    originY = ny;
  }

  function computeOut1() {
    return scale <= TH_OUT1 ? Math.min((TH_OUT1 - scale) / FADE_OUT1, 1) : 0;
  }
  function computeOut2() {
    return scale <= TH_OUT2 ? Math.min((TH_OUT2 - scale) / FADE_OUT2, 1) : 0;
  }
  function computeIn() {
    return scale >= TH_IN ? Math.min((scale - TH_IN) / FADE_IN, 1) : 0;
  }
  function computeBase() {
    const sum = computeOut1() + computeOut2() + computeIn();
    return Math.max(1 - sum, 0);
  }

  function drawLayer(stepSize, opacity) {
    if (opacity <= 0) return;
    ctx.save();
    ctx.strokeStyle = `rgba(204,204,204,${opacity})`;
    // FIX: dynamic line width
    ctx.lineWidth   = (0.5 + opacity * 1.5) / (dpr * scale);

    // FIX: calculate viewport in grid-space (CSS px)
    const widthGrid  = canvas.clientWidth  / scale;
    const heightGrid = canvas.clientHeight / scale;
    const oxGrid     = -originX / scale;
    const oyGrid     = -originY / scale;

    const startX = Math.floor(oxGrid / stepSize) * stepSize;
    const startY = Math.floor(oyGrid / stepSize) * stepSize;

    for (let x = startX; x <= oxGrid + widthGrid; x += stepSize) {
      ctx.beginPath();
      ctx.moveTo(x, oyGrid);
      ctx.lineTo(x, oyGrid + heightGrid);
      ctx.stroke();
    }
    for (let y = startY; y <= oyGrid + heightGrid; y += stepSize) {
      ctx.beginPath();
      ctx.moveTo(oxGrid, y);
      ctx.lineTo(oxGrid + widthGrid, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function draw() {
    // FIX: clear entire physical canvas
    ctx.resetTransform();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // FIX: apply DPR + pan + zoom separately for clarity
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.translate(originX, originY);
    ctx.scale(scale, scale);

    // FIX: draw layers
    drawLayer(baseStep * COARSE_MULT, computeOut2());
    drawLayer(baseStep * 4,          computeOut1());
    drawLayer(baseStep,              computeBase());
    drawLayer(baseStep / 2,          computeIn());

    ctx.restore();
  }

  return {
    draw,
    setTransform,
    get scale()   { return scale;   },
    get originX() { return originX; },
    get originY() { return originY; },
    MIN_SCALE: minScale,
    MAX_SCALE: maxScale,
  };
}