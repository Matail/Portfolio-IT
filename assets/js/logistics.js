/* =========================================================
   logistics.js — motion figures for projects/logistics.html
   - hero: freight routes between US hubs, trucks running along them
   - 01 input -> output chips, 06 counters
   - 02 cost spread by distance band, 04 pipeline + VIF, 05 error breakdown
     (data in logistics-data.js, taken from the project's repos)
   Every chart keeps a table view; labels use textContent.
   ========================================================= */
(function () {
  'use strict';
  const D = window.LOGI_DATA || {};
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const sv = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.append(n);
    return n;
  };
  const once = (node, fn, threshold = 0.3) => {
    if (!node) return;
    const ob = new IntersectionObserver(es => { if (es[0].isIntersecting) { ob.disconnect(); fn(); } }, { threshold });
    ob.observe(node);
  };
  const watch = (node, fn, threshold = 0.1) => {
    if (!node) return;
    const ob = new IntersectionObserver(es => fn(es[0].isIntersecting), { threshold });
    ob.observe(node);
  };
  const onResize = (host, fn) => {
    let w = host.clientWidth, t = 0;
    addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { if (host.clientWidth !== w) { w = host.clientWidth; fn(); } }, 150); });
  };
  const figure = (name, fn) => { try { fn(); } catch (e) { console.warn('logistics figure skipped:', name, e); } };
  const fmt = (v, d) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const countTo = (node, to, d, suffix, dur = 1000) => {
    if (reduce) { node.textContent = fmt(to, d) + suffix; return; }
    const t0 = performance.now();
    const step = t => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      node.textContent = fmt(to * e, d) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const tipFor = host => {
    const tip = el('div', 'st-tip');
    host.append(tip);
    return {
      show(x, y, title, rows) {
        tip.replaceChildren(el('small', null, title), ...rows.map(([color, label, value]) => {
          const r = el('div'), key = el('i');
          key.style.background = color;
          r.append(key, el('span', null, label), el('b', null, value));
          return r;
        }));
        const w = host.clientWidth, tw = tip.offsetWidth || 140;
        tip.style.left = Math.max(0, Math.min(w - tw, x + 14)) + 'px';
        tip.style.top = Math.max(0, y - 10) + 'px';
        tip.classList.add('on');
      },
      hide() { tip.classList.remove('on'); }
    };
  };
  const tableView = (after, head, rows) => {
    const d = el('details', 'st-table'), t = el('table'), tr = el('tr');
    d.append(el('summary', null, '표로 보기'), t);
    head.forEach(h => tr.append(el('th', null, h)));
    t.append(tr);
    rows.forEach(r => { const row = el('tr'); r.forEach(c => row.append(el('td', null, c))); t.append(row); });
    after.after(d);
    return d;
  };

  /* ---------- US map (us-atlas Albers USA, 975 x 610) ---------- */
  // d3.geoAlbers().parallels([29.5, 45.5]).rotate([96, 0]).center([-0.6, 38.7]).scale(1300).translate([487.5, 305])
  const albers = (() => {
    const rad = Math.PI / 180, p1 = 29.5 * rad, p2 = 45.5 * rad;
    const n = (Math.sin(p1) + Math.sin(p2)) / 2, C = Math.cos(p1) ** 2 + 2 * n * Math.sin(p1), r0 = Math.sqrt(C) / n;
    const raw = (lam, phi) => { const r = Math.sqrt(C - 2 * n * Math.sin(phi)) / n; return [r * Math.sin(lam * n), r0 - r * Math.cos(lam * n)]; };
    const k = 1300, c = raw(-0.6 * rad, 38.7 * rad);
    return (lng, lat) => { const p = raw((lng + 96) * rad, lat * rad); return [487.5 + k * (p[0] - c[0]), 305 - k * (p[1] - c[1])]; };
  })();
  const drawStates = (svg, cls, filter) => {
    const g = sv('g', {}, svg);
    (window.US_MAP || []).forEach(s => {
      if (filter && !filter(s)) return;
      const p = sv('path', { class: cls, d: s.d }, g);
      p.dataset.st = s.st; p.dataset.padd = s.p;
    });
    return g;
  };

  /* ---------- hero: freight routes ---------- */
  figure('hero', function () {
    const host = $('#heroMap'); if (!host || !window.US_MAP) return;
    const svg = sv('svg', { viewBox: '0 0 975 610' }, host);
    drawStates(svg, 'us', s => s.st !== 'AK' && s.st !== 'HI');
    const HUB = {
      sea: ['Seattle', -122.33, 47.61], la: ['Los Angeles', -118.24, 34.05], phx: ['Phoenix', -112.07, 33.45],
      den: ['Denver', -104.99, 39.74], dal: ['Dallas', -96.8, 32.78], hou: ['Houston', -95.37, 29.76],
      kc: ['Kansas City', -94.58, 39.1], chi: ['Chicago', -87.63, 41.88], mem: ['Memphis', -90.05, 35.15],
      atl: ['Atlanta', -84.39, 33.75], det: ['Detroit', -83.05, 42.33], ny: ['New York', -74.01, 40.71], mia: ['Miami', -80.19, 25.76]
    };
    const ROUTES = [['la', 'chi'], ['hou', 'ny'], ['sea', 'dal'], ['chi', 'atl'], ['den', 'mem'], ['phx', 'kc'], ['det', 'mia'], ['dal', 'chi'], ['la', 'hou'], ['kc', 'ny']];
    const pos = {};
    for (const id in HUB) pos[id] = albers(HUB[id][1], HUB[id][2]);
    const gR = sv('g', {}, svg), gT = sv('g', {}, svg), gH = sv('g', {}, svg);
    const routes = ROUTES.map(([a, b]) => {
      const [x1, y1] = pos[a], [x2, y2] = pos[b];
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
      const cx = mx + (dy / len) * len * 0.18 * (dx > 0 ? 1 : -1), cy = my - Math.abs(dx / len) * len * 0.18;
      const p = sv('path', { class: 'route', d: `M${x1.toFixed(1)},${y1.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}` }, gR);
      const L = p.getTotalLength(), N = 160, pts = [];
      for (let i = 0; i <= N; i++) { const q = p.getPointAtLength(i / N * L); pts.push([q.x, q.y]); } // read once, write only in the loop
      return { a, b, p, len: L, pts, t: Math.random(), truck: reduce ? null : sv('circle', { class: 'truck', r: 3.2 }, gT) };
    });
    for (const id in pos) {
      sv('circle', { class: 'hub-ring', cx: pos[id][0], cy: pos[id][1], r: 6 }, gH).style.animationDelay = (Math.random() * 2.4).toFixed(2) + 's';
      sv('circle', { class: 'hub', cx: pos[id][0], cy: pos[id][1], r: 2.6 }, gH);
    }
    const label = $('#heroRoute');
    let cur = 6, live = false, raf = 0, tAuto = 0, last = 0; // rest on Detroit → Miami, clear of the title
    const highlight = i => {
      routes.forEach((r, k) => r.p.classList.toggle('on', k === i));
      const r = routes[i];
      if (label) label.textContent = `${HUB[r.a][0]} → ${HUB[r.b][0]}`;
    };
    highlight(cur);
    if (reduce) return;
    const frame = t => {
      if (!live) return;
      const dt = last ? Math.min(64, t - last) : 16; last = t;
      routes.forEach(r => {
        r.t = (r.t + dt / (r.len * 22)) % 1;
        const f = r.t * (r.pts.length - 1), i = Math.floor(f), w = f - i, A = r.pts[i], B = r.pts[Math.min(i + 1, r.pts.length - 1)];
        r.truck.setAttribute('cx', (A[0] + (B[0] - A[0]) * w).toFixed(1)); r.truck.setAttribute('cy', (A[1] + (B[1] - A[1]) * w).toFixed(1));
      });
      raf = requestAnimationFrame(frame);
    };
    const cycle = () => { tAuto = setTimeout(() => { cur = (cur + 1) % routes.length; highlight(cur); cycle(); }, 2600); };
    watch($('.lg-hero'), v => {
      $('.lg-hero').classList.toggle('off', !v);
      if (v && !live) { live = true; last = 0; raf = requestAnimationFrame(frame); cycle(); }
      if (!v && live) { live = false; cancelAnimationFrame(raf); clearTimeout(tAuto); }
    });
  });

  /* ---------- 01: input chips arrive one by one; 06: counters ---------- */
  $$('.lg-io-in span').forEach((s, i) => s.style.setProperty('--i', i));
  [$('.lg-io')].forEach(n => watch(n, v => n.classList.toggle('off', !v), 0));
  $$('.lg-pipe .lg-step').forEach((s, i) => s.style.setProperty('--i', i));
  once($('#award .cs-metrics'), () => $$('#award b[data-count]').forEach((b, i) => {
    const d = +(b.dataset.digits || 0), suf = b.dataset.suffix || '';
    b.textContent = fmt(0, d) + suf;
    setTimeout(() => countTo(b, +b.dataset.count, d, suf), i * 200);
  }));

  /* ---------- 02: diesel, CPI and unemployment by year (dashboard data files) ---------- */
  figure('macro', function () {
    const host = $('#macroGrid'), M = D.macro || {}, Y = M.years || [];
    const full = a => Array.isArray(a) && a.length === Y.length && Y.length > 1;
    const panels = [
      { title: '디젤 · $/gal', note: '경로 16,491개의 평균과 범위', y: M.dieselMean, lo: full(M.dieselMin) && full(M.dieselMax) ? M.dieselMin : null, hi: M.dieselMax, d: 2, min: 2, max: 6, ticks: [2, 4, 6] },
      { title: '소비자물가 CPI', note: '연평균', y: M.cpi, d: 0, min: 240, max: 300, ticks: [240, 270, 300] },
      { title: '실업률 · %', note: '연평균', y: M.unrate, d: 1, min: 0, max: 9, ticks: [0, 3, 6, 9] }
    ].filter(pn => full(pn.y));
    if (!host || !panels.length) { $('#macroChart') && $('#macroChart').remove(); return; }
    const built = panels.map(pn => {
      const fig = el('figure'), cap = el('figcaption'), plot = el('div', 'st-plot');
      const peak = pn.y.indexOf(Math.max(...pn.y));
      cap.append(el('span', null, pn.title), el('b', null, `${Y[peak]} ${fmt(pn.y[peak], pn.d)}`));
      fig.append(cap, plot);
      host.append(fig);
      plot.setAttribute('role', 'img');
      plot.setAttribute('aria-label', `${pn.title} ${pn.note}: ` + Y.map((yr, i) => `${yr} ${fmt(pn.y[i], pn.d)}`).join(', '));
      return { pn, plot, peak };
    });
    let shown = false;
    const draw = () => built.forEach(({ pn, plot, peak }) => {
      plot.querySelector('svg') && plot.querySelector('svg').remove();
      const W = plot.clientWidth, H = 150, pl = 30, pr = 10, pt = 10, pb = 22;
      const s = sv('svg', { viewBox: `0 0 ${W} ${H}`, height: H }, null);
      plot.prepend(s);
      const iw = W - pl - pr, ih = H - pt - pb;
      const x = i => pl + i / (Y.length - 1) * iw, y = v => pt + ih - (v - pn.min) / (pn.max - pn.min) * ih;
      pn.ticks.forEach(t => {
        sv('line', { class: 'grid', x1: pl, x2: pl + iw, y1: y(t), y2: y(t) }, s);
        sv('text', { x: pl - 6, y: y(t) + 4, 'text-anchor': 'end' }, s).textContent = fmt(t, 0);
      });
      Y.forEach((yr, i) => { sv('text', { x: x(i), y: H - 6, 'text-anchor': 'middle' }, s).textContent = "'" + String(yr).slice(2); });
      if (pn.lo) {
        const up = pn.hi.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`), dn = pn.lo.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).reverse();
        sv('path', { class: 'band', d: 'M' + up.join('L') + 'L' + dn.join('L') + 'Z' }, s);
      }
      const p = sv('path', { class: 'line draw s-warm', d: pn.y.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(v).toFixed(1)).join('') }, s);
      if (!shown && !reduce) { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; }
      sv('circle', { class: 'dot f-warm', cx: x(peak), cy: y(pn.y[peak]), r: 4 }, s);
    });
    draw();
    onResize(host, draw);
    once(host, () => { shown = true; $$('path.draw', host).forEach(p => { p.style.strokeDashoffset = 0; }); }, 0.4);
    tableView(host, ['연도', ...panels.map(p => p.title)], Y.map((yr, i) => [String(yr), ...panels.map(p => fmt(p.y[i], p.d))]));
  });

  /* ---------- 04: how the model inputs changed across vif.R versions ---------- */
  figure('vif', function () {
    const host = $('#vifRows'), V = D.vif;
    if (!host || !V || !Array.isArray(V.history) || !V.history.length) { $('#vifChart') && $('#vifChart').remove(); return; }
    const final = V.finalNumericFeatures || [];
    const TARGET = { value: '화물 가치', cost_proxy: '운송비', next_cp_per_value: '다음 해 운송비/가치' };
    const rows = V.history.map(h => ({ when: h.date.slice(2).replace(/-/g, '.'), sub: '목표 · ' + (TARGET[h.response] || h.response), feats: h.features, final: false }));
    rows.push({ when: '최종 입력', sub: '4개 모델 공통 수치 변수', feats: final, final: true });
    rows.forEach((r, i) => {
      const li = el('li', r.final ? 'final' : ''), t = el('time', null, r.when), chips = el('div', 'chips');
      li.style.setProperty('--i', i);
      t.append(el('small', null, r.sub));
      r.feats.forEach(f => chips.append(el('span', final.includes(f) ? 'keep' : '', f)));
      li.append(t, chips);
      host.append(li);
    });
    once($('#vifChart'), () => $('#vifChart').classList.add('in'), 0.3);
  });

  /* ---------- 05: feature importance by model (dashboard values) ---------- */
  figure('importance', function () {
    const list = $('#impList'), tabs = $('#impTabs'), I = (D.importance && D.importance.byModel) || {};
    const MODELS = [['catboost', 'CatBoost'], ['randomforest', 'RandomForest'], ['xgboost', 'XGBoost'], ['lightgbm', 'LightGBM']].filter(([id]) => Array.isArray(I[id]) && I[id].length);
    if (!list || !tabs || !MODELS.length) { $('#impBox') && $('#impBox').remove(); return; }
    const LABEL = { tons: '톤수', value: '가치', dist_km_mid: '거리', CPIAUCSL: '물가', UNRATE: '실업률', diesel_avg: '유가', year: '연도', sctg2: '품목', dms_orig: '출발', dms_dest: '도착' };
    const feats = [];
    MODELS.forEach(([id]) => I[id].forEach(f => { if (!feats.includes(f.feature)) feats.push(f.feature); }));
    const order = feats.slice(0, 7);
    const rows = order.map(f => {
      const li = el('li'), name = el('span'), code = el('code', null, f), tr = el('div', 'track'), fill = el('div', 'fill'), val = el('b', null, '0%');
      name.append(document.createTextNode((LABEL[f] || f) + ' '), code);
      tr.append(fill); li.append(name, tr, val); list.append(li);
      return { f, li, fill, val };
    });
    let cur = 0, shown = false;
    const set = k => {
      cur = k;
      const data = I[MODELS[k][0]];
      $$('button', tabs).forEach((b, j) => { b.classList.toggle('is-on', j === k); b.setAttribute('aria-pressed', j === k); });
      const sorted = rows.slice().sort((a, b) => ((data.find(d => d.feature === b.f) || {}).pct || 0) - ((data.find(d => d.feature === a.f) || {}).pct || 0));
      sorted.forEach(r => list.append(r.li)); // largest first
      rows.forEach(r => {
        const d = data.find(z => z.feature === r.f), v = d ? d.pct : 0;
        r.li.classList.toggle('gone', !d);
        r.fill.style.width = shown ? Math.max(v, d ? 0.6 : 0) + '%' : '0';
        r.val.textContent = d ? (v < 1 ? v.toFixed(2) : v.toFixed(1)) + '%' : '–';
      });
    };
    MODELS.forEach(([, name], k) => {
      const b = el('button', null, name);
      b.type = 'button';
      b.addEventListener('click', () => set(k));
      tabs.append(b);
    });
    set(0);
    once($('#impBox'), () => { shown = true; set(cur); }, 0.4);
    tableView($('#impBox .lg-imp-list'), ['변수', ...MODELS.map(m => m[1])], order.map(f => [(LABEL[f] || f) + ' (' + f + ')', ...MODELS.map(([id]) => { const d = I[id].find(z => z.feature === f); return d ? d.pct + '%' : '–'; })]));
  });
})();
