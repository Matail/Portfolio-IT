/* =========================================================
   charts.js — data lives in the HTML, this only animates it
   - <ul class="bars" data-max data-unit data-digits data-ref data-ref-label>
       <li data-v="48.8" [data-v2] class="best|void">label</li>
   - <div class="seg" data-for="barsId"><button data-key="v|v2">  value switch
   - #gantt + #ganttT                                             agent timeline
   Without JS the lists and numbers stay readable as plain text.
   ========================================================= */
(function () {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const onVisible = (el, fn) => {
    const ob = new IntersectionObserver(es => {
      if (es[0].isIntersecting) { ob.disconnect(); fn(); }
    }, { threshold: 0.35 });
    ob.observe(el);
  };
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const fmt = (v, digits) => v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  // ease-out count from whatever is shown now; one animation per element at a time
  const countTo = (node, to, digits, unit) => {
    cancelAnimationFrame(node._raf);
    const from = parseFloat(node.textContent.replace(/,/g, '')) || 0, t0 = performance.now();
    if (reduce) { node.textContent = fmt(to, digits) + unit; return; }
    const step = t => {
      const p = Math.min(1, (t - t0) / 1000), e = 1 - Math.pow(1 - p, 3);
      node.textContent = fmt(from + (to - from) * e, digits) + unit;
      if (p < 1) node._raf = requestAnimationFrame(step);
    };
    node._raf = requestAnimationFrame(step);
  };

  /* ---------- horizontal bars ---------- */
  document.querySelectorAll('ul.bars').forEach(ul => {
    const max = +ul.dataset.max || 100, unit = ul.dataset.unit || '', digits = +(ul.dataset.digits || 1);
    const items = Array.from(ul.children);
    items.forEach((li, k) => {
      const label = li.textContent.trim();
      li.classList.add('bar');
      li.style.setProperty('--k', k);
      const track = el('div', 'track');
      track.append(el('div', 'fill'));
      li.replaceChildren(el('span', null, label), track, el('b', null, (0).toFixed(digits) + unit));
    });
    let ref = null;
    if (ul.dataset.ref) {
      ref = el('i', 'ref');
      ref.append(el('em', null, ul.dataset.refLabel || ul.dataset.ref));
      ul.append(ref);
    }
    const placeRef = () => {
      if (!ref) return;
      const tr = items[0].querySelector('.track');
      ref.style.left = (tr.offsetLeft + tr.offsetWidth * (+ul.dataset.ref) / max) + 'px';
    };
    placeRef();
    addEventListener('resize', placeRef);
    let key = 'v', shown = false;
    const render = () => items.forEach(li => {
      const v = +li.dataset[key];
      li.querySelector('.fill').style.width = (v / max * 100) + '%';
      countTo(li.querySelector('b'), v, digits, unit);
    });
    onVisible(ul, () => { shown = true; placeRef(); render(); });
    ul.setKey = k => { key = k; if (shown) render(); };
  });

  document.querySelectorAll('.seg[data-for]').forEach(seg => {
    const target = document.getElementById(seg.dataset.for);
    seg.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      seg.querySelectorAll('button').forEach(x => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', x === b); });
      target.setKey(b.dataset.key);
    }));
  });


  /* ---------- agent timeline (System section) ---------- */
  (function gantt() {
    const host = document.getElementById('gantt'); if (!host) return;
    const T = 12; // seconds of simulated run
    const rows = [
      ['lead', [['think', 0, 0.8], ['write', 10.6, 12]]],
      ['plan_team', [['search', 0.8, 2.6], ['think', 2.6, 3.4], ['write', 3.4, 4.6]]],
      ['backend_team', [['think', 4.6, 5.2], ['code', 5.2, 8.4], ['search', 8.4, 8.9]]],
      ['report_team', [['code', 8.9, 9.8], ['write', 9.8, 10.6]]],
      ['asset_team', [['think', 5.0, 5.6], ['code', 5.6, 7.2]]]
    ];
    host.replaceChildren(...rows.map(([name, segs]) => {
      const row = el('div', 'g-row');
      row.append(el('span', 'g-name', name), ...segs.map(([kind, s, e]) => {
        const seg = el('i', 'g-seg g-' + kind);
        seg.dataset.s = s; seg.dataset.e = e;
        return seg;
      }));
      return row;
    }), el('div', 'g-head'), (() => {
      const ticks = el('div', 'g-ticks');
      ticks.append(...[0, 2, 4, 6, 8, 10, 12].map(s => el('span', null, s + 's')));
      return ticks;
    })());
    const segs = host.querySelectorAll('.g-seg'), head = host.querySelector('.g-head'), tEl = document.getElementById('ganttT');
    const rowEls = host.querySelectorAll('.g-row');
    const layout = () => {
      const left = parseFloat(getComputedStyle(host).paddingLeft), right = 18;
      const span = host.clientWidth - left - right;
      segs.forEach(s => { s.style.left = (s.dataset.s / T * span) + 'px'; s.style.width = ((s.dataset.e - s.dataset.s) / T * span) + 'px'; });
      return { left, span };
    };
    let geo = layout(); addEventListener('resize', () => { geo = layout(); });
    if (reduce) { // show the finished run instead of animating it
      segs.forEach(s => s.classList.add('on'));
      head.style.left = (geo.left + geo.span) + 'px';
      tEl.textContent = T.toFixed(1) + 's';
      return;
    }
    let start = null, running = false, rafId = 0, pauseT = 0;
    function frame(t) {
      if (!running) return;
      if (start === null) start = t;
      const sec = Math.min(T, (t - start) / 1000 * 1.25);
      head.style.left = (geo.left + sec / T * geo.span) + 'px';
      tEl.textContent = sec.toFixed(1) + 's';
      segs.forEach(s => s.classList.toggle('on', sec >= +s.dataset.s));
      rowEls.forEach(r => {
        const live = Array.from(r.querySelectorAll('.g-seg')).some(s => sec >= +s.dataset.s && sec <= +s.dataset.e);
        r.classList.toggle('live', live);
      });
      if (sec >= T) { pauseT = setTimeout(() => { start = null; segs.forEach(s => s.classList.remove('on')); rafId = requestAnimationFrame(frame); }, 2600); return; }
      rafId = requestAnimationFrame(frame);
    }
    // one entry point: cancel any pending pause/frame before (re)starting, so only one loop runs
    const restart = () => {
      clearTimeout(pauseT); cancelAnimationFrame(rafId);
      start = null; segs.forEach(s => s.classList.remove('on'));
      if (running) rafId = requestAnimationFrame(frame);
    };
    new IntersectionObserver(e => {
      const v = e[0].isIntersecting;
      if (v && !running) { running = true; restart(); }
      if (!v) { running = false; clearTimeout(pauseT); cancelAnimationFrame(rafId); }
    }, { threshold: 0.3 }).observe(host);
  })();
})();
