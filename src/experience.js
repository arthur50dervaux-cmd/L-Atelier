/**
 * Moteur d'expérience — la couche « sensible » du site.
 *
 * Tout ce qui suit est du confort visuel : chaque effet se désactive depuis
 * l'administration (panneau « Expérience »), et l'ensemble est court-circuité
 * si le visiteur a demandé un mouvement réduit. Le contenu reste toujours
 * lisible sans aucun de ces effets.
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { EXPERIENCE_DEFAULTS } from './content.js';

const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = () => window.matchMedia('(hover: none)').matches;

/* ============================================================
   1. Titres révélés mot à mot
   ============================================================ */

/**
 * Découpe un titre en mots enveloppés, chacun dans un masque, puis les fait
 * monter en cascade quand le titre entre à l'écran. On ne touche qu'aux
 * nœuds de texte : les <br/> et l'accentuation restent intacts, et le titre
 * d'origine est conservé dans `aria-label` pour les lecteurs d'écran.
 */
export function splitHeading(el) {
  if (!el || el.dataset.split === 'done') return [];

  // Les lignes sont séparées par des <br/> : on les traite d'abord, sinon
  // `textContent` collerait les mots de part et d'autre du saut de ligne
  // (« Construiredes rêves ») dans l'étiquette lue par les lecteurs d'écran.
  const lines = el.innerHTML.split(/<br\s*\/?>/i)
    .map((line) => line.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  if (!lines.length) return [];

  el.setAttribute('aria-label', lines.join(' '));
  el.innerHTML = lines.map((line) => {
    const words = line.split(' ').filter(Boolean);
    return `<span class="sw-line" aria-hidden="true">${words
      .map((w) => `<span class="sw-mask"><span class="sw-word">${w}</span></span>`)
      .join(' ')}</span>`;
  }).join('');
  el.dataset.split = 'done';
  return [...el.querySelectorAll('.sw-word')];
}

function initSplitHeadings(scope = document) {
  const selectors = '.section-head h2, .section-title, #hero-title, .detail-info h2, .legal-body h2';
  scope.querySelectorAll(selectors).forEach((el) => {
    const words = splitHeading(el);
    if (!words.length) return;
    gsap.set(words, { yPercent: 115 });
    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter: () => gsap.to(words, {
        yPercent: 0, duration: 1.05, ease: 'expo.out', stagger: 0.055,
      }),
    });
  });
}

/* ============================================================
   2. Manifeste : le texte s'allume à la lecture
   ============================================================ */

function initManifestoScroll(el) {
  if (!el) return;
  const text = el.textContent.trim();
  if (!text) return;
  el.setAttribute('aria-label', text);
  el.innerHTML = text.split(/\s+/)
    .map((w) => `<span class="mf-word" aria-hidden="true">${w}</span>`).join(' ');
  const words = el.querySelectorAll('.mf-word');
  gsap.fromTo(words, { opacity: 0.16 }, {
    opacity: 1,
    stagger: 0.35,
    ease: 'none',
    scrollTrigger: { trigger: el, start: 'top 78%', end: 'bottom 55%', scrub: 0.6 },
  });
}

/* ============================================================
   3. Chorégraphie du hero
   ============================================================ */

function initHeroChoreography() {
  const hero = document.getElementById('hero');
  if (!hero) return;
  const media = hero.querySelector('.hero-media');
  const text = hero.querySelector('.hero-text');
  const cue = hero.querySelector('.hero-bottom');

  // L'image s'éloigne pendant que le titre monte et s'efface : on « entre »
  // dans le site plutôt que de simplement le faire défiler.
  gsap.timeline({
    scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.8 },
  })
    .to(media, { scale: 1.14, yPercent: 8, ease: 'none' }, 0)
    .to(text, { yPercent: -32, opacity: 0, ease: 'none' }, 0)
    .to(cue, { opacity: 0, duration: 0.25, ease: 'none' }, 0);
}

/* ============================================================
   4. Curseur contextuel
   ============================================================ */

function initCursor() {
  if (isTouch()) return;
  const root = document.createElement('div');
  root.className = 'cursor';
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = '<span class="cursor-dot"></span><span class="cursor-ring"><span class="cursor-label"></span></span>';
  document.body.appendChild(root);
  document.body.classList.add('has-cursor');

  const dot = root.querySelector('.cursor-dot');
  const ring = root.querySelector('.cursor-ring');
  const label = root.querySelector('.cursor-label');
  const pos = { x: innerWidth / 2, y: innerHeight / 2 };
  const ringPos = { ...pos };

  window.addEventListener('pointermove', (e) => {
    pos.x = e.clientX; pos.y = e.clientY;
    gsap.set(dot, { x: pos.x, y: pos.y });
    if (!root.classList.contains('visible')) root.classList.add('visible');
  }, { passive: true });
  document.addEventListener('pointerleave', () => root.classList.remove('visible'));

  // L'anneau suit avec une inertie : c'est ce décalage qui donne la sensation
  // de matière. Le point, lui, colle exactement au pointeur.
  gsap.ticker.add(() => {
    ringPos.x += (pos.x - ringPos.x) * 0.16;
    ringPos.y += (pos.y - ringPos.y) * 0.16;
    gsap.set(ring, { x: ringPos.x, y: ringPos.y });
  });

  const CUES = [
    ['.property-card', 'Découvrir'],
    ['.project-card', 'Voir'],
    ['.furniture-card', 'Voir'],
    ['.cinema-card', 'Ouvrir'],
    ['.custom-item', 'Voir'],
    ['.film-thumb, .film-player', 'Lire'],
    ['.pano-item', 'Voir'],
    ['a, button, input, textarea, select, [role="button"]', ''],
  ];

  document.addEventListener('pointerover', (e) => {
    for (const [selector, text] of CUES) {
      const hit = e.target.closest(selector);
      if (!hit) continue;
      root.classList.add('active');
      root.classList.toggle('labelled', !!text);
      label.textContent = text;
      return;
    }
    root.classList.remove('active', 'labelled');
    label.textContent = '';
  });
  document.addEventListener('pointerdown', () => root.classList.add('down'));
  document.addEventListener('pointerup', () => root.classList.remove('down'));
}

/* ============================================================
   5. Boutons aimantés
   ============================================================ */

function initMagnetic() {
  if (isTouch()) return;
  document.querySelectorAll('.btn, .brand, #to-top, .catalog-print').forEach((el) => {
    const strength = el.classList.contains('btn') ? 0.32 : 0.22;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      gsap.to(el, {
        x: (e.clientX - (r.left + r.width / 2)) * strength,
        y: (e.clientY - (r.top + r.height / 2)) * strength,
        duration: 0.5, ease: 'power3.out',
      });
    });
    el.addEventListener('pointerleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' });
    });
  });
}

/* ============================================================
   6. Bandeau défilant
   ============================================================ */

function initMarquee(text) {
  const host = document.getElementById('marquee');
  if (!host || !text) return;
  host.hidden = false;
  const piece = `<span class="marquee-piece">${text}</span>`;
  const track = document.createElement('div');
  track.className = 'marquee-track';
  track.setAttribute('aria-hidden', 'true');
  // Deux copies identiques : la seconde prend le relais quand la première sort.
  track.innerHTML = piece.repeat(2);
  host.appendChild(track);
  host.insertAdjacentHTML('beforeend', `<span class="sr-only">${text}</span>`);

  const loop = gsap.to(track, { xPercent: -50, duration: 34, ease: 'none', repeat: -1 });

  // La bande accélère avec la vitesse de défilement. On pilote directement le
  // `timeScale` du tween : passer par gsap.to(track, …) créerait un second
  // tween sur le même élément, qui interromprait la boucle.
  let target = 1;
  ScrollTrigger.create({
    trigger: host,
    start: 'top bottom',
    end: 'bottom top',
    onUpdate: (self) => { target = 1 + Math.min(Math.abs(self.getVelocity()) / 2200, 3); },
  });
  gsap.ticker.add(() => {
    const current = loop.timeScale();
    loop.timeScale(current + (target - current) * 0.08);
    target += (1 - target) * 0.04; // retour progressif à la vitesse de croisière
  });
}

/* ============================================================
   7. Fond qui se transforme d'une section à l'autre
   ============================================================ */

function initColorMorph() {
  const sections = [...document.querySelectorAll('main > section')];
  if (!sections.length) return;
  const styles = getComputedStyle(document.documentElement);
  const bg = styles.getPropertyValue('--bg').trim();
  const bgLight = styles.getPropertyValue('--bg-light').trim();
  const deep = styles.getPropertyValue('--azur-deep').trim();

  const colorOf = (section) => (section.classList.contains('dark') ? deep
    : section.classList.contains('alt') ? bgLight : bg);

  // Les sections deviennent transparentes : c'est le fond du document qui se
  // transforme, ce qui supprime toute césure entre les blocs.
  sections.forEach((section) => { section.style.background = 'transparent'; });

  // Un IntersectionObserver centré sur le milieu de l'écran : la section qui
  // croise cette ligne donne sa couleur. Plus fiable qu'un ScrollTrigger, qui
  // manquait le changement lorsqu'on arrivait directement sur une section.
  let painted = '';
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const target = colorOf(entry.target);
      if (target === painted) return;
      painted = target;
      gsap.to(document.body, { backgroundColor: target, duration: 0.8, ease: 'power2.out' });
    });
  }, { rootMargin: '-49% 0px -49% 0px' });
  sections.forEach((section) => observer.observe(section));

  // Le panorama est épinglé (donc sorti du flux) : sa couleur est appliquée
  // à l'entrée et à la sortie de sa zone.
  const pano = document.getElementById('panorama');
  if (pano) {
    ScrollTrigger.create({
      trigger: pano.closest('.pin-spacer') || pano,
      start: 'top center', end: 'bottom center',
      onToggle: (self) => {
        if (!self.isActive) return;
        painted = deep;
        gsap.to(document.body, { backgroundColor: deep, duration: 0.8, ease: 'power2.out' });
      },
    });
  }
}

/* ============================================================
   8. Index de chapitre
   ============================================================ */

function initChapters(entries) {
  if (!entries.length || window.innerWidth < 1100) return;
  const nav = document.getElementById('chapters');
  if (!nav) return;
  nav.hidden = false;
  nav.innerHTML = entries.map(({ id, label }) => `
    <button type="button" data-chapter="${id}">
      <span class="ch-dash" aria-hidden="true"></span>
      <span class="ch-label">${label}</span>
    </button>`).join('');

  const buttons = [...nav.querySelectorAll('button')];
  buttons.forEach((b) => b.addEventListener('click', () => {
    document.getElementById(b.dataset.chapter)?.scrollIntoView({ behavior: prefersReduced() ? 'auto' : 'smooth' });
  }));

  const spy = new IntersectionObserver((obs) => {
    obs.forEach((entry) => {
      if (!entry.isIntersecting) return;
      buttons.forEach((b) => b.classList.toggle('current', b.dataset.chapter === entry.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  entries.forEach(({ id }) => {
    const el = document.getElementById(id);
    if (el) spy.observe(el);
  });
}

/* ============================================================
   9. Panorama horizontal épinglé
   ============================================================ */

/**
 * La bande d'images défile horizontalement pendant que la page est épinglée :
 * c'est le moment « signature » du site. En dessous de 900 px ou en mouvement
 * réduit, on retombe sur une bande à défilement tactile classique.
 */
export function initPanorama() {
  const section = document.getElementById('panorama');
  if (!section) return;
  const track = section.querySelector('.pano-track');
  if (!track || track.children.length < 2) return;

  if (prefersReduced() || window.innerWidth < 900) {
    section.classList.add('pano-static');
    return;
  }

  const distance = () => track.scrollWidth - window.innerWidth + window.innerWidth * 0.08;
  // Le parcours vertical ne coûte que 55 % de la course horizontale : la bande
  // défile plus vite et la page reste courte, ce qu'exige un site professionnel.
  const scrollCost = () => distance() * 0.55;
  gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: () => `+=${scrollCost()}`,
      pin: true,
      scrub: 1,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });

  // Le titre laisse la place aux images dès que la bande avance : sans cela,
  // les visuels passeraient derrière le texte et le rendraient illisible.
  const head = section.querySelector('.pano-head');
  const hint = section.querySelector('.pano-hint');
  if (head) {
    gsap.to([head, hint].filter(Boolean), {
      opacity: 0,
      y: -18,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: () => `+=${scrollCost() * 0.22}`,
        scrub: 0.5,
        invalidateOnRefresh: true,
      },
    });
  }
}

/* ============================================================
   Point d'entrée
   ============================================================ */

export function initExperience(options = {}) {
  const cfg = { ...EXPERIENCE_DEFAULTS, ...options.config };
  const reduced = prefersReduced();

  // Le mouvement réduit désactive tout ce qui bouge, mais laisse le découpage
  // typographique (déjà visible) et l'index de chapitre (purement utile).
  if (cfg.splitHeadings && !reduced) initSplitHeadings();
  if (cfg.manifestoScroll && !reduced) initManifestoScroll(document.querySelector('[data-bind="manifesto"]'));
  if (cfg.heroChoreography && !reduced) initHeroChoreography();
  if (cfg.cursor && !reduced) initCursor();
  if (cfg.magnetic && !reduced) initMagnetic();
  if (cfg.marquee && !reduced) initMarquee(cfg.marqueeText);
  // Le panorama d'abord : son épinglage insère un conteneur dans la page, que
  // le morphing de couleur doit pouvoir observer.
  if (cfg.panorama) initPanorama();
  if (cfg.colorMorph && !reduced) initColorMorph();
  if (cfg.chapters) initChapters(options.chapters || []);
}
