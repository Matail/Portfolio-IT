/* =========================================================
   main.js — theme, top bar and reveal on every page;
   hero and stack only where they exist (index.html)
   (charts live in charts.js)
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
  $('#themeBtn').addEventListener('click', () => setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));
  window.isDark = () => root.getAttribute('data-theme') !== 'light';

  /* ---------- dock: links fold into "menu" once scrolled, active section ---------- */
  const dock = $('#nav');
  const hero = $('#home');
  const links = $$('.dock-links a[data-section]');
  const sections = links.map(l => document.getElementById(l.dataset.section)).filter(Boolean);
  const onScroll = () => {
    dock.classList.toggle('is-folded', window.scrollY > (hero ? hero.offsetHeight * 0.5 : 80));
    const y = window.scrollY + innerHeight * 0.35;
    let cur = '';
    sections.forEach(s => { if (s.offsetTop <= y) cur = s.id; });
    links.forEach(l => l.classList.toggle('is-active', l.dataset.section === cur));
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- dock menu sheet ---------- */
  const sheet = $('#dockSheet'), scrim = $('#dockScrim'), menuBtn = $('#dockMenu');
  let hideT = 0;
  const openMenu = () => {
    clearTimeout(hideT);
    sheet.hidden = scrim.hidden = false;
    sheet.offsetWidth; // apply the un-hidden state first so the open transition runs
    root.classList.add('menu-open');
    menuBtn.setAttribute('aria-expanded', 'true');
    $('.sheet-links a', sheet).focus();
  };
  const closeMenu = (refocus = true) => {
    if (!root.classList.contains('menu-open')) return;
    root.classList.remove('menu-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    hideT = setTimeout(() => { sheet.hidden = scrim.hidden = true; }, reduce ? 0 : 450);
    if (refocus) menuBtn.focus();
  };
  menuBtn.addEventListener('click', openMenu);
  $('#dockClose').addEventListener('click', () => closeMenu());
  scrim.addEventListener('click', () => closeMenu());
  addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  $$('a', sheet).forEach(a => a.addEventListener('click', () => closeMenu(false)));
  sheet.addEventListener('keydown', e => { // keep Tab inside the open sheet
    if (e.key !== 'Tab') return;
    const f = $$('a, button', sheet), first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ---------- reveal on scroll ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => io.observe(el));

  if (hero) heroScene();
  const stackHost = $('#stackGrid');
  if (stackHost) renderStack();
  starfield();

  function heroScene() {
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
      titleEl.replaceChildren(...titles[i].map(w => {
        const tw = document.createElement('span');
        tw.className = 'tw'; tw.setAttribute('aria-hidden', 'true');
        for (const c of w) {
          const ch = document.createElement('span');
          ch.className = 'ch'; ch.style.setProperty('--i', n++);
          ch.textContent = c === ' ' ? ' ' : c;
          tw.appendChild(ch);
        }
        return tw;
      }));
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

    /* ---------- avatar: head turns toward the pointer, bubble types greetings ---------- */
    const avatar = $('#heroAvatar');
    const greet = $('#heroGreet');
    if (!reduce) {
      // eased toward the target and only while it is still moving: idle when the pointer is still
      let tx = 0, ty = 0, x = 0, y = 0, raf = 0;
      const tick = () => {
        x += (tx - x) * 0.12; y += (ty - y) * 0.12;
        avatar.style.setProperty('--nx', x.toFixed(3));
        avatar.style.setProperty('--ny', y.toFixed(3));
        raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.002 ? requestAnimationFrame(tick) : 0;
      };
      const aim = (nx, ny) => { tx = nx; ty = ny; if (!raf) raf = requestAnimationFrame(tick); };
      const clamp1 = v => Math.max(-1, Math.min(1, v));
      hero.addEventListener('pointermove', e => {
        const r = avatar.getBoundingClientRect(); // the face sits ~41% down the figure
        aim(clamp1((e.clientX - r.left - r.width / 2) / (innerWidth / 2)),
          clamp1((e.clientY - r.top - r.height * 0.41) / (innerHeight / 2)));
      });
      hero.addEventListener('pointerleave', () => aim(0, 0));

      // erase the shown greeting, type the next one, hold, repeat
      const hellos = ['안녕하세요', 'Hello', 'こんにちは', 'Hola', 'Bonjour', '你好', 'Ciao'];
      let gi = 0, gn = [...hellos[0]].length, dir = -1;
      const typeGreet = () => {
        const w = [...hellos[gi]];
        gn += dir;
        greet.textContent = w.slice(0, gn).join('');
        let wait = dir > 0 ? 120 : 55;
        if (gn >= w.length) { dir = -1; wait = 2000; }
        else if (gn <= 0) { dir = 1; gi = (gi + 1) % hellos.length; wait = 300; }
        setTimeout(typeGreet, wait);
      };
      setTimeout(typeGreet, 2400);
    }

    /* ---------- clouds thicken and thin on a 15 s cycle ---------- */
    if (reduce) { hero.style.setProperty('--cl', '0.5'); return; }
    let heroVisible = true;
    new IntersectionObserver(e => { heroVisible = e[0].isIntersecting; }).observe(hero);
    const bump = (p, a, b) => {
      if (p <= a || p >= b) return 0;
      const k = (p - a) / (b - a), x = Math.min(1, k / 0.25, (1 - k) / 0.25);
      return x * x * (3 - 2 * x);
    };
    const clouds = t => {
      requestAnimationFrame(clouds);
      if (heroVisible) hero.style.setProperty('--cl', bump((t % 15000) / 15000, 0.48, 0.8).toFixed(3));
    };
    requestAnimationFrame(clouds);
  }

  function starfield() {
    /* ---------- floating particles behind every page ---------- */
    const cv = $('#stars');
    const ctx = cv.getContext('2d');
    let W, H, DPR;
    const stars = [];
    function sizeStars() {
      DPR = Math.min(devicePixelRatio || 1, 2);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * DPR; cv.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      // keep the particles already floating (a phone's URL bar resizes the viewport while scrolling): only add or drop the difference
      const n = Math.round((W * H) / 5200);
      while (stars.length < n) stars.push({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 1.3 + 0.3,
        vx: (Math.random() - 0.5) * 0.06, vy: Math.random() * 0.08 + 0.02,
        p: Math.random() * Math.PI * 2
      });
      stars.length = n;
    }
    sizeStars();
    addEventListener('resize', sizeStars);
    let t0 = 0;
    function drawStars(t) {
      requestAnimationFrame(drawStars);
      const dt = Math.min(50, t - t0); t0 = t;
      ctx.clearRect(0, 0, W, H);
      const dark = window.isDark();
      for (const s of stars) {
        if (!reduce) { s.x += s.vx * dt * 0.06; s.y += s.vy * dt * 0.06; }
        if (s.y > H) { s.y = -2; s.x = Math.random() * W; }
        if (s.x < 0) s.x = W; if (s.x > W) s.x = 0;
        const tw = 0.5 + 0.5 * Math.sin(t * 0.002 + s.p);
        const a = (dark ? 0.18 : 0.3) + tw * (dark ? 0.25 : 0.4);
        ctx.fillStyle = dark ? 'rgba(255,255,255,' + a + ')' : 'rgba(140,100,30,' + a + ')';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
      }
    }
    requestAnimationFrame(drawStars);
  }

  function renderStack() {
    /* ---------- stack: monochrome icon grid, brand colour + name on hover ---------- */
    const SI = slug => 'url(https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/' + slug + '.svg)';
    const stack = [
      ['python', '#3776AB', 'Python'], ['pytorch', '#EE4C2C', 'PyTorch'], ['numpy', '#4DABCF', 'NumPy'], ['pandas', '#E70488', 'Pandas'], ['scikitlearn', '#F7931E', 'scikit-learn'], ['jupyter', '#F37626', 'Jupyter'],
      ['huggingface', '#FFD21E', 'Hugging Face'], ['claude', '#D97757', 'Claude'], ['ollama', '#ffffff', 'Ollama'], ['langchain', '#3FB68B', 'LangChain'], ['fastapi', '#009688', 'FastAPI'], ['flask', '#ffffff', 'Flask'],
      ['typescript', '#3178C6', 'TypeScript'], ['javascript', '#F7DF1E', 'JavaScript'], ['react', '#61DAFB', 'React'], ['nodedotjs', '#5FA04E', 'Node.js'], ['astro', '#BC52EE', 'Astro'], ['threedotjs', '#ffffff', 'three.js'],
      ['cloudflare', '#F38020', 'Cloudflare'], ['vercel', '#ffffff', 'Vercel'], ['supabase', '#3FCF8E', 'Supabase'], ['docker', '#2496ED', 'Docker'], ['git', '#F05032', 'Git'], ['github', '#ffffff', 'GitHub'],
      ['unity', '#ffffff', 'Unity'], ['blender', '#E87D0D', 'Blender'], ['figma', '#F24E1E', 'Figma'], ['notion', '#ffffff', 'Notion'], ['linux', '#FCC624', 'Linux'], ['anthropic', '#D4A27F', 'Anthropic']
    ];
    const cells = stack.map(([slug, , name], k) => {
      const el = document.createElement('div');
      el.className = 'st';
      el.style.setProperty('--m', SI(slug));
      el.style.setProperty('--i', k);
      const label = document.createElement('span');
      label.textContent = name;
      el.append(document.createElement('i'), label);
      return el;
    });
    stackHost.replaceChildren(...cells);
    // white brand marks would vanish on the light theme
    const fixWhite = () => cells.forEach((el, k) => {
      const c = stack[k][1];
      el.style.setProperty('--c', c === '#ffffff' && !window.isDark() ? '#111111' : c);
    });
    fixWhite();
    addEventListener('themechange', fixWhite);
  }
})();
