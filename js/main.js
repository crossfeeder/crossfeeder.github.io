/* CrossFeeder — scripts du site : apparitions, crossfader, vidéo live, liste des mixs (mixes.json) */
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!REDUCED && 'IntersectionObserver' in window) document.documentElement.classList.add('js-reveal');
const revealIO = ('IntersectionObserver' in window) ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); } }), { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }) : null;
const reveal = el => { if (revealIO) revealIO.observe(el); else el.classList.add('in'); };
document.querySelectorAll('.reveal').forEach(reveal);

/* Crossfader : teinte la vidéo et les accents, de l'ambre au bleu */
(function () {
  const A = [227, 155, 61], B1 = [76, 141, 255], B2 = [111, 163, 255];
  const mix = (a, b, t) => 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',') + ')';
  const root = document.documentElement, xf = document.getElementById('xf');
  const apply = () => { const t = xf.value / 100; root.style.setProperty('--tint', mix(A, B1, t)); root.style.setProperty('--accent', mix(A, B2, t)); };
  xf.addEventListener('input', apply); apply();
  /* Démo automatique : un aller-retour ambre → bleu → ambre à l'arrivée, interrompu dès que le visiteur touche le fader */
  if (!REDUCED) {
    let stop = false;
    ['pointerdown', 'keydown', 'touchstart'].forEach(ev => xf.addEventListener(ev, () => { stop = true; }, { once: true }));
    setTimeout(() => {
      const t0 = performance.now(), D = 4200;
      const step = now => {
        if (stop) return;
        const k = Math.min((now - t0) / D, 1);
        xf.value = Math.round(100 * (1 - Math.cos(k * 2 * Math.PI)) / 2);
        apply();
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, 1800);
  }
})();

/* Face A : liste des mixs lue dans mixes.json (mise à jour par l'agent CrossFeeder) */
(function () {
  const W = 'https://player-widget.mixcloud.com/widget/iframe/?hide_cover=1&feed=';
  const $ = id => document.getElementById(id);
  const list = $('mixList');
  function select(m, btn, num) {
    list.querySelectorAll('.mix').forEach(b => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
    $('nowCover').src = m.cover || 'photos/studio.jpg';
    const disc = $('nowDisc'); disc.classList.remove('spin'); void disc.offsetWidth; disc.classList.add('spin');
    $('nowCover').alt = 'Pochette de ' + m.series;
    $('nowLbl').textContent = 'En écoute · ' + num;
    $('nowSeries').textContent = m.series;
    $('nowGenres').textContent = m.genres;
    $('nowPlayer').src = W + encodeURIComponent(m.mixcloud);
    const links = $('nowLinks'); links.textContent = '';
    const add = (href, label) => { const a = document.createElement('a'); a.href = href; a.target = '_blank'; a.rel = 'noopener'; a.textContent = label + ' ↗'; links.appendChild(a); };
    add('https://www.mixcloud.com' + m.mixcloud, 'Mixcloud');
    if (m.soundcloud) add(m.soundcloud, 'SoundCloud');
  }
  fetch('mixes.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : Promise.reject()).then(d => {
    const mixes = (d && d.mixes) || [];
    if (!mixes.length) return;
    $('mixCount').textContent = mixes.length + ' sets · cliquer pour écouter';
    mixes.forEach((m, i) => {
      const num = String(mixes.length - i).padStart(2, '0');
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'mix'; b.setAttribute('aria-pressed', 'false');
      const n = document.createElement('span'); n.className = 'num'; n.textContent = num;
      const img = document.createElement('img'); img.src = m.cover || 'photos/studio.jpg'; img.alt = ''; img.loading = 'lazy'; img.width = 64; img.height = 64;
      const t = document.createElement('span'); t.className = 'txt';
      const s = document.createElement('span'); s.className = 's'; s.textContent = m.series;
      if (i === 0) { const nw = document.createElement('span'); nw.className = 'new'; nw.textContent = 'NOUVEAU'; s.appendChild(nw); }
      const g = document.createElement('span'); g.className = 'g'; g.textContent = m.genres;
      t.append(s, g); b.append(n, img, t);
      b.addEventListener('click', () => {
        select(m, b, num);
        if (window.innerWidth < 900) $('now').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      });
      li.appendChild(b); list.appendChild(li);
      li.classList.add('reveal'); li.style.setProperty('--d', (i * 0.06).toFixed(2) + 's'); reveal(li);
      if (i === 0) select(m, b, num);
    });
  }).catch(() => {
    const p = document.createElement('p'); p.className = 'fallback';
    p.innerHTML = 'Tous les mixs sont sur <a href="https://www.mixcloud.com/CrossFeeder/" target="_blank" rel="noopener">Mixcloud</a>.';
    list.replaceWith(p);
  });
})();
/* Live : la vidéo démarre (sans son) quand elle est visible, se met en pause hors écran ; bouton lecture/pause */
(function () {
  const v = document.getElementById('liveVid'), btn = document.getElementById('liveBtn');
  if (!v || !btn) return;
  let userPaused = REDUCED;
  if (REDUCED) { v.removeAttribute('autoplay'); v.pause(); }
  const sync = () => { btn.textContent = v.paused ? 'Lecture' : 'Pause'; btn.setAttribute('aria-label', v.paused ? 'Lire la vidéo' : 'Mettre la vidéo en pause'); };
  v.addEventListener('play', sync); v.addEventListener('pause', sync); sync();
  btn.addEventListener('click', () => { if (v.paused) { userPaused = false; v.play().catch(() => {}); } else { userPaused = true; v.pause(); } });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { if (!userPaused) v.play().catch(() => {}); } else if (!v.paused) v.pause();
    }), { threshold: 0.35 }).observe(v);
  } else if (!userPaused) v.play().catch(() => {});
})();
