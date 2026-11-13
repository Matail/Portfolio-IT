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
      const cx = mx + (dy / len) * len * 0.18 * (dx > 0 ? -1 : 1), cy = my - Math.abs(dx / len) * len * 0.18;
      const p = sv('path', { class: 'route', d: `M${x1.toFixed(1)},${y1.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}` }, gR);
      return { a, b, p, len: p.getTotalLength(), t: Math.random(), truck: reduce ? null : sv('circle', { class: 'truck', r: 3.2 }, gT) };
    });
    for (const id in pos) {
      sv('circle', { class: 'hub-ring', cx: pos[id][0], cy: pos[id][1], r: 6 }, gH).style.animationDelay = (Math.random() * 2.4).toFixed(2) + 's';
      sv('circle', { class: 'hub', cx: pos[id][0], cy: pos[id][1], r: 2.6 }, gH);
    }
    const label = $('#heroRoute');
    let cur = 0, live = false, raf = 0, tAuto = 0, last = 0;
    const highlight = i => {
      routes.forEach((r, k) => r.p.classList.toggle('on', k === i));
      const r = routes[i];
      if (label) label.textContent = `${HUB[r.a][0]} → ${HUB[r.b][0]}`;
    };
    highlight(0);
    if (reduce) return;
    const frame = t => {
      if (!live) return;
      const dt = last ? Math.min(64, t - last) : 16; last = t;
      routes.forEach(r => {
        r.t = (r.t + dt / (r.len * 22)) % 1;
        const q = r.p.getPointAtLength(r.t * r.len);
        r.truck.setAttribute('cx', q.x.toFixed(1)); r.truck.setAttribute('cy', q.y.toFixed(1));
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
  $$('.lg-split li').forEach((li, i) => li.style.setProperty('--i', i));
  once($('#award .cs-metrics'), () => $$('#award b[data-count]').forEach((b, i) => {
    b.textContent = '0' + (b.dataset.suffix || '');
    setTimeout(() => countTo(b, +b.dataset.count, 1, b.dataset.suffix || ''), i * 200);
  }));

  /* data-driven figures are added below */
})();
