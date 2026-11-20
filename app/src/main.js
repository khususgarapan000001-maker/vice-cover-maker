// Leonida Nights — GTA 6 Cover Studio.
// A static offline poster maker: pick photos, choose one of six multi-panel
// layouts, grade it like a Vice City sunset, set the stacked-white title,
// and export a print-ready PNG in 1080x1080, 1080x1350 or 1920x1080.

const SAMPLES = [
  { name: 'Sunset Boulevard', src: 'samples/boulevard.jpg' },
  { name: 'Palm Pier', src: 'samples/pier.jpg' },
  { name: 'Neon Street', src: 'samples/neon-street.jpg' },
];

const LAYOUTS = [
  { id: 'hero4', name: 'Hero + 4' },
  { id: 'duo', name: 'Split Duo' },
  { id: 'fullbleed', name: 'Full Bleed Hero' },
  { id: 'triptych', name: 'Triptych' },
  { id: 'grid', name: 'Grid 2x2' },
  { id: 'filmstrip', name: 'Filmstrip' },
];

const GRADES = [
  { id: 'sunset', name: 'Vice Sunset', css: 'linear-gradient(135deg,#ff2e88,#ff7a3d,#ffd23d)', a: '#ff2e88', b: '#ff7a3d' },
  { id: 'neon', name: 'Neon Nights', css: 'linear-gradient(135deg,#ff00c8,#00e5ff,#7a00ff)', a: '#ff00c8', b: '#00e5ff' },
  { id: 'gold', name: 'Palm Gold', css: 'linear-gradient(135deg,#ffb300,#ff8a00,#fff3b0)', a: '#ffb300', b: '#ff8a00' },
  { id: 'noir', name: 'Mono Noir', css: 'linear-gradient(135deg,#000,#666,#fff)', a: '#111111', b: '#888888' },
  { id: 'ocean', name: 'Ocean Drive', css: 'linear-gradient(135deg,#00b3a6,#ff5e8a,#00e5ff)', a: '#00b3a6', b: '#ff5e8a' },
  { id: 'haze', name: 'Heat Haze', css: 'linear-gradient(135deg,#ff3d00,#ff9a3d,#ff2e63)', a: '#ff3d00', b: '#ff9a3d' },
];

const state = {
  layout: 'hero4',
  grade: 'sunset',
  intensity: 0.8,
  title1: 'LEONIDA',
  title2: 'NIGHTS',
  subtitle: 'where the sun never sets on the hustle',
  tagline: 'ONE CITY. EVERY SECRET HAS A VIEW.',
  billing: 'A FAN-MADE POSTER STUDIO • NOT AFFILIATED WITH ROCKSTAR GAMES • LEONIDA NIGHTS',
  callouts: ['THE GETAWAY', 'OCEAN DRIVE', 'LAST LIGHT'],
  gradientTitle: false,
  halftone: true,
  seal: true,
  burst: true,
  ribbon: true,
  activePhoto: 0,
  selectedPanel: 0,
  panels: [], // per panel: { photo, zoom, ox, oy }
};

const canvas = document.getElementById('cover');
const ctx = canvas.getContext('2d');
const images = [];
let imagesReady = 0;

SAMPLES.forEach((s, i) => {
  const img = new Image();
  img.onload = () => { imagesReady++; render(); };
  img.src = s.src;
  images[i] = img;
});

// Panels are unit rects; layoutPanels scales them to the cover size.
function layoutPanels(id, W, H) {
  const g = 6; // gutter px at export scale
  const u = (x, y, w, h) => ({ x: x * W, y: y * H, w: w * W, h: h * H });
  switch (id) {
    case 'hero4': return [
      u(0, 0, 0.6, 1),
      u(0.6, 0, 0.2, 0.5), u(0.8, 0, 0.2, 0.5),
      u(0.6, 0.5, 0.2, 0.5), u(0.8, 0.5, 0.2, 0.5)];
    case 'duo': return [u(0, 0, 0.5, 0.8), u(0.5, 0, 0.5, 0.8), u(0, 0.8, 1, 0.2)];
    case 'fullbleed': return [u(0, 0, 1, 1)];
    case 'triptych': return [u(0, 0, 1 / 3, 1), u(1 / 3, 0, 1 / 3, 1), u(2 / 3, 0, 1 / 3, 1)];
    case 'grid': return [
      u(0, 0, 0.5, 0.5), u(0.5, 0, 0.5, 0.5),
      u(0, 0.5, 0.5, 0.5), u(0.5, 0.5, 0.5, 0.5)];
    case 'filmstrip': return [
      u(0, 0, 1, 0.7),
      u(0, 0.7, 0.25, 0.3), u(0.25, 0.7, 0.25, 0.3),
      u(0.5, 0.7, 0.25, 0.3), u(0.75, 0.7, 0.25, 0.3)];
    default: return [u(0, 0, 1, 1)];
  }
}

function panelCount() { return layoutPanels(state.layout, 100, 100).length; }

function ensurePanels() {
  const n = panelCount();
  while (state.panels.length < n) {
    state.panels.push({ photo: state.activePhoto, zoom: 1.15, ox: 0, oy: 0 });
  }
  state.panels.length = n;
  if (state.selectedPanel >= n) state.selectedPanel = 0;
}

function gradeOf(id) { return GRADES.find((g) => g.id === id) || GRADES[0]; }

// Draw one photo into a panel rect, cover-fit, with per-panel zoom + offset.
function drawPhoto(c, img, r, p) {
  if (!img || !img.naturalWidth) { c.fillStyle = '#241631'; c.fillRect(r.x, r.y, r.w, r.h); return; }
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const scale = Math.max(r.w / iw, r.h / ih) * p.zoom;
  const dw = iw * scale, dh = ih * scale;
  const dx = r.x + (r.w - dw) / 2 + p.ox * r.w;
  const dy = r.y + (r.h - dh) / 2 + p.oy * r.h;
  c.save();
  c.beginPath(); c.rect(r.x, r.y, r.w, r.h); c.clip();
  if (state.grade === 'noir') c.filter = 'grayscale(1) contrast(1.25)';
  c.drawImage(img, dx, dy, dw, dh);
  c.filter = 'none';
  c.restore();
}

// Deterministic grain so two exports of the same cover match.
function grain(c, W, H, seed) {
  let s = seed;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  c.save(); c.globalAlpha = 0.06;
  for (let i = 0; i < 1400; i++) {
    const v = Math.floor(rnd() * 255);
    c.fillStyle = v > 127 ? '#fff' : '#000';
    c.fillRect(rnd() * W, rnd() * H, 2, 2);
  }
  c.restore();
}

function halftoneDots(c, W, H) {
  c.save(); c.fillStyle = 'rgba(0,0,0,0.16)';
  const step = Math.max(10, W / 90);
  for (let y = step / 2; y < H; y += step) {
    for (let x = step / 2; x < W; x += step) {
      if ((x + y) % (step * 4) < step * 2) continue;
      c.beginPath(); c.arc(x, y, step * 0.16, 0, Math.PI * 2); c.fill();
    }
  }
  c.restore();
}

function starburst(c, cx, cy, r, text) {
  c.save();
  c.translate(cx, cy);
  c.fillStyle = '#ffd23d';
  c.strokeStyle = '#111'; c.lineWidth = Math.max(2, r * 0.08);
  c.beginPath();
  const spikes = 12;
  for (let i = 0; i < spikes * 2; i++) {
    const rr = i % 2 === 0 ? r : r * 0.72;
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
  }
  c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#111';
  c.font = `900 ${r * 0.34}px Archivo, sans-serif`;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(text, 0, -r * 0.14);
  c.font = `900 ${r * 0.24}px Archivo, sans-serif`;
  c.fillText('NEW', 0, r * 0.22);
  c.restore();
}

function sealStamp(c, cx, cy, r) {
  c.save();
  c.translate(cx, cy); c.rotate(-0.18);
  c.strokeStyle = '#fff'; c.lineWidth = Math.max(2, r * 0.07);
  c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.arc(0, 0, r * 0.78, 0, Math.PI * 2); c.stroke();
  c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = `900 ${r * 0.26}px Archivo, sans-serif`;
  c.fillText('EST. 2026', 0, -r * 0.28);
  c.font = `${r * 0.3}px Caveat, cursive`;
  c.fillText('Leonida', 0, r * 0.08);
  c.font = `900 ${r * 0.2}px Archivo, sans-serif`;
  c.fillText('★ ★ ★', 0, r * 0.45);
  c.restore();
}

// The cover itself: panels + grade + stacked-white lettering + print details.
function drawCover(c, W, H) {
  ensurePanels();
  const grade = gradeOf(state.grade);
  const rects = layoutPanels(state.layout, W, H);
  c.clearRect(0, 0, W, H);
  c.fillStyle = '#0e0a12'; c.fillRect(0, 0, W, H);

  rects.forEach((r, i) => {
    const inset = Math.max(2, W * 0.004);
    drawPhoto(c, images[state.panels[i].photo], { x: r.x + inset, y: r.y + inset, w: r.w - inset * 2, h: r.h - inset * 2 }, state.panels[i]);
    c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = Math.max(1.5, W * 0.002);
    c.strokeRect(r.x + inset, r.y + inset, r.w - inset * 2, r.h - inset * 2);
  });

  // Grade wash: a duotone overlay whose strength follows the slider, so
  // the exported PNG carries exactly the grade the preview shows.
  const k = state.intensity;
  if (state.grade !== 'noir' || k > 0) {
    const g = c.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, grade.a); g.addColorStop(1, grade.b);
    c.save(); c.globalAlpha = (state.grade === 'noir' ? 0.18 : 0.42) * k;
    c.globalCompositeOperation = 'overlay'; c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'soft-light'; c.fillRect(0, 0, W, H);
    c.restore();
  }
  const vg = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.34)');
  c.fillStyle = vg; c.fillRect(0, 0, W, H);
  grain(c, W, H, 1234567);
  if (state.halftone) halftoneDots(c, W, H);

  const pad = W * 0.035;
  const titleSize = Math.min(W * 0.115, H * 0.24);
  const bandH = H * 0.16;

  // Bottom caption band behind the title.
  c.save();
  const band = c.createLinearGradient(0, H - bandH * 2.1, 0, H);
  band.addColorStop(0, 'rgba(10,4,16,0)'); band.addColorStop(1, 'rgba(10,4,16,0.82)');
  c.fillStyle = band; c.fillRect(0, H - bandH * 2.1, W, bandH * 2.1);
  c.restore();

  // Stacked white block title with heavy black outline + drop shadow.
  c.save();
  c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  c.font = `${titleSize}px Anton, sans-serif`;
  c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = W * 0.012; c.shadowOffsetY = W * 0.006;
  c.lineJoin = 'round'; c.lineWidth = Math.max(3, titleSize * 0.09);
  c.strokeStyle = '#0a0410';
  const y2 = H - H * 0.085;
  const y1 = y2 - titleSize * 1.02;
  let fill;
  if (state.gradientTitle) {
    fill = c.createLinearGradient(pad, y1 - titleSize, pad, y2);
    fill.addColorStop(0, '#ffd23d'); fill.addColorStop(0.5, '#ff5e8a'); fill.addColorStop(1, '#7a00ff');
  } else { fill = '#ffffff'; }
  c.fillStyle = fill;
  if (state.title1) { c.strokeText(state.title1.toUpperCase(), pad, y1); c.fillText(state.title1.toUpperCase(), pad, y1); }
  if (state.title2) { c.strokeText(state.title2.toUpperCase(), pad, y2); c.fillText(state.title2.toUpperCase(), pad, y2); }
  c.restore();

  // Script subtitle tucked under the title block.
  c.save();
  c.font = `${Math.max(14, titleSize * 0.34)}px Caveat, cursive`;
  c.fillStyle = '#ffd23d';
  c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 6;
  c.textAlign = 'left'; c.textBaseline = 'top';
  c.fillText(state.subtitle, pad, H - H * 0.062);
  c.restore();

  // Tagline strip + billing block at the very bottom.
  const stripH = Math.max(18, H * 0.042);
  c.fillStyle = '#0a0410'; c.fillRect(0, H - stripH, W, stripH);
  c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = `800 ${stripH * 0.52}px Archivo, sans-serif`;
  c.fillText(state.tagline.toUpperCase(), W / 2, H - stripH / 2, W * 0.96);
  c.font = `400 ${Math.max(8, H * 0.011)}px Archivo, sans-serif`;
  c.fillStyle = 'rgba(255,255,255,0.75)';
  c.fillText(state.billing.toUpperCase(), W / 2, H - stripH - Math.max(9, H * 0.014), W * 0.96);

  // Callouts with leader lines on the small panels.
  c.save();
  c.font = `800 ${Math.max(10, W * 0.014)}px Archivo, sans-serif`;
  c.textAlign = 'left'; c.textBaseline = 'bottom';
  state.callouts.forEach((label, i) => {
    const r = rects[(i + 1) % rects.length];
    if (!r || !label) return;
    const lx = r.x + r.w * 0.08, ly = r.y + r.h * 0.3;
    const tx = lx + W * 0.01, ty = ly - H * 0.015;
    c.strokeStyle = '#fff'; c.lineWidth = Math.max(1.5, W * 0.002);
    c.beginPath(); c.moveTo(lx, ly); c.lineTo(lx + W * 0.03, ly - H * 0.04); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(lx, ly, Math.max(2, W * 0.003), 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffd23d';
    c.fillText(label.toUpperCase(), tx, ty);
  });
  c.restore();

  // Print details: seal, star-burst, corner ribbon.
  if (state.seal) sealStamp(c, W - W * 0.075, H * 0.13, Math.min(W, H) * 0.075);
  if (state.burst) starburst(c, W * 0.07, H * 0.11, Math.min(W, H) * 0.055, 'VICE');
  if (state.ribbon) {
    c.save();
    c.translate(0, 0); c.rotate(0);
    c.fillStyle = '#ff2e63';
    c.beginPath();
    c.moveTo(0, H * 0.02); c.lineTo(W * 0.16, H * 0.02); c.lineTo(W * 0.13, H * 0.065); c.lineTo(0, H * 0.065);
    c.closePath(); c.fill();
    c.fillStyle = '#fff'; c.font = `800 ${Math.max(10, H * 0.02)}px Archivo, sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('LEONIDA', W * 0.07, H * 0.043);
    c.restore();
  }

  // Selected panel outline in the live preview only.
  if (c === ctx && rects[state.selectedPanel]) {
    const r = rects[state.selectedPanel];
    c.save();
    c.strokeStyle = '#ffd23d'; c.lineWidth = 4; c.setLineDash([10, 6]);
    c.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
    c.restore();
  }
}

function render() {
  if (!imagesReady) return;
  drawCover(ctx, canvas.width, canvas.height);
  window.__shotReady = true;
}

function exportPNG() {
  const [w, h] = document.getElementById('sizeSelect').value.split('x').map(Number);
  const off = document.createElement('canvas');
  off.width = w; off.height = h;
  drawCover(off.getContext('2d'), w, h);
  return new Promise((resolve) => off.toBlob((b) => resolve(b), 'image/png'));
}

async function downloadExport() {
  const blob = await exportPNG();
  if (!blob) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `leonida-nights-${document.getElementById('sizeSelect').value}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

// --- Controls -------------------------------------------------------------
function buildPickers() {
  const lp = document.getElementById('layoutPicker');
  LAYOUTS.forEach((l) => {
    const b = document.createElement('button');
    b.className = 'pick' + (l.id === state.layout ? ' active' : '');
    b.textContent = l.name;
    b.onclick = () => {
      state.layout = l.id; ensurePanels(); render();
      lp.querySelectorAll('.pick').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
    };
    lp.appendChild(b);
  });
  const gp = document.getElementById('gradePicker');
  GRADES.forEach((g) => {
    const b = document.createElement('button');
    b.className = 'pick' + (g.id === state.grade ? ' active' : '');
    const sw = document.createElement('span');
    sw.className = 'swatch'; sw.style.background = g.css;
    b.appendChild(sw);
    b.appendChild(document.createTextNode(g.name));
    b.onclick = () => {
      state.grade = g.id; render();
      gp.querySelectorAll('.pick').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
    };
    gp.appendChild(b);
  });
  const sm = document.getElementById('samples');
  SAMPLES.forEach((s, i) => {
    const img = document.createElement('img');
    img.src = s.src; img.alt = s.name; img.title = s.name;
    if (i === 0) img.classList.add('active');
    img.onclick = () => {
      state.activePhoto = i;
      sm.querySelectorAll('img').forEach((x) => x.classList.remove('active'));
      img.classList.add('active');
    };
    sm.appendChild(img);
  });
}

function bindText(id, key, transform) {
  document.getElementById(id).addEventListener('input', (e) => {
    state[key] = transform ? transform(e.target.value) : e.target.value;
    render();
  });
}
bindText('title1', 'title1');
bindText('title2', 'title2');
bindText('subtitle', 'subtitle');
bindText('tagline', 'tagline');
bindText('billing', 'billing');
['callout1', 'callout2', 'callout3'].forEach((id, i) => {
  document.getElementById(id).addEventListener('input', (e) => { state.callouts[i] = e.target.value; render(); });
});

document.getElementById('gradeSlider').addEventListener('input', (e) => { state.intensity = Number(e.target.value); render(); });
document.getElementById('zoomSlider').addEventListener('input', (e) => {
  ensurePanels();
  state.panels[state.selectedPanel].zoom = Number(e.target.value);
  render();
});
document.getElementById('gradientToggle').addEventListener('change', (e) => { state.gradientTitle = e.target.checked; render(); });
document.getElementById('halftoneToggle').addEventListener('change', (e) => { state.halftone = e.target.checked; render(); });
document.getElementById('sealToggle').addEventListener('change', (e) => { state.seal = e.target.checked; render(); });
document.getElementById('burstToggle').addEventListener('change', (e) => { state.burst = e.target.checked; render(); });
document.getElementById('ribbonToggle').addEventListener('change', (e) => { state.ribbon = e.target.checked; render(); });
document.getElementById('exportBtn').addEventListener('click', downloadExport);
document.getElementById('fillAllBtn').addEventListener('click', () => {
  ensurePanels();
  state.panels.forEach((p) => { p.photo = state.activePhoto; });
  render();
});

document.getElementById('fileInput').addEventListener('change', (e) => {
  const files = [...e.target.files];
  files.forEach((f) => {
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => { images.push(img); imagesReady++; render(); };
    img.src = url;
    SAMPLES.push({ name: f.name, src: url });
    const sm = document.getElementById('samples');
    const thumb = document.createElement('img');
    thumb.src = url; thumb.alt = f.name;
    thumb.onclick = () => { state.activePhoto = images.length - 1; sm.querySelectorAll('img').forEach((x) => x.classList.remove('active')); thumb.classList.add('active'); };
    sm.appendChild(thumb);
  });
  e.target.value = '';
});

// Click a panel to select + assign the active photo; drag to reposition it.
let drag = null;
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) };
}
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const rects = layoutPanels(state.layout, canvas.width, canvas.height);
  const i = rects.findIndex((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
  if (i < 0) return;
  ensurePanels();
  state.selectedPanel = i;
  state.panels[i].photo = state.activePhoto;
  document.getElementById('zoomSlider').value = state.panels[i].zoom;
  drag = { x: p.x, y: p.y, ox: state.panels[i].ox, oy: state.panels[i].oy };
  canvas.setPointerCapture(e.pointerId);
  render();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const r = layoutPanels(state.layout, canvas.width, canvas.height)[state.selectedPanel];
  const panel = state.panels[state.selectedPanel];
  panel.ox = drag.ox + (p.x - drag.x) / r.w;
  panel.oy = drag.oy + (p.y - drag.y) / r.h;
  render();
});
canvas.addEventListener('pointerup', () => { drag = null; });

// Headless hooks for the maker's screenshot script: render any cover on demand.
window.Leonida = {
  state,
  setCover(opts) {
    Object.assign(state, opts);
    if (opts.photos) state.panels = opts.photos.map((photo) => ({ photo, zoom: 1.15, ox: 0, oy: 0 }));
    if (opts.callouts) state.callouts = opts.callouts;
    ensurePanels();
    render();
  },
  exportDataURL(w, h) {
    const off = document.createElement('canvas');
    off.width = w; off.height = h;
    drawCover(off.getContext('2d'), w, h);
    return off.toDataURL('image/png');
  },
};

buildPickers();
ensurePanels();
if (document.fonts && document.fonts.ready) {
  document.fonts.load('16px Anton').then(render).catch(render);
  document.fonts.load('16px Caveat').then(render).catch(render);
  document.fonts.ready.then(render);
}
render();
