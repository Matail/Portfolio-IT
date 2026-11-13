/* =========================================================
   exaone.js — motion figures for projects/exaone.html
   - hero: a weight matrix pruned 2:4 by magnitude, quantised to 16 levels, then packed
   - 01/06 counters, 02 which modules are compressed (sizes from config.json),
     04 unstructured vs 2:4 storage (sizes from the saved models)
   Numbers come from the hackathon folder analysis (safetensors headers, recipe.yaml,
   config.json), not from settings in the notebooks.
   ========================================================= */
(function () {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const once = (node, fn, threshold = 0.3) => {
    if (!node) return;
    const ob = new IntersectionObserver(es => { if (es[0].isIntersecting) { ob.disconnect(); fn(); } }, { threshold });
    ob.observe(node);
  };
  const watch = (node, fn, threshold = 0) => {
    if (!node) return;
    const ob = new IntersectionObserver(es => fn(es[0].isIntersecting), { threshold });
    ob.observe(node);
  };
  const figure = (name, fn) => { try { fn(); } catch (e) { console.warn('exaone figure skipped:', name, e); } };
  const fmt = (v, d) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const countTo = (node, to, d, pre, suf, dur = 1100) => {
    if (reduce) { node.textContent = pre + fmt(to, d) + suf; return; }
    const t0 = performance.now();
    const step = t => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      node.textContent = pre + fmt(to * e, d) + suf;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  // seeded random so the matrices look the same on every visit
  const rng = seed => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

  /* ---------- counters ---------- */
  const counters = box => once(box, () => $$('b[data-count]', box).forEach((b, i) => {
    const raw = b.dataset.count, d = raw.includes('.') ? raw.split('.')[1].length : 0;
    const pre = b.dataset.prefix || '', suf = b.dataset.suffix || '';
    b.textContent = pre + fmt(0, d) + suf;
    setTimeout(() => countTo(b, +raw, d, pre, suf), i * 240);
  }));
  counters($('.st-journey'));
  counters($('#award .cs-metrics'));
  $$('#timeline li').forEach((li, i) => li.style.setProperty('--i', i));
  $$('.ex-pipe .lg-step').forEach((s, i) => s.style.setProperty('--i', i));

  /* weights per row: groups of 4, keep the 2 largest |w| in each group (magnitude 2:4) */
  const makeRows = (rows, cols, seed) => {
    const r = rng(seed);
    return Array.from({ length: rows }, () => {
      const w = Array.from({ length: cols }, () => (r() * 2 - 1) * (0.3 + r() * 0.7));
      const keep24 = new Set();
      for (let g = 0; g < cols; g += 4) {
        [0, 1, 2, 3].map(k => g + k).sort((a, b) => Math.abs(w[b]) - Math.abs(w[a])).slice(0, 2).forEach(k => keep24.add(k));
      }
      return { w, keep24 };
    });
  };

  /* ---------- hero: BF16 -> 2:4 -> 4bit -> packed ---------- */
  figure('hero', function () {
    const host = $('#heroGrid'), phaseEl = $('#heroPhase'); if (!host) return;
    const narrow = innerWidth < 760, ROWS = narrow ? 18 : 14, COLS = narrow ? 24 : 44;
    const rows = makeRows(ROWS, COLS, 7);
    const cells = rows.map(({ w }) => {
      const row = el('div', 'ex-row');
      const cs = w.map(v => { const c = el('i'); c.style.setProperty('--a', (0.08 + Math.abs(v) * 0.42).toFixed(3)); row.append(c); return c; });
      const meta = Array.from({ length: COLS / 4 }, () => { const m = el('i', 'm gone'); row.append(m); return m; });
      host.append(row);
      return { cs, meta };
    });
    const PHASES = ['BF16 원본', '2:4 프루닝 · 그룹마다 2개를 0으로', 'GPTQ · 남은 가중치를 4bit로', '압축 저장 · 0을 빼고 위치만 기록'];
    const show = ph => {
      phaseEl.textContent = PHASES[ph];
      rows.forEach(({ w, keep24 }, ri) => {
        const { cs, meta } = cells[ri];
        cs.forEach((c, k) => {
          const zero = ph >= 1 && !keep24.has(k);
          c.classList.toggle('z', zero);
          c.classList.toggle('gone', ph >= 3 && zero);
          const a = Math.abs(w[k]);
          const lv = ph >= 2 ? Math.round(a * 15) / 15 : a; // 16 levels once quantised
          c.style.setProperty('--a', (0.08 + lv * 0.42).toFixed(3));
        });
        meta.forEach(m => m.classList.toggle('gone', ph < 3));
      });
    };
    if (reduce) { show(3); return; }
    show(0);
    let ph = 0, timer = 0, live = false;
    const step = () => { timer = setTimeout(() => { ph = (ph + 1) % PHASES.length; show(ph); step(); }, ph === 3 ? 3200 : 2200); };
    watch($('.ex-hero'), v => {
      if (v && !live) { live = true; step(); }
      if (!v && live) { live = false; clearTimeout(timer); }
    });
  });

  /* ---------- 02: 30 layers, each Linear drawn to its parameter count ---------- */
  figure('arch', function () {
    const host = $('#archStack'); if (!host) return;
    // config.json: hidden 2048, FFN 4096, 32 heads x 64, 8 KV heads x 64
    const MODS = [['q', 2048 * 2048, 'attn'], ['k', 2048 * 512, 'attn'], ['v', 2048 * 512, 'attn'], ['o', 2048 * 2048, 'attn'], ['gate', 2048 * 4096, 'mlp'], ['up', 2048 * 4096, 'mlp'], ['down', 4096 * 2048, 'mlp']];
    const total = MODS.reduce((a, m) => a + m[1], 0);
    const top = el('div', 'emb top');
    top.append(el('span', null, 'lm_head'), el('small', null, '입력 임베딩과 공유'));
    host.append(top);
    for (let i = 29; i >= 0; i--) {
      const lay = el('div', 'lay');
      MODS.forEach(([, n, kind]) => { const s = el('span', kind); s.style.flex = String(n / total); s.style.setProperty('--i', 29 - i); lay.append(s); });
      host.append(lay);
    }
    const emb = el('div', 'emb');
    emb.append(el('span', null, 'embed_tokens'), el('small', null, '102,400 × 2,048 · 그대로'));
    host.append(emb);
    const lab = el('div', 'lab');
    MODS.forEach(([name, n]) => { const s = el('span', null, name); s.style.flex = String(n / total); lab.append(s); });
    host.append(lab);
  });

  /* ---------- 04: unstructured 50% vs 2:4 — what actually gets stored ---------- */
  figure('mask', function () {
    const root = $('#maskFig'), mat = $('#maskMat'); if (!root || !mat) return;
    const ROWS = 6, COLS = innerWidth < 760 ? 12 : 16;
    const rows = makeRows(ROWS, COLS, 21);
    // unstructured: the smallest 50% of all weights, wherever they are
    const all = rows.flatMap((r, ri) => r.w.map((v, k) => [Math.abs(v), ri, k])).sort((a, b) => a[0] - b[0]);
    const zeroU = new Set(all.slice(0, all.length / 2).map(([, ri, k]) => ri + ':' + k));
    const cells = rows.map(({ w }) => {
      const row = el('div', 'r');
      const cs = w.map(v => { const c = el('i'); c.style.setProperty('--a', (0.25 + Math.abs(v) * 0.75).toFixed(3)); row.append(c); return c; });
      const meta = Array.from({ length: COLS / 4 }, () => { const m = el('i', 'm gone'); row.append(m); return m; });
      mat.append(row);
      return { cs, meta };
    });
    const NOTE = { dense: '0이 흩어져 있어 그대로 저장됩니다', '24': '4개마다 2개를 남겨 절반만 저장합니다' };
    // weight_packed and meta sizes read from the saved models
    const READ = { dense: ['535MB', '0도 함께 저장 · 크기 그대로'], '24': ['267MB + 메타 134MB', '순수하게 줄어든 양 약 134MB'] };
    const bytes = $('#maskBytes'), read = $('#maskRead'), note = $('#maskNote'), btns = $$('.seg button', root);
    let mode = 'dense', auto = !reduce, hold = false, timer = 0, started = false;
    const set = m => {
      mode = m;
      root.dataset.mode = m;
      btns.forEach(b => { const on = b.dataset.mode === m; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); });
      note.textContent = NOTE[m];
      read.replaceChildren(el('b', null, READ[m][0]), document.createTextNode(' · ' + READ[m][1]));
      rows.forEach(({ keep24 }, ri) => {
        cells[ri].cs.forEach((c, k) => {
          const zero = m === 'dense' ? zeroU.has(ri + ':' + k) : !keep24.has(k);
          c.classList.toggle('z', zero);
          c.classList.toggle('gone', m === '24' && zero);
        });
        cells[ri].meta.forEach(x => x.classList.toggle('gone', m !== '24'));
      });
      // dense: 535 of 535; 2:4: 267 + 134 = 401 of 535
      bytes.style.width = m === 'dense' ? '100%' : (401 / 535 * 100).toFixed(1) + '%';
      bytes.style.setProperty('--w1', m === 'dense' ? '100%' : (267 / 401 * 100).toFixed(1) + '%');
    };
    btns.forEach(b => b.addEventListener('click', () => { auto = false; clearTimeout(timer); set(b.dataset.mode); }));
    const loop = () => { clearTimeout(timer); if (!auto || hold) return; timer = setTimeout(() => { if (!auto || hold) return; set(mode === 'dense' ? '24' : 'dense'); loop(); }, 3400); };
    const holdOn = () => { hold = true; clearTimeout(timer); }, holdOff = () => { hold = false; if (started) loop(); };
    root.addEventListener('pointerenter', holdOn); root.addEventListener('pointerleave', holdOff);
    root.addEventListener('focusin', holdOn); root.addEventListener('focusout', holdOff);
    set(mode);
    once(root, () => { started = true; loop(); }, 0.4);
    watch(root, v => { if (!v) clearTimeout(timer); else if (started) loop(); });
  });
})();
