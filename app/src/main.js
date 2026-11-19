// Vice Cover Maker — offline GTA-style multi-panel cover art maker.
// All state lives in `coverState`; renderCover draws any size to any canvas.
const $ = (id) => document.getElementById(id);

const canvas = $('coverCanvas');
const ctx = canvas.getContext('2d');

const SAMPLE_PHOTOS = [
  { src: 'samples/sunset-car.jpg', name: 'Sunset car' },
  { src: 'samples/boulevard.jpg', name: 'Boulevard' },
  { src: 'samples/pier.jpg', name: 'Pier' },
  { src: 'samples/neon-street.jpg', name: 'Neon street' },
];

const coverState = {
  layout: 'hero4',
  grade: 'sunset',
  intensity: 0.8,
  title: 'SUNSET KEYS',
  subtitle: 'every street is a stage',
  tagline: 'ONE CITY. EVERY SECRET HAS A VIEW.',
  badge: 'EST. 2026',
  exportSize: '1920x1080',
  selectedPanel: 0,
  photos: [], // { img, name, src }
  panels: [], // { photo, zoom, ox, oy } — photo is an index into photos, -1 = empty
};

const LAYOUT_PANEL_COUNT = { hero4: 5, duo: 3, fullbleed: 1 };

function defaultPanelAssignment() {
  // Sunset car leads, the other samples fill the rest; repeats are fine.
  const order = [0, 1, 2, 3, 1];
  const n = LAYOUT_PANEL_COUNT[coverState.layout];
  return Array.from({ length: n }, (_, i) => ({
    photo: order[i % order.length],
    zoom: 1.1,
    ox: 0,
    oy: 0,
  }));
}

// ------------------------------------------------------------ layout geometry
// Panel rects as fractions of the cover; the bottom 22% is the caption band.
function layoutPanels(layout, W, H) {
  const m = 0.018 * W; // outer margin
  const g = 0.01 * W; // panel gap
  const top = m;
  const bottom = 0.76 * H; // panels end here
  const ph = bottom - top;
  if (layout === 'hero4') {
    const heroW = 0.52 * W;
    const rx = m + heroW + g;
    const rw = W - m - rx;
    const sw = (rw - g) / 2;
    const sh = (ph - g) / 2;
    return [
      { x: m, y: top, w: heroW, h: ph },
      { x: rx, y: top, w: sw, h: sh },
      { x: rx + sw + g, y: top, w: sw, h: sh },
      { x: rx, y: top + sh + g, w: sw, h: sh },
      { x: rx + sw + g, y: top + sh + g, w: sw, h: sh },
    ];
  }
  if (layout === 'duo') {
    const pw = (W - 2 * m - g) / 2;
    const tallH = 0.6 * H;
    return [
      { x: m, y: top, w: pw, h: tallH },
      { x: m + pw + g, y: top, w: pw, h: tallH },
      { x: m, y: top + tallH + g, w: W - 2 * m, h: bottom - top - tallH - g },
    ];
  }
  // fullbleed
  return [{ x: m, y: top, w: W - 2 * m, h: ph }];
}

// ------------------------------------------------------------ colour grades
const GRADES = {
  sunset: {
    filter: 'saturate(1.35) contrast(1.08) sepia(0.15)',
    stops: ['#ff2e88', '#ff7a1a', '#ffc93c'],
    mode: 'soft-light',
  },
  neon: {
    filter: 'saturate(1.5) contrast(1.12) hue-rotate(-12deg)',
    stops: ['#ff2e88', '#7a1aff', '#19e3d6'],
    mode: 'overlay',
  },
  gold: {
    filter: 'saturate(1.3) contrast(1.05) sepia(0.35)',
    stops: ['#ffb347', '#ff8c00', '#ffe259'],
    mode: 'soft-light',
  },
  noir: {
    filter: 'grayscale(1) contrast(1.28) brightness(1.05)',
    stops: ['#ff2e88', '#222222'],
    mode: 'overlay',
  },
};

function drawCoverPhoto(c, rect, panel) {
  const photo = coverState.photos[panel.photo];
  c.save();
  c.beginPath();
  c.rect(rect.x, rect.y, rect.w, rect.h);
  c.clip();
  if (!photo || !photo.img) {
    const grad = c.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    grad.addColorStop(0, '#3a1a5e');
    grad.addColorStop(1, '#12081c');
    c.fillStyle = grad;
    c.fillRect(rect.x, rect.y, rect.w, rect.h);
    c.restore();
    return;
  }
  const img = photo.img;
  const grade = GRADES[coverState.grade];
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * panel.zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = rect.x + (rect.w - dw) / 2 + panel.ox * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + panel.oy * rect.h;
  c.filter = grade.filter;
  c.drawImage(img, dx, dy, dw, dh);
  c.filter = 'none';
  // Grade tint over this panel only.
  const tint = c.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  grade.stops.forEach((s, i) => tint.addColorStop(i / (grade.stops.length - 1), s));
  c.globalCompositeOperation = grade.mode;
  c.globalAlpha = coverState.intensity * (coverState.grade === 'noir' ? 0.35 : 0.55);
  c.fillStyle = tint;
  c.fillRect(rect.x, rect.y, rect.w, rect.h);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
  c.restore();
}

function drawPanelFrames(c, rects) {
  c.save();
  c.lineWidth = Math.max(2, 0.004 * c.canvas.width);
  c.strokeStyle = 'rgba(255,255,255,0.92)';
  for (const r of rects) c.strokeRect(r.x, r.y, r.w, r.h);
  c.restore();
}

// ------------------------------------------------------------ lettering
function fitFont(c, text, maxWidth, startPx, family, weight) {
  let px = startPx;
  c.font = `${weight} ${px}px ${family}`;
  while (px > 12 && c.measureText(text).width > maxWidth) {
    px -= 2;
    c.font = `${weight} ${px}px ${family}`;
  }
  return px;
}

function drawTitleBlock(c, W, H) {
  const bandY = 0.76 * H;
  // Caption band: dark gradient rising out of the photos.
  const band = c.createLinearGradient(0, bandY - 0.06 * H, 0, H);
  band.addColorStop(0, 'rgba(12,4,24,0)');
  band.addColorStop(0.35, 'rgba(12,4,24,0.82)');
  band.addColorStop(1, 'rgba(12,4,24,0.96)');
  c.fillStyle = band;
  c.fillRect(0, bandY - 0.06 * H, W, H - bandY + 0.06 * H);

  const m = 0.03 * W;
  const title = coverState.title || 'SUNSET KEYS';
  const titlePx = fitFont(c, title, W - 2 * m, 0.13 * H, 'Anton, sans-serif', 400);
  const titleY = H - 0.085 * H;
  const grad = c.createLinearGradient(m, titleY - titlePx, m, titleY);
  grad.addColorStop(0, '#ffe259');
  grad.addColorStop(0.45, '#ff7a1a');
  grad.addColorStop(1, '#ff2e88');
  c.save();
  c.textBaseline = 'alphabetic';
  c.lineJoin = 'round';
  c.font = `${titlePx}px Anton, sans-serif`;
  c.strokeStyle = '#1a0526';
  c.lineWidth = Math.max(3, titlePx * 0.07);
  c.strokeText(title, m, titleY);
  c.fillStyle = grad;
  c.fillText(title, m, titleY);
  c.restore();

  // Script subtitle, tucked right of / above the title.
  const subPx = Math.max(14, 0.038 * H);
  c.save();
  c.font = `700 ${subPx}px Caveat, cursive`;
  c.fillStyle = '#19e3d6';
  c.shadowColor = 'rgba(0,0,0,0.7)';
  c.shadowBlur = 6;
  c.textAlign = 'right';
  c.fillText(coverState.subtitle, W - m, bandY + 0.045 * H);
  c.restore();

  // Tagline strip along the very bottom.
  const stripH = 0.045 * H;
  c.fillStyle = '#ff2e88';
  c.fillRect(0, H - stripH, W, stripH);
  const tagPx = fitFont(c, coverState.tagline, W - 2 * m, 0.026 * H, 'Archivo, sans-serif', 800);
  c.save();
  c.font = `800 ${tagPx}px Archivo, sans-serif`;
  c.fillStyle = '#ffffff';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(coverState.tagline, W / 2, H - stripH / 2);
  c.restore();
}

function drawStarburst(c, cx, cy, r, points, text) {
  c.save();
  c.translate(cx, cy);
  c.rotate(-0.2);
  c.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rr = i % 2 === 0 ? r : r * 0.72;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.closePath();
  c.fillStyle = '#ffc93c';
  c.fill();
  c.lineWidth = Math.max(2, r * 0.06);
  c.strokeStyle = '#1a0526';
  c.stroke();
  c.fillStyle = '#1a0526';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const px = fitFont(c, text, r * 1.5, r * 0.34, 'Archivo, sans-serif', 800);
  c.font = `800 ${px}px Archivo, sans-serif`;
  c.fillText(text, 0, 0);
  c.restore();
}

function drawStar(c, cx, cy, r, fill) {
  c.save();
  c.translate(cx, cy);
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  c.restore();
}

function drawStickers(c, W, H) {
  const r = 0.062 * Math.min(W, H);
  const cx = W - r - 0.035 * W;
  const cy = r + 0.035 * H;
  drawStarburst(c, cx, cy, r, 12, coverState.badge);
  // Heat stars: five gold stars under the badge.
  const sr = 0.016 * Math.min(W, H);
  const gap = sr * 2.6;
  const startX = cx - gap * 2;
  const starY = cy + r * 1.3;
  for (let i = 0; i < 5; i++) drawStar(c, startX + i * gap, starY, sr, '#ffc93c');
}

function drawVignette(c, W, H) {
  const v = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(10,2,20,0.35)');
  c.fillStyle = v;
  c.fillRect(0, 0, W, H);
}

// ------------------------------------------------------------ the render
function renderCover(c, W, H) {
  c.clearRect(0, 0, W, H);
  c.fillStyle = '#12081c';
  c.fillRect(0, 0, W, H);
  const rects = layoutPanels(coverState.layout, W, H);
  rects.forEach((rect, i) => {
    const panel = coverState.panels[i] || { photo: -1, zoom: 1.1, ox: 0, oy: 0 };
    drawCoverPhoto(c, rect, panel);
  });
  drawPanelFrames(c, rects);
  drawVignette(c, W, H);
  drawTitleBlock(c, W, H);
  drawStickers(c, W, H);
}

function renderPreview() {
  const [w, h] = coverState.exportSize.split('x').map(Number);
  const aspect = w / h;
  const pw = 960;
  const ph = Math.round(pw / aspect);
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw;
    canvas.height = ph;
  }
  renderCover(ctx, pw, ph);
}

// ------------------------------------------------------------ photos
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadSamplePhotos() {
  for (const s of SAMPLE_PHOTOS) {
    try {
      const img = await loadImage(s.src);
      coverState.photos.push({ img, name: s.name, src: s.src });
    } catch {
      // A missing sample just leaves the panel dark; the app still works.
    }
  }
  coverState.panels = defaultPanelAssignment();
  buildPhotoStrip();
  renderPreview();
}

function buildPhotoStrip() {
  const strip = $('photoStrip');
  strip.innerHTML = '';
  coverState.photos.forEach((p, i) => {
    const thumb = document.createElement('img');
    thumb.src = p.src;
    thumb.alt = p.name;
    thumb.title = `${p.name} — click to put in the selected panel`;
    if (coverState.panels.some((panel) => panel.photo === i)) thumb.classList.add('assigned');
    thumb.addEventListener('click', () => {
      assignPhotoToPanel(i);
    });
    strip.appendChild(thumb);
  });
}

function assignPhotoToPanel(photoIndex) {
  const panel = coverState.panels[coverState.selectedPanel];
  if (!panel) return;
  panel.photo = photoIndex;
  panel.zoom = 1.1;
  panel.ox = 0;
  panel.oy = 0;
  buildPhotoStrip();
  renderPreview();
}

function fillAllPanels() {
  const src = coverState.panels[coverState.selectedPanel]?.photo ?? 0;
  for (const panel of coverState.panels) {
    panel.photo = src;
    panel.zoom = 1.1;
    panel.ox = 0;
    panel.oy = 0;
  }
  buildPhotoStrip();
  renderPreview();
}

async function addUserPhotos(files) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      coverState.photos.push({ img, name: file.name, src: url });
    } catch {
      URL.revokeObjectURL(url);
    }
  }
  buildPhotoStrip();
  renderPreview();
}

// ------------------------------------------------------------ export
function renderToDataURL(w, h) {
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  renderCover(off.getContext('2d'), w, h);
  return off.toDataURL('image/png');
}

function exportCover() {
  const [w, h] = coverState.exportSize.split('x').map(Number);
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  renderCover(off.getContext('2d'), w, h);
  off.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
}

// ------------------------------------------------------------ panel picking + drag
function panelAtPoint(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * canvas.width;
  const y = ((clientY - rect.top) / rect.height) * canvas.height;
  const rects = layoutPanels(coverState.layout, canvas.width, canvas.height);
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return { index: i, x, y, rect: r };
  }
  return null;
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const hit = panelAtPoint(e.clientX, e.clientY);
  if (!hit) return;
  coverState.selectedPanel = hit.index;
  syncPanelControls();
  const panel = coverState.panels[hit.index];
  drag = { x: hit.x, y: hit.y, ox: panel.ox, oy: panel.oy, rect: hit.rect };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
  const panel = coverState.panels[coverState.selectedPanel];
  panel.ox = Math.max(-0.5, Math.min(0.5, drag.ox + (x - drag.x) / drag.rect.w));
  panel.oy = Math.max(-0.5, Math.min(0.5, drag.oy + (y - drag.y) / drag.rect.h));
  renderPreview();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('pointercancel', () => { drag = null; });

// ------------------------------------------------------------ controls
function syncPanelControls() {
  const panel = coverState.panels[coverState.selectedPanel];
  if (!panel) return;
  $('panelZoom').value = Math.round(panel.zoom * 100);
  $('panelZoomVal').textContent = `${panel.zoom.toFixed(2)}×`;
}

function bindControls() {
  $('layoutSeg').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-layout]');
    if (!btn) return;
    coverState.layout = btn.dataset.layout;
    coverState.selectedPanel = 0;
    coverState.panels = defaultPanelAssignment();
    document.querySelectorAll('#layoutSeg button').forEach((b) => b.classList.toggle('active', b === btn));
    buildPhotoStrip();
    syncPanelControls();
    renderPreview();
  });
  $('gradeSeg').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-grade]');
    if (!btn) return;
    coverState.grade = btn.dataset.grade;
    document.querySelectorAll('#gradeSeg button').forEach((b) => b.classList.toggle('active', b === btn));
    renderPreview();
  });
  $('gradeIntensity').addEventListener('input', (e) => {
    coverState.intensity = Number(e.target.value) / 100;
    $('gradeIntensityVal').textContent = `${e.target.value}%`;
    renderPreview();
  });
  $('panelZoom').addEventListener('input', (e) => {
    const panel = coverState.panels[coverState.selectedPanel];
    if (!panel) return;
    panel.zoom = Number(e.target.value) / 100;
    $('panelZoomVal').textContent = `${panel.zoom.toFixed(2)}×`;
    renderPreview();
  });
  $('fillAllBtn').addEventListener('click', fillAllPanels);
  $('resetPanelBtn').addEventListener('click', () => {
    const panel = coverState.panels[coverState.selectedPanel];
    if (!panel) return;
    panel.zoom = 1.1;
    panel.ox = 0;
    panel.oy = 0;
    syncPanelControls();
    renderPreview();
  });
  $('titleInput').addEventListener('input', (e) => { coverState.title = e.target.value.toUpperCase(); renderPreview(); });
  $('subtitleInput').addEventListener('input', (e) => { coverState.subtitle = e.target.value; renderPreview(); });
  $('taglineInput').addEventListener('input', (e) => { coverState.tagline = e.target.value.toUpperCase(); renderPreview(); });
  $('badgeInput').addEventListener('input', (e) => { coverState.badge = e.target.value.toUpperCase(); renderPreview(); });
  $('exportSize').addEventListener('change', (e) => {
    coverState.exportSize = e.target.value;
    renderPreview();
  });
  $('exportBtn').addEventListener('click', exportCover);
  $('exportBtn2').addEventListener('click', exportCover);
  $('filePicker').addEventListener('change', (e) => {
    addUserPhotos([...e.target.files]);
    e.target.value = '';
  });
}

// ------------------------------------------------------------ boot + automation hooks
window.__viceCover = {
  state: coverState,
  renderToDataURL,
  exportCover,
  renderPreview,
  setLayout(layout) {
    coverState.layout = layout;
    coverState.panels = defaultPanelAssignment();
    renderPreview();
  },
  setGrade(grade) { coverState.grade = grade; renderPreview(); },
  setExportSize(size) { coverState.exportSize = size; renderPreview(); },
};

async function boot() {
  bindControls();
  syncPanelControls();
  try {
    await document.fonts.load('100px Anton');
    await document.fonts.load('700 40px Caveat');
    await document.fonts.load('800 20px Archivo');
    await document.fonts.ready;
  } catch {
    // Fonts fall back to system faces; the cover still renders.
  }
  await loadSamplePhotos();
  window.__viceCoverReady = true;
}

boot();
