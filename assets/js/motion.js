/* =========================================================
   motion.js — scroll-linked motion
   - .xs  stacked project cards: each arrives tilted and lower, straightens as it
          reaches its sticky slot, then sinks back and dims while the next card covers it
   - [data-hero]  case-study hero: its content scales back and fades as you scroll past
   Scroll-in reveals (.reveal) are handled in main.js.
   ========================================================= */
(function () {
  'use strict';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const ease = t => 1 - Math.pow(1 - t, 3);
  const cards = Array.from(document.querySelectorAll('.xs'));
  const hero = document.querySelector('[data-hero]');
  if (!cards.length && !hero) return;

  let stick = [];
  const measure = () => { stick = cards.map(c => parseFloat(getComputedStyle(c).top) || 0); };

  function frame() {
    ticking = false;
    const vh = innerHeight;
    cards.forEach((it, i) => {
      const s = stick[i];
      const pIn = clamp((vh - it.getBoundingClientRect().top) / (vh - s), 0, 1);
      const next = cards[i + 1];
      const pOut = next ? clamp((vh - next.getBoundingClientRect().top) / (vh - s), 0, 1) : 0;
      const e = ease(pIn), tilt = parseFloat(it.style.getPropertyValue('--tilt')) || 3;
      const card = it.firstElementChild;
      card.style.transform = 'translateY(' + ((1 - e) * 80).toFixed(1) + 'px) rotate(' + ((1 - e) * tilt).toFixed(2) + 'deg) scale(' + (1 - pOut * 0.08).toFixed(3) + ')';
      card.style.filter = pOut > 0.01 ? 'brightness(' + (1 - pOut * 0.5).toFixed(3) + ')' : '';
      // the floating chart and screenshot trail the card a little, in opposite directions
      it.querySelectorAll('.xc-float').forEach((f, k) => { f.style.translate = '0 ' + ((1 - e) * (k ? 70 : -50)).toFixed(1) + 'px'; });
    });
    if (hero) {
      const p = clamp(scrollY / (hero.offsetHeight * 0.85), 0, 1);
      const inner = hero.querySelector('.cs-hero-in');
      inner.style.transform = 'translateY(' + (p * 90).toFixed(1) + 'px) scale(' + (1 - p * 0.12).toFixed(3) + ')';
      inner.style.opacity = (1 - p * 1.1).toFixed(3);
    }
  }
  let ticking = false;
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', () => { measure(); request(); });
  measure();
  frame();
})();
