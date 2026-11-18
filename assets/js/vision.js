/* =========================================================
   vision.js — motion figures for projects/vision.html
   - hero: CIFAR-100 classes as cells; all cells of one superclass light up together
   - 02 the 20 superclasses (pointer or arrow keys), 01/06 counters,
     04 PyramidNet stages, SIGReg unit-test distributions
   Numbers come from the team's final slides, weekly reports, the LeJEPA reports and
   the training logs kept in the project folder.
   ========================================================= */
(function () {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const narrowMq = matchMedia('(max-width: 760px)'); // same breakpoint as the cell sizes in style.css
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs, parent, text) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    if (parent) parent.append(n);
    return n;
  };
  const once = (node, fn, threshold = 0.3) => {
    if (!node) return;
    const ob = new IntersectionObserver(es => { if (es[0].isIntersecting) { ob.disconnect(); fn(); } }, { threshold });
    ob.observe(node);
  };
  const figure = (name, fn) => { try { fn(); } catch (e) { console.warn('vision figure skipped:', name, e); } };
  const fmt = (v, d) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const countTo = (node, to, d, pre, suf, dur = 1100) => {
    const t0 = performance.now();
    const step = t => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      node.textContent = pre + fmt(to * e, d) + suf;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  // seeded random so the hero and the point clouds look the same on every visit
  const rng = seed => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

  // CIFAR-100 superclasses and their classes (from the dataset's meta file)
  const SC = [
    ['aquatic mammals', 'beaver · dolphin · otter · seal · whale'],
    ['fish', 'aquarium fish · flatfish · ray · shark · trout'],
    ['flowers', 'orchid · poppy · rose · sunflower · tulip'],
    ['food containers', 'bottle · bowl · can · cup · plate'],
    ['fruit and vegetables', 'apple · mushroom · orange · pear · sweet pepper'],
    ['household electrical devices', 'clock · keyboard · lamp · telephone · television'],
    ['household furniture', 'bed · chair · couch · table · wardrobe'],
    ['insects', 'bee · beetle · butterfly · caterpillar · cockroach'],
    ['large carnivores', 'bear · leopard · lion · tiger · wolf'],
    ['large man-made outdoor things', 'bridge · castle · house · road · skyscraper'],
    ['large natural outdoor scenes', 'cloud · forest · mountain · plain · sea'],
    ['large omnivores and herbivores', 'camel · cattle · chimpanzee · elephant · kangaroo'],
    ['medium mammals', 'fox · porcupine · possum · raccoon · skunk'],
    ['non-insect invertebrates', 'crab · lobster · snail · spider · worm'],
    ['people', 'baby · boy · girl · man · woman'],
    ['reptiles', 'crocodile · dinosaur · lizard · snake · turtle'],
    ['small mammals', 'hamster · mouse · rabbit · shrew · squirrel'],
    ['trees', 'maple · oak · palm · pine · willow'],
    ['vehicles 1', 'bicycle · bus · motorcycle · pickup truck · train'],
    ['vehicles 2', 'lawn mower · rocket · streetcar · tank · tractor']
  ];
  const FISH = 1;

  /* ---------- counters (reduced motion keeps the numbers already in the HTML) ---------- */
  const counters = box => {
    if (reduce || !box) return;
    once(box, () => $$('b[data-count]', box).forEach((b, i) => {
      const raw = b.dataset.count, d = raw.includes('.') ? raw.split('.')[1].length : 0;
      const pre = b.dataset.prefix || '', suf = b.dataset.suffix || '';
      b.textContent = pre + fmt(0, d) + suf;
      setTimeout(() => countTo(b, +raw, d, pre, suf), i * 240);
    }));
  };
  counters($('.st-journey'));
  counters($('#award .cs-metrics'));
  $$('#timeline li').forEach((li, i) => li.style.setProperty('--i', i));
  $$('.vi-pipe .lg-step').forEach((s, i) => s.style.setProperty('--i', i));

  /* ---------- hero: vertical runs of five cells, one superclass each ---------- */
  figure('hero', () => {
    const host = $('#heroGrid'), phase = $('#heroPhase'), hero = $('.vi-hero');
    if (!host) return;
    let groups = [], cur = FISH, timer = 0, visible = true, shape = '';
    const build = () => {
      const cell = narrowMq.matches ? 10 : 16, gap = narrowMq.matches ? 3 : 5;
      const cols = Math.floor((host.clientWidth + gap) / (cell + gap));
      const rows = Math.floor((host.clientHeight + gap) / (cell + gap));
      if (cols + 'x' + rows === shape) return;
      shape = cols + 'x' + rows;
      host.style.gridTemplateColumns = `repeat(${cols}, ${cell}px)`;
      host.style.gridAutoRows = cell + 'px';
      host.style.gap = gap + 'px';
      const r = rng(11), owner = [];
      for (let c = 0; c < cols; c++) {
        for (let b = 0; b < rows; b += 5) {
          const s = Math.floor(r() * SC.length);
          for (let k = b; k < Math.min(b + 5, rows); k++) owner[k * cols + c] = s;
        }
      }
      groups = SC.map(() => []);
      const cells = owner.map(s => { const i = document.createElement('i'); groups[s].push(i); return i; });
      host.replaceChildren(...cells);
      light(cur);
    };
    const light = s => {
      groups.forEach((g, k) => g.forEach(i => i.classList.toggle('on', k === s)));
      phase.textContent = SC[s][0] + ' · ' + SC[s][1].replace(/ · /g, ', ');
    };
    const next = () => { cur = (cur + 1) % SC.length; light(cur); };
    const run = () => { clearInterval(timer); if (!reduce && visible) timer = setInterval(next, 2200); };
    build();
    run();
    let rt = 0;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(build, 200); });
    new IntersectionObserver(es => { visible = es[0].isIntersecting; run(); }).observe(hero);
  });

  /* ---------- 02: the 20 superclasses, one tab stop, arrow keys move ---------- */
  figure('hierarchy', () => {
    const grid = $('#hierGrid'), nameEl = $('#hierName'), memEl = $('#hierMembers');
    if (!grid) return;
    let cur = FISH;
    const btns = SC.map(([name, members], i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'vi-sc';
      b.setAttribute('aria-label', name + ': ' + members.replace(/ · /g, ', '));
      b.setAttribute('aria-pressed', 'false');
      b.tabIndex = -1;
      for (let k = 0; k < 5; k++) b.append(document.createElement('span'));
      b.addEventListener('click', () => select(i, false));
      b.addEventListener('mouseenter', () => select(i, false));
      return b;
    });
    grid.replaceChildren(...btns);
    function select(i, focus) {
      btns[cur].setAttribute('aria-pressed', 'false');
      btns[cur].tabIndex = -1;
      cur = i;
      btns[i].setAttribute('aria-pressed', 'true');
      btns[i].tabIndex = 0;
      nameEl.textContent = SC[i][0];
      memEl.textContent = SC[i][1];
      if (focus) btns[i].focus();
    }
    grid.addEventListener('keydown', e => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (step) { e.preventDefault(); select((cur + step + SC.length) % SC.length, true); }
      else if (e.key === 'Home') { e.preventDefault(); select(0, true); }
      else if (e.key === 'End') { e.preventDefault(); select(SC.length - 1, true); }
    });
    select(FISH, false);
  });

  /* ---------- 04: PyramidNet stages, grouped columns ---------- */
  figure('pyramidnet', () => {
    const host = $('#pyrPlot');
    if (!host) return;
    const W = 720, H = 300, L = 40, R = 16, T = 16, B = 52;
    const data = [
      ['1차', '272층 · 200 epoch', 33.78, 55.10],
      ['2차', '110층 · 400 epoch', 58.28, 87.54],
      ['최종', '110층 · 800 epoch', 70.02, 87.33]
    ];
    const y = v => T + (H - T - B) * (1 - v / 100);
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true' }, host);
    [0, 25, 50, 75, 100].forEach(v => {
      svgEl('line', { class: 'grid', x1: L, x2: W - R, y1: y(v), y2: y(v) }, svg);
      svgEl('text', { x: L - 8, y: y(v) + 4, 'text-anchor': 'end' }, svg, v);
    });
    const gw = (W - L - R) / data.length, bw = 54;
    data.forEach(([stage, sub, t1, sc], i) => {
      const cx = L + gw * i + gw / 2;
      [[t1, 't1', -bw / 2 - 4], [sc, 'sc', bw / 2 + 4]].forEach(([v, cls, dx], j) => {
        const rect = svgEl('rect', { class: `col ${cls} grow`, x: cx + dx - bw / 2, y: y(v), width: bw, height: y(0) - y(v), rx: 4 }, svg);
        rect.style.setProperty('--k', i * 2 + j);
        svgEl('text', { class: 'lbl-strong', x: cx + dx, y: y(v) - 8, 'text-anchor': 'middle' }, svg, v.toFixed(2));
      });
      svgEl('text', { class: 'lbl-strong', x: cx, y: H - B + 22, 'text-anchor': 'middle' }, svg, stage);
      svgEl('text', { x: cx, y: H - B + 40, 'text-anchor': 'middle' }, svg, sub);
    });
    [[70, 'Top-1 목표 70'], [85, 'Superclass 목표 85']].forEach(([v, t]) => {
      svgEl('line', { class: 'ref', x1: L, x2: W - R, y1: y(v), y2: y(v) }, svg);
      svgEl('text', { x: L + 8, y: y(v) - 6 }, svg, t); // left end: the first stage's columns stay below both lines
    });
    if (reduce) host.classList.add('shown');
    else once(host, () => host.classList.add('shown'));
  });

  /* ---------- 04: SIGReg unit-test distributions (illustrative 2-D points) ---------- */
  figure('sigreg', () => {
    const specs = [['dIso', 1, 1], ['dAniso', 2.4, 0.16], ['dCol', 0.05, 0.05]];
    if (!$('#' + specs[0][0])) return;
    const gauss = r => { const u = Math.max(r(), 1e-9), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    const draw = () => {
      const cs = getComputedStyle($('.vi-page'));
      const dot = cs.getPropertyValue('--vi-hi').trim(), axis = cs.getPropertyValue('--line-2').trim();
      specs.forEach(([id, sx, sy]) => {
        const c = $('#' + id), g = c.getContext('2d'), s = c.width, r = rng(7);
        g.clearRect(0, 0, s, s);
        g.strokeStyle = axis; g.lineWidth = 1;
        g.beginPath(); g.moveTo(s / 2, 12); g.lineTo(s / 2, s - 12); g.moveTo(12, s / 2); g.lineTo(s - 12, s / 2); g.stroke();
        g.fillStyle = dot; g.globalAlpha = 0.6;
        for (let k = 0; k < 480; k++) {
          const px = s / 2 + gauss(r) * sx * s / 7.5, py = s / 2 + gauss(r) * sy * s / 7.5;
          g.beginPath(); g.arc(px, py, 2.4, 0, Math.PI * 2); g.fill();
        }
        g.globalAlpha = 1;
      });
    };
    draw();
    addEventListener('themechange', draw);
  });
})();
