// Leonida Nights — GTA 6 Cover Studio.
// Turns the user's photos + a caption into multi-panel GTA-style poster art.
// One renderer draws both the live editor preview and the exported PNG, so
// what you see is exactly what you download. Static, offline, no network.
'use strict';

const $ = (id) => document.getElementById(id);
const canvas = $('coverCanvas');
const ctx = canvas.getContext('2d');

// ---------------------------------------------------------------- samples
const SAMPLES = [
  { name: 'neon-street', src: 'samples/neon-street.jpg', label: 'Neon Street' },
  { name: 'boulevard', src: 'samples/boulevard.jpg', label: 'Sunset Blvd' },
  { name: 'pier', src: 'samples/pier.jpg', label: 'Palm Pier' },
];
const photos = []; // { name, label, img, w, h }
const MAX_SLOTS = 6;

// One assignment per panel slot: which photo, zoom and pan.
const slots = Array.from({ length: MAX_SLOTS }, () => ({ photo: 0, zoom: 1, ox: 0, oy: 0 }));
let selectedSlot = 0;

// ---------------------------------------------------------------- layouts
// Panel rects are fractions of the cover; every layout except Full Bleed
// reserves the bottom 20% as the caption band (title, tagline, billing).
function layoutPanels(name, W, H) {
  const g = Math.max(4, Math.round(W * 0.012));
  const cap = Math.round(H * 0.20);
  const ph = H - cap;
  if (name === 'hero4') {
    const heroW = Math.round(W * 0.60);
    const colX = heroW + g, colW = W - colX;
    const rows = 4, rh = Math.round((ph - g * (rows - 1)) / rows);
    const rects = [{ x: 0, y: 0, w: heroW, h: ph }];
    for (let i = 0; i < 4; i++) rects.push({ x: colX, y: i * (rh + g), w: colW, h: rh });
    return rects;
  }
  if (name === 'duo') {
    const w = Math.round((W - g) / 2);
    return [{ x: 0, y: 0, w, h: ph }, { x: w + g, y: 0, w, h: ph }];
  }
  if (name === 'fullbleed') return [{ x: 0, y: 0, w: W, h: H }];
  if (name === 'triptych') {
    const w = Math.round((W - 2 * g) / 3);
    return [0, 1, 2].map((i) => ({ x: i * (w + g), y: 0, w, h: ph }));
  }
  if (name === 'grid') {
    const w = Math.round((W - g) / 2), h = Math.round((ph - g) / 2);
    return [
      { x: 0, y: 0, w, h }, { x: w + g, y: 0, w, h },
      { x: 0, y: h + g, w, h }, { x: w + g, y: h + g, w, h },
    ];
  }
  // filmstrip: hero on top, four small panels along the bottom of the region.
  const heroH = Math.round(ph * 0.66);
  const stripY = heroH + g, stripH = ph - stripY;
  const w = Math.round((W - 3 * g) / 4);
  const rects = [{ x: 0, y: 0, w: W, h: heroH }];
  for (let i = 0; i < 4; i++) rects.push({ x: i * (w + g), y: stripY, w, h: stripH });
  return rects;
}

const LAYOUTS = [
  { id: 'hero4', label: 'Hero + 4' },
  { id: 'duo', label: 'Split Duo' },
  { id: 'fullbleed', label: 'Full Bleed Hero' },
  { id: 'triptych', label: 'Triptych' },
  { id: 'grid', label: 'Grid 2x2' },
  { id: 'filmstrip', label: 'Filmstrip' },
];

// ---------------------------------------------------------------- grades
function wash(c, W, H, stops, mode, alpha) {
  const grad = c.createLinearGradient(0, 0, 0, H);
  for (const [at, color] of stops) grad.addColorStop(at, color);
  c.save();
  c.globalCompositeOperation = mode;
  c.globalAlpha = alpha;
  c.fillStyle = grad;
  c.fillRect(0, 0, W, H);
  c.restore();
}

const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    swatch: 'linear-gradient(135deg,#ff5e3a,#ff2e88 55%,#7b2fff)',
    filter: 'saturate(1.3) contrast(1.08)',
    overlay(c, W, H, a) {
      wash(c, W, H, [[0, 'rgba(255,46,136,0.55)'], [0.45, 'rgba(255,46,136,0)'], [1, 'rgba(255,94,58,0.5)']], 'soft-light', a);
      wash(c, W, H, [[0, 'rgba(255,120,60,0.28)'], [1, 'rgba(255,120,60,0)']], 'overlay', a);
    },
  },
  neon: {
    label: 'Neon Nights',
    swatch: 'linear-gradient(135deg,#ff2e88,#2ee6ff)',
    filter: 'saturate(1.55) contrast(1.12)',
    overlay(c, W, H, a) {
      wash(c, W, H, [[0, 'rgba(255,46,136,0.5)'], [0.5, 'rgba(255,46,136,0)']], 'screen', a * 0.8);
      wash(c, W, H, [[0, 'rgba(46,230,255,0)'], [0.6, 'rgba(46,230,255,0.35)'], [1, 'rgba(46,230,255,0.5)']], 'screen', a * 0.8);
      wash(c, W, H, [[0, 'rgba(123,47,255,0.3)'], [1, 'rgba(123,47,255,0)']], 'overlay', a);
    },
  },
  gold: {
    label: 'Palm Gold',
    swatch: 'linear-gradient(135deg,#ffe259,#ffb02e 60%,#ff7e2e)',
    filter: 'saturate(1.25) contrast(1.05) sepia(0.18)',
    overlay(c, W, H, a) {
      wash(c, W, H, [[0, 'rgba(255,176,46,0.5)'], [0.5, 'rgba(255,176,46,0.08)'], [1, 'rgba(255,126,46,0.4)']], 'soft-light', a);
      wash(c, W, H, [[0, 'rgba(255,220,120,0.3)'], [1, 'rgba(255,220,120,0)']], 'screen', a * 0.7);
    },
  },
  noir: {
    label: 'Mono Noir',
    swatch: 'linear-gradient(135deg,#f5f5f5,#111)',
    filter: 'grayscale(1) contrast(1.28) brightness(1.06)',
    overlay(c, W, H, a) {
      wash(c, W, H, [[0, 'rgba(255,176,46,0.22)'], [1, 'rgba(255,176,46,0)']], 'soft-light', a * 0.6);
    },
  },
  ocean: {
    label: 'Ocean Drive',
    swatch: 'linear-gradient(135deg,#2ee6c8,#ff2e88)',
    filter: 'saturate(1.3) contrast(1.1)',
    overlay(c, W, H, a) {
      wash(c, W, H, [[0, 'rgba(20,180,170,0.42)'], [0.55, 'rgba(20,180,170,0)']], 'multiply', a);
      wash(c, W, H, [[0, 'rgba(255,46,136,0)'], [0.6, 'rgba(255,46,136,0.3)'], [1, 'rgba(255,46,136,0.45)']], 'screen', a * 0.8);
    },
  },
  heat: {
    label: 'Heat Haze',
    swatch: 'linear-gradient(135deg,#ff3b1f,#ffb02e)',
    filter: 'saturate(1.45) contrast(1.12)',
    overlay(c, W, H, a) {
      wash(c, W, H, [[0, 'rgba(255,59,31,0.4)'], [1, 'rgba(255,140,40,0.35)']], 'multiply', a);
      wash(c, W, H, [[0, 'rgba(255,80,40,0.4)'], [1, 'rgba(255,80,40,0)']], 'soft-light', a);
    },
  },
};
const GRADE_ORDER = ['sunset', 'neon', 'gold', 'noir', 'ocean', 'heat'];

// ---------------------------------------------------------------- state
const state = {
  layout: 'hero4',
  grade: 'sunset',
  intensity: 0.85,
  size: '1080x1080',
  title1: 'LEONIDA',
  title2: 'NIGHTS',
  subtitle: 'where the sun never sets on the hustle',
  tagline: 'ONE CITY. EVERY SECRET HAS A VIEW.',
  billing: 'A FAN-MADE POSTER STUDIO \u2022 NOT AFFILIATED WITH ROCKSTAR GAMES \u2022 LEONIDA NIGHTS',
  sealText: 'EST. 2026 \u2022 LEONIDA',
  burstText: 'HOT IN LEONIDA',
  ribbonText: 'LEONIDA',
  gradientTitle: false,
  halftone: true,
  seal: true,
  burst: true,
  ribbon: true,
  callouts: true,
  calloutTexts: ['THE GETAWAY', 'OCEAN DRIVE', 'LAST LIGHT'],
};

// ---------------------------------------------------------------- helpers
function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// ---------------------------------------------------------------- the cover
function drawPhotoInto(c, photo, rect, slot) {
  c.save();
  c.beginPath();
  c.rect(rect.x, rect.y, rect.w, rect.h);
  c.clip();
  if (!photo || !photo.img) {
    const g = c.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    g.addColorStop(0, '#3a1550');
    g.addColorStop(1, '#12081c');
    c.fillStyle = g;
    c.fillRect(rect.x, rect.y, rect.w, rect.h);
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.font = `bold ${Math.max(11, rect.w * 0.045)}px Archivo, sans-serif`;
    c.textAlign = 'center';
    c.fillText('ADD A PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2);
    c.restore();
    return;
  }
  const iw = photo.w, ih = photo.h;
  const base = Math.max(rect.w / iw, rect.h / ih) * slot.zoom;
  const dw = iw * base, dh = ih * base;
  const dx = rect.x + (rect.w - dw) / 2 + slot.ox * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + slot.oy * rect.h;
  c.filter = GRADES[state.grade].filter;
  c.drawImage(photo.img, dx, dy, dw, dh);
  c.filter = 'none';
  c.restore();
}

function drawStackedTitle(c, x, yTop, fs, line1, line2) {
  c.save();
  c.font = `${fs}px Anton, 'Arial Black', sans-serif`;
  c.textAlign = 'left';
  c.textBaseline = 'top';
  c.lineJoin = 'round';
  c.lineWidth = Math.max(2, fs * 0.085);
  c.strokeStyle = '#0a0512';
  c.strokeText(line1, x, yTop);
  c.strokeText(line2, x, yTop + fs * 1.04);
  let fill = '#ffffff';
  if (state.gradientTitle) {
    const g = c.createLinearGradient(x, yTop, x, yTop + fs * 2.2);
    g.addColorStop(0, '#fff7ae');
    g.addColorStop(0.5, '#ffb02e');
    g.addColorStop(1, '#ff2e88');
    fill = g;
  }
  c.shadowColor = 'rgba(0,0,0,0.55)';
  c.shadowBlur = fs * 0.1;
  c.shadowOffsetY = fs * 0.045;
  c.fillStyle = fill;
  c.fillText(line1, x, yTop);
  c.fillText(line2, x, yTop + fs * 1.04);
  c.restore();
}

function drawSeal(c, W, H) {
  const r = Math.round(Math.min(W, H) * 0.052);
  const cx = W - r - Math.round(W * 0.025);
  const cy = H - r - Math.round(H * 0.028);
  c.save();
  c.translate(cx, cy);
  c.rotate(-0.22);
  c.fillStyle = 'rgba(10,5,18,0.72)';
  c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#ffb02e'; c.lineWidth = Math.max(2, r * 0.07);
  c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.arc(0, 0, r * 0.78, 0, Math.PI * 2); c.stroke();
  c.fillStyle = '#ffe9b0';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  const parts = state.sealText.split('\u2022').map((s) => s.trim()).filter(Boolean);
  c.font = `bold ${Math.round(r * 0.3)}px Archivo, sans-serif`;
  c.fillText(parts[0] || 'EST. 2026', 0, -r * 0.26);
  c.fillText(parts[1] || 'LEONIDA', 0, r * 0.26);
  c.font = `${Math.round(r * 0.34)}px Archivo, sans-serif`;
  c.fillText('\u2605', 0, -r * 0.62);
  c.restore();
}

function drawStarburst(c, W, H) {
  const r = Math.round(Math.min(W, H) * 0.068);
  const cx = Math.round(W * 0.875), cy = Math.round(H * 0.085);
  const points = 14;
  c.save();
  c.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const ang = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.72;
    const x = cx + Math.cos(ang) * rad, y = cy + Math.sin(ang) * rad;
    if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
  }
  c.closePath();
  c.fillStyle = '#ffb02e';
  c.fill();
  c.lineWidth = Math.max(2, r * 0.06);
  c.strokeStyle = '#0a0512';
  c.stroke();
  c.fillStyle = '#0a0512';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  const words = state.burstText.split(' ');
  const lines = words.length > 2 ? [words.slice(0, 2).join(' '), words.slice(2).join(' ')] : [state.burstText];
  const fs = Math.round(r * 0.3);
  c.font = `bold ${fs}px Archivo, sans-serif`;
  lines.forEach((ln, i) => c.fillText(ln, cx, cy + (i - (lines.length - 1) / 2) * fs * 1.15));
  c.restore();
}

function drawRibbon(c, W, H) {
  c.save();
  c.translate(Math.round(W * 0.11), Math.round(H * 0.075));
  c.rotate(-Math.PI / 5);
  const bw = Math.round(W * 0.5), bh = Math.max(16, Math.round(H * 0.028));
  c.fillStyle = '#ff2e88';
  c.fillRect(-bw / 2, -bh / 2, bw, bh);
  c.fillStyle = '#ffffff';
  c.font = `bold ${Math.round(bh * 0.52)}px Archivo, sans-serif`;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  if ('letterSpacing' in c) c.letterSpacing = '3px';
  c.fillText(state.ribbonText, 0, 1);
  if ('letterSpacing' in c) c.letterSpacing = '0px';
  c.restore();
}

function drawCallouts(c, rects) {
  if (!state.callouts) return;
  // Anchors steer clear of the ribbon (top-left) and star-burst (top-right).
  const anchors = [
    { fx: 0.3, fy: 0.1 }, { fx: 0.56, fy: 0.3 }, { fx: 0.1, fy: 0.58 },
  ];
  c.save();
  c.textBaseline = 'middle';
  state.calloutTexts.forEach((text, i) => {
    if (!text || !text.trim()) return;
    const rect = rects[i % rects.length];
    const a = anchors[i % anchors.length];
    const lx = rect.x + rect.w * a.fx, ly = rect.y + rect.h * a.fy;
    // Small, poster-style labels: sized to the cover, never to a wide panel.
    const coverMin = Math.min(c.canvas.width, c.canvas.height);
    const fs = Math.max(10, Math.round(Math.min(Math.min(rect.w, rect.h) * 0.06, coverMin * 0.02)));
    c.font = `bold ${fs}px Archivo, sans-serif`;
    const pad = fs * 0.55;
    const tw = c.measureText(text).width;
    const bw = tw + pad * 2, bh = fs * 1.9;
    // Keep the label inside the cover.
    const bx = Math.max(6, Math.min(lx, c.canvas.width - bw - 6));
    const by = ly - fs * 0.9;
    // Short leader line from the label down to a point just below it.
    const tx = Math.min(rect.x + rect.w - 6, lx + rect.w * 0.16);
    const ty = Math.min(rect.y + rect.h - 6, ly + rect.h * 0.22);
    c.strokeStyle = 'rgba(255,255,255,0.9)';
    c.lineWidth = Math.max(1.5, fs * 0.09);
    c.beginPath();
    c.moveTo(bx + bw / 2, by + bh);
    c.lineTo(tx, ty);
    c.stroke();
    c.fillStyle = '#ff2e88';
    c.beginPath(); c.arc(tx, ty, Math.max(3, fs * 0.22), 0, Math.PI * 2); c.fill();
    // Label box.
    c.fillStyle = 'rgba(10,5,18,0.88)';
    c.fillRect(bx, by, bw, bh);
    c.strokeStyle = '#ffb02e'; c.lineWidth = Math.max(1, fs * 0.07);
    c.strokeRect(bx, by, bw, bh);
    c.fillStyle = '#ffffff';
    c.textAlign = 'left';
    c.fillText(text, bx + pad, by + bh / 2 + 1);
  });
  c.restore();
}

function drawGrain(c, W, H, seed) {
  const rand = mulberry32(seed);
  const n = Math.min(2600, Math.round((W * H) / 900));
  c.save();
  for (let i = 0; i < n; i++) {
    const v = rand();
    c.fillStyle = v > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    c.fillRect(rand() * W, rand() * H, 1.4, 1.4);
  }
  c.restore();
}

function drawHalftone(c, W, H) {
  const s = Math.max(6, Math.round(W / 170));
  c.save();
  c.fillStyle = 'rgba(0,0,0,0.07)';
  for (let y = s / 2; y < H; y += s) {
    for (let x = ((y / s) % 2 ? s / 2 : 0) + s / 2; x < W; x += s) {
      c.beginPath(); c.arc(x, y, s * 0.26, 0, Math.PI * 2); c.fill();
    }
  }
  c.restore();
}

function drawVignette(c, W, H, a) {
  const g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${0.3 * a})`);
  c.save();
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  c.restore();
}

// The one renderer: draws the whole poster onto context c at size W x H.
function drawCover(c, W, H) {
  c.save();
  c.clearRect(0, 0, W, H);
  c.fillStyle = '#0d0616';
  c.fillRect(0, 0, W, H);
  const rects = layoutPanels(state.layout, W, H);
  const isBleed = state.layout === 'fullbleed';
  rects.forEach((rect, i) => {
    const slot = slots[i] || slots[0];
    drawPhotoInto(c, photos[slot.photo], rect, slot);
  });
  GRADES[state.grade].overlay(c, W, H, state.intensity);
  drawVignette(c, W, H, state.intensity);
  drawGrain(c, W, H, W * 7 + H * 13 + state.grade.length);
  if (state.halftone) drawHalftone(c, W, H);

  // Caption zone: bottom band, or an overlaid scrim on the full-bleed hero.
  const bandY = isBleed ? Math.round(H * 0.68) : Math.round(H * 0.80);
  const bandH = H - bandY;
  if (isBleed) {
    const scrim = c.createLinearGradient(0, bandY - H * 0.12, 0, H);
    scrim.addColorStop(0, 'rgba(0,0,0,0)');
    scrim.addColorStop(0.45, 'rgba(0,0,0,0.55)');
    scrim.addColorStop(1, 'rgba(0,0,0,0.82)');
    c.fillStyle = scrim;
    c.fillRect(0, bandY - H * 0.12, W, H - bandY + H * 0.12);
  } else {
    c.fillStyle = 'rgba(10,5,18,0.92)';
    c.fillRect(0, bandY, W, bandH);
    c.fillStyle = '#ff2e88';
    c.fillRect(0, bandY, W, Math.max(2, Math.round(H * 0.004)));
  }
  const fs = Math.round(bandH * (isBleed ? 0.34 : 0.4));
  const tx = Math.round(W * 0.045);
  drawStackedTitle(c, tx, bandY + bandH * 0.06, fs, state.title1 || 'LEONIDA', state.title2 || 'NIGHTS');
  // Script subtitle, right side of the caption band — kept clear of the seal.
  const sealR = state.seal ? Math.round(Math.min(W, H) * 0.052) : 0;
  const subRight = W - tx - (state.seal ? sealR * 2 + Math.round(W * 0.03) : 0);
  c.save();
  c.font = `${Math.round(fs * 0.38)}px Caveat, cursive`;
  c.fillStyle = '#ffb02e';
  c.textAlign = 'right';
  c.textBaseline = 'alphabetic';
  c.shadowColor = 'rgba(0,0,0,0.6)';
  c.shadowBlur = 6;
  c.fillText(state.subtitle, subRight, bandY + bandH * 0.52);
  c.restore();
  // Tagline strip.
  const stripH = Math.max(14, Math.round(bandH * 0.13));
  const stripY = bandY + bandH - stripH - Math.max(10, Math.round(bandH * 0.09));
  c.fillStyle = '#ff2e88';
  c.fillRect(0, stripY, W, stripH);
  c.save();
  c.fillStyle = '#ffffff';
  c.font = `bold ${Math.round(stripH * 0.58)}px Archivo, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  if ('letterSpacing' in c) c.letterSpacing = '2px';
  c.fillText(state.tagline, W / 2, stripY + stripH / 2 + 1);
  if ('letterSpacing' in c) c.letterSpacing = '0px';
  c.restore();
  // Billing block.
  c.save();
  c.fillStyle = 'rgba(255,255,255,0.72)';
  c.font = `${Math.max(9, Math.round(W * 0.0105))}px Archivo, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  c.fillText(state.billing, W / 2, H - Math.max(6, Math.round(bandH * 0.045)));
  c.restore();

  drawCallouts(c, rects);
  if (state.burst) drawStarburst(c, W, H);
  if (state.ribbon) drawRibbon(c, W, H);
  if (state.seal) drawSeal(c, W, H);
  // Thin poster frame.
  c.strokeStyle = 'rgba(0,0,0,0.5)';
  c.lineWidth = Math.max(2, Math.round(W * 0.004));
  c.strokeRect(0, 0, W, H);
  c.restore();
}

// ---------------------------------------------------------------- render
function currentSize() {
  const [w, h] = state.size.split('x').map(Number);
  return { w, h };
}

function render() {
  const { w, h } = currentSize();
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  drawCover(ctx, w, h);
  updatePanelBar();
}

function renderShotCover() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  drawCover(ctx, canvas.width, canvas.height);
}

// ---------------------------------------------------------------- export
function exportPNG() {
  const { w, h } = currentSize();
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off.getContext('2d'), w, h);
  off.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `leonida-nights-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
}

// ---------------------------------------------------------------- editor UI
function buildLayoutPicker() {
  const grid = $('layoutGrid');
  LAYOUTS.forEach((lay) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'layout-btn' + (state.layout === lay.id ? ' active' : '');
    btn.dataset.layout = lay.id;
    const thumb = document.createElement('div');
    thumb.className = 'lthumb';
    layoutPanels(lay.id, 100, 62).forEach((r) => {
      const cell = document.createElement('i');
      cell.style.left = `${r.x}%`;
      cell.style.top = `${r.y / 62 * 100 * 0.8}%`;
      cell.style.width = `${r.w}%`;
      cell.style.height = `${(r.h / 62) * 100 * 0.8}%`;
      thumb.appendChild(cell);
    });
    const name = document.createElement('span');
    name.className = 'lname';
    name.textContent = lay.label;
    btn.append(thumb, name);
    btn.addEventListener('click', () => {
      state.layout = lay.id;
      document.querySelectorAll('.layout-btn').forEach((b) => b.classList.toggle('active', b.dataset.layout === lay.id));
      render();
    });
    grid.appendChild(btn);
  });
}

function buildGradePicker() {
  const grid = $('gradeGrid');
  GRADE_ORDER.forEach((id) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'grade-btn' + (state.grade === id ? ' active' : '');
    btn.dataset.grade = id;
    btn.style.background = GRADES[id].swatch;
    const label = document.createElement('span');
    label.textContent = GRADES[id].label;
    btn.appendChild(label);
    btn.addEventListener('click', () => {
      state.grade = id;
      document.querySelectorAll('.grade-btn').forEach((b) => b.classList.toggle('active', b.dataset.grade === id));
      render();
    });
    grid.appendChild(btn);
  });
}

function buildSampleRow() {
  const row = $('sampleRow');
  SAMPLES.forEach((s, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sample-thumb' + (i === 0 ? ' active' : '');
    btn.dataset.sample = s.name;
    const img = document.createElement('img');
    img.src = s.src;
    img.alt = s.label;
    const label = document.createElement('span');
    label.textContent = s.label;
    btn.append(img, label);
    btn.addEventListener('click', () => {
      slots[selectedSlot].photo = i;
      document.querySelectorAll('.sample-thumb').forEach((b) => b.classList.toggle('active', b.dataset.sample === s.name));
      render();
    });
    row.appendChild(btn);
  });
}

function refreshPhotoSelect() {
  const sel = $('panelPhoto');
  sel.innerHTML = '';
  photos.forEach((p, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = p.label;
    sel.appendChild(opt);
  });
  sel.value = String(slots[selectedSlot].photo);
}

function updatePanelBar() {
  const rects = layoutPanels(state.layout, canvas.width, canvas.height);
  const n = rects.length;
  if (selectedSlot >= n) selectedSlot = 0;
  const slot = slots[selectedSlot];
  const photo = photos[slot.photo];
  $('panelLabel').textContent = `Panel ${selectedSlot + 1} of ${n} \u2014 ${photo ? photo.label : 'no photo'}`;
  $('zoomSlider').value = String(slot.zoom);
  const sel = $('panelPhoto');
  if (sel.options.length) sel.value = String(slot.photo);
}

function bindControls() {
  $('fillAllBtn').addEventListener('click', () => {
    const p = slots[selectedSlot].photo;
    slots.forEach((s) => { s.photo = p; });
    render();
  });
  $('exportBtn').addEventListener('click', exportPNG);
  $('exportBtn2').addEventListener('click', exportPNG);
  $('resetPanelBtn').addEventListener('click', () => {
    slots[selectedSlot] = { photo: slots[selectedSlot].photo, zoom: 1, ox: 0, oy: 0 };
    render();
  });
  $('zoomSlider').addEventListener('input', (e) => {
    slots[selectedSlot].zoom = Number(e.target.value);
    render();
  });
  $('panelPhoto').addEventListener('change', (e) => {
    slots[selectedSlot].photo = Number(e.target.value);
    render();
  });
  $('intensitySlider').addEventListener('input', (e) => {
    state.intensity = Number(e.target.value);
    $('intensityVal').textContent = `${Math.round(state.intensity * 100)}%`;
    render();
  });
  const textMap = {
    title1: 'title1', title2: 'title2', subtitle: 'subtitle', tagline: 'tagline',
    billing: 'billing', sealText: 'sealText', burstText: 'burstText', ribbonText: 'ribbonText',
  };
  for (const [id, key] of Object.entries(textMap)) {
    $(id).addEventListener('input', (e) => { state[key] = e.target.value; render(); });
  }
  $('callout0').addEventListener('input', (e) => { state.calloutTexts[0] = e.target.value; render(); });
  $('callout1').addEventListener('input', (e) => { state.calloutTexts[1] = e.target.value; render(); });
  $('callout2').addEventListener('input', (e) => { state.calloutTexts[2] = e.target.value; render(); });
  const toggleMap = {
    gradientToggle: 'gradientTitle', halftoneToggle: 'halftone', sealToggle: 'seal',
    burstToggle: 'burst', ribbonToggle: 'ribbon', calloutToggle: 'callouts',
  };
  for (const [id, key] of Object.entries(toggleMap)) {
    $(id).addEventListener('change', (e) => { state[key] = e.target.checked; render(); });
  }
  document.querySelectorAll('input[name="exportSize"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      state.size = radio.value;
      render();
    });
  });
  $('filePicker').addEventListener('change', async (e) => {
    for (const file of e.target.files) {
      if (!file.type.startsWith('image/')) continue;
      const url = URL.createObjectURL(file);
      try {
        const img = await loadImage(url);
        const idx = photos.length;
        photos.push({ name: `upload-${idx}`, label: file.name.replace(/\.[^.]+$/, '').slice(0, 24) || `Photo ${idx + 1}`, img, w: img.naturalWidth, h: img.naturalHeight });
        slots[selectedSlot].photo = idx;
      } catch { /* unreadable file: skip it */ }
    }
    refreshPhotoSelect();
    render();
  });

  // Panel picking + drag-to-pan + wheel-to-zoom on the preview canvas.
  let dragging = null;
  const toCanvas = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) };
  };
  canvas.addEventListener('pointerdown', (e) => {
    const p = toCanvas(e);
    const rects = layoutPanels(state.layout, canvas.width, canvas.height);
    const hit = rects.findIndex((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
    if (hit < 0) return;
    selectedSlot = hit;
    dragging = { x: p.x, y: p.y, ox: slots[hit].ox, oy: slots[hit].oy, rect: rects[hit] };
    canvas.setPointerCapture(e.pointerId);
    render();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const p = toCanvas(e);
    const slot = slots[selectedSlot];
    slot.ox = Math.max(-0.5, Math.min(0.5, dragging.ox + (p.x - dragging.x) / dragging.rect.w));
    slot.oy = Math.max(-0.5, Math.min(0.5, dragging.oy + (p.y - dragging.y) / dragging.rect.h));
    render();
  });
  canvas.addEventListener('pointerup', () => { dragging = null; });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const slot = slots[selectedSlot];
    slot.zoom = Math.max(1, Math.min(3, slot.zoom * Math.exp(-e.deltaY * 0.0012)));
    render();
  }, { passive: false });
}

// ---------------------------------------------------------------- boot
async function loadSamples() {
  for (const s of SAMPLES) {
    try {
      const img = await loadImage(s.src);
      photos.push({ name: s.name, label: s.label, img, w: img.naturalWidth, h: img.naturalHeight });
    } catch { /* a missing sample just stays out of the picker */ }
  }
  refreshPhotoSelect();
}

function applyShotParams(params) {
  if (params.get('layout') && LAYOUTS.some((l) => l.id === params.get('layout'))) state.layout = params.get('layout');
  if (params.get('grade') && GRADES[params.get('grade')]) state.grade = params.get('grade');
  if (params.get('size') && /^\d+x\d+$/.test(params.get('size'))) state.size = params.get('size');
  if (params.get('title1')) state.title1 = params.get('title1');
  if (params.get('title2')) state.title2 = params.get('title2');
  if (params.get('intensity')) state.intensity = Math.max(0, Math.min(1, Number(params.get('intensity')) || 0.85));
  const photoName = params.get('photo');
  if (photoName) {
    const idx = photos.findIndex((p) => p.name === photoName);
    if (idx >= 0) slots.forEach((s) => { s.photo = idx; });
  }
  // photos=a,b,c assigns a different sample to each panel, in order.
  const photoList = params.get('photos');
  if (photoList) {
    const idxs = photoList.split(',').map((n) => photos.findIndex((p) => p.name === n.trim())).filter((i) => i >= 0);
    if (idxs.length) slots.forEach((s, i) => { s.photo = idxs[i % idxs.length]; });
  }
  // Keep the pickers in sync with the params.
  document.querySelectorAll('.layout-btn').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('.grade-btn').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
  document.querySelectorAll('input[name="exportSize"]').forEach((r) => { r.checked = r.value === state.size; });
  $('intensitySlider').value = String(state.intensity);
  $('intensityVal').textContent = `${Math.round(state.intensity * 100)}%`;
}

async function boot() {
  buildLayoutPicker();
  buildGradePicker();
  buildSampleRow();
  bindControls();
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  await loadSamples();
  applyShotParams(params);
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('90px Anton'),
        document.fonts.load('40px Caveat'),
        document.fonts.load('bold 20px Archivo'),
      ]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch { /* fonts fall back to system faces */ }
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    renderShotCover();
  } else {
    render();
  }
  window.__shotReady = true;
}

boot();
