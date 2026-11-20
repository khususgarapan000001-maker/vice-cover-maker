// Leonida Nights — GTA 6 Cover Studio.
// Static offline app: draws multi-panel poster cover art on canvas from the
// user's own photos, with layouts, colour grades and print details, and
// exports exact-size PNGs (1080x1080, 1080x1350, 1920x1080).
'use strict';

const $ = (id) => document.getElementById(id);
const canvas = $('coverCanvas');
const ctx = canvas.getContext('2d');

// ---- Layouts: panels + text zones, all as fractions of the cover ----
const LAYOUTS = [
  {
    id: 'hero4', name: 'Hero + 4',
    panels: [[0, 0, 0.62, 1], [0.628, 0, 0.18, 0.492], [0.816, 0, 0.18, 0.492], [0.628, 0.508, 0.18, 0.492], [0.816, 0.508, 0.18, 0.492]],
    title: { x: 0.03, y: 0.58, w: 0.56, h: 0.32, align: 'left' },
    taglineY: 0.925, billingY: 0.968,
    seal: { x: 0.93, y: 0.09 }, burst: { x: 0.56, y: 0.10 },
    callouts: [
      { p: 0, ax: 0.72, ay: 0.22, lx: 0.66, ly: 0.06 },
      { p: 1, ax: 0.5, ay: 0.6, lx: 0.66, ly: 0.30 },
      { p: 4, ax: 0.5, ay: 0.4, lx: 0.70, ly: 0.72 },
    ],
  },
  {
    id: 'duo', name: 'Split Duo',
    panels: [[0, 0, 0.494, 0.78], [0.506, 0, 0.494, 0.78]],
    title: { x: 0.05, y: 0.795, w: 0.9, h: 0.13, align: 'center' },
    taglineY: 0.93, billingY: 0.968,
    seal: { x: 0.92, y: 0.08 }, burst: { x: 0.08, y: 0.08 },
    callouts: [
      { p: 0, ax: 0.7, ay: 0.3, lx: 0.06, ly: 0.42 },
      { p: 1, ax: 0.3, ay: 0.3, lx: 0.70, ly: 0.42 },
      { p: 0, ax: 0.5, ay: 0.65, lx: 0.36, ly: 0.60 },
    ],
  },
  {
    id: 'fullbleed', name: 'Full Bleed Hero',
    panels: [[0, 0, 1, 1]],
    title: { x: 0.04, y: 0.56, w: 0.92, h: 0.30, align: 'left' },
    taglineY: 0.915, billingY: 0.962,
    seal: { x: 0.90, y: 0.10 }, burst: { x: 0.86, y: 0.30 },
    callouts: [
      { p: 0, ax: 0.18, ay: 0.28, lx: 0.05, ly: 0.10 },
      { p: 0, ax: 0.82, ay: 0.42, lx: 0.68, ly: 0.18 },
      { p: 0, ax: 0.55, ay: 0.20, lx: 0.40, ly: 0.06 },
    ],
  },
  {
    id: 'triptych', name: 'Triptych',
    panels: [[0, 0.175, 0.326, 0.76], [0.337, 0.175, 0.326, 0.76], [0.674, 0.175, 0.326, 0.76]],
    title: { x: 0.05, y: 0.015, w: 0.9, h: 0.15, align: 'center' },
    taglineY: 0.945, billingY: 0.975,
    seal: { x: 0.90, y: 0.90 }, burst: { x: 0.08, y: 0.90 },
    callouts: [
      { p: 0, ax: 0.5, ay: 0.25, lx: 0.03, ly: 0.30 },
      { p: 1, ax: 0.5, ay: 0.55, lx: 0.38, ly: 0.72 },
      { p: 2, ax: 0.5, ay: 0.25, lx: 0.70, ly: 0.30 },
    ],
  },
  {
    id: 'grid', name: 'Grid 2x2',
    panels: [[0, 0, 0.494, 0.452], [0.506, 0, 0.494, 0.452], [0, 0.472, 0.494, 0.452], [0.506, 0.472, 0.494, 0.452]],
    title: { x: 0.05, y: 0.375, w: 0.9, h: 0.20, align: 'center', band: true },
    taglineY: 0.935, billingY: 0.970,
    seal: { x: 0.93, y: 0.07 }, burst: { x: 0.07, y: 0.07 },
    callouts: [
      { p: 0, ax: 0.7, ay: 0.3, lx: 0.05, ly: 0.16 },
      { p: 1, ax: 0.3, ay: 0.7, lx: 0.68, ly: 0.10 },
      { p: 3, ax: 0.6, ay: 0.3, lx: 0.62, ly: 0.60 },
    ],
  },
  {
    id: 'filmstrip', name: 'Filmstrip',
    panels: [[0, 0, 1, 0.66], [0, 0.68, 0.2425, 0.20], [0.2525, 0.68, 0.2425, 0.20], [0.505, 0.68, 0.2425, 0.20], [0.7575, 0.68, 0.2425, 0.20]],
    title: { x: 0.04, y: 0.40, w: 0.92, h: 0.24, align: 'left' },
    taglineY: 0.905, billingY: 0.952,
    seal: { x: 0.91, y: 0.09 }, burst: { x: 0.87, y: 0.50 },
    callouts: [
      { p: 0, ax: 0.2, ay: 0.25, lx: 0.05, ly: 0.08 },
      { p: 0, ax: 0.8, ay: 0.30, lx: 0.66, ly: 0.12 },
      { p: 2, ax: 0.5, ay: 0.5, lx: 0.30, ly: 0.70 },
    ],
  },
];

// ---- Colour grades (canvas-applied) ----
const GRADES = [
  { id: 'sunset', name: 'Vice Sunset', top: '#ff2e88', bottom: '#ff7a18', tint: '#ff9a3d', tintOp: 0.20, mono: false },
  { id: 'neon', name: 'Neon Nights', top: '#ff00c8', bottom: '#00e5ff', tint: '#7a00ff', tintOp: 0.20, mono: false },
  { id: 'gold', name: 'Palm Gold', top: '#ffd319', bottom: '#ff7a18', tint: '#ffcf5c', tintOp: 0.22, mono: false },
  { id: 'noir', name: 'Mono Noir', top: '#ffffff', bottom: '#111111', tint: '#ff2e88', tintOp: 0.12, mono: true },
  { id: 'ocean', name: 'Ocean Drive', top: '#00e5c7', bottom: '#ff2e88', tint: '#00b3a6', tintOp: 0.18, mono: false },
  { id: 'heat', name: 'Heat Haze', top: '#ff3d00', bottom: '#ffb300', tint: '#ff5a00', tintOp: 0.22, mono: false },
];

const SIZES = [
  { id: '1080x1080', w: 1080, h: 1080, label: '1080 × 1080' },
  { id: '1080x1350', w: 1080, h: 1350, label: '1080 × 1350' },
  { id: '1920x1080', w: 1920, h: 1080, label: '1920 × 1080' },
];

// ---- State ----
const state = {
  layout: 2, // Full Bleed Hero default: the striking poster shape
  grade: 0, // Vice Sunset
  gradeIntensity: 0.8,
  size: 2, // 1920x1080
  title1: 'LEONIDA',
  title2: 'NIGHTS',
  subtitle: 'where the sun never sets on the hustle',
  tagline: 'ONE CITY. EVERY SECRET HAS A VIEW.',
  billing: 'A FAN-MADE POSTER STUDIO • NOT AFFILIATED WITH ROCKSTAR GAMES • LEONIDA NIGHTS',
  sealText: 'EST. 2026 • LEONIDA',
  callouts: ['THE GETAWAY', 'OCEAN DRIVE', 'LAST LIGHT'],
  gradientTitle: false,
  halftone: true,
  burst: true,
  ribbon: true,
  selectedPanel: 0,
};

const photos = []; // HTMLImageElement list
const panelPhoto = []; // panel index -> photo index (-1 = empty)
const panelView = []; // panel index -> { zoom, ox, oy }
let lastPhoto = -1;

function resetPanels() {
  const n = Math.max(...LAYOUTS.map((l) => l.panels.length));
  for (let i = 0; i < n; i++) {
    if (panelPhoto[i] === undefined) panelPhoto[i] = -1;
    if (!panelView[i]) panelView[i] = { zoom: 1, ox: 0, oy: 0 };
  }
}
resetPanels();

// ---- Grain pattern (deterministic) ----
const grainCanvas = document.createElement('canvas');
grainCanvas.width = 128; grainCanvas.height = 128;
{
  const g = grainCanvas.getContext('2d');
  const img = g.createImageData(128, 128);
  let seed = 1234567;
  for (let i = 0; i < img.data.length; i += 4) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const v = 96 + (seed % 64);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}

// ---- Photo loading ----
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = src;
  });
}

async function addPhoto(src) {
  const im = await loadImage(src);
  photos.push(im);
  lastPhoto = photos.length - 1;
  return lastPhoto;
}

async function fillAll(photoIdx) {
  const idx = photoIdx !== undefined ? photoIdx : lastPhoto;
  if (idx < 0) return;
  const layout = LAYOUTS[state.layout];
  layout.panels.forEach((_, i) => { panelPhoto[i] = idx; });
  render();
}

// ---- Cover drawing ----
function drawPhotoCover(c, img, px, py, pw, ph, view, mono) {
  c.save();
  c.beginPath(); c.rect(px, py, pw, ph); c.clip();
  if (mono) c.filter = 'grayscale(1) contrast(1.14) brightness(1.06)';
  const scale = Math.max(pw / img.width, ph / img.height) * view.zoom;
  const dw = img.width * scale, dh = img.height * scale;
  const maxOx = Math.max(0, (dw - pw) / 2), maxOy = Math.max(0, (dh - ph) / 2);
  const dx = px + (pw - dw) / 2 + Math.max(-maxOx, Math.min(maxOx, view.ox));
  const dy = py + (ph - dh) / 2 + Math.max(-maxOy, Math.min(maxOy, view.oy));
  c.drawImage(img, dx, dy, dw, dh);
  c.restore();
}

function applyGrade(c, W, H, grade, intensity) {
  if (intensity <= 0) return;
  c.save();
  // Sunset / neon gradient map, overlay blend.
  const grad = c.createLinearGradient(0, 0, W * 0.35, H);
  grad.addColorStop(0, grade.top);
  grad.addColorStop(1, grade.bottom);
  c.globalCompositeOperation = 'overlay';
  c.globalAlpha = 0.55 * intensity;
  c.fillStyle = grad;
  c.fillRect(0, 0, W, H);
  // Warm tint, soft light.
  c.globalCompositeOperation = 'soft-light';
  c.globalAlpha = grade.tintOp * 4 * intensity;
  c.fillStyle = grade.tint;
  c.fillRect(0, 0, W, H);
  c.restore();
  // Vignette.
  c.save();
  const vg = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, `rgba(0,0,0,${0.34 * intensity})`);
  c.fillStyle = vg;
  c.fillRect(0, 0, W, H);
  c.restore();
  // Grain.
  c.save();
  c.globalCompositeOperation = 'overlay';
  c.globalAlpha = 0.10 * intensity;
  c.fillStyle = c.createPattern(grainCanvas, 'repeat');
  c.fillRect(0, 0, W, H);
  c.restore();
}

function fitFont(c, text, maxW, startSize) {
  let size = startSize;
  c.font = `${size}px Anton, sans-serif`;
  while (size > 12 && c.measureText(text).width > maxW) {
    size *= 0.92;
    c.font = `${size}px Anton, sans-serif`;
  }
  return size;
}

function drawStackedTitle(c, W, H, zone, gradient) {
  const lines = [state.title1, state.title2].filter(Boolean);
  if (!lines.length) return;
  const zx = zone.x * W, zy = zone.y * H, zw = zone.w * W, zh = zone.h * H;
  const lineH = zh / lines.length;
  const longest = lines.reduce((a, b) => (a.length > b.length ? a : b));
  let size = Math.min(lineH * 0.92, zw / (longest.length * 0.60));
  size = fitFont(c, longest, zw, size);
  c.save();
  c.textBaseline = 'middle';
  c.textAlign = zone.align === 'center' ? 'center' : 'left';
  const tx = zone.align === 'center' ? zx + zw / 2 : zx;
  const shadowY = size * 0.06;
  lines.forEach((line, i) => {
    const ty = zy + (i + 0.5) * lineH;
    c.font = `${size}px Anton, sans-serif`;
    c.shadowColor = 'rgba(0,0,0,0.55)';
    c.shadowBlur = size * 0.08;
    c.shadowOffsetY = shadowY;
    c.lineJoin = 'round';
    c.strokeStyle = '#000';
    c.lineWidth = size * 0.11;
    c.strokeText(line, tx, ty);
    c.shadowColor = 'transparent';
    c.shadowBlur = 0; c.shadowOffsetY = 0;
    if (gradient) {
      const g = c.createLinearGradient(0, ty - size / 2, 0, ty + size / 2);
      g.addColorStop(0, '#ffd319'); g.addColorStop(0.5, '#ff7a18'); g.addColorStop(1, '#ff2e88');
      c.fillStyle = g;
    } else {
      c.fillStyle = '#fff';
    }
    c.fillText(line, tx, ty);
  });
  c.restore();
}

function drawSubtitle(c, W, H, zone) {
  if (!state.subtitle) return;
  c.save();
  const size = Math.min(W * 0.042, zone.h * H * 0.5);
  c.font = `${Math.round(size)}px Caveat, cursive`;
  c.textAlign = zone.align === 'center' ? 'center' : 'left';
  c.textBaseline = 'middle';
  const tx = zone.align === 'center' ? (zone.x + zone.w / 2) * W : zone.x * W;
  // Sit just under the title, clamped above the tagline strip.
  const taglineTop = (LAYOUTS[state.layout].taglineY - 0.012) * H;
  let ty = (zone.y + zone.h) * H + size * 0.55;
  ty = Math.min(ty, taglineTop - size * 0.55);
  c.translate(tx, ty);
  c.rotate(-0.03);
  c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 6; c.shadowOffsetY = 2;
  c.fillStyle = '#ffd319';
  c.fillText(state.subtitle, 0, 0);
  c.restore();
}

function drawTagline(c, W, H, y) {
  if (!state.tagline) return;
  const barH = H * 0.042;
  const by = y * H;
  c.save();
  c.fillStyle = '#000';
  c.fillRect(0, by, W, barH);
  c.fillStyle = '#ffd319';
  c.fillRect(0, by, W, 2);
  c.fillStyle = '#fff';
  const size = Math.min(barH * 0.52, W * 0.021);
  c.font = `700 ${size}px Archivo, sans-serif`;
  try { c.letterSpacing = `${size * 0.18}px`; } catch (e) { /* older canvas */ }
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(state.tagline.toUpperCase(), W / 2, by + barH / 2 + size * 0.05);
  c.restore();
}

function drawBilling(c, W, H, y) {
  if (!state.billing) return;
  c.save();
  const size = Math.max(9, W * 0.0105);
  c.font = `400 ${size}px Archivo, sans-serif`;
  c.fillStyle = 'rgba(255,255,255,0.85)';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(state.billing.toUpperCase(), W / 2, y * H + size);
  c.restore();
}

function drawSeal(c, W, H, pos) {
  if (!state.sealText) return;
  const cx = pos.x * W, cy = pos.y * H, r = W * 0.042;
  c.save();
  c.translate(cx, cy);
  c.rotate(-0.18);
  c.globalAlpha = 0.92;
  c.strokeStyle = '#fff'; c.lineWidth = Math.max(2, W * 0.0022);
  c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.arc(0, 0, r * 0.82, 0, Math.PI * 2); c.stroke();
  // Centre text, two lines, inside the double ring (from the seal text field).
  const parts = (state.sealText || 'EST. 2026 • LEONIDA').split('•').map((s) => s.trim()).filter(Boolean);
  const top = parts[0] || 'EST. 2026';
  const bottom = parts[1] || 'LEONIDA';
  const size = Math.min(r * 0.30, (r * 1.5) / Math.max(top.length, bottom.length) * 1.15);
  c.font = `700 ${size}px Archivo, sans-serif`;
  c.fillStyle = '#fff';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(top, 0, -size * 0.55);
  c.fillText(bottom, 0, size * 0.55);
  c.restore();
}

function drawBurst(c, W, H, pos) {
  const cx = pos.x * W, cy = pos.y * H, r = W * 0.038;
  c.save();
  c.translate(cx, cy);
  c.rotate(0.2);
  c.beginPath();
  const spikes = 12;
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r * 0.62;
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
  }
  c.closePath();
  c.fillStyle = '#ffd319';
  c.strokeStyle = '#ff2e88'; c.lineWidth = Math.max(2, W * 0.002);
  c.fill(); c.stroke();
  c.fillStyle = '#12081c';
  c.font = `${r * 0.52}px Anton, sans-serif`;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('HOT!', 0, 0);
  c.restore();
}

function drawRibbon(c, W, H) {
  const text = 'LEONIDA';
  const size = W * 0.020;
  c.save();
  c.translate(W, 0);
  c.rotate(Math.PI / 4);
  const bandW = W * 0.30;
  c.fillStyle = '#ff2e88';
  c.fillRect(-bandW / 2, -size * 1.1, bandW, size * 2.2);
  c.fillStyle = '#fff';
  c.font = `700 ${size}px Archivo, sans-serif`;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(text, 0, 0);
  c.restore();
}

function drawCallouts(c, W, H, layout) {
  const size = Math.max(11, W * 0.016);
  c.save();
  c.font = `700 ${size}px Archivo, sans-serif`;
  layout.callouts.forEach((co, i) => {
    const label = state.callouts[i];
    if (!label) return;
    const panel = layout.panels[co.p];
    if (!panel) return;
    const ax = (panel[0] + co.ax * panel[2]) * W;
    const ay = (panel[1] + co.ay * panel[3]) * H;
    const pad = size * 0.55;
    const tw = c.measureText(label.toUpperCase()).width;
    let lx = co.lx * W, ly = co.ly * H;
    lx = Math.max(4, Math.min(W - tw - pad * 2 - 4, lx));
    ly = Math.max(4, Math.min(H - size * 2.4, ly));
    // Leader line.
    c.strokeStyle = '#fff'; c.lineWidth = Math.max(1.5, W * 0.0016);
    c.beginPath();
    c.moveTo(lx + tw / 2 + pad, ly + size);
    c.lineTo(ax, ay);
    c.stroke();
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(ax, ay, Math.max(3, W * 0.003), 0, Math.PI * 2); c.fill();
    // Label box.
    c.fillStyle = 'rgba(0,0,0,0.82)';
    c.fillRect(lx, ly, tw + pad * 2, size * 2);
    c.fillStyle = '#ffd319';
    c.fillRect(lx, ly, 3, size * 2);
    c.fillStyle = '#fff';
    c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillText(label.toUpperCase(), lx + pad + 3, ly + size + 1);
  });
  c.restore();
}

function drawHalftone(c, W, H) {
  c.save();
  c.fillStyle = 'rgba(0,0,0,0.10)';
  const step = Math.max(10, W * 0.011);
  const r = step * 0.22;
  // Dots across the bottom strip and the top band — a print texture.
  for (let y = H * 0.90; y < H; y += step) {
    for (let x = ((y / step) % 2) * step / 2; x < W; x += step) {
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    }
  }
  c.restore();
}

function renderCover(c, W, H) {
  const layout = LAYOUTS[state.layout];
  const grade = GRADES[state.grade];
  c.clearRect(0, 0, W, H);
  c.fillStyle = '#12081c';
  c.fillRect(0, 0, W, H);
  // Panels.
  layout.panels.forEach((p, i) => {
    const px = p[0] * W, py = p[1] * H, pw = p[2] * W, ph = p[3] * H;
    const photoIdx = panelPhoto[i];
    if (photoIdx >= 0 && photos[photoIdx]) {
      drawPhotoCover(c, photos[photoIdx], px, py, pw, ph, panelView[i], grade.mono);
    } else {
      // Empty panel placeholder: warm gradient + label.
      const g = c.createLinearGradient(px, py, px + pw, py + ph);
      g.addColorStop(0, '#3a1d55'); g.addColorStop(1, '#1e0f2e');
      c.fillStyle = g;
      c.fillRect(px, py, pw, ph);
      c.fillStyle = 'rgba(255,255,255,0.55)';
      c.font = `700 ${Math.max(12, W * 0.016)}px Archivo, sans-serif`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('ADD A PHOTO', px + pw / 2, py + ph / 2);
    }
    // Panel frame.
    c.strokeStyle = 'rgba(255,255,255,0.9)';
    c.lineWidth = Math.max(2, W * 0.003);
    c.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
    // Selected panel highlight (preview only).
    if (c === ctx && i === state.selectedPanel) {
      c.strokeStyle = '#ffd319';
      c.lineWidth = Math.max(3, W * 0.005);
      c.strokeRect(px + 3, py + 3, pw - 6, ph - 6);
    }
  });
  // Grade over everything.
  applyGrade(c, W, H, grade, state.gradeIntensity);
  // Dark band behind the title on full-bleed / grid layouts.
  const zone = layout.title;
  if (LAYOUTS[state.layout].id === 'fullbleed' || LAYOUTS[state.layout].id === 'filmstrip') {
    const bg = c.createLinearGradient(0, (zone.y - 0.02) * H, 0, (zone.y + zone.h + 0.06) * H);
    bg.addColorStop(0, 'rgba(0,0,0,0)');
    bg.addColorStop(0.35, 'rgba(0,0,0,0.55)');
    bg.addColorStop(1, 'rgba(0,0,0,0.75)');
    c.fillStyle = bg;
    c.fillRect(0, (zone.y - 0.02) * H, W, (zone.h + 0.08) * H);
  }
  if (zone.band) {
    c.fillStyle = 'rgba(0,0,0,0.55)';
    c.fillRect(zone.x * W - W * 0.02, zone.y * H, zone.w * W + W * 0.04, zone.h * H);
  }
  drawStackedTitle(c, W, H, zone, state.gradientTitle);
  drawSubtitle(c, W, H, zone);
  drawCallouts(c, W, H, layout);
  if (state.burst) drawBurst(c, W, H, layout.burst);
  if (state.ribbon) drawRibbon(c, W, H);
  drawSeal(c, W, H, layout.seal);
  drawTagline(c, W, H, layout.taglineY);
  drawBilling(c, W, H, layout.billingY);
  if (state.halftone) drawHalftone(c, W, H);
}

function render() {
  const size = SIZES[state.size];
  const previewW = 960;
  const previewH = Math.round((previewW * size.h) / size.w);
  if (canvas.width !== previewW || canvas.height !== previewH) {
    canvas.width = previewW;
    canvas.height = previewH;
  }
  renderCover(ctx, previewW, previewH);
  $('previewSize').textContent = size.label;
}

// ---- Export ----
function exportPNG() {
  const size = SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = size.w; off.height = size.h;
  const oc = off.getContext('2d');
  renderCover(oc, size.w, size.h);
  off.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `leonida-nights-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
}

// ---- Pickers ----
function buildPickers() {
  const lp = $('layoutPicker');
  LAYOUTS.forEach((layout, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.layout = i;
    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    thumb.style.background = 'linear-gradient(135deg,#ff2e88,#ff7a18 60%,#ffd319)';
    layout.panels.forEach((p) => {
      const el = document.createElement('i');
      el.style.left = `${p[0] * 100}%`; el.style.top = `${p[1] * 100}%`;
      el.style.width = `${p[2] * 100}%`; el.style.height = `${p[3] * 100}%`;
      thumb.appendChild(el);
    });
    const cap = document.createElement('b');
    cap.textContent = 'LEONIDA';
    thumb.appendChild(cap);
    b.appendChild(thumb);
    const lbl = document.createElement('span');
    lbl.className = 'lbl';
    lbl.textContent = layout.name;
    b.appendChild(lbl);
    b.addEventListener('click', () => {
      state.layout = i;
      state.selectedPanel = 0;
      syncPickers();
      render();
    });
    lp.appendChild(b);
  });
  const gp = $('gradePicker');
  GRADES.forEach((grade, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.grade = i;
    const sw = document.createElement('div');
    sw.className = 'thumb';
    sw.style.background = `linear-gradient(135deg, ${grade.top}, ${grade.bottom})`;
    b.appendChild(sw);
    const lbl = document.createElement('span');
    lbl.className = 'lbl';
    lbl.textContent = grade.name;
    b.appendChild(lbl);
    b.addEventListener('click', () => {
      state.grade = i;
      syncPickers();
      render();
    });
    gp.appendChild(b);
  });
}

function syncPickers() {
  document.querySelectorAll('#layoutPicker button').forEach((b) => {
    b.classList.toggle('active', Number(b.dataset.layout) === state.layout);
  });
  document.querySelectorAll('#gradePicker button').forEach((b) => {
    b.classList.toggle('active', Number(b.dataset.grade) === state.grade);
  });
  const layout = LAYOUTS[state.layout];
  $('panelLabel').textContent = `Panel ${state.selectedPanel + 1} of ${layout.panels.length}`;
  const v = panelView[state.selectedPanel] || { zoom: 1 };
  $('zoomSlider').value = Math.round(v.zoom * 100);
  $('zoomVal').textContent = `${Math.round(v.zoom * 100)}%`;
}

// ---- Panel interaction: click to select, drag to pan ----
let drag = null;
function canvasPoint(ev) {
  const r = canvas.getBoundingClientRect();
  const x = ((ev.clientX - r.left) / r.width) * canvas.width;
  const y = ((ev.clientY - r.top) / r.height) * canvas.height;
  return { x, y };
}
function panelAt(x, y) {
  const layout = LAYOUTS[state.layout];
  for (let i = layout.panels.length - 1; i >= 0; i--) {
    const p = layout.panels[i];
    if (x >= p[0] * canvas.width && x < (p[0] + p[2]) * canvas.width &&
        y >= p[1] * canvas.height && y < (p[1] + p[3]) * canvas.height) return i;
  }
  return -1;
}
canvas.addEventListener('pointerdown', (ev) => {
  const { x, y } = canvasPoint(ev);
  const i = panelAt(x, y);
  if (i < 0) return;
  state.selectedPanel = i;
  syncPickers();
  render();
  drag = { panel: i, startX: x, startY: y, ox: panelView[i].ox, oy: panelView[i].oy };
  canvas.setPointerCapture(ev.pointerId);
});
canvas.addEventListener('pointermove', (ev) => {
  if (!drag) return;
  const { x, y } = canvasPoint(ev);
  const v = panelView[drag.panel];
  v.ox = drag.ox + (x - drag.startX);
  v.oy = drag.oy + (y - drag.startY);
  render();
});
canvas.addEventListener('pointerup', () => { drag = null; });

// ---- Controls wiring ----
function bindControls() {
  $('photoInput').addEventListener('change', async (ev) => {
    for (const file of ev.target.files) {
      const idx = await addPhoto(URL.createObjectURL(file));
      panelPhoto[state.selectedPanel] = idx;
    }
    render();
    ev.target.value = '';
  });
  document.querySelectorAll('#samples button').forEach((b) => {
    b.addEventListener('click', async () => {
      const idx = await addPhoto(b.dataset.sample);
      panelPhoto[state.selectedPanel] = idx;
      document.querySelectorAll('#samples button').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      render();
    });
  });
  $('fillAllBtn').addEventListener('click', () => fillAll());
  $('zoomSlider').addEventListener('input', () => {
    const v = panelView[state.selectedPanel];
    v.zoom = Number($('zoomSlider').value) / 100;
    $('zoomVal').textContent = `${$('zoomSlider').value}%`;
    render();
  });
  $('gradeSlider').addEventListener('input', () => {
    state.gradeIntensity = Number($('gradeSlider').value) / 100;
    $('gradeVal').textContent = `${$('gradeSlider').value}%`;
    render();
  });
  const textBindings = [
    ['title1', 'title1'], ['title2', 'title2'], ['subtitle', 'subtitle'],
    ['tagline', 'tagline'], ['billing', 'billing'], ['sealText', 'sealText'],
  ];
  textBindings.forEach(([id, key]) => {
    $(id).addEventListener('input', () => { state[key] = $(id).value; render(); });
  });
  ['callout1', 'callout2', 'callout3'].forEach((id, i) => {
    $(id).addEventListener('input', () => { state.callouts[i] = $(id).value; render(); });
  });
  $('gradientToggle').addEventListener('change', () => { state.gradientTitle = $('gradientToggle').checked; render(); });
  $('halftoneToggle').addEventListener('change', () => { state.halftone = $('halftoneToggle').checked; render(); });
  $('burstToggle').addEventListener('change', () => { state.burst = $('burstToggle').checked; render(); });
  $('ribbonToggle').addEventListener('change', () => { state.ribbon = $('ribbonToggle').checked; render(); });
  document.querySelectorAll('#sizeSelector input[name="exportSize"]').forEach((r) => {
    r.addEventListener('change', () => {
      state.size = SIZES.findIndex((s) => s.id === r.value);
      render();
    });
  });
  $('exportBtn').addEventListener('click', exportPNG);
}

// ---- Screenshot mode (?shot=cover / ?shot=editor) ----
const params = new URLSearchParams(location.search);
const shotMode = params.get('shot');

async function loadSampleForShot(name) {
  const idx = await addPhoto(`samples/${name}`);
  const layout = LAYOUTS[state.layout];
  layout.panels.forEach((_, i) => { panelPhoto[i] = idx; });
}

async function init() {
  buildPickers();
  bindControls();
  syncPickers();
  // Fonts first so the first paint already uses Anton / Caveat / Archivo.
  try {
    await Promise.all([
      document.fonts.load('80px Anton'),
      document.fonts.load('40px Caveat'),
      document.fonts.load('700 20px Archivo'),
    ]);
  } catch (e) { /* fall back to system fonts */ }

  if (shotMode === 'cover') {
    document.body.classList.add('shot-mode');
    const layoutName = params.get('layout');
    const gradeName = params.get('grade');
    const sizeId = params.get('size');
    const photo = params.get('photo') || 'boulevard.jpg';
    if (layoutName) state.layout = Math.max(0, LAYOUTS.findIndex((l) => l.id === layoutName));
    if (gradeName) state.grade = Math.max(0, GRADES.findIndex((g) => g.id === gradeName));
    if (sizeId) state.size = Math.max(0, SIZES.findIndex((s) => s.id === sizeId));
    if (params.get('title1')) state.title1 = params.get('title1');
    if (params.get('title2')) state.title2 = params.get('title2');
    await loadSampleForShot(photo);
    // Full-size render, scaled by CSS to the viewport.
    const size = SIZES[state.size];
    canvas.width = size.w;
    canvas.height = size.h;
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.objectFit = 'contain';
    renderCover(ctx, size.w, size.h);
    window.__shotReady = true;
    return;
  }

  // Normal editor: start with the sunset boulevard sample in every panel.
  try {
    await loadSampleForShot('boulevard.jpg');
  } catch (e) { /* samples missing: editor still works with the picker */ }
  render();
  if (shotMode === 'editor') {
    await new Promise((r) => setTimeout(r, 400));
    window.__shotReady = true;
  }
}

init();
