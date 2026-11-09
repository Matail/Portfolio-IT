/* =========================================================
   hands.js — two ASCII hands reaching for each other
   Silhouettes are drawn into a tiny mask canvas (1 px = 1 character cell),
   then every covered cell is printed as a glyph. Scrolling closes the gap.
   ========================================================= */
(function () {
  'use strict';
  const cv = document.getElementById('hands');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CW = 8, CH = 13; // character cell in CSS px
  const SETS = ['.,\'`-', ':;~+=<>!i', '(){}[]|/\\01oO#%'];
  const mask = document.createElement('canvas');
  const mctx = mask.getContext('2d', { willReadFrequently: true });

  let W, H, cols, rows, cov = new Float32Array(0), glyph = [], gapDrawn = -1;
  const pickGlyph = a => { const s = SETS[a < 0.35 ? 0 : a < 0.75 ? 1 : 2]; return s[(Math.random() * s.length) | 0]; };

  function size() {
    const d = Math.min(devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * d; cv.height = H * d;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    cols = Math.ceil(W / CW); rows = Math.ceil(H / CH);
    mask.width = cols; mask.height = rows;
    cov = new Float32Array(cols * rows);
    glyph = new Array(cols * rows).fill('');
    gapDrawn = -1;
  }

  const bez = (p0, p1, p2, p3, t) => {
    const u = 1 - t;
    return [
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]
    ];
  };
  // tapered capsule along a cubic curve, radius r0 -> r1
  function limb(c, p0, p1, p2, p3, r0, r1) {
    for (let i = 0; i <= 48; i++) {
      const t = i / 48, [x, y] = bez(p0, p1, p2, p3, t);
      c.beginPath(); c.arc(x, y, r0 + (r1 - r0) * t, 0, 6.283); c.fill();
    }
  }
  // one hand, index finger pointing along dir (+1 right, -1 left); everything relative to the fingertip
  function hand(c, tip, dir, u, armEnd, droop) {
    const P = (dx, dy) => [tip[0] + dx * u * dir, tip[1] + dy * u];
    const K = P(-0.17, 0.02);                                   // index knuckle
    limb(c, K, P(-0.11, 0.0), P(-0.05, droop * 0.4), P(0, droop), 0.03 * u, 0.019 * u); // index finger
    c.beginPath(); c.ellipse(...P(-0.25, 0.06), 0.11 * u, 0.075 * u, dir * 0.15, 0, 6.283); c.fill(); // palm
    limb(c, P(-0.21, 0.0), P(-0.17, -0.07), P(-0.11, -0.06), P(-0.08, -0.035), 0.032 * u, 0.021 * u); // thumb
    [0, 0.04, 0.075].forEach((o, k) => {                        // curled fingers
      const s = P(-0.18 - o, 0.06 + o * 0.5);
      limb(c, s, P(-0.09 - o * 1.4, 0.08 + o), P(-0.1 - o * 1.4, 0.16 + o), P(-0.16 - o, 0.16 + o * 0.6), 0.03 * u, (0.022 - k * 0.002) * u);
    });
    const Wr = P(-0.33, 0.09);                                  // wrist -> forearm -> off-screen
    limb(c, Wr, P(-0.6, 0.14), [armEnd[0] * 0.6 + Wr[0] * 0.4, armEnd[1] * 0.7 + Wr[1] * 0.3], armEnd, 0.07 * u, 0.13 * u);
  }

  function buildMask(gap) {
    mctx.setTransform(1, 0, 0, 1, 0, 0);
    mctx.clearRect(0, 0, cols, rows);
    mctx.setTransform(1 / CW, 0, 0, 1 / CH, 0, 0); // draw in CSS px, land in cell space
    mctx.fillStyle = '#fff';
    const u = Math.min(H * 1.15, W * 0.42);
    hand(mctx, [W / 2 - gap / 2, H * 0.5], 1, u, [-80, H + 120], 0.05);       // reaching up from bottom-left
    hand(mctx, [W / 2 + gap / 2, H * 0.42], -1, u, [W + 80, H * 0.02], -0.01); // reaching down from top-right
    const data = mctx.getImageData(0, 0, cols, rows).data;
    for (let i = 0; i < cov.length; i++) {
      const a = data[i * 4 + 3] / 255;
      if (a > 0.08 && !glyph[i]) glyph[i] = pickGlyph(a);
      if (a <= 0.08) glyph[i] = '';
      cov[i] = a;
    }
    gapDrawn = gap;
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    ctx.font = '11px ui-monospace, Consolas, monospace';
    ctx.textBaseline = 'top';
    const fg = window.isDark && !window.isDark() ? '17,17,17' : '255,255,255';
    // batch by brightness bucket so fillStyle changes only 4 times per frame
    for (let b = 0; b < 4; b++) {
      ctx.fillStyle = 'rgba(' + fg + ',' + (0.22 + b * 0.16) + ')';
      for (let i = 0; i < cov.length; i++) {
        if (!glyph[i] || Math.min(3, (cov[i] * 4) | 0) !== b) continue;
        ctx.fillText(glyph[i], (i % cols) * CW, ((i / cols) | 0) * CH);
      }
    }
  }

  size();
  addEventListener('resize', size);
  let visible = false;
  new IntersectionObserver(e => { visible = e[0].isIntersecting; }).observe(cv);

  let last = 0;
  function loop(t) {
    requestAnimationFrame(loop);
    if (!visible || t - last < 70) return; // ~14 fps is plenty for a flicker
    last = t;
    const r = cv.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight * 0.5 + r.height * 0.5)));
    const e = 1 - Math.pow(1 - p, 3);
    const gap = Math.round(W * (reduce ? 0.03 : 0.24 - 0.21 * e));
    if (Math.abs(gap - gapDrawn) > 1) buildMask(gap);
    if (!reduce) for (let k = 0; k < 40; k++) { // re-roll a few glyphs each frame
      const i = (Math.random() * cov.length) | 0;
      if (glyph[i]) glyph[i] = pickGlyph(cov[i]);
    }
    render();
  }
  requestAnimationFrame(loop);
})();
