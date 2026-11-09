/* =========================================================
   main.js — layout-level interactions
   ========================================================= */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;

  /* ---------- theme ---------- */
  function setTheme(t) {
    root.setAttribute('data-theme', t);
    localStorage.setItem('theme', t);
    window.dispatchEvent(new CustomEvent('themechange', { detail: t }));
  }
  const toggleTheme = () => setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  $('#themeBtn').addEventListener('click', toggleTheme);
  const big = $('#bigToggle');
  if (big) big.addEventListener('click', toggleTheme);
  window.isDark = () => root.getAttribute('data-theme') !== 'light';

  /* ---------- nav: expand after hero, active section ---------- */
  const nav = $('#nav');
  const hero = $('#home');
  const onScroll = () => {
    nav.classList.toggle('is-expanded', window.scrollY > hero.offsetHeight * 0.55);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const links = $$('.nav-link[data-section]');
  const sections = links.map(l => document.getElementById(l.dataset.section)).filter(Boolean);
  const setActive = id => links.forEach(l => l.classList.toggle('is-active', l.dataset.section === id));
  // left-edge indicator: the active section's bar is longest, neighbours shrink with distance
  const indBars = $$('#sideInd a');
  const IND_W = [38, 26, 17, 10, 7];
  const setIndicator = id => {
    const k = sections.findIndex(s => s.id === id);
    indBars.forEach((a, j) => {
      a.style.setProperty('--w', IND_W[Math.min(IND_W.length - 1, Math.abs(j - k))] + 'px');
      a.classList.toggle('on', j === k);
    });
  };
  const spy = () => {
    const y = window.scrollY + innerHeight * 0.35;
    let cur = 'home';
    sections.forEach(s => { if (s.offsetTop <= y) cur = s.id; });
    setActive(cur);
    setIndicator(cur);
  };
  addEventListener('scroll', spy, { passive: true });
  spy();

  /* ---------- nav mega menus: hovering an item swaps the preview ---------- */
  $$('.mega').forEach(m => {
    const img = $('.mega-prev img', m), cap = $('.mega-prev p', m), items = $$('.mega-list a', m);
    const pick = a => {
      items.forEach(x => x.classList.toggle('on', x === a));
      img.src = a.dataset.img; cap.textContent = a.dataset.cap;
    };
    items.forEach(a => a.addEventListener('mouseenter', () => pick(a)));
    $$('a', m).forEach(a => a.addEventListener('click', e => {
      a.blur();
      const id = a.getAttribute('href').slice(1);
      if (id.startsWith('p-')) { e.preventDefault(); showProject(id); } // may be filtered out
    }));
    pick(items[0]);
  });

  /* ---------- hero: rotating title + synced lines ---------- */
  const titles = [
    ['AI', 'Engineer'],
    ['Data-driven', 'Developer'],
    ['LLM Compression', 'Engineer'],
    ['Agent Workflow', 'Builder']
  ];
  const titleEl = $('#heroTitle');
  const lineEls = $$('#heroLines li');
  let ti = 0;
  // one span per character so blur in/out runs as a left-to-right stagger
  const renderTitle = i => {
    let n = 0;
    titleEl.setAttribute('aria-label', titles[i].join(' '));
    titleEl.innerHTML = titles[i].map(w => '<span class="tw" aria-hidden="true">' +
      Array.from(w).map(c => '<span class="ch" style="--i:' + (n++) + '">' + (c === ' ' ? '&nbsp;' : c) + '</span>').join('') +
      '</span>').join('');
  };
  const goHero = i => {
    titleEl.classList.add('out');
    setTimeout(() => {
      ti = i;
      renderTitle(ti);
      titleEl.offsetWidth; // reflow
      titleEl.classList.remove('out');
    }, reduce ? 0 : 700);
    lineEls.forEach((li, k) => {
      li.classList.toggle('is-active', k === i);
      li.classList.toggle('is-past', k < i);
    });
  };
  renderTitle(0);
  let heroTimer = setInterval(() => goHero((ti + 1) % titles.length), 4200);
  lineEls.forEach((li, k) => li.addEventListener('mouseenter', () => {
    clearInterval(heroTimer);
    if (k !== ti) goHero(k);
    heroTimer = setInterval(() => goHero((ti + 1) % titles.length), 4200);
  }));

  /* ---------- starfield + dust in beam ---------- */
  const cv = $('#stars');
  const ctx = cv.getContext('2d');
  let W, H, DPR, stars = [];
  function sizeStars() {
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * DPR; cv.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const n = Math.round((W * H) / 5200);
    stars = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.3 + 0.3,
      vx: (Math.random() - 0.5) * 0.06, vy: Math.random() * 0.08 + 0.02,
      p: Math.random() * Math.PI * 2
    }));
  }
  sizeStars();
  addEventListener('resize', sizeStars);
  let heroVisible = true;
  new IntersectionObserver(e => { heroVisible = e[0].isIntersecting; }).observe(hero);
  function inBeam(x, y) {
    // cone from top-right corner pointing down-left (~205°–245° from north, clockwise)
    const ox = W * 0.97, oy = 0;
    const a = Math.atan2(x - ox, -(y - oy)) * 180 / Math.PI; // angle from north
    const ang = (a + 360) % 360;
    const d = Math.hypot(x - ox, y - oy) / Math.hypot(W, H);
    if (ang > 205 && ang < 240) return Math.max(0, 1 - d * 1.1) * (1 - Math.abs(ang - 218) / 22);
    return 0;
  }
  // sky cycle (15 s): stars rise -> ridge shows -> clouds thicken -> searchlight sweeps -> dark
  const SKY_MS = 15000;
  const bump = (p, a, b) => {
    if (p <= a || p >= b) return 0;
    const k = (p - a) / (b - a), x = Math.min(1, k / 0.25, (1 - k) / 0.25);
    return x * x * (3 - 2 * x);
  };
  const sky = { stars: 1, mtn: 1, cl: 0.5, beam: 0.7 }; // static values for reduced motion
  let t0 = 0;
  function drawStars(t) {
    requestAnimationFrame(drawStars);
    if (!heroVisible) return;
    const dt = Math.min(50, t - t0); t0 = t;
    if (!reduce) {
      const p = (t % SKY_MS) / SKY_MS;
      sky.stars = 0.08 + 0.92 * bump(p, 0.02, 0.64);
      sky.mtn = bump(p, 0.16, 0.58);
      sky.cl = bump(p, 0.48, 0.8);
      sky.beam = bump(p, 0.66, 0.97);
    }
    hero.style.setProperty('--mtn', sky.mtn.toFixed(3));
    hero.style.setProperty('--cl', sky.cl.toFixed(3));
    hero.style.setProperty('--beam-a', sky.beam.toFixed(3));
    ctx.clearRect(0, 0, W, H);
    const dark = window.isDark();
    for (const s of stars) {
      if (!reduce) { s.x += s.vx * dt * 0.06; s.y += s.vy * dt * 0.06; }
      if (s.y > H) { s.y = -2; s.x = Math.random() * W; }
      if (s.x < 0) s.x = W; if (s.x > W) s.x = 0;
      const b = inBeam(s.x, s.y) * sky.beam;
      const tw = 0.5 + 0.5 * Math.sin(t * 0.002 + s.p);
      const a = ((dark ? 0.18 : 0.08) + tw * (dark ? 0.25 : 0.1)) * sky.stars + b * 0.9;
      ctx.fillStyle = dark ? 'rgba(255,255,255,' + a + ')' : 'rgba(180,140,60,' + a * 0.7 + ')';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r + b * 0.8, 0, 6.283); ctx.fill();
    }
  }
  requestAnimationFrame(drawStars);

  /* ---------- reveal on scroll ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => io.observe(el));

  /* ---------- about photos: dot grid -> coarse mosaic -> sharp photo ---------- */
  const drawFit = (c, img, w, h, contain) => {
    const r = img.naturalWidth / img.naturalHeight;
    let dw = w, dh = w / r;
    if (contain ? r < w / h : r > w / h) { dh = h; dw = h * r; }
    c.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  };
  function pixelReveal(fig) {
    const img = $('img', fig);
    const done = () => fig.classList.add('done');
    if (reduce) return done();
    img.decode().then(() => {
      const W = fig.clientWidth, H = fig.clientHeight, contain = fig.classList.contains('fit-contain');
      const cv = document.createElement('canvas'), c = cv.getContext('2d');
      const small = document.createElement('canvas'), sc = small.getContext('2d');
      cv.width = W; cv.height = H; fig.appendChild(cv);
      const steps = [56, 32, 18, 10, 5];
      let k = 0;
      const tick = () => {
        if (k === steps.length) { done(); cv.style.opacity = 0; setTimeout(() => cv.remove(), 400); return; }
        const px = steps[k++];
        small.width = Math.ceil(W / px); small.height = Math.ceil(H / px);
        sc.fillStyle = contain ? '#fff' : '#111'; sc.fillRect(0, 0, small.width, small.height);
        drawFit(sc, img, small.width, small.height, contain);
        c.imageSmoothingEnabled = false;
        c.clearRect(0, 0, W, H);
        c.drawImage(small, 0, 0, small.width * px, small.height * px);
        setTimeout(tick, 120);
      };
      setTimeout(tick, 280);
    }).catch(done);
  }
  const pxIO = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { pxIO.unobserve(e.target); pixelReveal(e.target); }
  }), { threshold: 0.3 });
  $$('.ph.px').forEach(f => pxIO.observe(f));

  /* ---------- statement: word-by-word highlight tied to scroll ---------- */
  const st = $('#statement');
  st.innerHTML = st.textContent.trim().split(/\s+/).map(w => '<span class="sw">' + w + '</span>').join(' ');
  const sws = $$('.sw', st);
  const stScroll = () => {
    const r = st.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (innerHeight * 0.55)));
    const n = Math.round(p * sws.length);
    sws.forEach((w, i) => w.classList.toggle('on', i < n));
  };
  addEventListener('scroll', stScroll, { passive: true });
  stScroll();

  /* ---------- logo marquee with center-scale ---------- */
  const SI = slug => 'url(https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/' + slug + '.svg)';
  const logos = [
    { t: 'HANYANG<small>ERICA</small>', wide: true },
    { i: 'pytorch' },
    { t: 'LG<small>AIMERS</small>' },
    { i: 'claude' },
    { t: 'EXAONE', wide: true },
    { i: 'huggingface' },
    { t: 'NGL<small>KOREA</small>' },
    { i: 'unity' },
    { t: 'MCP' },
    { i: 'cloudflare' },
    { i: 'python' },
    { t: 'D3QN' }
  ];
  const track = $('#logoTrack');
  const mk = l => {
    const d = document.createElement('div');
    d.className = 'lg' + (l.wide ? ' wide' : '');
    if (l.i) { d.innerHTML = '<span class="ic"></span>'; d.firstChild.style.setProperty('--m', SI(l.i)); }
    else { d.innerHTML = '<span>' + l.t + '</span>'; d.style.fontSize = l.wide ? '20px' : '22px'; }
    return d;
  };
  for (let k = 0; k < 3; k++) logos.forEach(l => track.appendChild(mk(l)));
  const items = $$('.lg', track);
  let off = 0, setW = 0, hover = false;
  const measure = () => { setW = track.scrollWidth / 3; };
  measure(); addEventListener('resize', measure);
  track.parentElement.addEventListener('mouseenter', () => hover = true);
  track.parentElement.addEventListener('mouseleave', () => hover = false);
  let lt = 0;
  function marquee(t) {
    requestAnimationFrame(marquee);
    const dt = Math.min(50, t - lt); lt = t;
    if (!reduce) off -= (hover ? 0.012 : 0.045) * dt;
    if (-off >= setW) off += setW;
    track.style.transform = 'translate(' + off + 'px,-50%)';
    const wr = track.parentElement.getBoundingClientRect();
    if (wr.bottom < 0 || wr.top > innerHeight) return;
    const cx = wr.left + wr.width / 2;
    for (const it of items) {
      const r = it.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - cx) / (wr.width / 2);
      const s = 1.12 - Math.min(1, d) * 0.42;
      it.style.transform = 'scale(' + s.toFixed(3) + ')';
    }
  }
  requestAnimationFrame(marquee);

  /* ---------- works: data for grid & deck ---------- */
  const projects = [
    { id: 'p-streams', name: 'STREAMS AI', year: '캡스톤 → v17', sub: '데이터 누수를 찾아 다시 이긴 보드게임 AI', img: 'assets/img/st-curve.webp', v: 'v-blue', tags: ['#RL', '#SGAZ', '#재검증', '#Unity'], cat: 'ml data',
      desc: '캡스톤에서 71.5점으로 우수상을 받은 에이전트를 재점검해 덱 정보 누수를 찾아냈습니다. 사람과 같은 정보로 다시 학습한 v17이 48.8점으로 사람(31.3)을 넘었습니다.' },
    { id: 'p-faf5', name: 'Logistics Cost AI', year: '산학', sub: 'FAF5 기반 운송비 예측 + LLM 설명', img: 'assets/img/fa-dashboard.webp', v: 'v-amber', tags: ['#Pandas', '#RandomForest', '#Optuna', '#LLM'], cat: 'data ml',
      desc: 'FAF5 화물 통계에 유가·거시경제·인구 이동 데이터를 결합해 운송비를 예측했습니다. RandomForest가 ±10% 이내 예측 70.3%를 기록했고, LLM이 절감 대안을 설명합니다.' },
    { id: 'p-exaone', name: 'EXAONE Compression', year: '2026', sub: 'GPTQ × SparseGPT 온디바이스 경량화', img: 'assets/img/ex-quant.webp', v: 'v-violet', tags: ['#LLM', '#GPTQ', '#SparseGPT'], cat: 'llm ml',
      desc: 'EXAONE 4.0 1.2B를 모바일용으로 경량화했습니다. SparseGPT로 구조를 먼저 확정하고 GPTQ W4A16이 남은 오차를 재분배하도록 순서를 설계했습니다.' },
    { id: 'p-agents', name: 'AI Dev Automation', year: '2026', sub: 'MCP 서버 + Agent SDK 에이전트 팀', img: 'assets/img/agents-thumb.svg', v: 'v-green', tags: ['#AgentSDK', '#MCP', '#ClaudeCode'], cat: 'agents llm',
      desc: 'MCP 서버 23개와 Agent SDK 에이전트 팀 4개를 묶어 기획 → 구현 → QA 보고서까지 이어지는 개발 환경을 만들어 운영하고 있습니다.' }
  ];
  const inCat = (p, f) => f === 'all' || p.cat.split(' ').includes(f);
  const gridView = $('#gridView');
  gridView.innerHTML = projects.map((p, i) => `
    <article class="g-card" data-cat="${p.cat}">
      <div class="g-thumb ${p.v}"><span class="tnum">0${i + 1}</span><img src="${p.img}" alt="" loading="lazy"></div>
      <h4>${p.name}<small>${p.year}</small></h4>
      <p>${p.sub}</p>
      <div class="g-tags">${p.tags.map(t => '<span>' + t + '</span>').join('')}</div>
      <div class="btn-row"><a class="view-btn" href="#${p.id}" data-goto="${p.id}">View project ↗</a></div>
    </article>`).join('');
  // grid thumbs reuse visual gradient via ::before -> copy class rule

  /* deck */
  const deck = $('#deck'), dots = $('#deckDots');
  let order = projects.map((_, i) => i);
  const FLIP_ICON = '<svg viewBox="0 0 24 24"><path d="M4 10a8 8 0 0 1 14.3-4.3L20 8"/><path d="M20 3v5h-5"/><path d="M20 14a8 8 0 0 1-14.3 4.3L4 16"/><path d="M4 21v-5h5"/></svg>';
  deck.innerHTML = projects.map((p, i) => `
    <div class="d-card" data-i="${i}">
      <div class="d-flip">
        <div class="d-face d-front ${p.v}">
          <div class="d-main">
            <img src="${p.img}" alt="" draggable="false">
            <div class="d-meta"><div><span class="d-num">0${i + 1} / 0${projects.length}</span><b>${p.name}</b></div><small>${p.year}</small></div>
          </div>
          <div class="d-bar"><span>Front · 눌러서 뒤집기</span><button class="d-flipbtn" type="button">${FLIP_ICON}Flip</button></div>
        </div>
        <div class="d-face d-back">
          <div class="d-main">
            <span class="d-num">0${i + 1} / 0${projects.length} · ${p.year}</span>
            <h5>${p.name}</h5>
            <p>${p.desc}</p>
            <div class="g-tags">${p.tags.map(t => '<span>' + t + '</span>').join('')}</div>
            <div class="d-links"><a class="view-btn" href="#${p.id}" data-goto="${p.id}">View project ↗</a></div>
          </div>
          <div class="d-bar"><span>Back · 눌러서 뒤집기</span><button class="d-flipbtn" type="button">${FLIP_ICON}Flip</button></div>
        </div>
      </div>
    </div>`).join('');
  dots.innerHTML = projects.map(() => '<i></i>').join('');
  const dCards = $$('.d-card', deck);
  const flying = new Set(); // thrown cards finish their exit before rejoining the stack
  function layoutDeck() {
    order.forEach((idx, pos) => {
      const c = dCards[idx];
      if (flying.has(c)) return;
      c.style.zIndex = 10 - pos;
      c.style.transform = `translateY(${pos * -18}px) scale(${1 - pos * 0.05}) rotate(${pos % 2 ? 2 : -2 * (pos > 0)}deg)`;
      c.style.filter = pos ? `brightness(${1 - pos * 0.15})` : '';
      c.style.opacity = pos > 3 ? 0 : 1;
    });
    $$('i', dots).forEach((d, k) => d.classList.toggle('on', k === order[0]));
    // only the visible face of the top card is focusable / exposed to assistive tech
    dCards.forEach((c, i) => {
      const flipped = c.classList.contains('flipped');
      c.inert = i !== order[0];
      $('.d-front', c).inert = flipped;
      $('.d-back', c).inert = !flipped;
    });
  }
  const flip = c => { c.classList.toggle('flipped'); layoutDeck(); };
  const nextCard = dir => {
    if (dir > 0) order.push(order.shift()); else order.unshift(order.pop());
    dCards.forEach(c => flying.has(c) || c.classList.remove('flipped'));
    layoutDeck();
  };
  $('#deckNext').onclick = () => nextCard(1);
  $('#deckPrev').onclick = () => nextCard(-1);
  layoutDeck();
  deck.addEventListener('click', e => {
    const b = e.target.closest('.d-flipbtn');
    if (!b) return;
    const c = b.closest('.d-card');
    flip(c);
    $(c.classList.contains('flipped') ? '.d-back .d-flipbtn' : '.d-front .d-flipbtn', c).focus(); // keep keyboard focus on the visible face
  });
  // drag top card aside (throw = next card, tap = flip)
  let drag = null;
  deck.addEventListener('pointerdown', e => {
    const c = e.target.closest('.d-card');
    if (!c || +c.dataset.i !== order[0] || e.target.closest('a, button')) return;
    drag = { c, x: e.clientX, dx: 0 };
    c.setPointerCapture(e.pointerId);
    c.style.transition = 'none';
  });
  deck.addEventListener('pointermove', e => {
    if (!drag) return;
    drag.dx = e.clientX - drag.x;
    drag.c.style.transform = `translateX(${drag.dx}px) rotate(${drag.dx / 18}deg)`;
  });
  const endDrag = () => {
    if (!drag) return;
    const { c, dx } = drag; drag = null;
    c.style.transition = '';
    if (Math.abs(dx) > 90) {
      c.style.transform = `translateX(${Math.sign(dx) * 520}px) rotate(${Math.sign(dx) * 20}deg)`;
      flying.add(c);
      nextCard(1); // the rest of the deck moves up now
      setTimeout(() => { // once off-screen, snap the thrown card to the back without animating
        flying.delete(c);
        c.classList.remove('flipped');
        c.style.transition = 'none'; layoutDeck(); c.offsetWidth; c.style.transition = '';
      }, 600);
    } else if (Math.abs(dx) < 4) flip(c);
    else layoutDeck();
  };
  deck.addEventListener('pointerup', endDrag);
  deck.addEventListener('pointercancel', endDrag);

  /* views */
  const showcase = $('#showcase'), deckView = $('#deckView');
  $$('#viewBtns .view').forEach(b => b.addEventListener('click', () => {
    $$('#viewBtns .view').forEach(x => x.classList.toggle('is-on', x === b));
    const v = b.dataset.v;
    showcase.hidden = v !== 'showcase';
    gridView.hidden = v !== 'grid';
    deckView.hidden = v !== 'deck';
  }));
  [gridView, deck].forEach(host => host.addEventListener('click', e => {
    const a = e.target.closest('[data-goto]');
    if (!a) return;
    e.preventDefault();
    showProject(a.dataset.goto);
  }));

  /* filters: counts on chips, thumbnail stack, blur-out -> swap -> blur-in */
  const faces = $('#faces');
  const renderFaces = f => {
    faces.innerHTML = projects.filter(p => inCat(p, f)).map(p => '<img src="' + p.img + '" alt="">').join('');
  };
  $$('#filterChips .chip').forEach(b => { $('sup', b).textContent = projects.filter(p => inCat(p, b.dataset.f)).length; });
  renderFaces('all');
  let swapT = 0, activeF = 'all', pendingF = null; // pendingF: chosen but still inside the 260 ms blur
  const applyFilter = f => {
    activeF = f; pendingF = null;
    $$('#filterChips .chip').forEach(x => x.classList.toggle('is-on', x.dataset.f === f));
    let n = 0;
    $$('.case, .g-card').forEach(el => {
      const ok = f === 'all' || el.dataset.cat.split(' ').includes(f);
      el.classList.toggle('is-hidden', !ok);
      if (ok && el.classList.contains('case')) n++;
    });
    $('#projCount').textContent = n;
    renderFaces(f);
    // deck keeps only the matching cards in its rotation
    order = projects.map((_, i) => i).filter(i => inCat(projects[i], f));
    dCards.forEach((c, i) => { c.classList.toggle('is-hidden', !order.includes(i)); c.classList.remove('flipped'); });
    $$('i', dots).forEach((d, i) => d.classList.toggle('is-hidden', !order.includes(i)));
    layoutDeck();
    [showcase, gridView, deckView].forEach(el => el.classList.remove('is-swapping'));
  };
  $$('#filterChips .chip').forEach(b => b.addEventListener('click', () => {
    $$('#filterChips .chip').forEach(x => x.classList.toggle('is-on', x === b));
    [showcase, gridView, deckView].forEach(el => el.classList.add('is-swapping'));
    clearTimeout(swapT);
    pendingF = b.dataset.f;
    swapT = setTimeout(() => applyFilter(b.dataset.f), reduce ? 0 : 260);
  }));
  // jump to a project from a menu / grid / deck link, clearing a filter that hides it
  const showProject = id => {
    const el = document.getElementById(id), p = projects.find(x => x.id === id);
    const f = pendingF || activeF; // a filter picked a moment ago counts as applied
    if (pendingF || !inCat(p, f)) { clearTimeout(swapT); applyFilter(inCat(p, f) ? f : 'all'); }
    $$('#viewBtns .view')[0].click();
    requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth' }));
  };

  /* ---------- terminal typing (agents case + experiments) ---------- */
  function typeLoop(el, lines, speed) {
    if (!el) return;
    let li = 0, ci = 0, html = '';
    const tick = () => {
      if (li >= lines.length) { setTimeout(() => { li = 0; ci = 0; html = ''; el.innerHTML = ''; tick(); }, 2600); return; }
      const [cls, txt] = lines[li];
      ci++;
      const cur = html + '<span class="' + cls + '">' + txt.slice(0, ci) + '</span>';
      el.innerHTML = cur + '<span class="c4">▌</span>';
      if (ci >= txt.length) { html += '<span class="' + cls + '">' + txt + '</span>\n'; li++; ci = 0; setTimeout(tick, 380); }
      else setTimeout(tick, speed);
    };
    const ob = new IntersectionObserver(e => { if (e[0].isIntersecting) { tick(); ob.disconnect(); } });
    ob.observe(el);
  }
  typeLoop($('#termBody'), [
    ['c1', '✻ Claude Code'],
    ['c4', '> 이 저장소 리팩터링하고 QA 보고서까지 만들어 줘'],
    ['c3', '● plan_team.start_plan(project_dir)'],
    ['c4', '  ↳ docs/plans/refactor.md 작성 완료'],
    ['c3', '● backend_team.start_backend(brief)'],
    ['c4', '  ↳ worktree 브랜치 커밋 · test fail 1→0 · semgrep 1→0'],
    ['c3', '● report_team.start_report(run_hints)'],
    ['c4', '  ↳ reports/<job_id>/report.html'],
    ['c2', '✓ diff와 보고서 확인 후 merge는 사람이 결정']
  ], 22);
  typeLoop($('#expTerm'), [
    ['c4', '$ wrangler deploy'],
    ['', 'Uploaded matail-party (1.9 sec)'],
    ['', 'Bindings: D1 · KV · Durable Objects'],
    ['c2', '✓ Deployed matail.party'],
    ['c4', '$ gh pr list --state merged | wc -l'],
    ['', '49+']
  ], 30);

  /* ---------- experiments: number board ---------- */
  const board = $('#expBoard');
  if (board) {
    for (let k = 0; k < 20; k++) board.appendChild(Object.assign(document.createElement('i'), { textContent: '' }));
    const cells = $$('i', board);
    const play = () => {
      cells.forEach(c => { c.className = ''; c.textContent = ''; });
      const seq = Array.from({ length: 20 }, (_, k) => k + 1).sort(() => Math.random() - 0.5).slice(0, 14).sort((a, b) => a - b);
      const slots = Array.from({ length: 20 }, (_, k) => k).sort(() => Math.random() - 0.5).slice(0, 14).sort((a, b) => a - b);
      slots.forEach((s, k) => setTimeout(() => {
        cells[s].textContent = seq[k];
        cells[s].className = k % 3 === 0 ? 'ag' : 'on';
      }, 260 * k));
      setTimeout(play, 260 * 14 + 2400);
    };
    const ob = new IntersectionObserver(e => { if (e[0].isIntersecting) { play(); ob.disconnect(); } });
    ob.observe(board);
  }

  /* ---------- ask me anything (local keyword bot) ---------- */
  const KB = [
    { k: ['프로젝트', '작업', '만든', 'project', '포트폴리오'], a: '대표 프로젝트는 네 가지예요. ① 강화학습+모방학습 <a href="#p-streams">STREAMS 에이전트</a> ② FAF5 기반 <a href="#p-faf5">물류 운송비 예측</a> ③ <a href="#p-exaone">EXAONE 경량화</a> ④ MCP·Agent SDK로 만든 <a href="#p-agents">AI 개발 자동화 환경</a>.' },
    { k: ['강화', 'rl', 'd3qn', '스트림스', 'streams', '에이전트 점수', '보드'], a: '캡스톤에서는 BC+D3QN 에이전트로 71.5점을 내 우수상을 받았어요. 그런데 재점검해 보니 덱 정보 누수와 비교 연산 버그가 있었고, 걷어내면 24.4점(사람 31.3)이었습니다. 사람과 같은 124차원 입력으로 Gumbel AlphaZero 셀프플레이를 다시 학습한 v17이 48.8점으로 사람을 넘었고, 지금 matail.party에서 난이도 5단계로 플레이할 수 있어요.' },
    { k: ['경량', '압축', 'exaone', 'gptq', 'sparse', '양자화', '프루닝', 'llm'], a: 'LG AIMERS 8기에서 EXAONE 4.0 1.2B를 경량화했어요. SparseGPT로 35% sparsity·2:4 마스크를 먼저 걸고, GPTQ W4A16이 남은 오차를 재분배하도록 순서를 설계했습니다.' },
    { k: ['데이터', '물류', 'faf5', '전처리', '예측', 'pandas'], a: 'FAF5 화물 통계에 유가·거시경제·인구 이동 데이터를 결합해 학습용 데이터셋을 만들었어요. VIF로 중복 Feature를 걸러내고 Optuna로 4개 모델을 튜닝했고, RandomForest가 ±10% 이내 예측 70.3%로 가장 좋았습니다.' },
    { k: ['mcp', 'agent', '에이전트 팀', '자동화', 'claude', 'sdk'], a: 'Claude Code를 중심으로 MCP 서버 23개(직접 만든 9개)와 Agent SDK 에이전트 팀 4개(plan·backend·report·asset)를 운영해요. 기획 → 별도 브랜치 구현 → 실행 QA 보고서로 이어지고, merge는 사람이 결정합니다. 유료 호출은 한도·비용 상한 안에서만 돌아가요.' },
    { k: ['기술', '스택', '자신', '잘하', 'stack', '언어'], a: '가장 자신 있는 건 Python 기반 ML(PyTorch, 강화학습)과 데이터 처리(Pandas)예요. 서비스 쪽으로는 TypeScript·Flask·Cloudflare Workers/D1, 요즘은 MCP와 Agent SDK를 가장 많이 씁니다. <a href="#stack">My Stack</a>에서 전체를 볼 수 있어요.' },
    { k: ['학교', '학력', '전공', '졸업', '대학'], a: '한양대학교 ERICA 지능정보양자공학전공이고, 2027년 상반기 졸업 예정입니다.' },
    { k: ['연락', '메일', 'email', 'contact', '이메일', '깃허브', 'github'], a: '메일은 <a href="mailto:pow01042@naver.com">pow01042@naver.com</a>, 코드는 <a href="https://github.com/Matail" target="_blank" rel="noopener">github.com/Matail</a>에 있어요.' },
    { k: ['강점', '장점', '성격', '일하는', '방식'], a: '문제를 구조화하고, 데이터로 검증하고, 끝까지 배포하는 방식으로 일해요. 막히는 지점은 도구로 만들어서 다음에는 자동으로 풀리게 하는 걸 좋아합니다.' }
  ];
  const log = $('#askLog');
  const say = (txt, who) => {
    const m = document.createElement('div');
    m.className = 'msg ' + who;
    if (who === 'me') m.textContent = txt; else m.innerHTML = txt;
    log.appendChild(m);
    while (log.children.length > 6) log.removeChild(log.firstChild);
  };
  const answer = q => {
    const s = q.toLowerCase();
    let best = null, score = 0;
    KB.forEach(e => { const n = e.k.filter(k => s.includes(k)).length; if (n > score) { score = n; best = e; } });
    return best ? best.a : '그 질문엔 아직 준비된 답이 없어요. 프로젝트, 기술 스택, LLM 경량화, 에이전트 자동화, 학력, 연락처 등에 대해 물어봐 주세요.';
  };
  const ask = q => {
    if (!q.trim()) return;
    say(q, 'me');
    setTimeout(() => say(answer(q), 'bot'), 420);
  };
  $('#askForm').addEventListener('submit', e => { e.preventDefault(); const i = $('#askInput'); ask(i.value); i.value = ''; });
  $$('#askChips button').forEach(b => b.addEventListener('click', () => ask(b.textContent)));

  /* ---------- stack grid ---------- */
  const stack = [
    ['python', '#3776AB', 'Python'], ['pytorch', '#EE4C2C', 'PyTorch'], ['numpy', '#4DABCF', 'NumPy'], ['pandas', '#E70488', 'Pandas'], ['scikitlearn', '#F7931E', 'scikit-learn'], ['jupyter', '#F37626', 'Jupyter'],
    ['huggingface', '#FFD21E', 'Hugging Face'], ['claude', '#D97757', 'Claude'], ['ollama', '#ffffff', 'Ollama'], ['langchain', '#3FB68B', 'LangChain'], ['fastapi', '#009688', 'FastAPI'], ['flask', '#ffffff', 'Flask'],
    ['typescript', '#3178C6', 'TypeScript'], ['javascript', '#F7DF1E', 'JavaScript'], ['react', '#61DAFB', 'React'], ['nodedotjs', '#5FA04E', 'Node.js'], ['astro', '#BC52EE', 'Astro'], ['threedotjs', '#ffffff', 'three.js'],
    ['cloudflare', '#F38020', 'Cloudflare'], ['vercel', '#ffffff', 'Vercel'], ['supabase', '#3FCF8E', 'Supabase'], ['docker', '#2496ED', 'Docker'], ['git', '#F05032', 'Git'], ['github', '#ffffff', 'GitHub'],
    ['unity', '#ffffff', 'Unity'], ['blender', '#E87D0D', 'Blender'], ['figma', '#F24E1E', 'Figma'], ['notion', '#ffffff', 'Notion'], ['linux', '#FCC624', 'Linux'], ['anthropic', '#D4A27F', 'Anthropic']
  ];
  const sg = $('#stackGrid');
  sg.innerHTML = stack.map(([s, c, n]) => `<div class="st" style="--m:${SI(s)};--c:${c}"><i></i><span>${n}</span></div>`).join('');
  const fixWhite = () => $$('.st', sg).forEach((el, k) => {
    const c = stack[k][1];
    el.style.setProperty('--c', c === '#ffffff' && !window.isDark() ? '#111111' : c);
  });
  fixWhite();
  addEventListener('themechange', fixWhite);
})();
