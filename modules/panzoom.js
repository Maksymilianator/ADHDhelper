// modules/panzoom.js

export function initPanZoom({ canvas, grid, onDraw }) {
  let isPanning = false, start = { x:0,y:0 };

  const ZF  = 1.1,
        MIN = grid.MIN_SCALE,
        MAX = grid.MAX_SCALE;

  canvas.addEventListener('mousedown', e => {
    if (e.button!==1) return;
    isPanning = true;
    start.x = e.clientX - grid.originX;
    start.y = e.clientY - grid.originY;
  });
  canvas.addEventListener('mousemove', e => {
    if (!isPanning) return;
    const nx = e.clientX - start.x,
          ny = e.clientY - start.y;
    grid.setTransform(grid.scale,nx,ny);
    onDraw();
  });
  canvas.addEventListener('mouseup',   e => { if(e.button===1) isPanning=false; });
  canvas.addEventListener('mouseleave',() => { isPanning=false; });

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const { scale, originX, originY } = grid;
    const mx = (e.clientX - originX)/scale,
          my = (e.clientY - originY)/scale;
    let ns = scale * (e.deltaY<0?ZF:1/ZF);
    ns = Math.max(MIN,Math.min(MAX,ns));
    const nx = e.clientX - mx*ns,
          ny = e.clientY - my*ns;
    grid.setTransform(ns,nx,ny);
    onDraw();
  });
}

