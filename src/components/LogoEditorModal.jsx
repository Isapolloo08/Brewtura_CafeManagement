import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icons } from './Icons';

const VIEW_W = 560;
const VIEW_H = 400;
const HANDLE = 16;

const RATIOS = [
  { id: 'free', label: 'Free', ratio: null },
  { id: '1:1', label: '1:1', ratio: 1 },
  { id: '4:3', label: '4:3', ratio: 4 / 3 },
  { id: '16:9', label: '16:9', ratio: 16 / 9 },
];

const BG_COLORS = [
  { id: 'transparent', label: 'Transparent', value: 'transparent' },
  { id: 'white', label: 'White', value: '#FFFFFF' },
  { id: 'cream', label: 'Cream', value: '#F5E6D3' },
  { id: 'caramel', label: 'Caramel', value: '#C08552' },
  { id: 'espresso', label: 'Espresso', value: '#693F27' },
  { id: 'dark', label: 'Dark', value: '#17100D' },
];

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export function LogoEditorModal({ src, onCancel, onApply }) {
  const [img, setImg] = useState(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [ratioId, setRatioId] = useState('free');
  const [bgColor, setBgColor] = useState('transparent');
  const [logoShape, setLogoShape] = useState('square');
  const [borderEnabled, setBorderEnabled] = useState(false);
  const [borderWidth, setBorderWidth] = useState(8);
  const [borderColor, setBorderColor] = useState('#FFFFFF');
  const [contentScale, setContentScale] = useState(1);

  const transRef = useRef(null);
  const canvasRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    const image = new Image();
    image.onload = () => setImg(image);
    image.onerror = () => setImg(null);
    image.src = src;
    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [src]);

  // Build the rotated + flipped working canvas whenever the transform changes.
  useEffect(() => {
    if (!img) return;
    const swap = rotation % 180 !== 0;
    const w = swap ? img.naturalHeight : img.naturalWidth;
    const h = swap ? img.naturalWidth : img.naturalHeight;
    setDims({ w, h });
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setCrop({ x: 0, y: 0, w, h });

    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.translate(w / 2, h / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2, img.naturalWidth, img.naturalHeight);
    transRef.current = c;
  }, [img, rotation, flipH, flipV]);

  // Draw the preview: transformed image + crop overlay.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#221B18';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    const trans = transRef.current;
    if (!trans || !dims.w) return;

    const scale = Math.min(VIEW_W / dims.w, VIEW_H / dims.h);
    const dispScale = scale * zoom;
    const imgW = dims.w * dispScale;
    const imgH = dims.h * dispScale;
    const ox = (VIEW_W - imgW) / 2 + pan.x;
    const oy = (VIEW_H - imgH) / 2 + pan.y;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(trans, ox, oy, imgW, imgH);

    // Crop overlay
    const cx = ox + crop.x * dispScale;
    const cy = oy + crop.y * dispScale;
    const cw = crop.w * dispScale;
    const ch = crop.h * dispScale;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, VIEW_W, cy);
    ctx.fillRect(0, cy, VIEW_W, ch);
    ctx.clearRect(cx, cy, cw, ch);
    ctx.fillRect(0, cy + ch, VIEW_W, VIEW_H - cy - ch);
    ctx.fillRect(0, cy, cx, ch);
    ctx.fillRect(cx + cw, cy, VIEW_W - cx - cw, ch);

    ctx.strokeStyle = '#D49A6A';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx, cy, cw, ch);

    // Corner handles
    ctx.fillStyle = '#D49A6A';
    const hs = 5;
    const corners = [
      [cx, cy],
      [cx + cw, cy],
      [cx, cy + ch],
      [cx + cw, cy + ch],
    ];
    for (const [hx, hy] of corners) {
      ctx.beginPath();
      ctx.rect(hx - hs, hy - hs, hs * 2, hs * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Golden-rule gridlines
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + (cw * i) / 3, cy);
      ctx.lineTo(cx + (cw * i) / 3, cy + ch);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy + (ch * i) / 3);
      ctx.lineTo(cx + cw, cy + (ch * i) / 3);
      ctx.stroke();
    }
  }, [img, dims, zoom, pan, crop]);

  const getLayout = useCallback(() => {
    const scale = Math.min(VIEW_W / dims.w, VIEW_H / dims.h);
    const dispScale = scale * zoom;
    const imgW = dims.w * dispScale;
    const imgH = dims.h * dispScale;
    const ox = (VIEW_W - imgW) / 2 + pan.x;
    const oy = (VIEW_H - imgH) / 2 + pan.y;
    return { scale, dispScale, imgW, imgH, ox, oy };
  }, [dims, zoom, pan]);

  const toCanvasPoint = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * VIEW_W,
      y: ((e.clientY - rect.top) / rect.height) * VIEW_H,
    };
  };

  const hitTest = (px, py) => {
    const { dispScale, ox, oy } = getLayout();
    const cx = ox + crop.x * dispScale;
    const cy = oy + crop.y * dispScale;
    const cw = crop.w * dispScale;
    const ch = crop.h * dispScale;
    const near = (a, b) => Math.abs(a - b) <= HANDLE;
    if (near(px, cx) && near(py, cy)) return 'nw';
    if (near(px, cx + cw) && near(py, cy)) return 'ne';
    if (near(px, cx) && near(py, cy + ch)) return 'sw';
    if (near(px, cx + cw) && near(py, cy + ch)) return 'se';
    if (px >= cx && px <= cx + cw && py >= cy && py <= cy + ch) return 'move';
    return 'pan';
  };

  const handlePointerDown = (e) => {
    if (!transRef.current) return;
    e.preventDefault();
    const { x, y } = toCanvasPoint(e);
    const mode = hitTest(x, y);
    dragRef.current = { mode, startX: x, startY: y, crop: { ...crop }, pan: { ...pan }, dispScale: getLayout().dispScale };
    canvasRef.current.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    const drag = dragRef.current;
    if (!drag) return;
    e.preventDefault();
    const { x, y } = toCanvasPoint(e);
    const dx = (x - drag.startX) / drag.dispScale;
    const dy = (y - drag.startY) / drag.dispScale;

    if (drag.mode === 'pan') {
      setPan({ x: drag.pan.x + (x - drag.startX), y: drag.pan.y + (y - drag.startY) });
      return;
    }

    const ratio = RATIOS.find((r) => r.id === ratioId)?.ratio ?? null;
    let { x: cx, y: cy, w: cw, h: ch } = drag.crop;

    if (drag.mode === 'move') {
      cx = clamp(cx + dx, 0, dims.w - cw);
      cy = clamp(cy + dy, 0, dims.h - ch);
    } else {
      const edges = {
        nw: { l: 1, t: 1 },
        ne: { r: 1, t: 1 },
        sw: { l: 1, b: 1 },
        se: { r: 1, b: 1 },
      }[drag.mode];
      let newX = cx;
      let newY = cy;
      let newW = cw;
      let newH = ch;
      if (edges.l) newX = clamp(cx + dx, 0, cx + cw - 8);
      if (edges.t) newY = clamp(cy + dy, 0, cy + ch - 8);
      if (edges.r) newW = clamp(cw + dx, 8, dims.w - cx);
      if (edges.b) newH = clamp(ch + dy, 8, dims.h - cy);
      if (edges.l) newW = cx + cw - newX;
      if (edges.t) newH = cy + ch - newY;

      if (ratio) {
        if (edges.l || edges.r) {
          newH = newW / ratio;
          if (edges.t) newY = clamp(cy + ch - newH, 0, cy + ch - 8);
          else newY = clamp(cy, 0, dims.h - newH);
        } else {
          newW = newH * ratio;
          if (edges.l) newX = clamp(cx + cw - newW, 0, cx + cw - 8);
          else newX = clamp(cx, 0, dims.w - newW);
        }
      }

      const next = { x: newX, y: newY, w: newW, h: newH };
      if (next.x < 0) {
        next.w += next.x;
        next.x = 0;
      }
      if (next.y < 0) {
        next.h += next.y;
        next.y = 0;
      }
      setCrop(next);
      return;
    }

    setCrop({ x: cx, y: cy, w: cw, h: ch });
  };

  const handlePointerUp = (e) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    canvasRef.current?.releasePointerCapture(e.pointerId);
  };

  const applyRatio = (id) => {
    setRatioId(id);
    const ratio = RATIOS.find((r) => r.id === id)?.ratio;
    let w = crop.w;
    let h = crop.h;
    if (ratio) {
      if (w / h > ratio) h = w / ratio;
      else w = h * ratio;
      if (w > dims.w) { w = dims.w; h = w / ratio; }
      if (h > dims.h) { h = dims.h; w = h * ratio; }
    } else {
      w = dims.w;
      h = dims.h;
    }
    const cx = crop.x + crop.w / 2;
    const cy = crop.y + crop.h / 2;
    const x = clamp(cx - w / 2, 0, dims.w - w);
    const y = clamp(cy - h / 2, 0, dims.h - h);
    setCrop({ x, y, w, h });
  };

  const handleZoom = (delta) => {
    setZoom((z) => clamp(Math.round((z + delta) * 100) / 100, 0.5, 5));
  };

  // Auto-trim: removes transparent (or near-white) empty margins around the
  // content within the current crop so the logo fills the shape edge-to-edge.
  // Hybrid approach: skips fully transparent pixels and near-white pixels, so
  // transparent logos and white-background logos both trim correctly.
  const trimEmptySpace = () => {
    const trans = transRef.current;
    if (!trans || !crop.w || !crop.h) return;
    const { x, y, w, h } = crop;
    const tmp = document.createElement('canvas');
    tmp.width = w;
    tmp.height = h;
    const tctx = tmp.getContext('2d');
    if (!tctx) return;
    tctx.drawImage(trans, x, y, w, h, 0, 0, w, h);
    let data;
    try {
      data = tctx.getImageData(0, 0, w, h).data;
    } catch {
      return;
    }
    const alphaThreshold = 10;
    const whiteThreshold = 245;
    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const i = (py * w + px) * 4;
        const a = data[i + 3];
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const isTransparent = a < alphaThreshold;
        const isNearWhite = !isTransparent && r >= whiteThreshold && g >= whiteThreshold && b >= whiteThreshold;
        if (isTransparent || isNearWhite) continue;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }
    }
    if (maxX < 0) return;
    setCrop({ x: x + minX, y: y + minY, w: maxX - minX + 1, h: maxY - minY + 1 });
  };

  const renderOutput = useCallback(() => {
    const trans = transRef.current;
    if (!trans || !crop.w || !crop.h) return null;
    const out = document.createElement('canvas');
    const maxDim = 256;
    const outScale = Math.min(1, maxDim / Math.max(crop.w, crop.h));
    out.width = Math.max(1, Math.round(crop.w * outScale));
    out.height = Math.max(1, Math.round(crop.h * outScale));
    const ctx = out.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const radius =
      logoShape === 'circle'
        ? Math.min(out.width, out.height) / 2
        : logoShape === 'rounded'
          ? Math.min(out.width, out.height) * 0.25
          : 0;

    // 1) Background (behind everything, fills the full square/canvas)
    if (bgColor !== 'transparent') {
      ctx.save();
      if (radius > 0) {
        ctx.beginPath();
        ctx.roundRect(0, 0, out.width, out.height, radius);
        ctx.clip();
      }
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.restore();
    }

    // 2) Shape-clip the image itself. contentScale > 1 zooms in from center so
    //    the logo fills the shape with no empty space around it.
    const drawContent = (insetX = 0, insetY = 0, clip = true) => {
      const dstW = out.width - insetX * 2;
      const dstH = out.height - insetY * 2;
      const srcW = crop.w / contentScale;
      const srcH = crop.h / contentScale;
      const srcX = crop.x + (crop.w - srcW) / 2;
      const srcY = crop.y + (crop.h - srcH) / 2;
      if (clip && radius > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(0, 0, out.width, out.height, radius);
        ctx.clip();
        ctx.drawImage(trans, srcX, srcY, srcW, srcH, insetX, insetY, dstW, dstH);
        ctx.restore();
      } else {
        ctx.drawImage(trans, srcX, srcY, srcW, srcH, insetX, insetY, dstW, dstH);
      }
    };

    if (borderEnabled) {
      // Punch a hole: fill the border color fully, then draw only the clipped
      // image inset by borderWidth, leaving a colored frame.
      ctx.fillStyle = borderColor;
      if (radius > 0) {
        ctx.beginPath();
        ctx.roundRect(0, 0, out.width, out.height, radius);
        ctx.fill();
        ctx.save();
        ctx.beginPath();
        const innerR = Math.max(0, radius - borderWidth);
        ctx.roundRect(borderWidth, borderWidth, out.width - borderWidth * 2, out.height - borderWidth * 2, innerR);
        ctx.clip();
        ctx.clearRect(0, 0, out.width, out.height);
        drawContent(borderWidth, borderWidth, false);
        ctx.restore();
      } else {
        ctx.fillRect(0, 0, out.width, out.height);
        drawContent(borderWidth, borderWidth, false);
      }
    } else {
      drawContent(0, 0, true);
    }

    return out;
  }, [crop, bgColor, logoShape, borderEnabled, borderWidth, borderColor, contentScale]);

  const handleApply = () => {
    const out = renderOutput();
    if (!out) return;
    onApply(out.toDataURL('image/png'));
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Memoized output preview so we don't re-render a canvas on every state tick.
  const outputPreview = useMemo(() => {
    const out = renderOutput();
    return out ? out.toDataURL('image/png') : '';
  }, [renderOutput]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-3xl glass-card rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xl animate-slideUp max-h-[92vh] overflow-y-auto">
        <div className="flex items-center gap-3 pb-3 border-b border-[#C08552]/10">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C08552]/20 to-[#693F27]/10 flex items-center justify-center shrink-0">
            <Icons.Edit className="w-4 h-4 text-[#693F27]" />
          </div>
          <div className="flex-1">
            <h3 className="font-heading font-extrabold text-lg text-[#3C2A21]">Edit Logo</h3>
            <p className="text-[10px] text-[#3C2A21]/45 font-medium">
              Crop, rotate, flip, shape, add a border or background, and zoom. Drag the handles to resize the crop area.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-lg hover:bg-red-500/10 text-[#3C2A21]/50 hover:text-red-700 flex items-center justify-center transition-all active:scale-95"
            aria-label="Close editor"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3 space-y-3">
            <div
              className="relative rounded-2xl overflow-hidden border border-[#C08552]/20 shadow-inner touch-none select-none"
              style={{ height: VIEW_H }}
            >
              <canvas
                ref={canvasRef}
                width={VIEW_W}
                height={VIEW_H}
                className="w-full h-full block cursor-move"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/50 backdrop-blur px-2 py-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => handleZoom(-0.25)}
                  className="w-6 h-6 rounded-md hover:bg-white/10 text-white/80 text-sm font-bold"
                  aria-label="Zoom out"
                >
                  −
                </button>
                <span className="text-[10px] text-white/70 font-semibold w-12 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => handleZoom(0.25)}
                  className="w-6 h-6 rounded-md hover:bg-white/10 text-white/80 text-sm font-bold"
                  aria-label="Zoom in"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={resetView}
                  className="w-6 h-6 rounded-md hover:bg-white/10 text-white/60 text-[10px] font-bold"
                  aria-label="Reset view"
                >
                  ⟲
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] text-[#3C2A21]/45 font-semibold uppercase tracking-wider">
                Drag image to pan
              </span>
              <span className="text-[10px] text-[#3C2A21]/45 font-semibold uppercase tracking-wider">
                {dims.w} × {dims.h}px
              </span>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div>
              <label className="block text-[11px] font-extrabold text-[#4A2E2A] uppercase tracking-wider mb-2">
                Transform
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/60 border border-[#C08552]/20 text-[#3C2A21] text-xs font-bold hover:bg-white/90 transition-all active:scale-95"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 0115 0m-4.5 4.5H21V21M4.5 12l3 3m12-3l-3-3" />
                  </svg>
                  Rotate 90°
                </button>
                <button
                  type="button"
                  onClick={() => setFlipH((f) => !f)}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
                    flipH
                      ? 'bg-[#693F27] text-amber-100 border-[#693F27]'
                      : 'bg-white/60 border-[#C08552]/20 text-[#3C2A21] hover:bg-white/90'
                  }`}
                >
                  <Icons.ArrowUpDown className="w-3.5 h-3.5 rotate-90" />
                  Flip H
                </button>
                <button
                  type="button"
                  onClick={() => setFlipV((f) => !f)}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
                    flipV
                      ? 'bg-[#693F27] text-amber-100 border-[#693F27]'
                      : 'bg-white/60 border-[#C08552]/20 text-[#3C2A21] hover:bg-white/90'
                  }`}
                >
                  <Icons.ArrowUpDown className="w-3.5 h-3.5" />
                  Flip V
                </button>
                <button
                  type="button"
                  onClick={() => { setRotation(0); setFlipH(false); setFlipV(false); resetView(); }}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/5 border border-red-500/20 text-red-700 text-xs font-bold hover:bg-red-500/10 transition-all active:scale-95"
                >
                  <Icons.Trash className="w-3.5 h-3.5" />
                  Reset
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-[#4A2E2A] uppercase tracking-wider mb-2">
                Crop Ratio
              </label>
              <div className="flex gap-2">
                {RATIOS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => applyRatio(r.id)}
                    className={`flex-1 px-2 py-2 rounded-xl border text-[11px] font-bold transition-all active:scale-95 ${
                      ratioId === r.id
                        ? 'bg-[#693F27] text-amber-100 border-[#693F27]'
                        : 'bg-white/60 border-[#C08552]/20 text-[#3C2A21] hover:bg-white/90'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-[#4A2E2A] uppercase tracking-wider mb-2">
                Shape & Border
              </label>
              <div className="flex gap-2 mb-2">
                {[
                  { id: 'square', label: 'Square', icon: '' },
                  { id: 'rounded', label: 'Rounded', icon: 'rounded-[6px]' },
                  { id: 'circle', label: 'Circle', icon: 'rounded-full' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setLogoShape(s.id)}
                    className={`flex-1 px-2 py-2 rounded-xl border text-[11px] font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                      logoShape === s.id
                        ? 'bg-[#693F27] text-amber-100 border-[#693F27]'
                        : 'bg-white/60 border-[#C08552]/20 text-[#3C2A21] hover:bg-white/90'
                    }`}
                  >
                    <span
                      className={`w-3 h-3 border-2 ${
                        logoShape === s.id ? 'border-amber-100/80' : 'border-[#3C2A21]/40'
                      } ${s.icon}`}
                    />
                    {s.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between px-1 py-2 rounded-xl bg-white/40 border border-[#C08552]/15">
                <label className="flex items-center gap-2 text-[11px] font-bold text-[#3C2A21]/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={borderEnabled}
                    onChange={(e) => setBorderEnabled(e.target.checked)}
                    className="w-3.5 h-3.5 accent-[#693F27]"
                  />
                  Add border
                </label>
                {borderEnabled && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={borderWidth}
                      onChange={(e) => setBorderWidth(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                      className="w-12 px-1.5 py-1 text-center text-[11px] font-bold text-[#3C2A21] rounded-lg glass-input"
                      title="Border thickness"
                    />
                    <input
                      type="color"
                      value={borderColor}
                      onChange={(e) => setBorderColor(e.target.value)}
                      className="w-7 h-7 rounded-lg border border-[#C08552]/30 bg-transparent cursor-pointer p-0"
                      title="Border color"
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-[#4A2E2A] uppercase tracking-wider mb-2">
                Fill & Trim
              </label>
              <button
                type="button"
                onClick={trimEmptySpace}
                className="w-full mb-2 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#F5E6D3] border border-amber-900/10 text-[#3C2A21] text-xs font-bold hover:bg-amber-900/15 transition-all active:scale-95"
              >
                <Icons.Settings className="w-3.5 h-3.5" />
                Auto-trim empty space
              </button>
              <div className="flex items-center gap-3 px-1">
                <span className="text-[10px] font-bold text-[#3C2A21]/50">Fill</span>
                <input
                  type="range"
                  min={1}
                  max={2.5}
                  step={0.05}
                  value={contentScale}
                  onChange={(e) => setContentScale(Number(e.target.value))}
                  className="flex-1 accent-[#693F27]"
                  title="Zoom the logo so it fills the shape"
                />
                <span className="text-[10px] font-bold text-[#3C2A21]/70 w-10 text-right">
                  {Math.round(contentScale * 100)}%
                </span>
              </div>
              <p className="text-[10px] text-[#3C2A21]/45 font-medium mt-1">
                Auto-trim removes empty margins; Fill zooms the logo so it covers the whole shape with no gaps.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-[#4A2E2A] uppercase tracking-wider mb-2">
                Background
              </label>
              <div className="flex flex-wrap gap-2">
                {BG_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={c.label}
                    onClick={() => setBgColor(c.value)}
                    className={`w-8 h-8 rounded-lg border-2 transition-all active:scale-95 flex items-center justify-center ${
                      bgColor === c.value ? 'border-[#693F27] ring-2 ring-[#693F27]/30' : 'border-[#C08552]/25 hover:border-[#C08552]/60'
                    } ${c.value === 'transparent' ? 'bg-[conic-gradient(#eee_25%,#fff_0_50%,#eee_0_75%,#fff_0)]' : ''}`}
                    style={c.value !== 'transparent' ? { backgroundColor: c.value } : undefined}
                  >
                    {c.value === 'transparent' && (
                      <svg className="w-3 h-3 text-[#3C2A21]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-[#4A2E2A] uppercase tracking-wider mb-2">
                Output
              </label>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-white/60 border border-[#C08552]/20 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                  {outputPreview ? (
                    <img
                      src={outputPreview}
                      alt="Logo preview"
                      className="w-full h-full object-contain p-0.5"
                    />
                  ) : (
                    <Icons.CoffeeCup className="w-6 h-6 text-[#3C2A21]/25" />
                  )}
                </div>
                <p className="text-[10px] text-[#3C2A21]/50 font-medium leading-relaxed">
                  Final logo is scaled to fit within 256px. The shape and border are baked into the image itself, so they show everywhere.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-3 border-t border-[#C08552]/10">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-3 rounded-2xl text-xs font-extrabold text-[#3C2A21]/60 hover:text-[#3C2A21] hover:bg-white/50 transition-all active:scale-95"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="ml-auto px-6 py-3 rounded-2xl font-extrabold text-xs bg-gradient-to-r from-[#693F27] to-[#3C2A21] text-amber-100 shadow-lg hover:brightness-110 active:scale-95 transition-all"
          >
            <span className="flex items-center gap-2">
              <Icons.Edit className="w-3.5 h-3.5" />
              Apply Logo
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
