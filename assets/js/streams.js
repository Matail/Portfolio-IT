/* =========================================================
   streams.js — motion figures for projects/streams.html
   - hero board: a fixed 20-card deck plays itself, runs light up, score counts
   - 01 journey counters, 02 score-table columns, 03 timeline stagger
   - 04 strategy mini boards, 07 leak toggle, SGAZ curves, score histogram,
     difficulty picker
   Data for the charts lives in streams-data.js (window.STREAMS_DATA), taken from
   the v17 training logs. Every chart keeps a table view; labels use textContent.
   ========================================================= */
(function () {
  'use strict';
  const D = window.STREAMS_DATA || {};
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';
  const EASE = 'cubic-bezier(.22, 1, .36, 1)';
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
  const watch = (node, fn, threshold = 0.15) => {
    const ob = new IntersectionObserver(es => fn(es[0].isIntersecting), { threshold });
    ob.observe(node);
  };
  const fmt = (v, d) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const countTo = (node, to, d = 0, dur = 900) => {
    cancelAnimationFrame(node._raf);
    const from = parseFloat(node.textContent.replace(/,/g, '')) || 0, t0 = performance.now();
    if (reduce) { node.textContent = fmt(to, d); return; }
    const step = t => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      node.textContent = fmt(from + (to - from) * e, d);
      if (p < 1) node._raf = requestAnimationFrame(step);
    };
    node._raf = requestAnimationFrame(step);
  };
  const onResize = fn => { let t = 0; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(fn, 150); }); };

  /* ---------- game rules (same as the server) ---------- */
  const TABLE = [0, 0, 1, 3, 5, 7, 9, 11, 15, 20, 25, 30, 35, 40, 50, 60, 70, 85, 100, 150, 300]; // index = run length
  // runs of filled slots that never go down; an empty slot ends a run
  const runsOf = board => {
    const out = [];
    let s = -1;
    for (let i = 0; i <= board.length; i++) {
      const v = board[i], p = board[i - 1];
      const cont = i < board.length && v != null && s >= 0 && p != null && v >= p;
      if (!cont) {
        if (s >= 0) out.push([s, i - 1]);
        s = i < board.length && v != null ? i : -1;
      }
    }
    return out;
  };
  const scoreOf = board => runsOf(board).reduce((a, [s, e]) => a + TABLE[e - s + 1], 0);
  const tone = v => (v <= 10 ? 'lo' : v > 20 ? 'hi' : '');

  /* ---------- hero: the tutorial deck plays itself ---------- */
  (function hero() {
    const host = $('#heroSlots'); if (!host) return;
    const cardEl = $('#heroCard'), scoreEl = $('#heroScore');
    const DECK = [15, 8, 22, 15, 3, 27, 12, 19, 6, 24, 11, 16, 4, 29, 17, 9, 20, 13, 7, 25];
    const slots = Array.from({ length: 20 }, () => host.appendChild(el('li')));
    // a plausible player: the free slot nearest its proportional spot, preferring slots that keep the order
    const plan = (() => {
      const b = Array(20).fill(null);
      return DECK.map(v => {
        const target = (v - 1) / 29 * 19;
        let best = -1, cost = Infinity;
        b.forEach((x, i) => {
          if (x != null) return;
          let l = null, r = null;
          for (let j = i - 1; j >= 0; j--) if (b[j] != null) { l = b[j]; break; }
          for (let j = i + 1; j < 20; j++) if (b[j] != null) { r = b[j]; break; }
          const c = Math.abs(i - target) + ((l == null || l <= v) && (r == null || v <= r) ? 0 : 40);
          if (c < cost) { cost = c; best = i; }
        });
        b[best] = v;
        return [v, best];
      });
    })();
    let board = Array(20).fill(null), k = 0, timer = 0, live = false, pending = false;
    const paintRuns = () => {
      slots.forEach(s => s.classList.remove('in-run', 'run-s', 'run-e'));
      runsOf(board).forEach(([s, e]) => {
        if (e === s) return;
        for (let i = s; i <= e; i++) slots[i].classList.add('in-run');
        slots[s].classList.add('run-s'); slots[e].classList.add('run-e');
      });
    };
    const put = (v, i, animate) => {
      const c = el('span', 'st-c ' + tone(v), String(v));
      slots[i].replaceChildren(c);
      board[i] = v;
      if (animate) {
        const a = cardEl.getBoundingClientRect(), z = slots[i].getBoundingClientRect();
        const dx = a.left + a.width / 2 - (z.left + z.width / 2), dy = a.top + a.height / 2 - (z.top + z.height / 2);
        c.animate([{ transform: `translate(${dx}px, ${dy}px) scale(1.35)` }, { transform: 'none' }], { duration: 560, easing: EASE });
      }
      paintRuns();
      countTo(scoreEl, scoreOf(board), 0, 500);
    };
    const showCard = v => {
      cardEl.textContent = v == null ? '–' : String(v);
      cardEl.className = v == null ? '' : tone(v);
      if (v != null && !reduce) cardEl.animate([{ transform: 'translateY(-8px) scale(.85)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 300, easing: EASE });
    };
    if (reduce) { // the finished board, no motion
      plan.forEach(([v, i]) => put(v, i, false));
      showCard(null);
      return;
    }
    const tick = () => {
      if (!live) return;
      if (k < plan.length) {
        const [v, i] = plan[k++];
        showCard(v);
        pending = true;
        timer = setTimeout(() => { pending = false; put(v, i, true); timer = setTimeout(tick, 520); }, 420);
      } else { // hold the finished board, then clear and replay
        showCard(null);
        timer = setTimeout(() => {
          slots.forEach(s => s.firstChild && s.firstChild.classList.add('out'));
          timer = setTimeout(() => {
            slots.forEach(s => s.replaceChildren());
            board = Array(20).fill(null); k = 0; paintRuns(); countTo(scoreEl, 0, 0, 400);
            timer = setTimeout(tick, 700);
          }, 520);
        }, 2800);
      }
    };
    watch($('.st-hero'), v => {
      if (v && !live) { live = true; timer = setTimeout(tick, 600); }
      if (!v && live) { live = false; clearTimeout(timer); if (pending) { pending = false; k--; } }
    });
  })();

  /* ---------- 01: count the journey numbers up ---------- */
  once($('.st-journey'), () => $$('.st-journey b[data-count]').forEach((b, i) => {
    b.textContent = '0';
    setTimeout(() => countTo(b, +b.dataset.count, 1, 1100), i * 260);
  }));

  /* ---------- 03 / 07: stagger index for the timeline ---------- */
  $$('#timeline li').forEach((li, i) => li.style.setProperty('--i', i));

  /* ---------- tooltip + table helpers ---------- */
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
  };

  /* ---------- 02: score table as columns ---------- */
  (function scoreCols() {
    const host = $('#scoreCols'); if (!host) return;
    host.classList.add('st-plot');
    const tip = tipFor(host);
    const draw = () => {
      host.querySelector('svg') && host.querySelector('svg').remove();
      const W = host.clientWidth, H = W < 560 ? 200 : 240, pl = 34, pr = 6, pt = 18, pb = 24;
      const s = sv('svg', { viewBox: `0 0 ${W} ${H}`, height: H }, null);
      host.prepend(s);
      const iw = W - pl - pr, ih = H - pt - pb, band = iw / 20, bw = Math.min(24, band * 0.62);
      const y = v => pt + ih - v / 300 * ih;
      [0, 100, 200, 300].forEach(t => {
        sv('line', { class: 'grid', x1: pl, x2: W - pr, y1: y(t), y2: y(t) }, s);
        sv('text', { x: pl - 8, y: y(t) + 4, 'text-anchor': 'end' }, s).textContent = t;
      });
      for (let L = 1; L <= 20; L++) {
        const v = TABLE[L], x = pl + (L - 1) * band + (band - bw) / 2, h = Math.max(v / 300 * ih, v ? 2 : 0);
        const r = sv('rect', { class: 'col grow' + (L === 20 ? ' best' : ''), x, y: pt + ih - h, width: bw, height: h, rx: Math.min(4, h / 2) }, s);
        r.style.setProperty('--k', L);
        if (L === 1 || L % 5 === 0) sv('text', { x: x + bw / 2, y: H - 6, 'text-anchor': 'middle' }, s).textContent = 'L' + L;
        if ([10, 15, 19, 20].includes(L)) sv('text', { class: 'lbl-strong', x: x + bw / 2, y: pt + ih - h - 6, 'text-anchor': 'middle' }, s).textContent = v;
        const hit = sv('rect', { class: 'hit', x: pl + (L - 1) * band, y: pt, width: band, height: ih }, s);
        hit.addEventListener('pointerenter', () => { r.classList.add('on'); tip.show(x, pt + ih - h - 40, '구간 길이 ' + L, [[getComputedStyle(r).fill, '점수', v + '점']]); });
        hit.addEventListener('pointerleave', () => { r.classList.remove('on'); tip.hide(); });
      }
    };
    draw(); onResize(draw);
    once(host, () => host.classList.add('shown'));
  })();

  /* ---------- 04: Fullstream vs Dummyspace mini boards ---------- */
  $$('.st-mini').forEach(m => {
    const dummy = m.dataset.pattern === 'dummy' ? [4, 9, 13, 17] : [];
    for (let i = 0; i < 20; i++) {
      const c = el('i', dummy.includes(i) ? 'd' : (m.dataset.pattern === 'dummy' ? 's' : 'r'));
      c.style.setProperty('--k', i);
      m.append(c);
    }
    once(m, () => m.classList.add('on'), 0.6);
  });

  /* ---------- 07: what the agent could see ---------- */
  (function leak() {
    const root = $('#leak'); if (!root) return;
    const BOARD = [3, null, 6, null, 8, null, null, 12, null, 15, null, null, null, 19, null, 22, null, null, 27, null];
    const UPCOMING = [24, 11, 16, 4, 29, 9, 20, 13];
    const VAL = { v16: 71.5, fair: 24.4 };
    const NOTE = { v16: '앞으로 나올 카드까지 봅니다', fair: '보드와 이번 카드만 봅니다' };
    $('#leakBoard').append(...BOARD.map(v => el('li', v == null ? '' : 'f', v == null ? '' : String(v))));
    $('#leakDeck').append(...UPCOMING.map((v, k) => {
      const li = el('li'), inner = el('span', 'in');
      inner.style.setProperty('--k', k);
      inner.append(el('span', 'fr', String(v)), el('span', 'bk', '?'));
      li.append(inner);
      return li;
    }));
    const score = $('#leakScore'), fill = $('#leakFill'), note = $('#leakNote');
    const btns = $$('.seg button', root);
    let mode = 'v16', auto = !reduce, timer = 0, shown = false;
    const set = m => {
      mode = m;
      root.dataset.mode = m;
      btns.forEach(b => { const on = b.dataset.mode === m; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); });
      note.textContent = NOTE[m];
      if (shown) { countTo(score, VAL[m], 1, 800); fill.style.width = (VAL[m] / 75 * 100) + '%'; }
    };
    btns.forEach(b => b.addEventListener('click', () => { auto = false; clearTimeout(timer); set(b.dataset.mode); }));
    const loop = () => { clearTimeout(timer); if (!auto) return; timer = setTimeout(() => { if (!auto) return; set(mode === 'v16' ? 'fair' : 'v16'); loop(); }, 3400); };
    once(root, () => { shown = true; score.textContent = '0'; set('v16'); loop(); }, 0.4);
    watch(root, v => { if (!v) clearTimeout(timer); else if (shown) loop(); });
  })();

  /* ---------- 07: SGAZ learning curves by value target ---------- */
  (function sgaz() {
    const host = $('#sgazPlot'), S = D.sgazTargets; if (!host || !S) return;
    host.classList.add('st-plot');
    host.tabIndex = 0;
    host.setAttribute('role', 'img');
    const series = [['sgaz_a', 's-a', 'MC/100'], ['sgaz_b', 's-b', 'MC/10'], ['sgaz_c', 's-c', 'λ-return']]
      .map(([id, cls, short]) => ({ ...S.find(s => s.id === id), cls, short })).filter(s => s.x);
    host.setAttribute('aria-label', 'SGAZ 학습 곡선: ' + series.map(s => `${s.short} ${s.y[s.y.length - 1]}점`).join(', '));
    const keys = $('#sgazKeys');
    const tip = tipFor(host);
    let drawn = false, cross = null;
    const draw = () => {
      host.querySelector('svg') && host.querySelector('svg').remove();
      const W = host.clientWidth, H = W < 560 ? 230 : 280, pl = 30, pr = W < 560 ? 70 : 96, pt = 12, pb = 26;
      const s = sv('svg', { viewBox: `0 0 ${W} ${H}`, height: H }, null);
      host.prepend(s);
      const xmax = 300, ymax = 55, iw = W - pl - pr, ih = H - pt - pb;
      const x = v => pl + v / xmax * iw, y = v => pt + ih - v / ymax * ih;
      [0, 10, 20, 30, 40, 50].forEach(t => {
        sv('line', { class: 'grid', x1: pl, x2: pl + iw, y1: y(t), y2: y(t) }, s);
        sv('text', { x: pl - 6, y: y(t) + 4, 'text-anchor': 'end' }, s).textContent = t;
      });
      [0, 100, 200, 300].forEach(t => { sv('text', { x: x(t), y: H - 6, 'text-anchor': 'middle' }, s).textContent = t + (t === 300 ? '반복' : ''); });
      sv('line', { class: 'ref', x1: pl, x2: pl + iw, y1: y(31.3), y2: y(31.3) }, s);
      sv('text', { x: pl + 6, y: y(31.3) - 6 }, s).textContent = '사람 평균 31.3';
      series.forEach((ser, k) => {
        const d = ser.x.map((v, i) => (i ? 'L' : 'M') + x(v).toFixed(1) + ',' + y(ser.y[i]).toFixed(1)).join('');
        const p = sv('path', { class: 'line draw ' + ser.cls, d }, s);
        ser._path = p;
        const color = getComputedStyle(p).stroke;
        if (!drawn && !reduce) {
          const len = p.getTotalLength();
          p.style.strokeDasharray = len; p.style.strokeDashoffset = len; p.style.setProperty('--k', k);
          ser._p = p; ser._len = len;
        }
        const lx = ser.x[ser.x.length - 1], ly = ser.y[ser.y.length - 1];
        sv('circle', { class: 'dot', cx: x(lx), cy: y(ly), r: 4 }, s).style.fill = color;
        const t = sv('text', { class: k === 2 ? 'lbl-strong' : '', x: x(lx) + 8, y: y(ly) + 4 }, s);
        t.textContent = `${ser.short} · ${ly}`;
      });
      // crosshair snapping to the logged iterations (every 10)
      cross = sv('line', { class: 'cross', x1: 0, x2: 0, y1: pt, y2: pt + ih }, s);
      const hit = sv('rect', { class: 'hit', x: pl, y: pt, width: iw, height: ih }, s);
      const showAt = it => {
        cross.setAttribute('x1', x(it)); cross.setAttribute('x2', x(it)); cross.style.opacity = 1;
        const rows = series.map(ser => { const i = ser.x.indexOf(it); return i < 0 ? null : [getComputedStyle(ser._path).stroke, ser.short, ser.y[i] + '점']; }).filter(Boolean);
        tip.show(x(it), pt + 6, it + '반복', rows);
      };
      const near = px => Math.max(10, Math.min(300, Math.round(((px - pl) / iw * xmax) / 10) * 10));
      hit.addEventListener('pointermove', e => { const r = s.getBoundingClientRect(); showAt(near((e.clientX - r.left) * (W / r.width))); });
      hit.addEventListener('pointerleave', () => { cross.style.opacity = 0; tip.hide(); });
      let kx = 300;
      host.onkeydown = e => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault(); kx = Math.max(10, Math.min(300, kx + (e.key === 'ArrowRight' ? 10 : -10))); showAt(kx);
      };
      host.onblur = () => { cross.style.opacity = 0; tip.hide(); };
      host.onfocus = () => showAt(kx);
    };
    draw();
    if (keys) series.forEach(ser => { const sp = el('span'), i = el('i'); i.style.background = getComputedStyle(host.querySelector('path.' + ser.cls)).stroke; sp.append(i, document.createTextNode(ser.short)); keys.append(sp); });
    onResize(() => { drawn = true; draw(); });
    once(host, () => { series.forEach(ser => { if (ser._p) ser._p.style.strokeDashoffset = 0; }); drawn = true; });
    const its = series.find(s => s.id === 'sgaz_c').x;
    tableView(host, ['반복', ...series.map(s => s.short)], its.map(it => [String(it), ...series.map(ser => { const i = ser.x.indexOf(it); return i < 0 ? '–' : String(ser.y[i]); })]));
  })();

  /* ---------- 07: score histogram, v16 vs v17 ---------- */
  (function dist() {
    const host = $('#distPlot'), all = D.dist, E = D.distEdges; if (!host || !all || !E) return;
    host.classList.add('st-plot');
    const pick = [['v16', 'v16', 'v16 · 같은 정보'], ['sgaz', 'sgaz', 'v17 SGAZ']].map(([id, cls, short]) => ({ ...all.find(d => d.id === id), cls, short })).filter(d => d.counts);
    host.setAttribute('role', 'img');
    host.setAttribute('aria-label', '점수 분포: ' + pick.map(d => `${d.short} 평균 ${d.mean}점`).join(', '));
    const tip = tipFor(host);
    const binLabel = i => (i === E.length - 1 ? E[i] + '점 이상' : `${E[i]}–${E[i] + 4}점`);
    const draw = () => {
      host.querySelector('svg') && host.querySelector('svg').remove();
      const W = host.clientWidth, H = W < 560 ? 200 : 230, pl = 34, pr = 6, pt = 12, pb = 24;
      const s = sv('svg', { viewBox: `0 0 ${W} ${H}`, height: H }, null);
      host.prepend(s);
      const n = E.length, iw = W - pl - pr, ih = H - pt - pb, band = iw / n, bw = Math.max(2, Math.min(10, (band - 4) / 2));
      const max = 900, y = v => pt + ih - v / max * ih;
      [0, 300, 600, 900].forEach(t => {
        sv('line', { class: 'grid', x1: pl, x2: W - pr, y1: y(t), y2: y(t) }, s);
        sv('text', { x: pl - 6, y: y(t) + 4, 'text-anchor': 'end' }, s).textContent = t;
      });
      for (let i = 0; i < n; i++) {
        const x0 = pl + i * band + (band - (bw * 2 + 2)) / 2;
        const rects = pick.map((d, j) => {
          const v = d.counts[i], h = v / max * ih;
          const r = sv('rect', { class: 'col grow ' + d.cls, x: x0 + j * (bw + 2), y: pt + ih - h, width: bw, height: h, rx: Math.min(3, h / 2) }, s);
          r.style.setProperty('--k', i);
          return r;
        });
        if (i % 4 === 0) sv('text', { x: pl + i * band + band / 2, y: H - 6, 'text-anchor': 'middle' }, s).textContent = i === n - 1 ? '100+' : E[i];
        const hit = sv('rect', { class: 'hit', x: pl + i * band, y: pt, width: band, height: ih }, s);
        hit.addEventListener('pointerenter', () => {
          rects.forEach(r => r.classList.add('on'));
          tip.show(pl + i * band, pt, binLabel(i), pick.map((d, j) => [getComputedStyle(rects[j]).fill, d.short, d.counts[i] + '판']));
        });
        hit.addEventListener('pointerleave', () => { rects.forEach(r => r.classList.remove('on')); tip.hide(); });
      }
      const under = d => d.counts.slice(0, 4).reduce((a, b) => a + b, 0);
      const note = sv('text', { class: 'lbl-strong', x: W - pr, y: pt + 12, 'text-anchor': 'end' }, s);
      note.textContent = `20점 미만: v16 ${under(pick[0])}판 → v17 ${under(pick[1])}판`;
    };
    draw();
    const keys = $('#distKeys');
    if (keys) pick.forEach(d => { const sp = el('span'), i = el('i', 'box'); i.style.background = getComputedStyle(host.querySelector('rect.' + d.cls)).fill; sp.append(i, document.createTextNode(`${d.short} · 평균 ${d.mean}`)); keys.append(sp); });
    onResize(() => { draw(); host.classList.add('shown'); });
    once(host, () => host.classList.add('shown'));
    tableView(host, ['점수 구간', ...pick.map(d => d.short)], E.map((_, i) => [binLabel(i), ...pick.map(d => String(d.counts[i]))]));
  })();

  /* ---------- 07: difficulty — strength vs human-likeness ---------- */
  (function levels() {
    const host = $('#lvPlot'), L = D.levels, S = D.shippedLevels; if (!host || !L || !S) return;
    host.classList.add('st-plot');
    host.setAttribute('role', 'img');
    host.setAttribute('aria-label', 'β별 평균 점수와 사람과 같은 수 비율: ' + L.map(l => `β ${l.beta} ${l.argmaxMean}점 ${l.match}%`).join(', '));
    const pickEl = $('#lvPick'), sc = $('#lvScore'), mt = $('#lvMatch'), bt = $('#lvBeta');
    let cur = 4, auto = !reduce, timer = 0, sel = null, selDot = null, geo = null;
    const pointOf = lv => (lv.mode === 'sample' ? null : L.find(l => l.beta === lv.beta));
    const draw = () => {
      host.querySelector('svg') && host.querySelector('svg').remove();
      const W = host.clientWidth, H = W < 560 ? 230 : 260, pl = 30, pr = 16, pt = 18, pb = 42;
      const s = sv('svg', { viewBox: `0 0 ${W} ${H}`, height: H }, null);
      host.prepend(s);
      const x0 = 45, x1 = 70, y0 = 30, y1 = 52, iw = W - pl - pr, ih = H - pt - pb;
      const x = v => pl + (v - x0) / (x1 - x0) * iw, y = v => pt + ih - (v - y0) / (y1 - y0) * ih;
      geo = { x, y };
      [30, 35, 40, 45, 50].forEach(t => {
        sv('line', { class: 'grid', x1: pl, x2: pl + iw, y1: y(t), y2: y(t) }, s);
        sv('text', { x: pl - 6, y: y(t) + 4, 'text-anchor': 'end' }, s).textContent = t;
      });
      [45, 50, 55, 60, 65, 70].forEach(t => { sv('text', { x: x(t), y: pt + ih + 18, 'text-anchor': 'middle' }, s).textContent = t + '%'; });
      sv('text', { x: pl + iw, y: H - 2, 'text-anchor': 'end' }, s).textContent = '사람과 같은 수 (%) → 더 사람답게';
      sv('line', { class: 'ref', x1: pl, x2: pl + iw, y1: y(31.3), y2: y(31.3) }, s);
      sv('text', { x: pl + 6, y: y(31.3) - 6 }, s).textContent = '사람 평균 31.3';
      const sorted = L.slice().sort((a, b) => a.match - b.match);
      sv('path', { class: 'line s-a', d: sorted.map((l, i) => (i ? 'L' : 'M') + x(l.match).toFixed(1) + ',' + y(l.argmaxMean).toFixed(1)).join('') }, s);
      L.forEach(l => {
        const lv = S.find(z => z.mode === 'argmax' && z.beta === l.beta);
        sv('circle', { class: 'pt' + (lv ? ' ship' : ''), cx: x(l.match), cy: y(l.argmaxMean), r: lv ? 5 : 3.5 }, s);
        if (lv) sv('text', { class: 'lbl-strong', x: x(l.match), y: y(l.argmaxMean) + (lv.level === 5 || lv.level === 2 ? -12 : 20), 'text-anchor': 'middle' }, s).textContent = 'Lv' + lv.level;
        if (l.beta === 1000) sv('text', { x: x(l.match) - 8, y: y(l.argmaxMean) + 18, 'text-anchor': 'start' }, s).textContent = 'SGAZ만';
      });
      sel = sv('circle', { class: 'sel', cx: 0, cy: 0, r: 10 }, s);
      selDot = sv('circle', { class: 'sel-dot', cx: 0, cy: 0, r: 4 }, s);
      [sel, selDot].forEach(c => { c.style.transition = 'none'; });
      place(); // no slide-in from the corner when (re)drawn
      s.getBoundingClientRect();
      [sel, selDot].forEach(c => { c.style.transition = ''; });
    };
    const place = () => {
      if (!geo || !sel) return;
      const p = pointOf(S[cur]);
      [sel, selDot].forEach(c => {
        c.style.opacity = p ? 1 : 0;
        if (p) c.style.transform = `translate(${geo.x(p.match)}px, ${geo.y(p.argmaxMean)}px)`;
      });
    };
    const set = i => {
      cur = i;
      const lv = S[i], p = L.find(l => l.beta === lv.beta);
      $$('button', pickEl).forEach((b, j) => { b.classList.toggle('is-on', j === i); b.setAttribute('aria-pressed', j === i); });
      countTo(sc, lv.mean, 1, 600);
      mt.textContent = lv.mode === 'sample' ? '–' : p.match + '%';
      bt.textContent = lv.beta + (lv.mode === 'sample' ? ' · 확률대로 뽑기' : '');
      place();
    };
    S.forEach((lv, i) => {
      const b = el('button', null, `Lv${lv.level} ${lv.name}`);
      b.type = 'button';
      b.addEventListener('click', () => { auto = false; clearTimeout(timer); set(i); });
      pickEl.append(b);
    });
    draw(); set(cur); onResize(draw);
    let started = false;
    const loop = () => { clearTimeout(timer); if (!auto) return; timer = setTimeout(() => { if (!auto) return; set((cur + 1) % S.length); loop(); }, 2200); };
    once($('#levels'), () => { started = true; if (auto) set(0); loop(); }, 0.4);
    watch($('#levels'), v => { if (!v) clearTimeout(timer); else if (started) loop(); });
    tableView(host, ['β', '평균 점수', '확률 뽑기', '사람과 같은 수'], L.map(l => [String(l.beta), String(l.argmaxMean), String(l.sampleMean), l.match + '%']));
  })();
})();
