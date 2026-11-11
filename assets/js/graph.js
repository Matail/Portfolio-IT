/* =========================================================
   graph.js — skill constellation (tiny force-directed graph)
   ========================================================= */
(function () {
  'use strict';
  const cv = document.getElementById('graph');
  if (!cv) return;
  const ctx = cv.getContext('2d');

  const hubs = {
    'AI · Machine Learning': ['PyTorch', '강화학습 (D3QN)', '모방학습 (BC)', '모델 평가', 'Optuna'],
    'LLM & Compression': ['GPTQ', 'SparseGPT', 'Knowledge Distillation', 'EXAONE', 'Prompt Design'],
    'Data & Analytics': ['Pandas', '이상치 처리', 'VIF 분석', 'Feature Engineering', '시각화'],
    'Agents & Tooling': ['Claude Agent SDK', 'MCP (FastMCP)', 'Tool Calling', 'Skills', '비동기 Job'],
    'Full-stack': ['TypeScript', 'Flask', 'Cloudflare Workers', 'D1 · Durable Objects', 'Supabase'],
    'Game & 3D': ['Unity 6', 'three.js', 'Blender', 'WebGL']
  };
  const cross = [
    ['PyTorch', 'LLM & Compression'], ['Pandas', 'AI · Machine Learning'], ['Flask', 'Data & Analytics'],
    ['Tool Calling', 'LLM & Compression'], ['three.js', 'Full-stack'], ['모델 평가', 'Data & Analytics'],
    ['MCP (FastMCP)', 'Full-stack'], ['Unity 6', 'Agents & Tooling'], ['EXAONE', 'AI · Machine Learning']
  ];

  const nodes = [], links = [], byName = {};
  const add = (name, hub) => { const n = { name, hub, x: 0, y: 0, vx: 0, vy: 0, r: hub ? 5 : 2.6 }; nodes.push(n); byName[name] = n; return n; };
  Object.entries(hubs).forEach(([h, kids]) => {
    const hn = add(h, true);
    kids.forEach(k => links.push([hn, add(k, false)]));
  });
  Object.keys(hubs).forEach((h, i, arr) => links.push([byName[h], byName[arr[(i + 1) % arr.length]], true]));
  cross.forEach(([a, b]) => links.push([byName[a], byName[b], true]));
  const neighbors = new Map(nodes.map(n => [n, new Set()]));
  links.forEach(([a, b]) => { neighbors.get(a).add(b); neighbors.get(b).add(a); });

  // dust stars (static: no twinkle)
  const dust = Array.from({ length: 160 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.1 + .2, a: 0.08 + Math.random() * 0.12 }));

  let W, H, DPR;
  function size() {
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * DPR; cv.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  size();
  nodes.forEach((n, i) => {
    const a = (i / nodes.length) * Math.PI * 2;
    n.x = W / 2 + Math.cos(a) * (n.hub ? 120 : 260) + (Math.random() - .5) * 40;
    n.y = H / 2 + Math.sin(a) * (n.hub ? 120 : 220) + (Math.random() - .5) * 40;
  });

  let hover = null, drag = null;

  function step() {
    const cx = W / 2, cy = H / 2;
    const spread = Math.min(W, H);
    // repulsion
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        let dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy + 0.01;
        const f = (a.hub && b.hub ? 9000 : 2600) / d2;
        const d = Math.sqrt(d2); dx /= d; dy /= d;
        a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f;
      }
    }
    // springs
    links.forEach(([a, b, weak]) => {
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
      const L = weak ? spread * 0.42 : spread * 0.13;
      const k = weak ? 0.0008 : 0.006;
      const f = (d - L) * k;
      a.vx += dx / d * f; a.vy += dy / d * f; b.vx -= dx / d * f; b.vy -= dy / d * f;
    });
    // gravity toward the centre, damping; returns the fastest speed so callers know when it has settled
    let vmax = 0;
    nodes.forEach(n => {
      n.vx += (cx - n.x) * 0.0009; n.vy += (cy - n.y) * 0.0012;
      if (n === drag) { n.vx = n.vy = 0; return; }
      n.vx *= 0.86; n.vy *= 0.86;
      n.x += n.vx; n.y += n.vy;
      n.x = Math.max(40, Math.min(W - 40, n.x));
      n.y = Math.max(40, Math.min(H - 40, n.y));
      vmax = Math.max(vmax, Math.abs(n.vx), Math.abs(n.vy));
    });
    return vmax;
  }
  // settle the layout before anyone sees it, so the graph starts at rest
  for (let k = 0; k < 600 && step() > 0.01; k++);

  function render() {
    const dark = window.isDark ? window.isDark() : true;
    const fg = dark ? '255,255,255' : '17,17,17';
    ctx.clearRect(0, 0, W, H);
    dust.forEach(s => {
      ctx.fillStyle = 'rgba(' + fg + ',' + s.a.toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, 6.283); ctx.fill();
    });
    const focus = drag || hover;
    const nb = focus ? neighbors.get(focus) : null;
    links.forEach(([a, b, weak]) => {
      const on = focus && (a === focus || b === focus);
      ctx.strokeStyle = 'rgba(' + fg + ',' + (on ? 0.6 : focus ? 0.05 : weak ? 0.07 : 0.16) + ')';
      ctx.lineWidth = on ? 1.2 : 0.7;
      ctx.beginPath(); ctx.moveTo(a.x, a.y);
      // slight curve for weak links
      if (weak) { const mx2 = (a.x + b.x) / 2 + (a.y - b.y) * 0.12, my2 = (a.y + b.y) / 2 + (b.x - a.x) * 0.12; ctx.quadraticCurveTo(mx2, my2, b.x, b.y); }
      else ctx.lineTo(b.x, b.y);
      ctx.stroke();
    });
    nodes.forEach(n => {
      const lit = !focus || n === focus || nb.has(n);
      const a = lit ? 1 : 0.18;
      if (n.hub) {
        ctx.fillStyle = 'rgba(' + fg + ',' + (0.12 * a) + ')';
        ctx.beginPath(); ctx.arc(n.x, n.y, 12, 0, 6.283); ctx.fill();
      }
      ctx.fillStyle = 'rgba(' + fg + ',' + (n.hub ? a : 0.75 * a) + ')';
      ctx.beginPath(); ctx.arc(n.x, n.y, n === focus ? n.r + 2 : n.r, 0, 6.283); ctx.fill();
      ctx.font = (n.hub ? '600 13px ' : '11px ') + "Figtree, 'Wanted Sans', system-ui, sans-serif";
      ctx.fillStyle = 'rgba(' + fg + ',' + (n.hub ? 0.95 * a : 0.55 * a) + ')';
      ctx.fillText(n.name, n.x + (n.hub ? 14 : 7), n.y + 4);
    });
  }

  // physics runs only while a node is dragged, then until the graph comes to rest
  let raf = 0;
  function tick() {
    const vmax = step();
    render();
    raf = (drag || vmax > 0.02) ? requestAnimationFrame(tick) : 0;
  }
  const wake = () => { if (!raf) raf = requestAnimationFrame(tick); };

  const pick = (x, y) => {
    let best = null, bd = 26 * 26;
    nodes.forEach(n => { const d = (n.x - x) ** 2 + (n.y - y) ** 2; if (d < bd) { bd = d; best = n; } });
    return best;
  };
  const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener('pointermove', e => {
    const [x, y] = pos(e);
    if (drag) { drag.x = x; drag.y = y; wake(); }
    else {
      const h = pick(x, y);
      if (h !== hover) { hover = h; if (!raf) render(); } // highlight only, nothing moves
    }
    cv.style.cursor = drag ? 'grabbing' : hover ? 'pointer' : 'grab';
  });
  cv.addEventListener('pointerdown', e => {
    const [x, y] = pos(e);
    drag = pick(x, y);
    if (drag) { cv.setPointerCapture(e.pointerId); wake(); }
  });
  const up = () => { if (drag) { drag = null; wake(); } };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  cv.addEventListener('pointerleave', () => { if (!drag && hover) { hover = null; if (!raf) render(); } });
  addEventListener('resize', () => { size(); wake(); });
  addEventListener('themechange', () => { if (!raf) render(); });
  render();
  document.fonts.ready.then(() => { if (!raf) render(); }); // redraw labels once Figtree arrives
})();
