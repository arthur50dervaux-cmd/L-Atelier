import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { createScene } from './scene.js';
import { createViewer } from './viewer.js';
import {
  loadContent, isPreview, applyTheme,
  visualBackground, visualClass, visualUrl,
} from './content.js';

gsap.registerPlugin(ScrollTrigger);

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const brize = (s) => esc(s).replace(/\n/g, '<br/>');

/* ============ Loader (démarre immédiatement, attend le contenu) ============ */
const loader = document.getElementById('loader');
const loaderProgress = document.getElementById('loader-progress');
let loaderDone = false;
let contentReady = false;
let progress = 0;
const loaderInterval = setInterval(() => {
  progress = Math.min(progress + Math.random() * 16, contentReady ? 100 : 88);
  loaderProgress.style.width = `${progress}%`;
  if (progress >= 100) {
    clearInterval(loaderInterval);
    setTimeout(() => {
      loader.classList.add('hidden');
      loaderDone = true;
      gsap.fromTo('.act-0', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.4, ease: 'power2.out' });
    }, 350);
  }
}, 140);

init().catch((err) => {
  console.error(err);
  document.querySelector('.loader-label').textContent =
    'Impossible de charger le contenu du site (content/site.json).';
});

async function init() {
  const content = await loadContent();
  contentReady = true;

  const C = content;
  const email = C.contact?.email || '';
  const bg = (v) => visualBackground(C, v);

  /* ---------- Meta, thème, marque ---------- */
  applyTheme(C.theme);
  if (C.meta?.title) document.title = C.meta.title;
  if (C.meta?.description) document.querySelector('meta[name="description"]')?.setAttribute('content', C.meta.description);
  if (C.theme?.azurDeep) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', C.theme.azurDeep);
  document.querySelectorAll('[data-bind="brand"], [data-bind="detail-brand"]').forEach((el) => { el.textContent = C.brand?.name || "L'Atelier"; });
  document.querySelectorAll('[data-bind="loader-mark"], [data-bind="footer-mark"]').forEach((el) => { el.textContent = C.brand?.mark || "L'A."; });
  const loaderLabel = document.querySelector('[data-bind="loader-label"]');
  if (loaderLabel) loaderLabel.textContent = C.brand?.loaderLabel || '';
  document.getElementById('year').textContent = new Date().getFullYear();
  document.getElementById('footer-text').textContent = C.footer?.text || '';
  if (isPreview()) document.getElementById('preview-banner').hidden = false;

  /* ---------- Sections : visibilité + têtes + navigation ---------- */
  const sections = C.sections || {};
  const navLinks = document.getElementById('nav-links');
  const mobileNav = document.getElementById('mobile-nav');
  Object.entries(sections).forEach(([id, cfg]) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (cfg.visible === false) { el.style.display = 'none'; return; }
    const head = el.querySelector(`[data-head="${id}"]`);
    if (head) {
      head.innerHTML = `
        ${cfg.eyebrow ? `<p class="eyebrow">${esc(cfg.eyebrow)}</p>` : ''}
        ${cfg.title ? `<h2>${brize(cfg.title)}</h2>` : ''}
        ${cfg.sub ? `<p class="section-sub">${esc(cfg.sub)}</p>` : ''}`;
    }
    if (cfg.navLabel) {
      navLinks.insertAdjacentHTML('beforeend', `<a href="#${id}" data-hover>${esc(cfg.navLabel)}</a>`);
      mobileNav.insertAdjacentHTML('beforeend', `<a href="#${id}" data-hover>${esc(cfg.navLabel)}</a>`);
    }
  });

  /* ---------- Hero cinématique ---------- */
  const actsWrap = document.getElementById('hero-acts');
  actsWrap.outerHTML = (C.hero?.acts || []).map((a, i) => `
    <div class="act act-${i}">
      ${a.eyebrow ? `<p class="eyebrow">${esc(a.eyebrow)}</p>` : ''}
      ${a.size === 'big'
        ? `<h1 class="${a.signature ? 'signature' : ''}">${brize(a.title)}</h1>`
        : `<h2 class="${a.signature ? 'signature' : ''}">${brize(a.title)}</h2>`}
      ${a.role ? `<p class="role">${esc(a.role)}</p>` : ''}
    </div>`).join('');
  const cueLabel = document.querySelector('[data-bind="scroll-cue"]');
  if (cueLabel) cueLabel.textContent = C.hero?.scrollCue || '';

  /* ---------- Manifeste ---------- */
  const manifesto = document.querySelector('[data-bind="manifesto"]');
  if (C.manifesto) manifesto.innerHTML = brize(C.manifesto);
  else document.getElementById('intro').style.display = 'none';

  /* ---------- Agence ---------- */
  const A = C.agence || {};
  document.getElementById('agence-eyebrow').textContent = A.eyebrow || '';
  document.getElementById('agence-title').innerHTML = brize(A.title || '');
  document.getElementById('agence-paragraphs').innerHTML =
    (A.paragraphs || []).map((p) => `<p class="reveal">${esc(p)}</p>`).join('');
  document.getElementById('agence-timeline').innerHTML =
    (A.timeline || []).map((t) => `<li><span class="timeline-year">${esc(t.label)}</span><span>${esc(t.text)}</span></li>`).join('');
  const portrait = document.getElementById('agence-portrait');
  const portraitBg = bg(A.portraitImage);
  if (portraitBg) { portrait.style.backgroundImage = portraitBg; portrait.style.backgroundSize = 'cover'; portrait.style.backgroundPosition = 'center'; }
  document.getElementById('agence-initials').textContent = A.portraitInitials || '';
  document.getElementById('agence-caption').textContent = A.portraitCaption || '';

  /* ---------- Expertise ---------- */
  document.getElementById('services-grid').innerHTML = (C.expertise || []).map((s) => `
    <article class="service reveal" data-tilt data-accent="${esc(s.accent)}">
      <span class="service-num">${esc(s.num)}</span><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p>
    </article>`).join('');

  /* ---------- Conception : projets par état ---------- */
  const projectGrid = document.getElementById('project-grid');
  const projectTabs = document.getElementById('project-tabs');
  const tabDefs = C.projects?.tabs || [];
  projectTabs.innerHTML = tabDefs.map((t, i) =>
    `<button class="tab ${i === 0 ? 'active' : ''}" data-tab="${esc(t.id)}" data-hover>${esc(t.label)}</button>`).join('');

  function renderProjects(state) {
    const list = C.projects?.[state] || [];
    projectGrid.innerHTML = list.map((p, i) => {
      let badge = '';
      if (state === 'concours' && p.status) badge = `<span class="card-badge">${esc(p.status)}</span>`;
      else if (state === 'avenir' && p.year) badge = `<span class="card-badge soft">${esc(p.year)}</span>`;
      else if (state === 'termines' && p.year) badge = `<span class="card-badge soft">Livré ${esc(p.year)}</span>`;
      const progressBar = state === 'encours' && p.progress != null
        ? `<div class="progress"><div class="progress-bar" style="width:${Number(p.progress) || 0}%"></div></div>
           <p class="progress-label">${esc(p.phase || '')} · ${Number(p.progress) || 0}%</p>` : '';
      const meta = p.year ? `${p.place} — ${p.year}` : p.place;
      return `<article class="project-card reveal" data-hover data-i="${i}">
          <div class="project-visual ${visualClass(p.image)}" style="background-image:${bg(p.image)}">${badge}</div>
          <div class="project-meta"><h3>${esc(p.title)}</h3><p>${esc(meta)}</p>${progressBar}</div>
        </article>`;
    }).join('');
    projectGrid.querySelectorAll('.project-card').forEach((card) => {
      const p = list[parseInt(card.dataset.i, 10)];
      card.addEventListener('click', () => openItemModal({
        title: p.title, place: p.year ? `${p.place} — ${p.year}` : p.place, desc: p.desc, image: p.image,
      }));
      bindHover([card]);
    });
    initReveal(projectGrid.querySelectorAll('.reveal'));
  }
  projectTabs.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
    projectTabs.querySelectorAll('.tab').forEach((b) => b.classList.remove('active'));
    t.classList.add('active');
    renderProjects(t.dataset.tab);
  }));

  /* ---------- Immobilier ---------- */
  const properties = C.properties || [];
  const propertyGrid = document.getElementById('property-grid');
  const propertyFiltersEl = document.getElementById('property-filters');
  const types = [...new Set(properties.map((b) => b.type).filter(Boolean))];
  propertyFiltersEl.innerHTML = [`<button class="filter-btn active" data-filter="all" data-hover>Tous</button>`]
    .concat(types.map((t) => `<button class="filter-btn" data-filter="${esc(t)}" data-hover>${esc(t)}s</button>`)).join('');

  const statusClass = (s) => s === 'Vendu' ? 'sold' : s === 'Sous compromis' ? 'pending' : 'sale';
  propertyGrid.innerHTML = properties.map((b, i) => `
    <article class="property-card reveal" data-hover data-type="${esc(b.type)}" data-i="${i}">
      <div class="property-visual ${visualClass(b.image)}" style="background-image:${bg(b.image)}">
        <span class="status-badge ${statusClass(b.status)}">${esc(b.status)}</span>
        <span class="property-type">${esc(b.type)}</span>
      </div>
      <div class="property-meta">
        <h3>${esc(b.title)}</h3>
        <p class="property-place">${esc(b.place)}</p>
        <div class="property-specs">
          <span>${esc(b.surface)} m²</span><span>${esc(b.rooms)} pièces</span><span>${esc(b.beds)} ch.</span>
        </div>
        <p class="property-price">${esc(b.price)}</p>
      </div>
    </article>`).join('');
  propertyGrid.querySelectorAll('.property-card').forEach((c) => {
    c.addEventListener('click', () => openDetail(properties[parseInt(c.dataset.i, 10)]));
    bindHover([c]);
  });
  propertyFiltersEl.querySelectorAll('.filter-btn').forEach((btn) => btn.addEventListener('click', () => {
    propertyFiltersEl.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const f = btn.dataset.filter;
    propertyGrid.querySelectorAll('.property-card').forEach((card) => {
      const match = f === 'all' || card.dataset.type === f;
      if (match) { card.classList.remove('hide'); gsap.fromTo(card, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5 }); }
      else card.classList.add('hide');
    });
  }));

  /* ---- Page détail d'un bien (façon Kretz) ---- */
  const detail = document.getElementById('property-detail');
  const dq = (s) => detail.querySelector(s);
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
      <span class="spec"><strong>${esc(b.surface)} m²</strong>Surface</span>
      <span class="spec"><strong>${esc(b.rooms)}</strong>Pièces</span>
      <span class="spec"><strong>${esc(b.beds)}</strong>Chambres</span>
      <span class="spec"><strong>${esc(b.baths)}</strong>Salles de bain</span>`;
    dq('[data-detail-features]').innerHTML = (b.features || []).map((f) => `<li>${esc(f)}</li>`).join('');

    const gallery = b.gallery?.length ? b.gallery : [b.image];
    const setMain = (v) => {
      const main = dq('[data-detail-main]');
      main.className = `detail-main ${visualClass(v)}`;
      main.style.backgroundImage = bg(v);
    };
    setMain(gallery[0]);
    dq('[data-detail-thumbs]').innerHTML = gallery.map((v, i) =>
      `<button class="detail-thumb ${visualClass(v)}${i === 0 ? ' active' : ''}" data-i="${i}" data-hover style="background-image:${bg(v)}"></button>`
    ).join('');
    dq('[data-detail-thumbs]').querySelectorAll('.detail-thumb').forEach((t) => {
      t.addEventListener('click', () => {
        dq('[data-detail-thumbs]').querySelectorAll('.detail-thumb').forEach((x) => x.classList.remove('active'));
        t.classList.add('active');
        setMain(gallery[parseInt(t.dataset.i, 10)]);
      });
    });

    const videoBtn = dq('[data-detail-video]');
    if (b.video) { videoBtn.hidden = false; videoBtn.onclick = () => openFilm(b.video); }
    else videoBtn.hidden = true;

    dq('[data-detail-map]').href = `https://www.google.com/maps/search/${encodeURIComponent(b.map || b.place)}`;
    const mailBody = encodeURIComponent(`Bonjour,\n\nJe souhaite organiser une visite du bien « ${b.title} » (Réf. ${b.ref}).\n\nMerci.`);
    dq('[data-detail-mail]').href = `mailto:${email}?subject=${encodeURIComponent('Visite — ' + b.title + ' (' + b.ref + ')')}&body=${mailBody}`;

    detail.classList.add('open');
    document.body.classList.add('detail-open');
    detail.querySelector('.detail-scroll').scrollTop = 0;
  }
  function closeDetail() { detail.classList.remove('open'); document.body.classList.remove('detail-open'); }
  detail.querySelectorAll('[data-detail-close]').forEach((el) => el.addEventListener('click', closeDetail));

  /* ---------- Modale générique (projets, mobilier) ---------- */
  const modal = document.getElementById('modal');
  const modalSpecs = modal.querySelector('.modal-specs');
  function openItemModal({ title, place, desc, image, specs }) {
    modal.querySelector('.modal-title').textContent = title || '';
    modal.querySelector('.modal-place').textContent = place || '';
    modal.querySelector('.modal-desc').textContent = desc || '';
    const visual = modal.querySelector('.modal-visual');
    visual.className = `modal-visual ${visualClass(image)}`;
    visual.style.backgroundImage = bg(image);
    if (specs?.length) {
      modalSpecs.innerHTML = specs.map((s) => `<span class="spec"><strong>${esc(s.value)}</strong>${esc(s.label)}</span>`).join('');
      modalSpecs.style.display = '';
    } else modalSpecs.style.display = 'none';
    modal.classList.add('open');
  }
  modal.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', () => modal.classList.remove('open')));

  /* ---------- Films ---------- */
  const showreel = C.films?.showreel;
  const showreelEl = document.getElementById('film-showreel');
  if (showreel) {
    const poster = showreelEl.querySelector('.film-poster');
    poster.className = `film-poster ${visualClass(showreel.image)}`;
    poster.style.backgroundImage = bg(showreel.image);
    document.getElementById('showreel-label').textContent = showreel.label || '';
    showreelEl.addEventListener('click', () => openFilm(showreel.file));
  } else showreelEl.closest('.film-feature').style.display = 'none';
  document.getElementById('film-grid').innerHTML = (C.films?.items || []).map((f, i) => `
    <button class="film-thumb reveal ${visualClass(f.image)}" data-i="${i}" data-hover style="background-image:${bg(f.image)}">
      <span class="film-thumb-label">${esc(f.label)}</span>
    </button>`).join('');
  document.getElementById('film-grid').querySelectorAll('.film-thumb').forEach((el) => {
    el.addEventListener('click', () => openFilm((C.films.items[parseInt(el.dataset.i, 10)] || {}).file));
  });

  /* ---------- Cinématographique ---------- */
  const cinema = C.cinema || [];
  const cinemaGrid = document.getElementById('cinema-grid');
  cinemaGrid.innerHTML = cinema.map((c, i) => `
    <article class="cinema-card reveal ${visualClass(c.image)}" data-hover data-i="${i}" data-type="${esc(c.type)}" style="background-image:${bg(c.image)}">
      <span class="cinema-card-play">${c.type === 'Film' ? '▶' : '◎'}</span>
      <span class="cinema-card-type">${esc(c.category)}</span>
      <h3>${esc(c.title)}</h3>
      <span class="cinema-card-meta">${esc(c.place)}</span>
    </article>`).join('');
  cinemaGrid.querySelectorAll('.cinema-card').forEach((card) => {
    card.addEventListener('click', () => {
      const item = cinema[parseInt(card.dataset.i, 10)];
      if (item.type === 'Film') openFilm(item.video);
      else openPhoto(item.image, `${item.title} — ${item.category}`);
    });
    bindHover([card]);
  });
  const cinemaFilters = document.querySelectorAll('#cinema-filters .filter-btn');
  cinemaFilters.forEach((btn) => btn.addEventListener('click', () => {
    cinemaFilters.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const f = btn.dataset.filter;
    cinemaGrid.querySelectorAll('.cinema-card').forEach((card) => {
      card.style.display = (f === 'all' || card.dataset.type === f) ? '' : 'none';
    });
  }));

  /* ---------- Mobilier & design ---------- */
  const furniture = C.furniture || [];
  const furnitureGrid = document.getElementById('furniture-grid');
  const furnitureFiltersEl = document.getElementById('furniture-filters');
  const categories = [...new Set(furniture.map((f) => f.category).filter(Boolean))];
  furnitureFiltersEl.innerHTML = [`<button class="filter-btn active" data-filter="all" data-hover>Tout</button>`]
    .concat(categories.map((c) => `<button class="filter-btn" data-filter="${esc(c)}" data-hover>${esc(c)}s</button>`)).join('');
  furnitureGrid.innerHTML = furniture.map((f, i) => `
    <article class="furniture-card reveal" data-hover data-category="${esc(f.category)}" data-i="${i}">
      <div class="furniture-visual ${visualClass(f.image)}" style="background-image:${bg(f.image)}"><span class="furniture-edition">${esc(f.edition)}</span></div>
      <div class="furniture-meta">
        <p class="furniture-category">${esc(f.category)}</p>
        <h3>${esc(f.name)}</h3>
        <p class="furniture-material">${esc(f.material)}</p>
      </div>
    </article>`).join('');
  furnitureGrid.querySelectorAll('.furniture-card').forEach((card) => {
    card.addEventListener('click', () => {
      const f = furniture[parseInt(card.dataset.i, 10)];
      openItemModal({
        title: f.name, place: `${f.category} — ${f.edition}`, desc: f.desc, image: f.image,
        specs: [
          { value: f.material, label: 'Matière' },
          { value: f.dimensions, label: 'Dimensions' },
          { value: f.price, label: 'Prix' },
        ],
      });
    });
    bindHover([card]);
  });
  furnitureFiltersEl.querySelectorAll('.filter-btn').forEach((btn) => btn.addEventListener('click', () => {
    furnitureFiltersEl.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const f = btn.dataset.filter;
    furnitureGrid.querySelectorAll('.furniture-card').forEach((card) => {
      const match = f === 'all' || card.dataset.category === f;
      if (match) { card.classList.remove('hide'); gsap.fromTo(card, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5 }); }
      else card.classList.add('hide');
    });
  }));

  /* ---------- Équipe ---------- */
  document.getElementById('team-grid').innerHTML = (C.team || []).map((m) => `
    <article class="team-card reveal" data-tilt>
      <div class="team-avatar" ${m.photo ? `style="background-image:${bg(m.photo)};background-size:cover;background-position:center"` : ''}>${m.photo ? '' : esc(m.initials)}</div>
      <h3>${esc(m.name)}</h3>
      <p class="team-role">${esc(m.role)}</p>
      <p class="team-bio">${esc(m.bio)}</p>
    </article>`).join('');

  /* ---------- Approche / piliers ---------- */
  document.getElementById('pillars-grid').innerHTML = (C.philosophy || []).map((p) => `
    <div class="pillar reveal" data-tilt data-accent="${esc(p.accent)}">
      <span class="pillar-index">${esc(p.index)}</span><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p>
    </div>`).join('');

  /* ---------- Stats ---------- */
  document.getElementById('stats-grid').innerHTML = (C.stats || []).map((s) => `
    <div class="stat reveal">
      <span class="stat-number" data-count="${Number(s.value) || 0}">0</span>
      ${s.suffix ? `<span class="stat-suffix">${esc(s.suffix)}</span>` : ''}
      <p>${esc(s.label)}</p>
    </div>`).join('');

  /* ---------- Contact ---------- */
  const CT = C.contact || {};
  document.getElementById('contact-eyebrow').textContent = sections.contact?.eyebrow || 'Contact';
  document.getElementById('contact-title').innerHTML = brize(CT.title || '');
  document.getElementById('contact-info').innerHTML = (CT.lines || []).map((l) => `
    <li><span>${esc(l.label)}</span>${l.link ? `<a href="${esc(l.link)}" data-hover>${esc(l.value)}</a>` : `<a data-hover>${esc(l.value)}</a>`}</li>`).join('');
  document.getElementById('contact-note').textContent = CT.formNote || '';
  document.getElementById('contact-submit').textContent = CT.submitLabel || 'Envoyer';
  document.getElementById('contact-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const d = new FormData(e.target);
    const subject = encodeURIComponent(`Projet — ${d.get('subject') || 'Demande de contact'}`);
    const body = encodeURIComponent(`Nom: ${d.get('name')}\nEmail: ${d.get('email')}\n\n${d.get('message')}`);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  });

  /* ============ Défilement fluide ============ */
  const lenis = new Lenis({ smoothWheel: true, duration: 1.1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  /* ============ Scène 3D d'arrière-plan ============ */
  const canvas = document.getElementById('scene-canvas');
  const scene = createScene(canvas);

  /* ============ Curseur personnalisé ============ */
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

  /* ============ Navigation ============ */
  const nav = document.getElementById('nav');
  ScrollTrigger.create({ start: 80, onUpdate: (self) => nav.classList.toggle('scrolled', self.scroll() > 80) });
  const burger = document.getElementById('burger');
  burger.addEventListener('click', () => mobileNav.classList.toggle('open'));
  mobileNav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => mobileNav.classList.remove('open')));
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) { e.preventDefault(); lenis.scrollTo(target, { duration: 1.4 }); }
    });
  });
  document.getElementById('to-top').addEventListener('click', () => lenis.scrollTo(0, { duration: 1.4 }));

  /* ============ Caméra du hero pilotée au scroll ============ */
  const acts = gsap.utils.toArray('.act');
  ScrollTrigger.create({
    trigger: '#cinematic', start: 'top top', end: 'bottom top', scrub: true,
    onUpdate: (self) => {
      scene.setProgress(self.progress);
      const seg = 1 / Math.max(acts.length, 1);
      acts.forEach((act, i) => {
        const center = i * seg + seg / 2;
        const visibility = gsap.utils.clamp(0, 1, 1 - Math.abs(self.progress - center) / (seg * 0.6));
        gsap.to(act, { opacity: visibility, y: 24 * (1 - visibility), duration: 0.2, overwrite: 'auto' });
      });
      const cue = document.querySelector('.scroll-cue');
      if (cue) cue.style.opacity = self.progress < 0.04 ? 1 : 0;
    },
  });

  /* ============ Apparition au scroll ============ */
  function initReveal(els) {
    els.forEach((el) => ScrollTrigger.create({ trigger: el, start: 'top 88%', onEnter: () => el.classList.add('in') }));
  }
  initReveal(document.querySelectorAll('.reveal'));

  /* ============ Cartes inclinables ============ */
  document.querySelectorAll('[data-tilt]').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(card, { rotateY: px * 12, rotateX: -py * 12, duration: 0.4, ease: 'power2.out' });
    });
    card.addEventListener('mouseleave', () => gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.6, ease: 'power3.out' }));
  });

  /* ============ Compteurs ============ */
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

  /* ============ Rendu initial des projets ============ */
  renderProjects(tabDefs[0]?.id || 'avenir');

  /* ============ Visualiseur de maquette + cinématique ============ */
  const viewerEl = document.getElementById('model-viewer');
  const models = C.maquette?.models || [];
  const modelUrl = (m) => visualUrl(C, m?.file) || m?.file || '';
  if (viewerEl) {
    const viewer = createViewer(viewerEl, { modelUrl: modelUrl(models[0]) });
    const setActive = (group, el) => { viewerEl.querySelectorAll(group).forEach((b) => b.classList.remove('active')); el.classList.add('active'); };
    viewerEl.querySelector('[data-viewer-rotate]')?.addEventListener('click', viewer.toggleRotate);
    viewerEl.querySelector('[data-viewer-reset]')?.addEventListener('click', viewer.reset);
    viewerEl.querySelector('[data-viewer-full]')?.addEventListener('click', viewer.fullscreen);
    viewerEl.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => { viewer.setView(b.dataset.view); setActive('[data-view]', b); }));
    viewerEl.querySelectorAll('[data-mat]').forEach((b) => b.addEventListener('click', () => { viewer.setMaterial(b.dataset.mat); setActive('[data-mat]', b); }));
    viewerEl.querySelector('[data-viewer-sun]')?.addEventListener('input', (e) => viewer.setSun(parseFloat(e.target.value)));

    // Sélecteur de maquettes
    const modelTabs = document.getElementById('model-tabs');
    if (models.length > 1) {
      modelTabs.innerHTML = models.map((m, i) =>
        `<button class="model-tab ${i === 0 ? 'active' : ''}" data-i="${i}" data-hover>${esc(m.name || `Maquette ${i + 1}`)}</button>`).join('');
      modelTabs.querySelectorAll('.model-tab').forEach((b) => {
        b.addEventListener('click', () => {
          modelTabs.querySelectorAll('.model-tab').forEach((x) => x.classList.remove('active'));
          b.classList.add('active');
          stopCinematic();
          viewer.load(modelUrl(models[parseInt(b.dataset.i, 10)]));
        });
        bindHover([b]);
      });
    }

    // Mode cinématique
    const cineBtn = viewerEl.querySelector('[data-viewer-cinematic]');
    const cineStop = viewerEl.querySelector('[data-cine-stop]');
    const cineCaption = viewerEl.querySelector('[data-cine-caption]');
    const duration = Number(C.maquette?.cinematic?.duration) || 30;
    function startCinematic() {
      const active = modelTabs.querySelector('.model-tab.active');
      const name = models[parseInt(active?.dataset.i ?? 0, 10)]?.name || models[0]?.name || '';
      cineCaption.textContent = name ? `${name} — cinématique` : 'Cinématique';
      viewerEl.classList.add('cine');
      cineStop.hidden = false;
      viewer.startCinematic({ duration });
    }
    function stopCinematic() {
      if (!viewerEl.classList.contains('cine')) return;
      viewerEl.classList.remove('cine');
      cineStop.hidden = true;
      viewer.stopCinematic();
    }
    cineBtn?.addEventListener('click', startCinematic);
    cineStop?.addEventListener('click', stopCinematic);
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') stopCinematic(); });
  }

  /* ============ Lecteur de films ============ */
  const filmModal = document.getElementById('film-modal');
  const filmVideo = filmModal.querySelector('.film-video');
  function openFilm(src) {
    const url = visualUrl(C, src);
    filmModal.classList.add('open');
    if (!url) { filmVideo.removeAttribute('src'); filmModal.classList.remove('has-video'); return; }
    if (url.startsWith('data:') || url.startsWith('http')) {
      filmVideo.src = url; filmModal.classList.add('has-video'); filmVideo.play().catch(() => {});
      return;
    }
    fetch(url, { method: 'HEAD' })
      .then((res) => {
        if (res.ok) { filmVideo.src = url; filmModal.classList.add('has-video'); filmVideo.play().catch(() => {}); }
        else { filmVideo.removeAttribute('src'); filmModal.classList.remove('has-video'); }
      })
      .catch(() => { filmVideo.removeAttribute('src'); filmModal.classList.remove('has-video'); });
  }
  function closeFilm() { filmModal.classList.remove('open'); filmVideo.pause(); filmVideo.removeAttribute('src'); filmVideo.load(); }
  filmModal.querySelectorAll('[data-film-close]').forEach((el) => el.addEventListener('click', closeFilm));

  /* ============ Visionneuse photo ============ */
  const photoModal = document.getElementById('photo-modal');
  function openPhoto(source, caption) {
    const photo = visualUrl(C, source);
    const img = photoModal.querySelector('.photo-modal-img');
    if (photo) { img.src = photo; img.alt = caption; }
    else img.removeAttribute('src');
    photoModal.querySelector('.photo-modal-caption').textContent = caption;
    photoModal.classList.add('open');
  }
  function closePhoto() { photoModal.classList.remove('open'); }
  photoModal.querySelectorAll('[data-photo-close]').forEach((el) => el.addEventListener('click', closePhoto));

  /* ============ Touches globales ============ */
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { modal.classList.remove('open'); closeFilm(); closePhoto(); closeDetail(); }
  });
  window.addEventListener('resize', () => scene.resize());
}
