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
  const spy = () => {
    const y = window.scrollY + innerHeight * 0.35;
    let cur = 'home';
    sections.forEach(s => { if (s.offsetTop <= y) cur = s.id; });
    setActive(cur);
  };
  addEventListener('scroll', spy, { passive: true });
  spy();

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
  const renderTitle = i => {
    titleEl.innerHTML = titles[i].map(w => '<span class="tw">' + w + '</span>').join('');
  };
  const goHero = i => {
    titleEl.classList.add('out');
    setTimeout(() => {
      ti = i;
      renderTitle(ti);
      titleEl.offsetWidth; // reflow
      titleEl.classList.remove('out');
    }, reduce ? 0 : 550);
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
  let t0 = 0;
  function drawStars(t) {
    requestAnimationFrame(drawStars);
    if (!heroVisible) return;
    const dt = Math.min(50, t - t0); t0 = t;
    ctx.clearRect(0, 0, W, H);
    const dark = window.isDark();
    for (const s of stars) {
      if (!reduce) { s.x += s.vx * dt * 0.06; s.y += s.vy * dt * 0.06; }
      if (s.y > H) { s.y = -2; s.x = Math.random() * W; }
      if (s.x < 0) s.x = W; if (s.x > W) s.x = 0;
      const b = inBeam(s.x, s.y);
      const tw = 0.5 + 0.5 * Math.sin(t * 0.002 + s.p);
      const a = (dark ? 0.18 : 0.08) + tw * (dark ? 0.25 : 0.1) + b * 0.9;
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
    { id: 'p-streams', name: 'STREAMS AI', year: '캡스톤 → v17', sub: '데이터 누수를 찾아 다시 이긴 보드게임 AI', img: 'assets/img/st-curve.webp', v: 'v-blue', tags: ['#RL', '#SGAZ', '#재검증', '#Unity'], cat: 'ml data' },
    { id: 'p-faf5', name: 'Logistics Cost AI', year: '산학', sub: 'FAF5 기반 운송비 예측 + LLM 설명', img: 'assets/img/fa-dashboard.webp', v: 'v-amber', tags: ['#Pandas', '#RandomForest', '#Optuna', '#LLM'], cat: 'data ml' },
    { id: 'p-exaone', name: 'EXAONE Compression', year: '2026', sub: 'GPTQ × SparseGPT 온디바이스 경량화', img: 'assets/img/ex-quant.webp', v: 'v-violet', tags: ['#LLM', '#GPTQ', '#SparseGPT'], cat: 'llm ml' },
    { id: 'p-agents', name: 'AI Dev Automation', year: '2026', sub: 'MCP 서버 + Agent SDK 에이전트 팀', img: 'assets/img/agents-thumb.svg', v: 'v-green', tags: ['#AgentSDK', '#MCP', '#ClaudeCode'], cat: 'agents llm' }
  ];
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
  deck.innerHTML = projects.map((p, i) => `
    <div class="d-card ${p.v}" data-i="${i}">
      <span class="d-num">0${i + 1} / 0${projects.length}</span>
      <img src="${p.img}" alt="" draggable="false">
      <div class="d-meta"><div><b>${p.name}</b><br><small>${p.sub}</small></div><small>${p.year}</small></div>
    </div>`).join('');
  dots.innerHTML = projects.map(() => '<i></i>').join('');
  const dCards = $$('.d-card', deck);
  function layoutDeck() {
    order.forEach((idx, pos) => {
      const c = dCards[idx];
      c.style.zIndex = 10 - pos;
      c.style.transform = `translateY(${pos * -18}px) scale(${1 - pos * 0.05}) rotate(${pos % 2 ? 2 : -2 * (pos > 0)}deg)`;
      c.style.filter = pos ? `brightness(${1 - pos * 0.15})` : '';
      c.style.opacity = pos > 3 ? 0 : 1;
    });
    $$('i', dots).forEach((d, k) => d.classList.toggle('on', k === order[0]));
  }
  const nextCard = dir => {
    if (dir > 0) order.push(order.shift()); else order.unshift(order.pop());
    layoutDeck();
  };
  $('#deckNext').onclick = () => nextCard(1);
  $('#deckPrev').onclick = () => nextCard(-1);
  layoutDeck();
  // drag top card aside
  let drag = null;
  deck.addEventListener('pointerdown', e => {
    const c = e.target.closest('.d-card');
    if (!c || +c.dataset.i !== order[0]) return;
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
      setTimeout(() => nextCard(1), 220);
    } else if (Math.abs(dx) < 4) {
      nextCard(1);
    } else layoutDeck();
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
  gridView.addEventListener('click', e => {
    const a = e.target.closest('[data-goto]');
    if (!a) return;
    e.preventDefault();
    $$('#viewBtns .view')[0].click();
    requestAnimationFrame(() => document.getElementById(a.dataset.goto).scrollIntoView({ behavior: 'smooth' }));
  });

  /* filters */
  $$('#filterChips .chip').forEach(b => b.addEventListener('click', () => {
    $$('#filterChips .chip').forEach(x => x.classList.toggle('is-on', x === b));
    const f = b.dataset.f;
    let n = 0;
    $$('.case, .g-card').forEach(el => {
      const ok = f === 'all' || el.dataset.cat.split(' ').includes(f);
      el.classList.toggle('is-hidden', !ok);
      if (ok && el.classList.contains('case')) n++;
    });
    $('#projCount').textContent = n;
  }));

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
