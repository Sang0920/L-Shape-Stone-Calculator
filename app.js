// ===== L-Shape Stone Volume Calculator (with Chamfer) =====
//
// Cross-section decomposition:
//
//   C╲                              (chamfer on top-left edge)
//   ┌──────────────────────────┐
//   │        flat slab         │ T (flat thickness)
//   └──────────────┬───────────┘
//                  │    lip    │ Lh (lip drop height)
//                  │    Lw     │
//                  └───────────┘
//
// Volume = L × (W × T + Lw × Lh) − chamfer_volume
// Chamfer volume per edge = ½ × C² × L  (45° triangle prism)

(function () {
  'use strict';

  // --- DOM refs ---
  const $length = document.getElementById('length');
  const $width = document.getElementById('width');
  const $flatThickness = document.getElementById('flatThickness');
  const $lipWidth = document.getElementById('lipWidth');
  const $lipHeight = document.getElementById('lipHeight');
  const $chamfer = document.getElementById('chamfer');
  const $quantity = document.getElementById('quantity');
  const $volumeOne = document.getElementById('volumeOne');
  const $volumeTotal = document.getElementById('volumeTotal');
  const $svg = document.getElementById('shapeSvg');
  const $lShape = document.getElementById('lShape');
  const $lShapeHatch = document.getElementById('lShapeHatch');
  const $dims = document.getElementById('dimensions');
  const $btnCross = document.getElementById('btnCross');
  const $btnIso = document.getElementById('btnIso');

  let currentView = 'cross'; // 'cross' | 'iso'

  // --- Helpers ---
  function getValues() {
    return {
      L: parseFloat($length.value) || 0,
      W: parseFloat($width.value) || 0,
      T: parseFloat($flatThickness.value) || 0,
      Lw: parseFloat($lipWidth.value) || 0,
      Lh: parseFloat($lipHeight.value) || 0,
      C: parseFloat($chamfer.value) || 0,
      qty: parseInt($quantity.value, 10) || 1,
    };
  }

  function formatVolume(mm3) {
    const m3 = mm3 / 1e9;
    if (m3 === 0) return '—';
    if (m3 < 0.0001) return m3.toExponential(4) + ' m³';
    return m3.toFixed(6) + ' m³';
  }

  // --- Volume Calculation ---
  function calculate() {
    const v = getValues();
    // Base L-shape volume
    const baseVol = v.L * (v.W * v.T + v.Lw * v.Lh); // mm³

    // Chamfer removes a triangular prism from the top front edge
    // 45° chamfer: cross-section is a right isosceles triangle with legs = C
    // Volume per chamfered edge = ½ × C × C × L
    // The reference image shows the chamfer on the top-front edge (1 edge along L)
    const chamferVol = 0.5 * v.C * v.C * v.L;

    const volOne = Math.max(0, baseVol - chamferVol);
    const volTotal = volOne * v.qty;
    $volumeOne.textContent = formatVolume(volOne);
    $volumeTotal.textContent = formatVolume(volTotal);

    // pulse animation
    const rc = document.getElementById('resultsCard');
    rc.style.animation = 'none';
    void rc.offsetHeight;
    rc.style.animation = 'pulse .35s ease';
  }

  // --- Cross-Section Drawing ---
  function drawCrossSection() {
    const v = getValues();
    if (v.W <= 0 || v.T <= 0) return;

    const svgW = 500, svgH = 400;
    const pad = 70;
    const drawW = svgW - pad * 2;
    const drawH = svgH - pad * 2;

    // Total cross-section bounding: width = W, height = T + Lh
    const totalH = v.T + v.Lh;
    const scale = Math.min(drawW / v.W, drawH / totalH) * 0.75;

    const sW = v.W * scale;
    const sT = v.T * scale;
    const sLw = v.Lw * scale;
    const sLh = v.Lh * scale;
    const sC = v.C * scale; // chamfer size in SVG units

    // Centre in SVG
    const totalShapeH = sT + sLh;
    const ox = (svgW - sW) / 2;
    const oy = (svgH - totalShapeH) / 2;

    // Build the L-shape path (clockwise from top-left)
    // With chamfer on the top-left-front edge (the outer top corner shown in image)
    const lipLeftX = ox + sW - sLw;

    let path;
    if (sC > 0.5) {
      // Chamfer at the top-right outer corner of the flat surface
      // The chamfer cuts across the corner at 45°, going C inward horizontally and C down vertically
      path = [
        `M ${ox} ${oy}`,                            // top-left
        `L ${ox + sW - sC} ${oy}`,                  // top edge, stop before chamfer
        `L ${ox + sW} ${oy + sC}`,                  // chamfer diagonal (45°)
        `L ${ox + sW} ${oy + sT + sLh}`,            // down to bottom-right
        `L ${lipLeftX} ${oy + sT + sLh}`,            // bottom inner corner
        `L ${lipLeftX} ${oy + sT}`,                   // inner corner
        `L ${ox} ${oy + sT}`,                         // bottom-left
        `Z`
      ].join(' ');
    } else {
      // No chamfer — sharp corners
      path = [
        `M ${ox} ${oy}`,
        `L ${ox + sW} ${oy}`,
        `L ${ox + sW} ${oy + sT + sLh}`,
        `L ${lipLeftX} ${oy + sT + sLh}`,
        `L ${lipLeftX} ${oy + sT}`,
        `L ${ox} ${oy + sT}`,
        `Z`
      ].join(' ');
    }

    $lShape.setAttribute('d', path);
    $lShapeHatch.setAttribute('d', path);

    // --- Dimension annotations ---
    $dims.innerHTML = '';

    // Helper: dimension line with arrows
    function dimLine(x1, y1, x2, y2, label, side) {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const off = side === 'left' ? -30 : side === 'right' ? 30 : side === 'top' ? -30 : 30;
      let lx1 = x1, ly1 = y1, lx2 = x2, ly2 = y2;
      const isHoriz = Math.abs(y1 - y2) < 1;

      if (isHoriz) {
        ly1 += off; ly2 += off;
        g.innerHTML += `<line x1="${x1}" y1="${y1}" x2="${lx1}" y2="${ly1}" stroke="#48E0E4" stroke-width="0.8" opacity="0.4"/>`;
        g.innerHTML += `<line x1="${x2}" y1="${y2}" x2="${lx2}" y2="${ly2}" stroke="#48E0E4" stroke-width="0.8" opacity="0.4"/>`;
      } else {
        lx1 += off; lx2 += off;
        g.innerHTML += `<line x1="${x1}" y1="${y1}" x2="${lx1}" y2="${ly1}" stroke="#48E0E4" stroke-width="0.8" opacity="0.4"/>`;
        g.innerHTML += `<line x1="${x2}" y1="${y2}" x2="${lx2}" y2="${ly2}" stroke="#48E0E4" stroke-width="0.8" opacity="0.4"/>`;
      }

      g.innerHTML += `<line x1="${lx1}" y1="${ly1}" x2="${lx2}" y2="${ly2}" class="dim-line"/>`;

      const arrowSize = 5;
      if (isHoriz) {
        g.innerHTML += `<polygon points="${lx1},${ly1} ${lx1 + arrowSize},${ly1 - arrowSize / 2} ${lx1 + arrowSize},${ly1 + arrowSize / 2}" class="dim-arrow"/>`;
        g.innerHTML += `<polygon points="${lx2},${ly2} ${lx2 - arrowSize},${ly2 - arrowSize / 2} ${lx2 - arrowSize},${ly2 + arrowSize / 2}" class="dim-arrow"/>`;
      } else {
        g.innerHTML += `<polygon points="${lx1},${ly1} ${lx1 - arrowSize / 2},${ly1 + arrowSize} ${lx1 + arrowSize / 2},${ly1 + arrowSize}" class="dim-arrow"/>`;
        g.innerHTML += `<polygon points="${lx2},${ly2} ${lx2 - arrowSize / 2},${ly2 - arrowSize} ${lx2 + arrowSize / 2},${ly2 - arrowSize}" class="dim-arrow"/>`;
      }

      const tx = (lx1 + lx2) / 2;
      const ty = (ly1 + ly2) / 2;
      const textOffset = isHoriz ? -8 : -10;
      const anchor = isHoriz ? 'middle' : 'end';
      g.innerHTML += `<text x="${tx + (isHoriz ? 0 : textOffset)}" y="${ty + (isHoriz ? textOffset : 4)}" text-anchor="${anchor}" class="dim-text">${label}</text>`;

      $dims.appendChild(g);
    }

    // W (total width) — top
    dimLine(ox, oy, ox + sW, oy, `W = ${v.W}`, 'top');

    // T (flat thickness) — left
    dimLine(ox, oy, ox, oy + sT, `T = ${v.T}`, 'left');

    // Lw (lip width) — bottom
    dimLine(lipLeftX, oy + sT + sLh, ox + sW, oy + sT + sLh, `Lw = ${v.Lw}`, 'bottom');

    // Lh (lip drop) — right
    dimLine(ox + sW, oy + sT, ox + sW, oy + sT + sLh, `Lh = ${v.Lh}`, 'right');

    // Chamfer annotation
    if (sC > 0.5) {
      const cx1 = ox + sW - sC;
      const cy1 = oy;
      const cx2 = ox + sW;
      const cy2 = oy + sC;
      // Small label near the chamfer line
      const cmx = (cx1 + cx2) / 2 + 12;
      const cmy = (cy1 + cy2) / 2 - 8;
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      // highlight the chamfer edge
      g.innerHTML += `<line x1="${cx1}" y1="${cy1}" x2="${cx2}" y2="${cy2}" stroke="#ff6eb4" stroke-width="2" stroke-dasharray="3 2"/>`;
      g.innerHTML += `<text x="${cmx}" y="${cmy}" text-anchor="start" class="dim-text" fill="#ff6eb4" font-size="11">C = ${v.C}</text>`;
      $dims.appendChild(g);
    }
  }

  // --- 3D Isometric Drawing ---
  function drawIsometric() {
    const v = getValues();
    if (v.W <= 0 || v.T <= 0 || v.L <= 0) return;

    const svgW = 500, svgH = 400;
    const totalH = v.T + v.Lh;
    const maxDim = Math.max(v.W, v.L, totalH);
    const baseScale = 140 / maxDim;

    const ax = Math.cos(Math.PI / 6) * baseScale;
    const ay = Math.sin(Math.PI / 6) * baseScale;
    const cx = svgW / 2;
    const cy = svgH / 2 + 20;

    function iso(x3, y3, z3) {
      return [
        cx + x3 * ax - z3 * ax,
        cy - y3 * baseScale + x3 * ay + z3 * ay
      ];
    }

    const W = v.W, T = v.T, Lw = v.Lw, Lh = v.Lh, L = v.L, C = v.C;

    // Cross-section points in x-y (with chamfer on the top-right corner)
    // Going clockwise from top-left
    let csTop;
    if (C > 0) {
      csTop = [
        [0, T],            // top-left
        [W - C, T],        // top, before chamfer
        [W, T - C],        // after chamfer
        [W, -(Lh)],        // bottom-right lip
        [W - Lw, -(Lh)],  // inner lip bottom
        [W - Lw, 0],       // inner lip top
        [0, 0],            // bottom-left
      ];
    } else {
      csTop = [
        [0, T],
        [W, T],
        [W, -(Lh)],
        [W - Lw, -(Lh)],
        [W - Lw, 0],
        [0, 0],
      ];
    }

    const frontPts = csTop.map(([x, y]) => iso(x, y, 0));
    const backPts = csTop.map(([x, y]) => iso(x, y, L));

    function polyStr(pts) {
      return pts.map(p => p.join(',')).join(' ');
    }

    let svg = '';
    const cTop = 'rgba(158,170,185,0.75)';
    const cFront = 'rgba(120,135,150,0.8)';
    const cSide = 'rgba(100,115,130,0.80)';
    const cStroke = '#556';

    if (C > 0) {
      // Top surface: indices 0,1 → back 1,0
      const topFace = [frontPts[0], frontPts[1], backPts[1], backPts[0]];
      svg += `<polygon points="${polyStr(topFace)}" fill="${cTop}" stroke="${cStroke}" stroke-width="1"/>`;

      // Chamfer face: indices 1,2 → back 2,1
      const chamferFace = [frontPts[1], frontPts[2], backPts[2], backPts[1]];
      svg += `<polygon points="${polyStr(chamferFace)}" fill="rgba(180,140,170,0.7)" stroke="${cStroke}" stroke-width="1"/>`;

      // Right face: indices 2,3 → back 3,2
      const rightFace = [frontPts[2], frontPts[3], backPts[3], backPts[2]];
      svg += `<polygon points="${polyStr(rightFace)}" fill="${cSide}" stroke="${cStroke}" stroke-width="1"/>`;

      // Lip bottom: indices 3,4 → back 4,3
      const lipBottom = [frontPts[3], frontPts[4], backPts[4], backPts[3]];
      svg += `<polygon points="${polyStr(lipBottom)}" fill="${cTop}" stroke="${cStroke}" stroke-width="1"/>`;

      // Inner lip: indices 4,5 → back 5,4
      const innerLip = [frontPts[4], frontPts[5], backPts[5], backPts[4]];
      svg += `<polygon points="${polyStr(innerLip)}" fill="${cFront}" stroke="${cStroke}" stroke-width="1" opacity="0.5"/>`;

      // Flat bottom: indices 5,6 → back 6,5
      const flatBottom = [frontPts[5], frontPts[6], backPts[6], backPts[5]];
      svg += `<polygon points="${polyStr(flatBottom)}" fill="${cTop}" stroke="${cStroke}" stroke-width="1" opacity="0.4"/>`;
    } else {
      // Top surface
      const topFace = [frontPts[0], frontPts[1], backPts[1], backPts[0]];
      svg += `<polygon points="${polyStr(topFace)}" fill="${cTop}" stroke="${cStroke}" stroke-width="1"/>`;

      // Right face
      const rightFace = [frontPts[1], frontPts[2], backPts[2], backPts[1]];
      svg += `<polygon points="${polyStr(rightFace)}" fill="${cSide}" stroke="${cStroke}" stroke-width="1"/>`;

      // Lip bottom
      const lipBottom = [frontPts[2], frontPts[3], backPts[3], backPts[2]];
      svg += `<polygon points="${polyStr(lipBottom)}" fill="${cTop}" stroke="${cStroke}" stroke-width="1"/>`;

      // Inner lip
      const innerLip = [frontPts[3], frontPts[4], backPts[4], backPts[3]];
      svg += `<polygon points="${polyStr(innerLip)}" fill="${cFront}" stroke="${cStroke}" stroke-width="1" opacity="0.5"/>`;

      // Flat bottom
      const flatBottom = [frontPts[4], frontPts[5], backPts[5], backPts[4]];
      svg += `<polygon points="${polyStr(flatBottom)}" fill="${cTop}" stroke="${cStroke}" stroke-width="1" opacity="0.4"/>`;
    }

    // Front face
    svg += `<polygon points="${polyStr(frontPts)}" fill="${cFront}" stroke="${cStroke}" stroke-width="1.5"/>`;

    $lShape.setAttribute('d', '');
    $lShapeHatch.setAttribute('d', '');
    $dims.innerHTML = svg;

    // Dimension labels
    const lenMid = iso(W + 15 / baseScale, T, L / 2);
    $dims.innerHTML += `<text x="${lenMid[0] + 15}" y="${lenMid[1]}" class="dim-text" text-anchor="start">L = ${v.L}</text>`;

    const wMid = iso(W / 2, T + 15 / baseScale, 0);
    $dims.innerHTML += `<text x="${wMid[0]}" y="${wMid[1] - 10}" class="dim-text" text-anchor="middle">W = ${v.W}</text>`;

    const tMid = iso(-10 / baseScale, T / 2, 0);
    $dims.innerHTML += `<text x="${tMid[0] - 10}" y="${tMid[1]}" class="dim-text" text-anchor="end">T = ${v.T}</text>`;

    const lhMid = iso(W + 10 / baseScale, T - Lh / 2, 0);
    $dims.innerHTML += `<text x="${lhMid[0] + 10}" y="${lhMid[1]}" class="dim-text" text-anchor="start">Lh = ${v.Lh}</text>`;

    const lwMid = iso(W - Lw / 2, T - Lh - 12 / baseScale, 0);
    $dims.innerHTML += `<text x="${lwMid[0]}" y="${lwMid[1] + 16}" class="dim-text" text-anchor="middle">Lw = ${v.Lw}</text>`;

    // Chamfer label (if present)
    if (C > 0) {
      const cMid = iso(W - C / 2, T - C / 2, 0);
      $dims.innerHTML += `<text x="${cMid[0] + 14}" y="${cMid[1] - 6}" class="dim-text" fill="#ff6eb4" font-size="11" text-anchor="start">C = ${v.C}</text>`;
    }
  }

  // --- Unified draw ---
  function draw() {
    if (currentView === 'cross') {
      drawCrossSection();
    } else {
      drawIsometric();
    }
  }

  // --- View toggle ---
  $btnCross.addEventListener('click', () => {
    currentView = 'cross';
    $btnCross.classList.add('active');
    $btnIso.classList.remove('active');
    draw();
  });

  $btnIso.addEventListener('click', () => {
    currentView = 'iso';
    $btnIso.classList.add('active');
    $btnCross.classList.remove('active');
    draw();
  });

  // --- Event listeners ---
  const inputs = [$length, $width, $flatThickness, $lipWidth, $lipHeight, $chamfer, $quantity];
  inputs.forEach(el => {
    el.addEventListener('input', () => {
      calculate();
      draw();
    });
  });

  // --- Pulse keyframe (injected once) ---
  const style = document.createElement('style');
  style.textContent = `@keyframes pulse{0%{transform:scale(1)}40%{transform:scale(1.015)}100%{transform:scale(1)}}`;
  document.head.appendChild(style);

  // --- Init ---
  calculate();
  draw();
})();
