// Warstwa obiektów: tworzenie, odtwarzanie, opisy
function recreateObjects() {
    objectLayer.innerHTML = '';
    objectsDescriptors.forEach(desc => createObjectFromDescriptor(desc));
  }
  
  function createObjectFromDescriptor(desc) {
    let el, screenX = desc.x*scale+translateX, screenY = desc.y*scale+translateY;
    let screenW = desc.w*scale, screenH = desc.h*scale;
    // rodzaj kształtu
    if (desc.type === 'circle' || desc.type === 'square') {
      el = document.createElement('div');
      el.style.border = '2px solid black';
      el.style.borderRadius = desc.type==='circle'? '50%':'0';
    } else if (desc.type === 'triangle') {
      el = document.createElement('div');
      el.style.width = screenW+'px'; el.style.height = screenH+'px';
      const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('width',screenW); svg.setAttribute('height',screenH);
      const poly = document.createElementNS('http://www.w3.org/2000/svg','polygon');
      poly.setAttribute('points',`${screenW/2},0 ${screenW},${screenH} 0,${screenH}`);
      poly.setAttribute('stroke','black'); poly.setAttribute('fill','transparent');
      svg.appendChild(poly);
      el.appendChild(svg);
    } else if (desc.type === 'sticky') {
      el = document.createElement('div');
      el.contentEditable = true;
      el.className = 'sticky-note';
      el.style.backgroundColor = desc.color;
      el.innerText = desc.text;
    } else if (desc.type === 'image') {
      el = document.createElement('div');
      const img = document.createElement('img');
      img.src = desc.src;
      img.draggable = false;   // ← wyłączamy drag
      img.style.width='100%'; img.style.height='100%';
      el.appendChild(img);
    } else if (desc.type === 'text') {
      el = document.createElement('div');
      el.contentEditable = true;
      el.innerText = desc.text;
      el.style.fontSize = desc.fontSize+'px';
      el.style.color = desc.color;
    }
    if (!el) return;
    el.classList.add('object');
    // oznacz typ i wyłącz od razu edycję tekstu/sticky
    el.dataset.type = desc.type;
    if (desc.type === 'sticky' || desc.type === 'text') {
    el.contentEditable = false;
    }
    el.style.left  = screenX + 'px';
    el.style.top   = screenY + 'px';
    el.style.width = screenW + 'px';
    el.style.height= screenH + 'px';
    el.style.transform = `rotate(${desc.rotation}deg)`;
    el.dataset.index   = objectsDescriptors.indexOf(desc);
    objectLayer.appendChild(el);
    addObjectEventHandlers(el);
  }
  
  // Dodanie opisu i elementu na warstwę
  function createDescriptor(desc) {
    objectsDescriptors.push(desc);
    createObjectFromDescriptor(desc);
  
    // Zapisz środek nowego obiektu jako ostatni punkt widoku
    lastView.pos   = {
      x: desc.x + desc.w/2,
      y: desc.y + desc.h/2
    };
    lastView.scale = scale;
  
    saveState();
  }
  
  // Eventy dla obiektów
  function addObjectEventHandlers(el) {
    // pojedynczy klik — tylko wybór / przesunięcie
    el.onmousedown = e => {
      if (e.button !== 0) return;      // tylko lewy
      e.stopPropagation();
      if (currentTool !== 'pointer') return;
  
      selectElement(el);
      isMoving = true;
      const r = el.getBoundingClientRect();
      moveOffset = { x: e.clientX - r.left, y: e.clientY - r.top };
  
      // przy pojedynczym kliknięciu nigdy nie wchodzimy w tryb edycji
      if (el.dataset.type === 'sticky' || el.dataset.type === 'text') {
        el.contentEditable = false;
      }
    };
  
    // podwójny klik — wchodzimy w tryb edycji tekstu/sticky
    el.addEventListener('dblclick', e => {
      if (el.dataset.type === 'sticky' || el.dataset.type === 'text') {
        e.stopPropagation();
        el.contentEditable = true;
        el.focus();
      }
    });
  }
  
  
  // Wybór i uchwyty
  let handles = [];
  function selectElement(el) {
    deselectElement();
    selectedElement = el;
    showHandles(el);
  }
  function deselectElement() {
    handles.forEach(h=>h.remove());
    handles = [];
    selectedElement = null;
  }
  function showHandles(el) {
    const rect = el.getBoundingClientRect();
    ['nw','ne','se','sw'].forEach(dir=>{
      const h = document.createElement('div');
      h.className='handle'; h.dataset.dir=dir;
      objectLayer.appendChild(h); handles.push(h);
    });
    const rh = document.createElement('div');
    rh.className='rotate-handle';
    objectLayer.appendChild(rh); handles.push(rh);
    positionHandles(rect);
  }
  function positionHandles(rect) {
    handles.forEach(h=>{
      const dir = h.dataset.dir;
      if (dir==='nw') { h.style.left=rect.left-4+'px'; h.style.top=rect.top-4+'px'; }
      if (dir==='ne') { h.style.left=rect.right-4+'px'; h.style.top=rect.top-4+'px'; }
      if (dir==='se') { h.style.left=rect.right-4+'px'; h.style.top=rect.bottom-4+'px'; }
      if (dir==='sw') { h.style.left=rect.left-4+'px'; h.style.top=rect.bottom-4+'px'; }
      if (!dir) { // rotate
        h.style.left = rect.left + rect.width/2 - 6+'px';
        h.style.top  = rect.top - 20+'px';
      }
    });
  }
  function updateDescriptorFromElement(el) {
    const idx = parseInt(el.dataset.index);
    if (isNaN(idx)) return;
    const desc = objectsDescriptors[idx];
    const r = el.getBoundingClientRect();
    const mid = screenToWorld(r.left + r.width/2, r.top + r.height/2);
    desc.x = mid.x - (r.width/2)/scale;
    desc.y = mid.y - (r.height/2)/scale;
    desc.w = r.width/scale;
    desc.h = r.height/scale;
    const m = el.style.transform.match(/rotate\(([-0-9.]+)deg\)/);
    desc.rotation = m? parseFloat(m[1]) : 0;
    if (desc.type==='sticky') desc.text = el.innerText;
    if (desc.type==='text') {
      desc.text = el.innerText;
      desc.fontSize = parseInt(el.style.fontSize);
      desc.color = el.style.color;
    }
    saveState();
  }
  