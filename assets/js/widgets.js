/* =========================================================
   widgets.js — interactive bento components
   ========================================================= */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const onVisible = (el, fn, once = true) => {
    if (!el) return;
    const ob = new IntersectionObserver(e => e.forEach(x => {
      if (x.isIntersecting) { fn(); if (once) ob.disconnect(); }
    }), { threshold: 0.3 });
    ob.observe(el);
  };
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const replays = {}; // widget name -> restart function, wired to the ↻ buttons at the bottom
  // snap bar fills back to zero without animating, so the next fill animates from empty
  const resetFills = (rows, label) => rows.forEach(r => {
    const f = r.querySelector('.fill');
    f.style.transition = 'none'; f.style.width = '0'; f.offsetWidth; f.style.transition = '';
    r.querySelector('b').textContent = label;
  });

  /* ---------- receipt ---------- */
  const rc = $('#rcpt'), rb = $('#rcptBtn'), rs = $('#rcptState');
  let rState = 0; // 0 hidden, 1 printed
  let doneT = 0, tearT = 0, replayT = 0, autoT = 0; // pending callbacks; any newer click cancels them
  rb.addEventListener('click', () => {
    clearTimeout(doneT); clearTimeout(tearT); clearTimeout(replayT); clearTimeout(autoT);
    if (rState === 0) {
      rc.classList.remove('tear'); rc.classList.add('printed');
      rs.textContent = 'Printing…'; rb.textContent = 'Tear off'; rState = 1;
      doneT = setTimeout(() => { rs.textContent = 'Done'; }, 1800);
    } else {
      rc.classList.add('tear'); rs.textContent = 'Ready'; rb.textContent = 'Print report'; rState = 0;
      tearT = setTimeout(() => { rc.style.transition = 'none'; rc.classList.remove('printed', 'tear'); rc.offsetWidth; rc.style.transition = ''; }, 700);
    }
  });
  onVisible(rc.parentElement, () => { autoT = setTimeout(() => rState === 0 && rb.click(), 500); });
  replays.receipt = () => {
    if (rState === 1) { rb.click(); replayT = setTimeout(() => rb.click(), 760); } else rb.click();
  };

  /* ---------- gauge (compression stages) ---------- */
  const stages = [
    { pct: 100, stage: '원본 FP16', status: 'FP16', hot: true },
    { pct: 65, stage: 'SparseGPT 35%', status: 'Pruned', hot: false },
    { pct: 16, stage: '+ GPTQ W4A16', status: 'Mobile-ready', hot: false }
  ];
  let gi = 0, gaugeTs = [], gaugeRaf = 0;
  const g = $('#gauge'), gl = $('#gaugeLiquid'), gp = $('#gaugePct'), gs = $('#gaugeStage'), gst = $('#gaugeStatus'), gb = $('#gaugeBtn');
  function setGauge(i) {
    cancelAnimationFrame(gaugeRaf); // one count-up at a time
    const s = stages[i];
    gl.style.height = s.pct + '%';
    g.classList.toggle('hot', s.hot);
    gs.textContent = s.stage;
    gst.innerHTML = '<i></i>' + s.status;
    gst.classList.toggle('warn', s.hot);
    gb.textContent = i === stages.length - 1 ? 'Reset' : 'Compress';
    // count
    const from = parseInt(gp.textContent, 10) || 0, to = s.pct, t0 = performance.now();
    const step = t => {
      const p = Math.min(1, (t - t0) / 1100), e = 1 - Math.pow(1 - p, 3);
      gp.textContent = Math.round(from + (to - from) * e) + '%';
      if (p < 1) gaugeRaf = requestAnimationFrame(step);
    };
    gaugeRaf = requestAnimationFrame(step);
  }
  gb.addEventListener('click', () => { gaugeTs.forEach(clearTimeout); gi = (gi + 1) % stages.length; setGauge(gi); });
  setGauge(0);
  replays.gauge = () => {
    gaugeTs.forEach(clearTimeout);
    gaugeTs = stages.map((_, k) => setTimeout(() => { gi = k; setGauge(k); }, k * 1400));
  };

  /* ---------- embedding sphere ---------- */
  (function sphere() {
    const cv = $('#sphere'); if (!cv) return;
    const ctx = cv.getContext('2d');
    const N = 520, pts = [];
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * 2.399963;
      pts.push([Math.cos(th) * r, y, Math.sin(th) * r, Math.random()]);
    }
    let rx = -0.3, ry = 0, vx = 0, vy = 0.004, drag = null, W, H;
    const size = () => { const d = Math.min(devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
    size(); addEventListener('resize', size);
    cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', e => {
      if (!drag) return;
      vy = (e.clientX - drag.x) * 0.0016; vx = (e.clientY - drag.y) * 0.0016;
      drag = { x: e.clientX, y: e.clientY };
    });
    const up = () => { drag = null; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    const cells = document.querySelectorAll('.sphere-cells i');
    let vis = false; new IntersectionObserver(e => vis = e[0].isIntersecting).observe(cv);
    let k = 0;
    function draw() {
      requestAnimationFrame(draw);
      if (!vis) return;
      ry += vy; rx += vx;
      if (!drag) { vy += (0.004 - vy) * 0.02; vx *= 0.94; }
      ctx.clearRect(0, 0, W, H);
      const R = Math.min(W, H) * 0.44, cx = W / 2, cy = H / 2;
      const cX = Math.cos(rx), sX = Math.sin(rx), cY = Math.cos(ry), sY = Math.sin(ry);
      const fg = window.isDark() ? '255,255,255' : '17,17,17';
      for (const p of pts) {
        let x = p[0] * cY - p[2] * sY, z = p[0] * sY + p[2] * cY;
        let y = p[1] * cX - z * sX; z = p[1] * sX + z * cX;
        const a = (z + 1.2) / 2.2;
        ctx.fillStyle = 'rgba(' + fg + ',' + (0.08 + a * 0.75 * (0.6 + p[3] * 0.4)).toFixed(3) + ')';
        ctx.fillRect(cx + x * R, cy + y * R, 1.2 + a * 1.1, 1.2 + a * 1.1);
      }
      if (++k % 40 === 0) cells.forEach(c => c.classList.toggle('on', Math.random() < 0.35));
    }
    draw();
  })();

  /* ---------- STREAMS score comparison (same-information setting) ---------- */
  (function scores() {
    const host = $('#scoreBars'); if (!host) return;
    // source: 박원찬_포트폴리오_AI개발자동화.pdf p.5
    const HUMAN = 31.3, MAX = 75;
    const data = [
      ['캡스톤 발표값', 71.5, 'void'],
      ['누수 제거 후', 24.4, ''],
      ['Greedy', 38.0, ''],
      ['TD n-tuple', 47.5, ''],
      ['TD + expectimax', 48.4, ''],
      ['v17 SGAZ', 48.8, 'best']
    ];
    host.innerHTML = data.map(d => `<div class="bar-row ${d[2]}"><span>${d[0]}</span><div class="track"><div class="fill"></div></div><b>0</b></div>`).join('') +
      `<i class="human-line" style="--x:${(HUMAN / MAX * 100).toFixed(2)}%"><em>사람 ${HUMAN}</em></i>`;
    const rows = host.querySelectorAll('.bar-row');
    let timers = [], rafs = [];
    const run = () => {
      timers.forEach(clearTimeout); rafs.forEach(cancelAnimationFrame); // drop a run still in flight
      timers = Array.from(rows, (r, i) => setTimeout(() => {
        const v = data[i][1];
        r.querySelector('.fill').style.width = (v / MAX * 100) + '%';
        const el = r.querySelector('b'), t0 = performance.now();
        const step = t => { const p = Math.min(1, (t - t0) / 1000), e = 1 - Math.pow(1 - p, 3); el.textContent = (v * e).toFixed(1); if (p < 1) rafs[i] = requestAnimationFrame(step); };
        rafs[i] = requestAnimationFrame(step);
      }, i * 120));
    };
    onVisible(host, run);
    replays.score = () => { resetFills(rows, '0'); run(); };
  })();

  /* ---------- model bars ---------- */
  (function bars() {
    const host = $('#bars'); if (!host) return;
    const data = [['RandomForest', 70.3, 98.2], ['XGBoost', 52.2, 84.0], ['LightGBM', 20.2, 78.3], ['CatBoost', 4.6, 13.2]];
    host.innerHTML = data.map((d, i) => `<div class="bar-row${i === 0 ? ' best' : ''}"><span>${d[0]}</span><div class="track"><div class="fill"></div></div><b>0%</b></div>`).join('');
    const rows = host.querySelectorAll('.bar-row');
    let key = 1, rafs = [];
    const render = () => rows.forEach((r, i) => {
      cancelAnimationFrame(rafs[i]); // restart this row's count from whatever it shows now
      const v = data[i][key];
      r.querySelector('.fill').style.width = v + '%';
      const b = r.querySelector('b'), from = parseFloat(b.textContent) || 0, t0 = performance.now();
      const step = t => { const p = Math.min(1, (t - t0) / 1000), e = 1 - Math.pow(1 - p, 3); b.textContent = (from + (v - from) * e).toFixed(1) + '%'; if (p < 1) rafs[i] = requestAnimationFrame(step); };
      rafs[i] = requestAnimationFrame(step);
    });
    onVisible(host, render);
    replays.bars = () => { resetFills(rows, '0%'); render(); };
    document.querySelectorAll('#barSeg button').forEach(btn => btn.addEventListener('click', () => {
      document.querySelectorAll('#barSeg button').forEach(x => x.classList.toggle('is-on', x === btn));
      key = btn.dataset.k === '10' ? 1 : 2; render();
    }));
  })();

  /* ---------- agent gantt ---------- */
  (function gantt() {
    const host = $('#gantt'); if (!host) return;
    const T = 12; // seconds of simulated run
    const rows = [
      ['lead', [['think', 0, 0.8], ['write', 10.6, 12]]],
      ['plan_team', [['search', 0.8, 2.6], ['think', 2.6, 3.4], ['write', 3.4, 4.6]]],
      ['backend_team', [['think', 4.6, 5.2], ['code', 5.2, 8.4], ['search', 8.4, 8.9]]],
      ['report_team', [['code', 8.9, 9.8], ['write', 9.8, 10.6]]],
      ['asset_team', [['think', 5.0, 5.6], ['code', 5.6, 7.2]]]
    ];
    host.innerHTML = rows.map(([n, segs]) => `<div class="g-row"><span class="g-name">${n}</span>${segs.map(s => `<i class="g-seg g-${s[0]}" data-s="${s[1]}" data-e="${s[2]}"></i>`).join('')}</div>`).join('') +
      '<div class="g-head"></div><div class="g-ticks">' + [0, 2, 4, 6, 8, 10, 12].map(s => '<span>' + s + 's</span>').join('') + '</div>';
    const segs = host.querySelectorAll('.g-seg'), head = host.querySelector('.g-head'), tEl = $('#ganttT');
    const rowEls = host.querySelectorAll('.g-row');
    const layout = () => {
      const left = parseFloat(getComputedStyle(host).paddingLeft), right = 18;
      const span = host.clientWidth - left - right;
      segs.forEach(s => { s.style.left = (s.dataset.s / T * span) + 'px'; s.style.width = ((s.dataset.e - s.dataset.s) / T * span) + 'px'; });
      return { left, span };
    };
    let geo = layout(); addEventListener('resize', () => { geo = layout(); });
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
    // single entry point: cancel any pending pause/frame before (re)starting, so only one loop ever runs
    const restart = () => {
      clearTimeout(pauseT); cancelAnimationFrame(rafId);
      start = null; segs.forEach(s => s.classList.remove('on'));
      if (running) rafId = requestAnimationFrame(frame);
    };
    const ob = new IntersectionObserver(e => {
      const v = e[0].isIntersecting;
      if (v && !running) { running = true; restart(); }
      if (!v) { running = false; clearTimeout(pauseT); cancelAnimationFrame(rafId); }
    }, { threshold: 0.3 });
    ob.observe(host);
    replays.gantt = restart;
  })();

  /* ---------- experiments orbit ---------- */
  (function orbit() {
    const cv = $('#expOrbit'); if (!cv) return;
    const ctx = cv.getContext('2d');
    const names = ['docs search', 'tripo3d', 'sunoapi', 'kling', 'bootstrap', 'asset_team', 'plan_team', 'backend_team', 'report_team'];
    let W, H;
    const size = () => { const d = Math.min(devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
    size(); addEventListener('resize', size);
    let vis = false; new IntersectionObserver(e => vis = e[0].isIntersecting).observe(cv);
    function draw(t) {
      requestAnimationFrame(draw);
      if (!vis) return;
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2;
      names.forEach((n, i) => {
        const ring = i % 2 ? 0.42 : 0.3;
        const a = t * 0.00018 * (i % 2 ? 1 : -1.3) + i * 0.7;
        const x = cx + Math.cos(a) * W * ring, y = cy + Math.sin(a) * H * ring * 0.9;
        const pulse = (Math.sin(t * 0.003 + i) + 1) / 2;
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.05 + pulse * 0.15) + ')';
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
        ctx.fillStyle = '#e6e6e6';
        ctx.beginPath(); ctx.arc(x, y, 3, 0, 6.283); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        ctx.font = '11px ui-monospace, Consolas, monospace';
        ctx.fillText(n, x + 7, y + 4);
      });
    }
    requestAnimationFrame(draw);
  })();

  document.querySelectorAll('.w-replay').forEach(b => b.addEventListener('click', () => {
    const f = replays[b.dataset.replay];
    if (f) f();
  }));
})();
