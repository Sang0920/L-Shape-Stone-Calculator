// ===== L-Shape Stone Volume Calculator (with Chamfer / Bullnose) =====
//
// Cross-section decomposition:
//
//   ╲  or  ╭                        (chamfer or bullnose on top edge)
//   ┌──────────────────────────┐
//   │        flat slab         │ T (flat thickness)
//   └──────────────┬───────────┘
//                  │    lip    │ Lh (lip drop height)
//                  │    Lw     │
//                  └───────────┘
//
// Chamfer:  V = L × (W × T + Lw × Lh) − ½ × Tr² × L
// Bullnose: V = L × (W × T + Lw × Lh) − Tr² × (1 − π/4) × L

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
  const $validationMsg = document.getElementById('validationMsg');
  const $edgeChamfer = document.getElementById('edgeChamfer');
  const $edgeBullnose = document.getElementById('edgeBullnose');
  const $chamferLabel = document.getElementById('chamferLabel');
  const $chamferHint = document.getElementById('chamferHint');
  const $formulaText = document.getElementById('formulaText');
  const $formulaDesc = document.getElementById('formulaDesc');
  const $autoFitBtn = document.getElementById('autoFitBtn');

  let currentView = 'cross'; // 'cross' | 'iso'

  // --- Helpers ---
  function getEdgeType() {
    return $edgeBullnose.checked ? 'bullnose' : 'chamfer';
  }

  function getValues() {
    return {
      L: parseFloat($length.value) || 0,
      W: parseFloat($width.value) || 0,
      T: parseFloat($flatThickness.value) || 0,
      Lw: parseFloat($lipWidth.value) || 0,
      Lh: parseFloat($lipHeight.value) || 0,
      Tr: parseFloat($chamfer.value) || 0,
      qty: parseInt($quantity.value, 10) || 1,
      edge: getEdgeType(),
    };
  }

  function formatVolume(mm3) {
    const m3 = mm3 / 1e9;
    if (m3 === 0) return '—';
    if (m3 < 0.0001) return m3.toExponential(4) + ' m³';
    return m3.toFixed(6) + ' m³';
  }

  // --- Update UI labels based on edge type ---
  function updateEdgeUI() {
    const edge = getEdgeType();
    if (edge === 'bullnose') {
      $chamferLabel.innerHTML = 'Radius (T<sub>r</sub>)';
      $chamferHint.textContent = 'Quarter-circle radius on top edge (0 = no edge). Must be less than T.';
      $formulaText.innerHTML = 'V = L × [ W × T + Lw × Lh ] − T<sub>r</sub>² × (1 − π/4) × L';
      $formulaDesc.innerHTML = 'The L-shape is decomposed into a flat slab (W × T) plus a vertical lip (Lw × Lh), extruded along L. A bullnose removes a square minus a quarter-circle with radius = T<sub>r</sub>.';
      $autoFitBtn.style.display = 'block';
    } else {
      $chamferLabel.innerHTML = 'Chamfer Depth (T<sub>r</sub>)';
      $chamferHint.textContent = '45° chamfer leg length on top edge (0 = no edge). Must be less than T.';
      $formulaText.innerHTML = 'V = L × [ W × T + Lw × Lh ] − ½ × T<sub>r</sub>² × L';
      $formulaDesc.innerHTML = 'The L-shape is decomposed into a flat slab (W × T) plus a vertical lip (Lw × Lh), extruded along L. A 45° chamfer removes a right-isosceles triangular prism with legs = T<sub>r</sub>.';
      $autoFitBtn.style.display = 'none';
    }
  }

  // --- Input Validation ---
  function validate() {
    const v = getValues();
    const errors = [];
    const errorInputs = new Set();

    // All dimensions must be positive (except Tr which can be 0)
    if (v.L <= 0) { errors.push('Length (L) must be greater than 0.'); errorInputs.add($length); }
    if (v.W <= 0) { errors.push('Total Width (W) must be greater than 0.'); errorInputs.add($width); }
    if (v.T <= 0) { errors.push('Flat Thickness (T) must be greater than 0.'); errorInputs.add($flatThickness); }
    if (v.Lw <= 0) { errors.push('Lip Width (Lw) must be greater than 0.'); errorInputs.add($lipWidth); }
    if (v.Lh <= 0) { errors.push('Lip Drop Height (Lh) must be greater than 0.'); errorInputs.add($lipHeight); }
    if (v.Tr < 0) { errors.push('T\u1d63 cannot be negative.'); errorInputs.add($chamfer); }
    if (v.qty < 1) { errors.push('Quantity must be at least 1.'); errorInputs.add($quantity); }

    // Relationship constraints
    if (v.Tr > 0 && v.T > 0 && v.Tr >= v.T) {
      errors.push('T\u1d63 must be less than Flat Thickness (T).');
      errorInputs.add($chamfer);
    }
    if (v.Lw > 0 && v.W > 0 && v.Lw >= v.W) {
      errors.push('Lip Width (Lw) must be less than Total Width (W).');
      errorInputs.add($lipWidth);
    }

    // Update UI
    const allInputs = [$length, $width, $flatThickness, $lipWidth, $lipHeight, $chamfer, $quantity];
    allInputs.forEach(el => el.classList.remove('input-error'));
    errorInputs.forEach(el => el.classList.add('input-error'));

    if (errors.length > 0) {
      $validationMsg.innerHTML = '⚠ ' + errors.join('<br>⚠ ');
      $validationMsg.classList.add('visible');
      return false;
    } else {
      $validationMsg.innerHTML = '';
      $validationMsg.classList.remove('visible');
      return true;
    }
  }

  // --- Volume Calculation ---
  function calculate() {
    if (!validate()) {
      $volumeOne.textContent = '—';
      $volumeTotal.textContent = '—';
      return;
    }

    const v = getValues();
    // Base L-shape volume
    const baseVol = v.L * (v.W * v.T + v.Lw * v.Lh); // mm³

    // Edge removal volume
    let edgeVol = 0;
    if (v.edge === 'chamfer') {
      // 45° chamfer: right isosceles triangle with legs = Tr
      edgeVol = 0.5 * v.Tr * v.Tr * v.L;
    } else {
      // Bullnose: square minus quarter-circle = Tr² × (1 - π/4)
      edgeVol = v.Tr * v.Tr * (1 - Math.PI / 4) * v.L;
    }

    const volOne = Math.max(0, baseVol - edgeVol);
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

    const svgW = 700, svgH = 500;
    const pad = 80;
    const drawW = svgW - pad * 2;
    const drawH = svgH - pad * 2;

    // Total cross-section bounding: width = W, height = T + Lh
    const totalH = v.T + v.Lh;
    const scale = Math.min(drawW / v.W, drawH / totalH) * 0.75;

    const sW = v.W * scale;
    const sT = v.T * scale;
    const sLw = v.Lw * scale;
    const sLh = v.Lh * scale;
    const sTr = v.Tr * scale;

    // Centre in SVG
    const totalShapeH = sT + sLh;
    const ox = (svgW - sW) / 2;
    const oy = (svgH - totalShapeH) / 2;

    // Build the L-shape path
    const lipLeftX = ox + sW - sLw;

    let path;
    if (sTr > 0.5) {
      if (v.edge === 'bullnose') {
        // Bullnose: quarter-circle arc at the top-right corner
        path = [
          `M ${ox} ${oy}`,
          `L ${ox + sW - sTr} ${oy}`,
          `A ${sTr} ${sTr} 0 0 1 ${ox + sW} ${oy + sTr}`,  // quarter-circle arc
          `L ${ox + sW} ${oy + sT + sLh}`,
          `L ${lipLeftX} ${oy + sT + sLh}`,
          `L ${lipLeftX} ${oy + sT}`,
          `L ${ox} ${oy + sT}`,
          `Z`
        ].join(' ');
      } else {
        // Chamfer: diagonal cut
        path = [
          `M ${ox} ${oy}`,
          `L ${ox + sW - sTr} ${oy}`,
          `L ${ox + sW} ${oy + sTr}`,
          `L ${ox + sW} ${oy + sT + sLh}`,
          `L ${lipLeftX} ${oy + sT + sLh}`,
          `L ${lipLeftX} ${oy + sT}`,
          `L ${ox} ${oy + sT}`,
          `Z`
        ].join(' ');
      }
    } else {
      // No edge treatment — sharp corners
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
      const off = side === 'left' ? -35 : side === 'right' ? 35 : side === 'top' ? -35 : 35;
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

      const arrowSize = 6;
      if (isHoriz) {
        g.innerHTML += `<polygon points="${lx1},${ly1} ${lx1 + arrowSize},${ly1 - arrowSize / 2} ${lx1 + arrowSize},${ly1 + arrowSize / 2}" class="dim-arrow"/>`;
        g.innerHTML += `<polygon points="${lx2},${ly2} ${lx2 - arrowSize},${ly2 - arrowSize / 2} ${lx2 - arrowSize},${ly2 + arrowSize / 2}" class="dim-arrow"/>`;
      } else {
        g.innerHTML += `<polygon points="${lx1},${ly1} ${lx1 - arrowSize / 2},${ly1 + arrowSize} ${lx1 + arrowSize / 2},${ly1 + arrowSize}" class="dim-arrow"/>`;
        g.innerHTML += `<polygon points="${lx2},${ly2} ${lx2 - arrowSize / 2},${ly2 - arrowSize} ${lx2 + arrowSize / 2},${ly2 - arrowSize}" class="dim-arrow"/>`;
      }

      const tx = (lx1 + lx2) / 2;
      const ty = (ly1 + ly2) / 2;
      const textOffset = isHoriz ? -10 : -12;
      const anchor = isHoriz ? 'middle' : 'end';
      g.innerHTML += `<text x="${tx + (isHoriz ? 0 : textOffset)}" y="${ty + (isHoriz ? textOffset : 5)}" text-anchor="${anchor}" class="dim-text">${label}</text>`;

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

    // Edge annotation
    if (sTr > 0.5) {
      // Corner points of the edge region
      const ax = ox + sW - sTr, ay2 = oy;   // top of horizontal leg
      const bx = ox + sW, by = oy;      // corner (removed)
      const ccx = ox + sW, ccy = oy + sTr; // bottom of vertical leg

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

      if (v.edge === 'bullnose') {
        // Full dashed circle to show the complete circle the quarter-arc belongs to
        const circleCx = ox + sW - sTr;
        const circleCy = oy + sTr;
        g.innerHTML += `<circle cx="${circleCx}" cy="${circleCy}" r="${sTr}" fill="none" stroke="#f0a040" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.6"/>`;
        // Center dot
        g.innerHTML += `<circle cx="${circleCx}" cy="${circleCy}" r="2.5" fill="#f0a040" opacity="0.7"/>`;
        // Quarter-circle arc highlight (stronger)
        g.innerHTML += `<path d="M ${ax} ${ay2} A ${sTr} ${sTr} 0 0 1 ${ccx} ${ccy}" fill="none" stroke="#f0a040" stroke-width="2.5"/>`;
      } else {
        // Dashed hypotenuse
        g.innerHTML += `<line x1="${ax}" y1="${ay2}" x2="${ccx}" y2="${ccy}" stroke="#f0a040" stroke-width="2" stroke-dasharray="4 3"/>`;
      }

      // Dashed horizontal and vertical legs
      g.innerHTML += `<line x1="${ax}" y1="${ay2}" x2="${bx}" y2="${by}" stroke="#f0a040" stroke-width="1" stroke-dasharray="2 2" opacity="0.5"/>`;
      g.innerHTML += `<line x1="${bx}" y1="${by}" x2="${ccx}" y2="${ccy}" stroke="#f0a040" stroke-width="1" stroke-dasharray="2 2" opacity="0.5"/>`;

      // Right-angle square marker
      const sq = Math.min(8, sTr * 0.25);
      g.innerHTML += `<path d="M ${bx - sq} ${by} L ${bx - sq} ${by + sq} L ${bx} ${by + sq}" fill="none" stroke="#f0a040" stroke-width="1" opacity="0.6"/>`;

      // Horizontal leg label
      const hLabelX = (ax + bx) / 2;
      const hLabelY = ay2 - 8;
      g.innerHTML += `<text x="${hLabelX}" y="${hLabelY}" text-anchor="middle" class="dim-text" fill="#f0a040" font-size="11">T\u1d63 = ${v.Tr}</text>`;

      // Vertical leg label
      const vLabelX = ccx + 10;
      const vLabelY = (by + ccy) / 2 + 4;
      g.innerHTML += `<text x="${vLabelX}" y="${vLabelY}" text-anchor="start" class="dim-text" fill="#f0a040" font-size="11">T\u1d63 = ${v.Tr}</text>`;

      $dims.appendChild(g);
    }
  }

  // --- 3D Isometric Drawing ---
  function drawIsometric() {
    const v = getValues();
    if (v.W <= 0 || v.T <= 0 || v.L <= 0) return;

    const svgW = 700, svgH = 500;
    const totalH = v.T + v.Lh;
    const maxDim = Math.max(v.W, v.L, totalH);
    const baseScale = 180 / maxDim;

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

    const W = v.W, T = v.T, Lw = v.Lw, Lh = v.Lh, L = v.L, Tr = v.Tr;

    // Cross-section points in x-y
    // For bullnose, we approximate the curve with segments for the 3D view
    let csTop;
    if (Tr > 0) {
      if (v.edge === 'bullnose') {
        // Approximate quarter-circle with line segments
        const segments = 12;
        csTop = [[0, T]]; // top-left
        for (let i = 0; i <= segments; i++) {
          const angle = (Math.PI / 2) * (i / segments); // 0 to π/2
          const px = W - Tr + Tr * Math.sin(angle);
          const py = T - Tr + Tr * Math.cos(angle);
          csTop.push([px, py]);
        }
        csTop.push(
          [W, -(Lh)],
          [W - Lw, -(Lh)],
          [W - Lw, 0],
          [0, 0],
        );
      } else {
        csTop = [
          [0, T],
          [W - Tr, T],
          [W, T - Tr],
          [W, -(Lh)],
          [W - Lw, -(Lh)],
          [W - Lw, 0],
          [0, 0],
        ];
      }
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

    // For the 3D view, we draw the visible side faces between consecutive points
    // We need to identify which faces are top-like, side-like, etc.
    const n = csTop.length;

    // Draw side faces (each quad from front[i] → front[i+1] → back[i+1] → back[i])
    for (let i = 0; i < n - 1; i++) {
      const face = [frontPts[i], frontPts[i + 1], backPts[i + 1], backPts[i]];
      // Determine face color based on the edge direction
      const dx = csTop[i + 1][0] - csTop[i][0];
      const dy = csTop[i + 1][1] - csTop[i][1];

      let fill, opacity = '1';
      if (Math.abs(dy) < 0.01 && dx > 0) {
        // Horizontal top face
        fill = cTop;
      } else if (Math.abs(dx) < 0.01 && dy < 0) {
        // Vertical right face going down
        fill = cSide;
      } else if (Math.abs(dx) < 0.01 && dy > 0) {
        // Vertical face going up (inner lip)
        fill = cFront;
        opacity = '0.5';
      } else if (Math.abs(dy) < 0.01 && dx < 0) {
        // Horizontal bottom face
        fill = cTop;
        opacity = '0.4';
      } else if (dx > 0 && dy < 0) {
        // Chamfer/bullnose face (going right and down)
        fill = 'rgba(180,140,170,0.7)';
      } else {
        fill = cFront;
        opacity = '0.6';
      }

      svg += `<polygon points="${polyStr(face)}" fill="${fill}" stroke="${cStroke}" stroke-width="1" opacity="${opacity}"/>`;
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

    // Edge label
    if (Tr > 0) {
      const cMid = iso(W - Tr / 2, T - Tr / 2, 0);
      $dims.innerHTML += `<text x="${cMid[0] + 16}" y="${cMid[1] - 8}" class="dim-text" fill="#f0a040" font-size="12" text-anchor="start">T\u1d63 = ${v.Tr}</text>`;
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

  // --- Edge type toggle ---
  $edgeChamfer.addEventListener('change', () => {
    updateEdgeUI();
    calculate();
    draw();
  });
  $edgeBullnose.addEventListener('change', () => {
    updateEdgeUI();
    calculate();
    draw();
  });

  // --- Auto-fit radius ---
  $autoFitBtn.addEventListener('click', () => {
    const Lw = parseFloat($lipWidth.value) || 0;
    const T = parseFloat($flatThickness.value) || 0;
    if (Lw > 0 && T > 0) {
      // T_r = Lw + T − √(2·Lw·T)
      const Tr = Lw + T - Math.sqrt(2 * Lw * T);
      $chamfer.value = Math.round(Tr);
      calculate();
      draw();
    }
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
  updateEdgeUI();
  calculate();
  draw();
})();
