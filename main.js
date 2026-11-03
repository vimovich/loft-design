(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const WA = '998900000000';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Preloader ---------- */
  const pre = $('.preloader');
  const ready = () => document.dispatchEvent(new Event('site:ready'));
  if (pre) {
    const bar = $('.preloader__bar i', pre), pct = $('.preloader__pct', pre);
    let p = 0, finished = false;
    const t = setInterval(() => { p = Math.min(p + Math.random() * 16, 90); bar.style.width = p + '%'; pct.textContent = Math.round(p) + '%'; }, 110);
    const done = () => {
      if (finished) return; finished = true;
      clearInterval(t); bar.style.width = '100%'; pct.textContent = '100%';
      setTimeout(() => { pre.classList.add('done'); ready(); }, 260);
    };
    if (document.readyState === 'complete') done(); else window.addEventListener('load', done);
    setTimeout(done, 2800);
  } else { requestAnimationFrame(ready); }

  /* ---------- Broken image fallback ---------- */
  $$('img').forEach(img => {
    const fail = () => { img.classList.add('broken'); img.parentElement && img.parentElement.classList.add('ph'); };
    if (img.complete && img.getAttribute('src') && img.naturalWidth === 0) fail();
    img.addEventListener('error', fail);
  });

  /* ---------- Header / progress / to-top ---------- */
  const header = $('.header'), toTop = $('.to-top');
  const prog = document.createElement('div'); prog.className = 'progress-line'; document.body.appendChild(prog);
  let ticking = false;
  const onScroll = () => {
    const y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight;
    header && header.classList.toggle('scrolled', y > 40);
    toTop && toTop.classList.toggle('show', y > 700);
    prog.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
    ticking = false;
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  toTop && toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* ---------- Burger ---------- */
  const burger = $('.burger'), mm = $('.mobile-menu');
  const setMenu = open => { burger.classList.toggle('open', open); mm.classList.toggle('open', open); document.body.classList.toggle('lock', open); };
  burger && burger.addEventListener('click', () => setMenu(!mm.classList.contains('open')));
  $$('.mobile-menu a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  window.addEventListener('resize', () => { if (innerWidth > 1024 && mm && mm.classList.contains('open')) setMenu(false); });

  /* ---------- Hero slider ---------- */
  const hero = $('.hero');
  if (hero) {
    const slides = $$('.hero__slide', hero), texts = $$('.hero__text', hero), dots = $$('.hero__dot', hero);
    const DUR = 6500;
    // split h1 into masked words
    texts.forEach(t => {
      const h = $('h1, .h1', t); let i = 0;
      const walk = node => {
        [...node.childNodes].forEach(n => {
          if (n.nodeType === 3) {
            const frag = document.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach(part => {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
              const w = document.createElement('span'); w.className = 'w';
              const s = document.createElement('span'); s.textContent = part; s.style.transitionDelay = (0.1 + i++ * 0.07) + 's';
              w.appendChild(s); frag.appendChild(w);
            });
            n.replaceWith(frag);
          } else if (n.nodeType === 1) walk(n);
        });
      };
      walk(h);
    });
    hero.style.setProperty('--dur', DUR / 1000 + 's');
    // Deterministic state machine: every change re-applies all classes from `cur`,
    // autoplay is driven by an elapsed-time clock (pauses while tab hidden).
    let cur = -1, prev = -1, lockUntil = 0, startedAt = 0, textTimer = 0, running = false;
    const apply = () => {
      slides.forEach((s, i) => { s.classList.toggle('active', i === cur); s.classList.toggle('is-prev', i === prev); });
      dots.forEach((d, i) => { d.classList.toggle('done', i < cur); d.classList.remove('active'); });
      if (dots[cur]) { void dots[cur].offsetWidth; dots[cur].classList.add('active'); }
      texts.forEach(t => t.classList.remove('active'));
      clearTimeout(textTimer);
      const target = cur;
      textTimer = setTimeout(() => texts.forEach((t, i) => t.classList.toggle('active', i === target)), prev < 0 ? 60 : 380);
    };
    const show = (n, force) => {
      const now = performance.now();
      if (!force && now < lockUntil) return;
      n = (n + slides.length) % slides.length;
      if (n === cur) return;
      const img = $('img', slides[n]); if (img && img.loading === 'lazy') img.loading = 'eager';
      prev = cur; cur = n; lockUntil = now + 950; startedAt = now;
      // restart wipe animation on the incoming slide
      slides[cur].classList.remove('active'); void slides[cur].offsetWidth;
      apply();
    };
    const tick = now => {
      if (!document.hidden && cur >= 0 && now - startedAt >= DUR) show(cur + 1, true);
      requestAnimationFrame(tick);
    };
    document.addEventListener('visibilitychange', () => { if (!document.hidden) startedAt = performance.now(); });
    window.addEventListener('load', () => slides.forEach(s => { const i = $('img', s); if (i) i.loading = 'eager'; }));
    $('.hero__next', hero).addEventListener('click', () => show(cur + 1));
    $('.hero__prev', hero).addEventListener('click', () => show(cur - 1));
    dots.forEach((d, i) => d.addEventListener('click', () => show(i)));
    let sx = 0;
    hero.addEventListener('touchstart', e => sx = e.touches[0].clientX, { passive: true });
    hero.addEventListener('touchend', e => { const d = e.changedTouches[0].clientX - sx; if (Math.abs(d) > 60) show(cur + (d < 0 ? 1 : -1)); });
    const start = () => { if (running) return; running = true; show(0, true); requestAnimationFrame(tick); };
    if (pre) document.addEventListener('site:ready', start, { once: true }); else start();
    setTimeout(start, 3500); // safety net
  }

  /* ---------- Reveal ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .1, rootMargin: '0px 0px -6% 0px' });
  const startReveal = () => $$('.rv,.rv-img').forEach(el => io.observe(el));
  if (pre) document.addEventListener('site:ready', startReveal, { once: true }); else startReveal();

  /* ---------- Counters ---------- */
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target, to = +el.dataset.count, dur = 1700, st = performance.now();
    const step = now => {
      const k = Math.min((now - st) / dur, 1), v = Math.round(to * (1 - Math.pow(1 - k, 3)));
      el.textContent = v.toLocaleString('ru-RU');
      if (k < 1) requestAnimationFrame(step);
    };
    reduce ? (el.textContent = to) : requestAnimationFrame(step);
    cio.unobserve(el);
  }), { threshold: .4 });
  $$('[data-count]').forEach(el => cio.observe(el));

  /* ---------- Spotlight on bento ---------- */
  $$('.b-card').forEach(c => c.addEventListener('pointermove', e => {
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', e.clientX - r.left + 'px'); c.style.setProperty('--my', e.clientY - r.top + 'px');
  }));

  /* ---------- Tabs filter ---------- */
  $$('[data-tabs]').forEach(group => {
    const target = $(group.dataset.tabs);
    $$('.tab', group).forEach(tab => tab.addEventListener('click', () => {
      $$('.tab', group).forEach(t => t.classList.remove('active')); tab.classList.add('active');
      const f = tab.dataset.filter;
      $$('[data-cat]', target).forEach(card => {
        const hide = f !== 'all' && card.dataset.cat !== f;
        card.classList.toggle('hide', hide);
        if (!hide) { card.classList.add('in'); card.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 450, easing: 'cubic-bezier(.22,.8,.2,1)' }); }
      });
    }));
  });

  /* ---------- Price-mode toggle ---------- */
  $$('[data-price-mode]').forEach(group => {
    $$('.tab', group).forEach(tab => tab.addEventListener('click', () => {
      $$('.tab', group).forEach(t => t.classList.remove('active')); tab.classList.add('active');
      const m = tab.dataset.mode;
      $$('[data-col]').forEach(c => c.style.display = (m === 'all' || c.dataset.col === m) ? '' : 'none');
    }));
  });

  /* ---------- Accordion ---------- */
  $$('.acc').forEach(acc => {
    $$('.acc__item', acc).forEach(item => {
      const q = $('.acc__q', item), a = $('.acc__a', item);
      q.addEventListener('click', () => {
        const open = item.classList.contains('open');
        $$('.acc__item', acc).forEach(o => { o.classList.remove('open'); $('.acc__a', o).style.maxHeight = null; });
        if (!open) { item.classList.add('open'); a.style.maxHeight = a.scrollHeight + 'px'; }
      });
    });
    const first = $('.acc__item', acc); if (first) { first.classList.add('open'); $('.acc__a', first).style.maxHeight = $('.acc__a', first).scrollHeight + 'px'; }
  });

  /* ---------- Modals ---------- */
  const openModal = (id, subject) => {
    const m = $(id); if (!m) return;
    m.classList.remove('sent');
    if (subject) { const s = $('[name="subject"]', m); if (s) s.value = subject; const h = $('.modal__subject', m); if (h) h.textContent = subject; }
    m.classList.add('open'); document.body.classList.add('lock');
    setTimeout(() => { const f = $('input:not([type=hidden]):not([type=checkbox])', m); f && f.focus({ preventScroll: true }); }, 350);
  };
  const closeModal = m => { if (!m) return; m.classList.remove('open'); document.body.classList.remove('lock'); };
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-modal]');
    if (t) { e.preventDefault(); openModal(t.dataset.modal, t.dataset.subject); return; }
    const c = e.target.closest('.modal__close, .modal__bg');
    if (c) closeModal(c.closest('.modal, .lightbox'));
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') $$('.modal.open, .lightbox.open').forEach(closeModal); });

  /* ---------- Lightbox ---------- */
  const lb = $('.lightbox');
  $$('[data-lightbox]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault(); $('img', lb).src = a.href; lb.classList.add('open'); document.body.classList.add('lock');
  }));

  /* ---------- Phone mask ---------- */
  $$('input[type="tel"]').forEach(inp => {
    const fmt = () => {
      let d = inp.value.replace(/\D/g, '');
      if (!d.startsWith('998')) d = '998' + d.replace(/^998/, '');
      d = d.slice(0, 12);
      const p = [d.slice(3, 5), d.slice(5, 8), d.slice(8, 10), d.slice(10, 12)];
      let out = '+998';
      if (p[0]) out += ' (' + p[0] + (p[0].length === 2 ? ')' : '');
      if (p[1]) out += ' ' + p[1];
      if (p[2]) out += '-' + p[2];
      if (p[3]) out += '-' + p[3];
      inp.value = out;
    };
    inp.addEventListener('focus', () => { if (!inp.value) inp.value = '+998 '; });
    inp.addEventListener('blur', () => { if (inp.value.replace(/\D/g, '') === '998') inp.value = ''; });
    inp.addEventListener('input', fmt);
  });

  /* ---------- Toast ---------- */
  const toast = msg => {
    let t = $('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    t.innerHTML = '<i></i>' + msg; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 4200);
  };

  /* ---------- Forms → WhatsApp lead ---------- */
  $$('form.lead-form').forEach(form => {
    $$('[required]', form).forEach(inp => inp.addEventListener('input', () => inp.closest('.field')?.classList.remove('error')));
    form.addEventListener('submit', e => {
      e.preventDefault();
      let ok = true;
      $$('[required]', form).forEach(inp => {
        const f = inp.closest('.field');
        const bad = inp.type === 'tel' ? inp.value.replace(/\D/g, '').length < 12 : (inp.type === 'checkbox' ? !inp.checked : !inp.value.trim());
        if (f) f.classList.toggle('error', bad);
        if (bad) ok = false;
      });
      if (!ok) { toast('Проверьте заполнение полей'); return; }
      const lines = ['Заявка с сайта Loft design'];
      for (const [k, v] of new FormData(form).entries()) {
        if (!v || k === 'agree') continue;
        const lbl = form.querySelector(`[name="${k}"]`)?.dataset.label || k;
        lines.push(`${lbl}: ${v}`);
      }
      window.open(`https://wa.me/${WA}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener');
      const m = form.closest('.modal');
      if (m) m.classList.add('sent'); else toast('Спасибо! Заявка отправлена — менеджер свяжется с вами.');
      form.reset();
    });
  });

  /* ---------- Calculator: сроки получения разрешения (ориентир, недели) ---------- */
  const calc = $('#calc');
  if (calc) {
    const v = id => $('#' + id, calc);
    const has = id => v(id).checked;
    const wk = n => { n = Math.max(0, Math.round(n)); if (!n) return 'готово'; const m = n % 10, mm = n % 100; return n + ' ' + (m === 1 && mm !== 11 ? 'неделя' : (m >= 2 && m <= 4 && (mm < 12 || mm > 14)) ? 'недели' : 'недель'); };
    const run = () => {
      const k = +v('c-type').value, area = Math.max(+v('c-area').value || 0, 0);
      const big = area > 10000 ? 1.25 : area > 3000 ? 1.1 : 1;
      // исходные документы готовятся параллельно — берём самый долгий
      const docs = Math.max(has('c-land') ? 0 : 2, has('c-topo') ? 0 : 1.5, has('c-geo') ? 0 : 3, has('c-apz') ? 0 : 2.5) * k;
      const proj = ((has('c-proj') || has('c-exp')) ? 0 : 4 * big) * k;
      const exp = has('c-exp') ? 0 : 4 * k * big;
      const nTu = ['c-tu-el', 'c-tu-gas', 'c-tu-water'].filter(has).length;
      const tu = nTu ? (3 + (nTu - 1) * 0.5) * k : 0;
      const projTotal = proj + exp;
      const permit = 3;
      const total = docs + Math.max(projTotal, tu) + permit;
      const lo = Math.round(total), hi = Math.round(total * 1.3);
      v('r-docs').textContent = wk(docs);
      v('r-proj').textContent = wk(projTotal);
      v('r-tu').textContent = nTu ? wk(tu) : 'не нужны';
      v('r-permit').textContent = wk(permit);
      v('r-total').textContent = lo === hi ? wk(lo) : `${lo}–${wk(hi)}`;
      const hid = $('#calc-summary');
      if (hid) {
        const got = ['c-land:документы на землю', 'c-topo:топосъёмка', 'c-geo:геология', 'c-apz:АПЗ', 'c-proj:проект', 'c-exp:экспертиза']
          .filter(x => has(x.split(':')[0])).map(x => x.split(':')[1]);
        hid.value = `${v('c-type').selectedOptions[0].text}, ${area} м²; есть: ${got.join(', ') || 'ничего'}; ТУ: ${nTu}; ориентир ${v('r-total').textContent}`;
      }
    };
    $$('input,select', calc).forEach(el => { el.addEventListener('input', run); el.addEventListener('change', run); });
    run();
  }

  $$('.year').forEach(y => y.textContent = new Date().getFullYear());
})();
