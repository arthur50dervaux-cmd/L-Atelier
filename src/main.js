import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { createScene } from './scene.js';
import { createViewer } from './viewer.js';
import { projects, properties, team } from './data.js';

gsap.registerPlugin(ScrollTrigger);
document.getElementById('year').textContent = new Date().getFullYear();

/* ============ RENDER DYNAMIC CONTENT (avant les observers) ============ */
const esc = (s) => String(s).replace(/"/g, '&quot;');

/* --- Conception : projets par état --- */
const projectGrid = document.getElementById('project-grid');
function renderProjects(state) {
  const list = projects[state] || [];
  projectGrid.innerHTML = list.map((p) => {
    let badge = '';
    if (state === 'concours') badge = `<span class="card-badge">${p.status}</span>`;
    else if (state === 'avenir') badge = `<span class="card-badge soft">${p.year}</span>`;
    else if (state === 'termines') badge = `<span class="card-badge soft">Livré ${p.year}</span>`;
    const progress = state === 'encours'
      ? `<div class="progress"><div class="progress-bar" style="width:${p.progress}%"></div></div>
         <p class="progress-label">${p.phase} · ${p.progress}%</p>` : '';
    const meta = p.year ? `${p.place} — ${p.year}` : p.place;
    return `<article class="project-card reveal" data-hover
        data-title="${esc(p.title)}" data-place="${esc(meta)}" data-desc="${esc(p.desc)}">
        <div class="project-visual ${p.art}">${badge}</div>
        <div class="project-meta"><h3>${p.title}</h3><p>${meta}</p>${progress}</div>
      </article>`;
  }).join('');
  bindCards(projectGrid.querySelectorAll('.project-card'));
  initReveal(projectGrid.querySelectorAll('.reveal'));
}

const tabs = document.querySelectorAll('#project-tabs .tab');
tabs.forEach((t) => t.addEventListener('click', () => {
  tabs.forEach((b) => b.classList.remove('active'));
  t.classList.add('active');
  renderProjects(t.dataset.tab);
}));

/* --- Immobilier : biens --- */
const propertyGrid = document.getElementById('property-grid');
const statusClass = (s) => s === 'Vendu' ? 'sold' : s === 'Sous compromis' ? 'pending' : 'sale';
function renderProperties() {
  propertyGrid.innerHTML = properties.map((b) => `
    <article class="property-card reveal" data-hover data-type="${b.type}"
      data-title="${esc(b.title)}" data-place="${esc(b.place + ' — ' + b.region)}"
      data-desc="${esc(b.desc)}" data-price="${esc(b.price)}"
      data-surface="${b.surface}" data-rooms="${b.rooms}" data-beds="${b.beds}">
      <div class="property-visual ${b.art}">
        <span class="status-badge ${statusClass(b.status)}">${b.status}</span>
        <span class="property-type">${b.type}</span>
      </div>
      <div class="property-meta">
        <h3>${b.title}</h3>
        <p class="property-place">${b.place}</p>
        <div class="property-specs">
          <span>${b.surface} m²</span><span>${b.rooms} pièces</span><span>${b.beds} ch.</span>
        </div>
        <p class="property-price">${b.price}</p>
      </div>
    </article>`).join('');
  bindCards(propertyGrid.querySelectorAll('.property-card'), true);
  initReveal(propertyGrid.querySelectorAll('.reveal'));
}

const propertyFilters = document.querySelectorAll('#property-filters .filter-btn');
propertyFilters.forEach((btn) => btn.addEventListener('click', () => {
  propertyFilters.forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  const f = btn.dataset.filter;
  propertyGrid.querySelectorAll('.property-card').forEach((card) => {
    const match = f === 'all' || card.dataset.type === f;
    if (match) { card.classList.remove('hide'); gsap.fromTo(card, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5 }); }
    else card.classList.add('hide');
  });
}));

/* --- Équipe --- */
const teamGrid = document.getElementById('team-grid');
teamGrid.innerHTML = team.map((m) => `
  <article class="team-card reveal" data-tilt>
    <div class="team-avatar">${m.initials}</div>
    <h3>${m.name}</h3>
    <p class="team-role">${m.role}</p>
    <p class="team-bio">${m.bio}</p>
  </article>`).join('');

/* ============ MODAL (projets + biens) ============ */
const modal = document.getElementById('modal');
const modalTitle = modal.querySelector('.modal-title');
const modalPlace = modal.querySelector('.modal-place');
const modalDesc = modal.querySelector('.modal-desc');
const modalVisual = modal.querySelector('.modal-visual');
const modalSpecs = modal.querySelector('.modal-specs');

function openModal(el, isProperty) {
  modalTitle.textContent = el.dataset.title;
  modalPlace.textContent = el.dataset.place;
  modalDesc.textContent = el.dataset.desc;
  const visual = el.querySelector('.project-visual, .property-visual');
  const art = [...visual.classList].find((c) => c.startsWith('art-')) || '';
  modalVisual.className = `modal-visual ${art}`;
  if (isProperty) {
    modalSpecs.innerHTML = `
      <span class="spec"><strong>${el.dataset.price}</strong>Prix</span>
      <span class="spec"><strong>${el.dataset.surface} m²</strong>Surface</span>
      <span class="spec"><strong>${el.dataset.rooms}</strong>Pièces</span>
      <span class="spec"><strong>${el.dataset.beds}</strong>Chambres</span>`;
    modalSpecs.style.display = '';
  } else {
    modalSpecs.style.display = 'none';
  }
  modal.classList.add('open');
}
function bindCards(cards, isProperty = false) {
  cards.forEach((c) => {
    c.addEventListener('click', () => openModal(c, isProperty));
    c.addEventListener('mouseenter', () => document.body.classList.add('hovering'));
    c.addEventListener('mouseleave', () => document.body.classList.remove('hovering'));
  });
}
modal.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', () => modal.classList.remove('open')));

/* ============ Initial renders ============ */
renderProjects('avenir');
renderProperties();

/* ============ Smooth scroll ============ */
const lenis = new Lenis({ smoothWheel: true, duration: 1.1 });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

/* ============ Loader ============ */
const loader = document.getElementById('loader');
const loaderProgress = document.getElementById('loader-progress');
let progress = 0;
const loaderInterval = setInterval(() => {
  progress += Math.random() * 18;
  if (progress >= 100) {
    progress = 100;
    clearInterval(loaderInterval);
    loaderProgress.style.width = '100%';
    setTimeout(() => { loader.classList.add('hidden'); playIntro(); }, 350);
  } else {
    loaderProgress.style.width = `${progress}%`;
  }
}, 160);

/* ============ 3D background scene ============ */
const canvas = document.getElementById('scene-canvas');
const scene = createScene(canvas);

/* ============ Custom cursor ============ */
const cursorDot = document.getElementById('cursor-dot');
const cursorRing = document.getElementById('cursor-ring');
let mx = window.innerWidth / 2, my = window.innerHeight / 2, rx = mx, ry = my;
window.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; });
(function cursorLoop() {
  rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
  cursorDot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
  cursorRing.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
  requestAnimationFrame(cursorLoop);
})();
function bindHover(els) {
  els.forEach((el) => {
    el.addEventListener('mouseenter', () => document.body.classList.add('hovering'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('hovering'));
  });
}
bindHover(document.querySelectorAll('[data-hover]'));

/* ============ Nav ============ */
const nav = document.getElementById('nav');
ScrollTrigger.create({ start: 80, onUpdate: (self) => nav.classList.toggle('scrolled', self.scroll() > 80) });
const burger = document.getElementById('burger');
const mobileNav = document.getElementById('mobile-nav');
burger.addEventListener('click', () => mobileNav.classList.toggle('open'));
mobileNav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => mobileNav.classList.remove('open')));
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) { e.preventDefault(); lenis.scrollTo(target, { duration: 1.4 }); }
  });
});
document.getElementById('to-top').addEventListener('click', () => lenis.scrollTo(0, { duration: 1.4 }));

/* ============ Cinematic scroll camera ============ */
const acts = gsap.utils.toArray('.act');
ScrollTrigger.create({
  trigger: '#cinematic', start: 'top top', end: 'bottom top', scrub: true,
  onUpdate: (self) => {
    scene.setProgress(self.progress);
    const seg = 1 / acts.length;
    acts.forEach((act, i) => {
      const center = i * seg + seg / 2;
      const visibility = gsap.utils.clamp(0, 1, 1 - Math.abs(self.progress - center) / (seg * 0.6));
      gsap.to(act, { opacity: visibility, y: 24 * (1 - visibility), duration: 0.2, overwrite: 'auto' });
    });
    const cue = document.querySelector('.scroll-cue');
    if (cue) cue.style.opacity = self.progress < 0.04 ? 1 : 0;
  },
});

/* ============ Reveal-on-scroll (réutilisable) ============ */
function initReveal(els) {
  els.forEach((el) => ScrollTrigger.create({ trigger: el, start: 'top 88%', onEnter: () => el.classList.add('in') }));
}
initReveal(document.querySelectorAll('.reveal'));

/* ============ Tilt cards ============ */
function bindTilt(cards) {
  cards.forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(card, { rotateY: px * 12, rotateX: -py * 12, duration: 0.4, ease: 'power2.out' });
    });
    card.addEventListener('mouseleave', () => gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.6, ease: 'power3.out' }));
  });
}
bindTilt(document.querySelectorAll('[data-tilt]'));
bindHover(teamGrid.querySelectorAll('[data-hover]'));

/* ============ Stats count-up ============ */
document.querySelectorAll('.stat-number').forEach((el) => {
  const target = parseInt(el.dataset.count, 10);
  ScrollTrigger.create({
    trigger: el, start: 'top 85%', once: true,
    onEnter: () => gsap.to(el, {
      textContent: target, duration: 1.6, ease: 'power2.out', snap: { textContent: 1 },
      onUpdate: () => { el.textContent = Math.round(gsap.getProperty(el, 'textContent')); },
    }),
  });
});

/* ============ Contact form -> mailto ============ */
document.getElementById('contact-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const d = new FormData(e.target);
  const subject = encodeURIComponent(`Projet — ${d.get('subject') || 'Demande de contact'}`);
  const body = encodeURIComponent(`Nom: ${d.get('name')}\nEmail: ${d.get('email')}\n\n${d.get('message')}`);
  window.location.href = `mailto:arthur50dervaux@gmail.com?subject=${subject}&body=${body}`;
});

/* ============ Intro ============ */
function playIntro() {
  gsap.fromTo('.act-0', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.4, ease: 'power2.out' });
}

/* ============ 3D model viewer + outils ============ */
const viewerEl = document.getElementById('model-viewer');
if (viewerEl) {
  const viewer = createViewer(viewerEl);
  const setActive = (group, el) => { viewerEl.querySelectorAll(group).forEach((b) => b.classList.remove('active')); el.classList.add('active'); };
  viewerEl.querySelector('[data-viewer-rotate]')?.addEventListener('click', viewer.toggleRotate);
  viewerEl.querySelector('[data-viewer-reset]')?.addEventListener('click', viewer.reset);
  viewerEl.querySelector('[data-viewer-full]')?.addEventListener('click', viewer.fullscreen);
  viewerEl.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => { viewer.setView(b.dataset.view); setActive('[data-view]', b); }));
  viewerEl.querySelectorAll('[data-mat]').forEach((b) => b.addEventListener('click', () => { viewer.setMaterial(b.dataset.mat); setActive('[data-mat]', b); }));
  viewerEl.querySelector('[data-viewer-sun]')?.addEventListener('input', (e) => viewer.setSun(parseFloat(e.target.value)));
}

/* ============ Film lightbox ============ */
const filmModal = document.getElementById('film-modal');
const filmVideo = filmModal.querySelector('.film-video');
function openFilm(src, poster) {
  fetch(src, { method: 'HEAD' })
    .then((res) => {
      if (res.ok) { filmVideo.src = src; if (poster) filmVideo.poster = poster; filmModal.classList.add('has-video'); filmVideo.play().catch(() => {}); }
      else { filmVideo.removeAttribute('src'); filmModal.classList.remove('has-video'); }
    })
    .catch(() => { filmVideo.removeAttribute('src'); filmModal.classList.remove('has-video'); });
  filmModal.classList.add('open');
}
function closeFilm() { filmModal.classList.remove('open'); filmVideo.pause(); filmVideo.removeAttribute('src'); filmVideo.load(); }
document.querySelectorAll('[data-film]').forEach((el) => el.addEventListener('click', () => openFilm(el.dataset.film, el.dataset.poster || '')));
filmModal.querySelectorAll('[data-film-close]').forEach((el) => el.addEventListener('click', closeFilm));
document.querySelectorAll('[data-poster]').forEach((el) => {
  if (!el.dataset.poster) return;
  (el.querySelector('.film-poster') || el).style.backgroundImage = `url("${el.dataset.poster}")`;
});

/* ============ Global keys ============ */
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') { modal.classList.remove('open'); closeFilm(); } });
window.addEventListener('resize', () => scene.resize());
