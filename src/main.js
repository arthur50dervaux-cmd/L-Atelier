import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { createViewer } from './viewer.js';
import {
  loadContent, isPreview, applyTheme,
  visualBackground, visualUrl,
} from './content.js';

gsap.registerPlugin(ScrollTrigger);

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const brize = (s) => esc(s).replace(/\n/g, '<br/>');

/* ============ Voile de chargement (aucune animation d'intro) ============ */
const loader = document.getElementById('loader');

init().catch((err) => {
  console.error(err);
  loader.textContent = 'Impossible de charger le contenu du site.';
});

async function init() {
  const content = await loadContent();
  loader.classList.add('hidden');

  const C = content;
  const email = C.contact?.email || '';
  const bg = (v) => visualBackground(C, v);
  const visual = (v, cls = 'visual-bg') => `<div class="${cls}" style="background-image:${bg(v)}"></div>`;

  /* ---------- Meta, thème, marque ---------- */
  applyTheme(C.theme);
  if (C.meta?.title) document.title = C.meta.title;
  if (C.meta?.description) document.querySelector('meta[name="description"]')?.setAttribute('content', C.meta.description);
  if (C.theme?.bg) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', C.theme.bg);
  document.querySelectorAll('[data-bind="brand"], [data-bind="detail-brand"], [data-bind="overlay-brand"], [data-bind="footer-mark"]')
    .forEach((el) => { el.textContent = C.brand?.name || "L'Atelier"; });
  document.getElementById('year').textContent = new Date().getFullYear();
  document.getElementById('footer-text').textContent = C.footer?.text || '';
  if (isPreview()) document.getElementById('preview-banner').hidden = false;

  /* ---------- Sections : visibilité + têtes numérotées + navigation ---------- */
  const sections = C.sections || {};
  const navLinks = document.getElementById('nav-links');
  const overlayLinks = document.getElementById('overlay-links');
  let sectionIndex = 0;
  let navIndex = 0;
  Object.entries(sections).forEach(([id, cfg]) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (cfg.visible === false) { el.style.display = 'none'; return; }
    const head = el.querySelector(`[data-head="${id}"]`);
    if (head) {
      sectionIndex += 1;
      head.innerHTML = `
        <span class="section-index">${String(sectionIndex).padStart(2, '0')}</span>
        <div class="section-head-main">
          ${cfg.eyebrow ? `<p class="eyebrow">${esc(cfg.eyebrow)}</p>` : ''}
          ${cfg.title ? `<h2>${brize(cfg.title)}</h2>` : ''}
          ${cfg.sub ? `<p class="section-sub">${esc(cfg.sub)}</p>` : ''}
        </div>`;
    }
    if (cfg.navLabel) {
      navIndex += 1;
      navLinks.insertAdjacentHTML('beforeend', `<a href="#${id}">${esc(cfg.navLabel)}</a>`);
      overlayLinks.insertAdjacentHTML('beforeend',
        `<a href="#${id}"><span class="idx">${String(navIndex).padStart(2, '0')}</span>${esc(cfg.navLabel)}</a>`);
    }
  });
  document.getElementById('overlay-contact').textContent = email;

  /* ---------- Hero : une image fixe, un titre ---------- */
  // Rétro-compatibilité : si le contenu contient encore des « actes »
  // (ancien diaporama), le premier sert de hero.
  const legacyAct = C.hero?.acts?.[0];
  const hero = {
    eyebrow: C.hero?.eyebrow ?? legacyAct?.eyebrow ?? '',
    title: C.hero?.title ?? legacyAct?.title ?? '',
    role: C.hero?.role ?? legacyAct?.role ?? '',
    image: C.hero?.image ?? legacyAct?.image ?? 'art-sea',
  };
  document.getElementById('hero-image').style.backgroundImage = bg(hero.image);
  document.getElementById('hero-eyebrow').textContent = hero.eyebrow;
  document.getElementById('hero-title').innerHTML = brize(hero.title);
  document.getElementById('hero-role').textContent = hero.role;
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
  if (portraitBg) portrait.style.backgroundImage = portraitBg;
  document.getElementById('agence-initials').textContent = portraitBg ? '' : (A.portraitInitials || '');
  document.getElementById('agence-caption').textContent = A.portraitCaption || '';

  /* ---------- Expertise ---------- */
  document.getElementById('services-grid').innerHTML = (C.expertise || []).map((s) => `
    <article class="service reveal">
      <span class="service-num">${esc(s.num)}</span><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p>
    </article>`).join('');

  /* ---------- Conception : projets par état ---------- */
  const projectGrid = document.getElementById('project-grid');
  const projectTabs = document.getElementById('project-tabs');
  const tabDefs = C.projects?.tabs || [];
  projectTabs.innerHTML = tabDefs.map((t, i) =>
    `<button class="text-tab ${i === 0 ? 'active' : ''}" data-tab="${esc(t.id)}">${esc(t.label)}</button>`).join('');

  function renderProjects(state) {
    const list = C.projects?.[state] || [];
    projectGrid.innerHTML = list.map((p, i) => {
      let badge = '';
      if (state === 'concours' && p.status) badge = `<span class="card-badge strong">${esc(p.status)}</span>`;
      else if (state === 'avenir' && p.year) badge = `<span class="card-badge">${esc(p.year)}</span>`;
      else if (state === 'termines' && p.year) badge = `<span class="card-badge">Livré ${esc(p.year)}</span>`;
      const progressBar = state === 'encours' && p.progress != null
        ? `<div class="progress"><div class="progress-bar" style="width:${Number(p.progress) || 0}%"></div></div>
           <p class="progress-label">${esc(p.phase || '')} · ${Number(p.progress) || 0}%</p>` : '';
      return `<article class="project-card reveal" data-i="${i}">
          <div class="project-visual">${visual(p.image)}${badge}</div>
          <div class="project-meta">
            <p class="place">${esc(p.place)}${p.year ? ` — ${esc(p.year)}` : ''}</p>
            <h3>${esc(p.title)}</h3>
            ${progressBar}
          </div>
        </article>`;
    }).join('');
    projectGrid.querySelectorAll('.project-card').forEach((card) => {
      const p = list[parseInt(card.dataset.i, 10)];
      card.addEventListener('click', () => openItemModal({
        title: p.title, place: p.year ? `${p.place} — ${p.year}` : p.place, desc: p.desc, image: p.image,
      }));
    });
    initReveal(projectGrid.querySelectorAll('.reveal'));
  }
  projectTabs.querySelectorAll('.text-tab').forEach((t) => t.addEventListener('click', () => {
    projectTabs.querySelectorAll('.text-tab').forEach((b) => b.classList.remove('active'));
    t.classList.add('active');
    renderProjects(t.dataset.tab);
  }));

  /* ---------- Immobilier ---------- */
  const properties = C.properties || [];
  const propertyGrid = document.getElementById('property-grid');
  const propertyFiltersEl = document.getElementById('property-filters');
  const types = [...new Set(properties.map((b) => b.type).filter(Boolean))];
  propertyFiltersEl.innerHTML = [`<button class="text-tab active" data-filter="all">Tous</button>`]
    .concat(types.map((t) => `<button class="text-tab" data-filter="${esc(t)}">${esc(t)}s</button>`)).join('');

  const statusClass = (s) => s === 'Vendu' ? 'sold' : s === 'Sous compromis' ? 'pending' : 'sale';
  propertyGrid.innerHTML = properties.map((b, i) => `
    <article class="property-card reveal" data-type="${esc(b.type)}" data-i="${i}">
      <div class="property-visual">
        ${visual(b.image)}
        <span class="status-badge ${statusClass(b.status)}">${esc(b.status)}</span>
      </div>
      <div class="property-meta">
        <p class="place">${esc(b.place)} — ${esc(b.type)}</p>
        <h3>${esc(b.title)}</h3>
        <div class="property-line">
          <div class="property-specs">
            <span>${esc(b.surface)} m²</span><span>${esc(b.rooms)} pièces</span><span>${esc(b.beds)} ch.</span>
          </div>
          <p class="property-price">${esc(b.price)}</p>
        </div>
      </div>
    </article>`).join('');
  propertyGrid.querySelectorAll('.property-card').forEach((c) => {
    c.addEventListener('click', () => openDetail(properties[parseInt(c.dataset.i, 10)]));
  });
  propertyFiltersEl.querySelectorAll('.text-tab').forEach((btn) => btn.addEventListener('click', () => {
    propertyFiltersEl.querySelectorAll('.text-tab').forEach((b) => b.classList.remove('active'));
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
    const setMain = (v) => { dq('[data-detail-main]').style.backgroundImage = bg(v); };
    setMain(gallery[0]);
    dq('[data-detail-thumbs]').innerHTML = gallery.map((v, i) =>
      `<button class="detail-thumb${i === 0 ? ' active' : ''}" data-i="${i}" style="background-image:${bg(v)}"></button>`
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
    modal.querySelector('.modal-visual').style.backgroundImage = bg(image);
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
    showreelEl.querySelector('.film-poster').style.backgroundImage = bg(showreel.image);
    document.getElementById('showreel-label').textContent = showreel.label || '';
    showreelEl.addEventListener('click', () => openFilm(showreel.file));
  } else showreelEl.closest('.film-feature').style.display = 'none';
  document.getElementById('film-grid').innerHTML = (C.films?.items || []).map((f, i) => `
    <button class="film-thumb reveal" data-i="${i}">
      <span class="thumb-visual">${visual(f.image)}</span>
      <span class="film-thumb-label">${esc(f.label)}</span>
    </button>`).join('');
  document.getElementById('film-grid').querySelectorAll('.film-thumb').forEach((el) => {
    el.addEventListener('click', () => openFilm((C.films.items[parseInt(el.dataset.i, 10)] || {}).file));
  });

  /* ---------- Cinématographique ---------- */
  const cinema = C.cinema || [];
  const cinemaGrid = document.getElementById('cinema-grid');
  cinemaGrid.innerHTML = cinema.map((c, i) => `
    <article class="cinema-card reveal" data-i="${i}" data-type="${esc(c.type)}">
      <div class="cinema-visual">
        ${visual(c.image)}
        <span class="cinema-card-play">${c.type === 'Film' ? '▶' : '◎'}</span>
      </div>
      <div class="cinema-meta">
        <p class="place">${esc(c.category)} — ${esc(c.place)}</p>
        <h3>${esc(c.title)}</h3>
      </div>
    </article>`).join('');
  cinemaGrid.querySelectorAll('.cinema-card').forEach((card) => {
    card.addEventListener('click', () => {
      const item = cinema[parseInt(card.dataset.i, 10)];
      if (item.type === 'Film') openFilm(item.video);
      else openPhoto(item.image, `${item.title} — ${item.category}`);
    });
  });
  const cinemaFilters = document.querySelectorAll('#cinema-filters .text-tab');
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
  furnitureFiltersEl.innerHTML = [`<button class="text-tab active" data-filter="all">Tout</button>`]
    .concat(categories.map((c) => `<button class="text-tab" data-filter="${esc(c)}">${esc(c)}s</button>`)).join('');
  furnitureGrid.innerHTML = furniture.map((f, i) => `
    <article class="furniture-card reveal" data-category="${esc(f.category)}" data-i="${i}">
      <div class="furniture-visual">${visual(f.image)}<span class="furniture-edition">${esc(f.edition)}</span></div>
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
  });
  furnitureFiltersEl.querySelectorAll('.text-tab').forEach((btn) => btn.addEventListener('click', () => {
    furnitureFiltersEl.querySelectorAll('.text-tab').forEach((b) => b.classList.remove('active'));
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
    <article class="team-card reveal">
      <div class="team-avatar" ${m.photo ? `style="background-image:${bg(m.photo)}"` : ''}>${m.photo ? '' : esc(m.initials)}</div>
      <h3>${esc(m.name)}</h3>
      <p class="team-role">${esc(m.role)}</p>
      <p class="team-bio">${esc(m.bio)}</p>
    </article>`).join('');

  /* ---------- Études — ENSAP Bordeaux ---------- */
  const E = C.ensap || {};
  // Contenu publié antérieur à la section : on la masque plutôt que de l'afficher vide.
  if (!sections.ensap && !C.ensap) document.getElementById('ensap').style.display = 'none';
  document.getElementById('ensap-paragraphs').innerHTML =
    (E.paragraphs || []).map((p) => `<p class="reveal">${esc(p)}</p>`).join('');
  document.getElementById('ensap-cursus').innerHTML =
    (E.cursus || []).map((t) => `<li><span class="timeline-year">${esc(t.label)}</span><span>${esc(t.text)}</span></li>`).join('');
  const school = E.school || {};
  const schoolEl = document.getElementById('ensap-school');
  if (school.name || school.fullName) {
    schoolEl.innerHTML = `
      <p class="eyebrow">École</p>
      <h3>${esc(school.name || '')}</h3>
      ${school.fullName ? `<p>${esc(school.fullName)}</p>` : ''}
      ${school.place ? `<p>${esc(school.place)}</p>` : ''}
      ${school.url ? `<a class="btn" href="${esc(school.url)}" target="_blank" rel="noopener">${esc(school.linkLabel || 'Site de l\'école ↗')}</a>` : ''}`;
  } else schoolEl.style.display = 'none';
  const worksGrid = document.getElementById('ensap-grid');
  const works = E.works || [];
  worksGrid.innerHTML = works.map((w, i) => `
    <article class="project-card reveal" data-i="${i}">
      <div class="project-visual">${visual(w.image)}${w.year ? `<span class="card-badge">${esc(w.year)}</span>` : ''}</div>
      <div class="project-meta">
        <p class="place">${esc([w.category, w.year].filter(Boolean).join(' — '))}</p>
        <h3>${esc(w.title)}</h3>
      </div>
    </article>`).join('');
  worksGrid.querySelectorAll('.project-card').forEach((cardEl) => {
    cardEl.addEventListener('click', () => {
      const w = works[parseInt(cardEl.dataset.i, 10)];
      openItemModal({
        title: w.title, place: [w.category, w.year].filter(Boolean).join(' — '), desc: w.desc, image: w.image,
      });
    });
  });

  /* ---------- Approche / piliers ---------- */
  document.getElementById('pillars-grid').innerHTML = (C.philosophy || []).map((p) => `
    <div class="pillar reveal">
      <span class="pillar-index">${esc(p.index)}</span><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p>
    </div>`).join('');

  /* ---------- Chiffres ---------- */
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
    <li><span>${esc(l.label)}</span>${l.link ? `<a href="${esc(l.link)}">${esc(l.value)}</a>` : `<a>${esc(l.value)}</a>`}</li>`).join('');
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

  /* ============ Navigation ============ */
  const nav = document.getElementById('nav');
  ScrollTrigger.create({ start: 120, onUpdate: (self) => nav.classList.toggle('scrolled', self.scroll() > 120) });
  const burger = document.getElementById('burger');
  burger.addEventListener('click', () => document.body.classList.toggle('menu-open'));
  overlayLinks.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => document.body.classList.remove('menu-open')));
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) { e.preventDefault(); lenis.scrollTo(target, { duration: 1.4 }); }
    });
  });
  document.getElementById('to-top').addEventListener('click', () => lenis.scrollTo(0, { duration: 1.4 }));

  /* ============ Apparition au scroll ============ */
  function initReveal(els) {
    els.forEach((el) => ScrollTrigger.create({ trigger: el, start: 'top 88%', onEnter: () => el.classList.add('in') }));
  }
  initReveal(document.querySelectorAll('.reveal'));

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
        `<button class="model-tab ${i === 0 ? 'active' : ''}" data-i="${i}">${esc(m.name || `Maquette ${i + 1}`)}</button>`).join('');
      modelTabs.querySelectorAll('.model-tab').forEach((b) => {
        b.addEventListener('click', () => {
          modelTabs.querySelectorAll('.model-tab').forEach((x) => x.classList.remove('active'));
          b.classList.add('active');
          stopCinematic();
          viewer.load(modelUrl(models[parseInt(b.dataset.i, 10)]));
        });
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
    if (e.key === 'Escape') {
      modal.classList.remove('open'); closeFilm(); closePhoto(); closeDetail();
      document.body.classList.remove('menu-open');
    }
  });
}
