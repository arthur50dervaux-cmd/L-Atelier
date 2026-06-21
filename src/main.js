import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { createScene } from './scene.js';
import { createViewer } from './viewer.js';
import { projects, properties, team, cinema, furniture } from './data.js';

gsap.registerPlugin(ScrollTrigger);
document.getElementById('year').textContent = new Date().getFullYear();

/* ============ RENDER DYNAMIC CONTENT (avant les observers) ============ */
const esc = (s) => String(s).replace(/"/g, '&quot;');

/* ---- Photos réelles (Unsplash) posées en repli sur les dégradés "art-*" ----
 * Si une image ne charge pas, le dégradé d'origine reste visible en dessous :
 * aucune rupture visuelle. Remplacez simplement l'URL ci-dessous pour changer
 * une photo, ou déposez vos propres fichiers dans public/gallery/ (voir son README).
 */
const ART_GRADIENTS = {
  'art-sea': 'linear-gradient(160deg, #1a6f8a 0%, #2aa5c4 40%, #e0a04b 78%, #f4d28a 100%)',
  'art-vine': 'linear-gradient(160deg, #38491f 0%, #7a8a3c 45%, #c7a83f 80%, #e6d27a 100%)',
  'art-villa': 'linear-gradient(160deg, #1c2733 0%, #3a5266 40%, #7da0b4 75%, #d8e4ea 100%)',
  'art-cliff': 'linear-gradient(160deg, #3a2b20 0%, #a06a45 45%, #d99a65 72%, #1a8fb3 100%)',
  'art-interior': 'linear-gradient(160deg, #2a1f1a 0%, #7a4f2c 45%, #c08a52 80%, #e6cba3 100%)',
  'art-domaine': 'linear-gradient(160deg, #25321d 0%, #6b6b2c 40%, #c79a40 75%, #e0703f 100%)',
  'art-design': 'linear-gradient(160deg, #3a2418 0%, #8a5a35 45%, #d9a35c 78%, #efc878 100%)',
};
const ART_PHOTOS = {
  'art-sea': 'https://images.unsplash.com/photo-1505843513577-22bb7d21e455?auto=format&fit=crop&w=1600&q=80',
  'art-vine': 'https://images.unsplash.com/photo-1474919575373-9731559a8c5d?auto=format&fit=crop&w=1600&q=80',
  'art-villa': 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=80',
  'art-cliff': 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1600&q=80',
  'art-interior': 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80',
  'art-domaine': 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80',
  'art-design': 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1600&q=80',
};
function paintAllArt(root = document) {
  Object.keys(ART_PHOTOS).forEach((cls) => {
    root.querySelectorAll(`.${cls}`).forEach((el) => {
      el.style.backgroundImage = `url("${ART_PHOTOS[cls]}"), ${ART_GRADIENTS[cls]}`;
    });
  });
}

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
  paintAllArt(projectGrid);
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
  const cards = propertyGrid.querySelectorAll('.property-card');
  cards.forEach((c, i) => {
    c.addEventListener('click', () => openDetail(properties[i]));
    c.addEventListener('mouseenter', () => document.body.classList.add('hovering'));
    c.addEventListener('mouseleave', () => document.body.classList.remove('hovering'));
  });
  paintAllArt(propertyGrid);
  initReveal(propertyGrid.querySelectorAll('.reveal'));
}

/* ---- Page détail d'un bien (façon Kretz) ---- */
const detail = document.getElementById('property-detail');
const dq = (s) => detail.querySelector(s);
const visualBg = (v) => v.startsWith('art-') ? '' : `url("${v}")`;
const visualClass = (v) => v.startsWith('art-') ? v : '';

function openDetail(b) {
  dq('[data-detail-status]').textContent = `${b.status} · ${b.type}`;
  dq('[data-detail-title]').textContent = b.title;
  dq('[data-detail-place]').textContent = `${b.place} — ${b.region}`;
  dq('[data-detail-price]').textContent = b.price;
  dq('[data-detail-desc]').textContent = b.desc;
  dq('[data-detail-region]').textContent = `${b.place}, ${b.region}`;
  dq('[data-detail-ref]').textContent = `Réf. ${b.ref}`;
  dq('[data-detail-dpe]').textContent = b.dpe;
  dq('[data-detail-specs]').innerHTML = `
    <span class="spec"><strong>${b.surface} m²</strong>Surface</span>
    <span class="spec"><strong>${b.rooms}</strong>Pièces</span>
    <span class="spec"><strong>${b.beds}</strong>Chambres</span>
    <span class="spec"><strong>${b.baths}</strong>Salles de bain</span>`;
  dq('[data-detail-features]').innerHTML = b.features.map((f) => `<li>${f}</li>`).join('');

  // Galerie principale + miniatures
  const setMain = (v) => {
    const main = dq('[data-detail-main]');
    main.className = `detail-main ${visualClass(v)}`;
    main.style.backgroundImage = visualBg(v);
  };
  setMain(b.gallery[0]);
  dq('[data-detail-thumbs]').innerHTML = b.gallery.map((v, i) =>
    `<button class="detail-thumb ${visualClass(v)}${i === 0 ? ' active' : ''}" data-i="${i}" data-hover style="background-image:${visualBg(v)}"></button>`
  ).join('');
  dq('[data-detail-thumbs]').querySelectorAll('.detail-thumb').forEach((t) => {
    t.addEventListener('click', () => {
      dq('[data-detail-thumbs]').querySelectorAll('.detail-thumb').forEach((x) => x.classList.remove('active'));
      t.classList.add('active');
      setMain(b.gallery[parseInt(t.dataset.i, 10)]);
    });
  });
  paintAllArt(detail);

  // Bouton film
  const videoBtn = dq('[data-detail-video]');
  if (b.video) { videoBtn.hidden = false; videoBtn.onclick = () => openFilm(b.video, ''); }
  else videoBtn.hidden = true;

  // Liens carte + contact
  dq('[data-detail-map]').href = `https://www.google.com/maps/search/${encodeURIComponent(b.map)}`;
  const mailBody = encodeURIComponent(`Bonjour,\n\nJe souhaite organiser une visite du bien « ${b.title} » (Réf. ${b.ref}).\n\nMerci.`);
  dq('[data-detail-mail]').href = `mailto:contact@latelier-architecture.com?subject=${encodeURIComponent('Visite — ' + b.title + ' (' + b.ref + ')')}&body=${mailBody}`;

  detail.classList.add('open');
  document.body.classList.add('detail-open');
  detail.querySelector('.detail-scroll').scrollTop = 0;
}
function closeDetail() { detail.classList.remove('open'); document.body.classList.remove('detail-open'); }
detail.querySelectorAll('[data-detail-close]').forEach((el) => el.addEventListener('click', closeDetail));

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
  paintAllArt(modal);
  modal.classList.add('open');
}

/* ---- Mobilier : modale détaillée ---- */
function openFurnitureModal(item) {
  modalTitle.textContent = item.name;
  modalPlace.textContent = `${item.category} — ${item.edition}`;
  modalDesc.textContent = item.desc;
  modalVisual.className = `modal-visual ${item.art}`;
  modalSpecs.innerHTML = `
    <span class="spec"><strong>${item.material}</strong>Matière</span>
    <span class="spec"><strong>${item.dimensions}</strong>Dimensions</span>
    <span class="spec"><strong>${item.price}</strong>Prix</span>`;
  modalSpecs.style.display = '';
  paintAllArt(modal);
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

/* ============ Cinématographique ============ */
const cinemaGrid = document.getElementById('cinema-grid');
function renderCinema() {
  cinemaGrid.innerHTML = cinema.map((c, i) => `
    <article class="cinema-card reveal ${c.cover}" data-hover data-i="${i}" data-type="${c.type}">
      <span class="cinema-card-play">${c.type === 'Film' ? '▶' : '◎'}</span>
      <span class="cinema-card-type">${c.category}</span>
      <h3>${c.title}</h3>
      <span class="cinema-card-meta">${c.place}</span>
    </article>`).join('');
  cinemaGrid.querySelectorAll('.cinema-card').forEach((card) => {
    card.addEventListener('click', () => {
      const item = cinema[parseInt(card.dataset.i, 10)];
      if (item.type === 'Film') openFilm(item.video, '');
      else openPhoto(item.cover, `${item.title} — ${item.category}`);
    });
    card.addEventListener('mouseenter', () => document.body.classList.add('hovering'));
    card.addEventListener('mouseleave', () => document.body.classList.remove('hovering'));
  });
  paintAllArt(cinemaGrid);
  initReveal(cinemaGrid.querySelectorAll('.reveal'));
}
const cinemaFilters = document.querySelectorAll('#cinema-filters .filter-btn');
cinemaFilters.forEach((btn) => btn.addEventListener('click', () => {
  cinemaFilters.forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  const f = btn.dataset.filter;
  cinemaGrid.querySelectorAll('.cinema-card').forEach((card) => {
    card.style.display = (f === 'all' || card.dataset.type === f) ? '' : 'none';
  });
}));

/* ============ Mobilier & design ============ */
const furnitureGrid = document.getElementById('furniture-grid');
function renderFurniture() {
  furnitureGrid.innerHTML = furniture.map((f, i) => `
    <article class="furniture-card reveal" data-hover data-category="${f.category}" data-i="${i}">
      <div class="furniture-visual ${f.art}"><span class="furniture-edition">${f.edition}</span></div>
      <div class="furniture-meta">
        <p class="furniture-category">${f.category}</p>
        <h3>${f.name}</h3>
        <p class="furniture-material">${f.material}</p>
      </div>
    </article>`).join('');
  furnitureGrid.querySelectorAll('.furniture-card').forEach((card) => {
    card.addEventListener('click', () => openFurnitureModal(furniture[parseInt(card.dataset.i, 10)]));
    card.addEventListener('mouseenter', () => document.body.classList.add('hovering'));
    card.addEventListener('mouseleave', () => document.body.classList.remove('hovering'));
  });
  paintAllArt(furnitureGrid);
  initReveal(furnitureGrid.querySelectorAll('.reveal'));
}
const furnitureFilters = document.querySelectorAll('#furniture-filters .filter-btn');
furnitureFilters.forEach((btn) => btn.addEventListener('click', () => {
  furnitureFilters.forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  const f = btn.dataset.filter;
  furnitureGrid.querySelectorAll('.furniture-card').forEach((card) => {
    const match = f === 'all' || card.dataset.category === f;
    if (match) { card.classList.remove('hide'); gsap.fromTo(card, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5 }); }
    else card.classList.add('hide');
  });
}));

/* ============ Initial renders ============ */
renderProjects('avenir');
renderProperties();
renderCinema();
renderFurniture();

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
  window.location.href = `mailto:contact@latelier-architecture.com?subject=${subject}&body=${body}`;
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

/* ============ Visionneuse photo (Cinématographique) ============ */
const photoModal = document.getElementById('photo-modal');
function openPhoto(source, caption) {
  const photo = source.startsWith('art-') ? ART_PHOTOS[source] : source;
  const img = photoModal.querySelector('.photo-modal-img');
  if (photo) { img.src = photo; img.alt = caption; }
  else img.removeAttribute('src');
  photoModal.querySelector('.photo-modal-caption').textContent = caption;
  photoModal.classList.add('open');
}
function closePhoto() { photoModal.classList.remove('open'); }
photoModal.querySelectorAll('[data-photo-close]').forEach((el) => el.addEventListener('click', closePhoto));

/* ============ Habillage photo des éléments statiques (hero films, agence) ============ */
paintAllArt();

/* ============ Global keys ============ */
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') { modal.classList.remove('open'); closeFilm(); closePhoto(); closeDetail(); } });
window.addEventListener('resize', () => scene.resize());
