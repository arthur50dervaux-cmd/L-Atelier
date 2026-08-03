import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { createViewer } from './viewer.js';
import { initExperience } from './experience.js';
import {
  loadContent, isPreview, applyTheme, applyDesign,
  visualBackground, visualUrl, safeLinkUrl,
} from './content.js';

gsap.registerPlugin(ScrollTrigger);

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const brize = (s) => esc(s).replace(/\n/g, '<br/>');
const attr = (url) => esc(safeLinkUrl(url));

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

  /**
   * Visuel d'une carte : l'image est chargée paresseusement (`loading="lazy"`)
   * au-dessus du dégradé de repli — le site reste léger même avec des dizaines
   * de photos, et rien ne « saute » si une image manque.
   */
  const visual = (v, alt = '', eager = false) => {
    const url = visualUrl(C, v);
    const img = url
      ? `<img src="${esc(url)}" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" />`
      : '';
    return `<div class="visual-bg" style="background-image:${bg(v)}">${img}</div>`;
  };

  /**
   * Si une photo est introuvable, on retire l'image : le dégradé de repli
   * reprend la place proprement, au lieu d'afficher le texte alternatif
   * par-dessus la carte. L'écoute est en phase de capture car l'événement
   * `error` des images ne remonte pas.
   */
  document.addEventListener('error', (e) => {
    const img = e.target;
    if (img instanceof HTMLImageElement && (img.closest('.visual-bg') || img.closest('.hero-media'))) img.remove();
  }, true);

  /* ---------- Meta, thème, design, marque ---------- */
  applyTheme(C.theme);
  applyDesign(C.design);
  if (C.meta?.title) document.title = C.meta.title;
  const setMeta = (selector, value) => {
    if (value) document.querySelector(selector)?.setAttribute('content', value);
  };
  setMeta('meta[name="description"]', C.meta?.description);
  setMeta('meta[property="og:title"]', C.meta?.ogTitle || C.meta?.title);
  setMeta('meta[property="og:description"]', C.meta?.ogDescription || C.meta?.description);
  setMeta('meta[property="og:image"]', visualUrl(C, C.meta?.ogImage || C.hero?.image));
  setMeta('meta[name="theme-color"]', C.theme?.bg);
  if (C.meta?.canonical) document.querySelector('link[rel="canonical"]')?.setAttribute('href', safeLinkUrl(C.meta.canonical));

  document.querySelectorAll('[data-bind="brand"], [data-bind="detail-brand"], [data-bind="overlay-brand"], [data-bind="footer-mark"], [data-bind="catalog-brand"], [data-bind="legal-brand"]')
    .forEach((el) => { el.textContent = C.brand?.name || "L'Atelier"; });
  document.getElementById('year').textContent = new Date().getFullYear();
  document.getElementById('footer-text').textContent = C.footer?.text || '';
  if (isPreview()) document.getElementById('preview-banner').hidden = false;

  /* ---------- Données de référencement structurées (Google) ---------- */
  if (C.seo?.structuredData !== false) {
    const socials = (C.socials || []).map((s) => safeLinkUrl(s.url)).filter(Boolean);
    const ld = {
      '@context': 'https://schema.org',
      '@type': C.seo?.schemaType || 'ProfessionalService',
      name: C.brand?.name || "L'Atelier",
      description: C.meta?.description || '',
      url: safeLinkUrl(C.meta?.canonical) || window.location.origin + window.location.pathname,
      ...(email ? { email } : {}),
      ...(C.contact?.phone ? { telephone: C.contact.phone } : {}),
      ...(socials.length ? { sameAs: socials } : {}),
      ...(C.contact?.city ? { address: { '@type': 'PostalAddress', addressLocality: C.contact.city, addressCountry: C.contact.country || 'FR' } } : {}),
    };
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(ld);
    document.head.appendChild(script);
  }

  /* ---------- Panorama : bande d'images plein écran ---------- */
  // Rendu avant la mise en ordre des sections pour que la bande soit prête
  // au moment où GSAP mesure sa largeur et l'épingle.
  const panoEl = document.getElementById('panorama');
  const PANO = C.panorama || {};
  const panoItems = (PANO.items || []).filter((i) => i && (i.image || i.title));
  if (panoEl) {
    if (panoItems.length >= 2) {
      panoEl.hidden = false;
      document.getElementById('pano-eyebrow').textContent = PANO.eyebrow || '';
      document.getElementById('pano-title').textContent = PANO.title || 'Panorama';
      document.getElementById('pano-sub').textContent = PANO.sub || '';
      document.getElementById('pano-hint').textContent = PANO.hint || 'Faites défiler';
      document.getElementById('pano-track').innerHTML = panoItems.map((it, i) => `
        <article class="pano-item" data-i="${i}" tabindex="0" role="button">
          <div class="pano-visual">
            ${visual(it.image, it.title || '')}
            <span class="pano-index">${String(i + 1).padStart(2, '0')}</span>
          </div>
          <div class="pano-meta">
            ${it.place ? `<p class="place">${esc(it.place)}</p>` : ''}
            <h3>${esc(it.title || '')}</h3>
          </div>
        </article>`).join('');
    } else {
      panoEl.remove();
    }
  }

  /* ---------- Sections : ordre, visibilité, têtes numérotées, navigation ---------- */
  const sections = C.sections || {};
  const main = document.getElementById('top');
  const navLinks = document.getElementById('nav-links');
  const overlayLinks = document.getElementById('overlay-links');
  const customDefs = C.customSections || {};
  let sectionIndex = 0;
  let navIndex = 0;
  const chapters = [];

  /** Crée une section libre définie depuis l'administration. */
  function buildCustomSection(id, def) {
    const el = document.createElement('section');
    el.id = id;
    el.className = `section${def.background === 'alt' ? ' alt' : def.background === 'dark' ? ' dark' : ''}`;
    const items = (def.items || []).map((it, i) => `
      <article class="custom-item reveal" data-i="${i}">
        <div class="custom-visual media-frame reveal-mask">${visual(it.image, it.title || '')}</div>
        <div class="custom-meta">
          <h3>${esc(it.title || '')}</h3>
          ${it.text ? `<p>${esc(it.text)}</p>` : ''}
        </div>
      </article>`).join('');
    el.innerHTML = `
      <div class="section-inner">
        <div class="section-head reveal" data-head="${esc(id)}"></div>
        <div class="custom-body reveal">
          ${(def.paragraphs || []).map((p) => `<p>${brize(p)}</p>`).join('')}
        </div>
        <div class="custom-gallery">${items}</div>
      </div>`;
    // Les vignettes ouvrent la même fenêtre que les autres sections.
    el.querySelectorAll('.custom-item').forEach((card) => {
      const it = (def.items || [])[Number(card.dataset.i)];
      if (!it) return;
      card.addEventListener('click', () => openItemModal({
        title: it.title, place: it.caption || '', desc: it.text, image: it.image,
      }));
    });
    return el;
  }

  Object.entries(sections).forEach(([id, cfg]) => {
    let el = document.getElementById(id);
    if (!el && customDefs[id]) el = buildCustomSection(id, customDefs[id]);
    if (!el) return;
    if (cfg.visible === false) { el.remove(); return; }

    // L'ordre du fichier de contenu devient l'ordre réel de la page :
    // réordonner les sections depuis l'admin ne demande aucune modification du code.
    main.appendChild(el);

    const head = el.querySelector(`[data-head="${CSS.escape(id)}"]`);
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
      chapters.push({ id, label: cfg.navLabel });
      navLinks.insertAdjacentHTML('beforeend', `<a href="#${esc(id)}">${esc(cfg.navLabel)}</a>`);
      overlayLinks.insertAdjacentHTML('beforeend',
        `<a href="#${esc(id)}" style="--i:${navIndex}"><span class="idx">${String(navIndex).padStart(2, '0')}</span>${esc(cfg.navLabel)}</a>`);
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
  const heroImg = document.getElementById('hero-image');
  const heroUrl = visualUrl(C, hero.image);
  if (heroUrl) heroImg.src = heroUrl;
  else heroImg.remove();
  document.querySelector('.hero-media').style.backgroundImage = bg(hero.image);
  document.getElementById('hero-eyebrow').textContent = hero.eyebrow;
  document.getElementById('hero-title').innerHTML = brize(hero.title);
  document.getElementById('hero-role').textContent = hero.role;
  const cueLabel = document.querySelector('[data-bind="scroll-cue"]');
  if (cueLabel) cueLabel.textContent = C.hero?.scrollCue || '';

  /* ---------- Manifeste ---------- */
  const manifesto = document.querySelector('[data-bind="manifesto"]');
  if (C.manifesto) manifesto.innerHTML = brize(C.manifesto);
  else document.getElementById('intro').remove();

  /* ---------- Agence ---------- */
  const A = C.agence || {};
  const agenceEl = document.getElementById('agence');
  if (agenceEl) {
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
  }

  /* ---------- Expertise ---------- */
  const servicesGrid = document.getElementById('services-grid');
  if (servicesGrid) {
    servicesGrid.innerHTML = (C.expertise || []).map((s) => `
      <article class="service reveal">
        <span class="service-num">${esc(s.num)}</span><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p>
      </article>`).join('');
  }

  /* ---------- Conception : projets par état ---------- */
  const projectGrid = document.getElementById('project-grid');
  const projectTabs = document.getElementById('project-tabs');
  const tabDefs = C.projects?.tabs || [];
  if (projectTabs) {
    projectTabs.innerHTML = tabDefs.map((t, i) =>
      `<button class="text-tab ${i === 0 ? 'active' : ''}" data-tab="${esc(t.id)}">${esc(t.label)}</button>`).join('');
  }

  function renderProjects(state) {
    if (!projectGrid) return;
    const list = C.projects?.[state] || [];
    projectGrid.innerHTML = list.map((p, i) => {
      // L'année figure déjà dans la légende : seul un statut de concours
      // apporte une information, et il se lit sous le titre, pas sur la photo.
      const badge = state === 'concours' && p.status
        ? `<p class="card-tag">${esc(p.status)}</p>` : '';
      const progressBar = state === 'encours' && p.progress != null
        ? `<div class="progress"><div class="progress-bar" style="width:${Math.max(0, Math.min(100, Number(p.progress) || 0))}%"></div></div>
           <p class="progress-label">${esc(p.phase || '')} · ${Number(p.progress) || 0}%</p>` : '';
      return `<article class="project-card reveal" data-i="${i}" tabindex="0" role="button">
          <div class="project-visual media-frame reveal-mask">${visual(p.image, p.title)}</div>
          <div class="project-meta">
            <p class="place">${esc(p.place)}${p.year ? ` — ${esc(p.year)}` : ''}</p>
            <h3>${esc(p.title)}</h3>
            ${badge}
            ${progressBar}
          </div>
        </article>`;
    }).join('');
    projectGrid.querySelectorAll('.project-card').forEach((card) => {
      const p = list[parseInt(card.dataset.i, 10)];
      const open = () => openItemModal({
        title: p.title, place: p.year ? `${p.place} — ${p.year}` : p.place, desc: p.desc, image: p.image,
      });
      card.addEventListener('click', open);
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });
    initReveal(projectGrid.querySelectorAll('.reveal, .reveal-mask'));
  }
  projectTabs?.querySelectorAll('.text-tab').forEach((t) => t.addEventListener('click', () => {
    projectTabs.querySelectorAll('.text-tab').forEach((b) => b.classList.remove('active'));
    t.classList.add('active');
    renderProjects(t.dataset.tab);
  }));

  /* ---------- Immobilier ---------- */
  const properties = C.properties || [];
  const propertyGrid = document.getElementById('property-grid');
  const propertyFiltersEl = document.getElementById('property-filters');
  if (propertyGrid && propertyFiltersEl) {
    const types = [...new Set(properties.map((b) => b.type).filter(Boolean))];
    propertyFiltersEl.innerHTML = ['<button class="text-tab active" data-filter="all">Tous</button>']
      .concat(types.map((t) => `<button class="text-tab" data-filter="${esc(t)}">${esc(t)}s</button>`)).join('');

    const statusClass = (s) => (s === 'Vendu' ? 'sold' : s === 'Sous compromis' ? 'pending' : 'sale');
    propertyGrid.innerHTML = properties.map((b, i) => `
      <article class="property-card reveal" data-type="${esc(b.type)}" data-i="${i}" tabindex="0" role="button">
        <div class="property-visual media-frame reveal-mask">${visual(b.image, b.title)}</div>
        <div class="property-meta">
          <p class="place">${esc(b.place)} — ${esc(b.type)}<span class="status-tag ${statusClass(b.status)}">${esc(b.status)}</span></p>
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
      const open = () => openDetail(properties[parseInt(c.dataset.i, 10)]);
      c.addEventListener('click', open);
      c.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
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
  }

  /* ---- Page détail d'un bien ---- */
  const detail = document.getElementById('property-detail');
  const dq = (s) => detail.querySelector(s);
  function openDetail(b) {
    if (!b) return;
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
      `<button class="detail-thumb${i === 0 ? ' active' : ''}" data-i="${i}" style="background-image:${bg(v)}" aria-label="Photo ${i + 1}"></button>`,
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
    dq('[data-detail-mail]').href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(`Visite — ${b.title} (${b.ref})`)}&body=${mailBody}`;

    openOverlay(detail, 'detail-open');
    detail.querySelector('.detail-scroll').scrollTop = 0;
  }
  const closeDetail = () => closeOverlay(detail, 'detail-open');
  detail.querySelectorAll('[data-detail-close]').forEach((el) => el.addEventListener('click', closeDetail));

  /* ---------- Gestion générique des couches plein écran ---------- */
  let lastFocus = null;
  function openOverlay(el, bodyClass) {
    lastFocus = document.activeElement;
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
    document.body.classList.add(bodyClass);
    el.querySelector('button, [href], input')?.focus({ preventScroll: true });
  }
  function closeOverlay(el, bodyClass) {
    if (!el.classList.contains('open')) return;
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
    document.body.classList.remove(bodyClass);
    lastFocus?.focus?.({ preventScroll: true });
  }

  /* ---------- Modale générique (projets, mobilier, sections libres) ---------- */
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
    modal.setAttribute('aria-hidden', 'false');
    modal.querySelector('.modal-close').focus({ preventScroll: true });
  }
  const closeModal = () => { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); };
  modal.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', closeModal));

  /* ---------- Films ---------- */
  const showreel = C.films?.showreel;
  const showreelEl = document.getElementById('film-showreel');
  if (showreelEl) {
    if (showreel) {
      showreelEl.querySelector('.film-poster').style.backgroundImage = bg(showreel.image);
      document.getElementById('showreel-label').textContent = showreel.label || '';
      showreelEl.addEventListener('click', () => openFilm(showreel.file));
    } else showreelEl.closest('.film-feature').style.display = 'none';
  }
  const filmGrid = document.getElementById('film-grid');
  if (filmGrid) {
    filmGrid.innerHTML = (C.films?.items || []).map((f, i) => `
      <button class="film-thumb reveal" data-i="${i}">
        <span class="thumb-visual media-frame reveal-mask">${visual(f.image, f.label)}</span>
        <span class="film-thumb-label">${esc(f.label)}</span>
      </button>`).join('');
    filmGrid.querySelectorAll('.film-thumb').forEach((el) => {
      el.addEventListener('click', () => openFilm((C.films.items[parseInt(el.dataset.i, 10)] || {}).file));
    });
  }

  /* ---------- Cinématographique ---------- */
  const cinema = C.cinema || [];
  const cinemaGrid = document.getElementById('cinema-grid');
  if (cinemaGrid) {
    cinemaGrid.innerHTML = cinema.map((c, i) => `
      <article class="cinema-card reveal" data-i="${i}" data-type="${esc(c.type)}" tabindex="0" role="button">
        <div class="cinema-visual media-frame reveal-mask">
          ${visual(c.image, c.title)}
          <span class="cinema-card-play" aria-hidden="true">${c.type === 'Film' ? '▶' : '◎'}</span>
        </div>
        <div class="cinema-meta">
          <p class="place">${esc(c.category)} — ${esc(c.place)}</p>
          <h3>${esc(c.title)}</h3>
        </div>
      </article>`).join('');
    cinemaGrid.querySelectorAll('.cinema-card').forEach((card) => {
      const open = () => {
        const item = cinema[parseInt(card.dataset.i, 10)];
        if (item.type === 'Film') openFilm(item.video);
        else openPhoto(item.image, `${item.title} — ${item.category}`);
      };
      card.addEventListener('click', open);
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
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
  }

  /* ---------- Mobilier & design ---------- */
  const furniture = C.furniture || [];
  const furnitureGrid = document.getElementById('furniture-grid');
  const furnitureFiltersEl = document.getElementById('furniture-filters');
  if (furnitureGrid && furnitureFiltersEl) {
    const categories = [...new Set(furniture.map((f) => f.category).filter(Boolean))];
    furnitureFiltersEl.innerHTML = ['<button class="text-tab active" data-filter="all">Tout</button>']
      .concat(categories.map((c) => `<button class="text-tab" data-filter="${esc(c)}">${esc(c)}s</button>`)).join('');
    furnitureGrid.innerHTML = furniture.map((f, i) => `
      <article class="furniture-card reveal" data-category="${esc(f.category)}" data-i="${i}" tabindex="0" role="button">
        <div class="furniture-visual media-frame reveal-mask">${visual(f.image, f.name)}<span class="furniture-edition">${esc(f.edition)}</span></div>
        <div class="furniture-meta">
          <p class="furniture-category">${esc(f.category)}</p>
          <h3>${esc(f.name)}</h3>
          <p class="furniture-material">${esc(f.material)}</p>
        </div>
      </article>`).join('');
    furnitureGrid.querySelectorAll('.furniture-card').forEach((card) => {
      const open = () => {
        const f = furniture[parseInt(card.dataset.i, 10)];
        openItemModal({
          title: f.name, place: `${f.category} — ${f.edition}`, desc: f.desc, image: f.image,
          specs: [
            { value: f.material, label: 'Matière' },
            { value: f.dimensions, label: 'Dimensions' },
            { value: f.price, label: 'Prix' },
          ],
        });
      };
      card.addEventListener('click', open);
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
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
  }

  /* ---------- Catalogue mobilier (feuilles A4, enregistrables en PDF) ---------- */
  const catalogEl = document.getElementById('furniture-catalog');
  const catalogCta = document.getElementById('btn-catalog');
  const CAT = C.furnitureCatalog || {};
  let catalogBuilt = false;

  function buildCatalog() {
    const brand = C.brand?.name || "L'Atelier";
    const year = new Date().getFullYear();
    const title = CAT.title || 'Catalogue';
    const total = furniture.length + 2;
    const foot = (label, n) => `<div class="cat-pagefoot"><span>${esc(label)}</span><span>${n} / ${total}</span></div>`;
    const artImg = (v, alt = '') => {
      const url = visualUrl(C, v);
      return url ? `<img src="${esc(url)}" alt="${esc(alt)}" loading="lazy" />` : '';
    };
    const specRow = (label, value) => (value
      ? `<div class="cat-spec"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>` : '');

    const cover = `
      <div class="cat-page cat-cover">
        <div class="cat-cover-art" style="background-image:${bg(CAT.cover || 'art-design')}">${artImg(CAT.cover || 'art-design')}</div>
        <div class="cat-cover-text">
          <p class="cat-eyebrow">${esc(brand)} — ${year}</p>
          <h2>${esc(title)}</h2>
          ${CAT.subtitle ? `<p class="cat-sub">${esc(CAT.subtitle)}</p>` : ''}
        </div>
        ${foot(brand, 1)}
      </div>`;

    const pieces = furniture.map((f, i) => `
      <div class="cat-page cat-piece">
        <div class="cat-visual" style="background-image:${bg(f.image)}">${artImg(f.image, f.name)}</div>
        <p class="cat-eyebrow">N° ${String(i + 1).padStart(2, '0')}${f.category ? ` — ${esc(f.category)}` : ''}</p>
        <h3>${esc(f.name)}</h3>
        ${f.desc ? `<p class="cat-desc">${esc(f.desc)}</p>` : ''}
        <div class="cat-specs">
          ${specRow('Matière', f.material)}
          ${specRow('Dimensions', f.dimensions)}
          ${specRow('Édition', f.edition)}
          ${specRow('Prix', f.price)}
        </div>
        ${foot(`${brand} — ${title} ${year}`, i + 2)}
      </div>`).join('');

    const back = `
      <div class="cat-page cat-back">
        <div>
          <p class="cat-eyebrow">${esc(CAT.contactTitle || 'Commander ou demander une pièce')}</p>
          <h3>${esc(brand)}</h3>
          ${email ? `<p class="cat-contact">${esc(email)}</p>` : ''}
          ${CAT.note ? `<p class="cat-note">${esc(CAT.note)}</p>` : ''}
        </div>
        ${foot(C.footer?.text || brand, total)}
      </div>`;

    const pagesEl = document.getElementById('catalog-pages');
    pagesEl.innerHTML = cover + pieces + back;
    // Si une photo ne charge pas, le dégradé de repli en fond prend le relais.
    pagesEl.querySelectorAll('img').forEach((img) => img.addEventListener('error', () => img.remove()));
  }

  function openCatalog() {
    if (!catalogBuilt) { buildCatalog(); catalogBuilt = true; }
    openOverlay(catalogEl, 'catalog-open');
    catalogEl.querySelector('.catalog-scroll').scrollTop = 0;
  }
  const closeCatalog = () => closeOverlay(catalogEl, 'catalog-open');
  if (catalogCta) {
    if (furniture.length) {
      catalogCta.textContent = CAT.buttonLabel || 'Ouvrir le catalogue (PDF)';
      catalogCta.addEventListener('click', openCatalog);
      catalogEl.querySelectorAll('[data-catalog-close]').forEach((b) => b.addEventListener('click', closeCatalog));
      catalogEl.querySelector('[data-catalog-print]').addEventListener('click', () => window.print());
    } else catalogCta.closest('.catalog-cta').style.display = 'none';
  }

  /* ---------- Équipe ---------- */
  const teamGrid = document.getElementById('team-grid');
  if (teamGrid) {
    teamGrid.innerHTML = (C.team || []).map((m) => `
      <article class="team-card reveal">
        <div class="team-avatar" ${m.photo ? `style="background-image:${bg(m.photo)}"` : ''}>${m.photo ? '' : esc(m.initials)}</div>
        <h3>${esc(m.name)}</h3>
        <p class="team-role">${esc(m.role)}</p>
        <p class="team-bio">${esc(m.bio)}</p>
      </article>`).join('');
  }

  /* ---------- Études — ENSAP Bordeaux ---------- */
  const E = C.ensap || {};
  const ensapEl = document.getElementById('ensap');
  if (ensapEl) {
    document.getElementById('ensap-paragraphs').innerHTML =
      (E.paragraphs || []).map((p) => `<p class="reveal">${esc(p)}</p>`).join('');
    document.getElementById('ensap-cursus').innerHTML =
      (E.cursus || []).map((t) => `<li><span class="timeline-year">${esc(t.label)}</span><span>${esc(t.text)}</span></li>`).join('');
    const school = E.school || {};
    const schoolEl = document.getElementById('ensap-school');
    if (school.name || school.fullName) {
      const schoolLink = attr(school.url);
      schoolEl.innerHTML = `
        <p class="eyebrow">École</p>
        <h3>${esc(school.name || '')}</h3>
        ${school.fullName ? `<p>${esc(school.fullName)}</p>` : ''}
        ${school.place ? `<p>${esc(school.place)}</p>` : ''}
        ${schoolLink ? `<a class="btn" href="${schoolLink}" target="_blank" rel="noopener noreferrer">${esc(school.linkLabel || "Site de l'école ↗")}</a>` : ''}`;
    } else schoolEl.style.display = 'none';
    const worksGrid = document.getElementById('ensap-grid');
    const works = E.works || [];
    worksGrid.innerHTML = works.map((w, i) => `
      <article class="project-card reveal" data-i="${i}" tabindex="0" role="button">
        <div class="project-visual media-frame reveal-mask">${visual(w.image, w.title)}</div>
        <div class="project-meta">
          <p class="place">${esc([w.category, w.year].filter(Boolean).join(' — '))}</p>
          <h3>${esc(w.title)}</h3>
        </div>
      </article>`).join('');
    worksGrid.querySelectorAll('.project-card').forEach((cardEl) => {
      const open = () => {
        const w = works[parseInt(cardEl.dataset.i, 10)];
        openItemModal({
          title: w.title, place: [w.category, w.year].filter(Boolean).join(' — '), desc: w.desc, image: w.image,
        });
      };
      cardEl.addEventListener('click', open);
      cardEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });
  }

  /* ---------- Approche / piliers ---------- */
  const pillarsGrid = document.getElementById('pillars-grid');
  if (pillarsGrid) {
    pillarsGrid.innerHTML = (C.philosophy || []).map((p) => `
      <div class="pillar reveal">
        <span class="pillar-index">${esc(p.index)}</span><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p>
      </div>`).join('');
  }

  /* ---------- Chiffres ---------- */
  const statsGrid = document.getElementById('stats-grid');
  if (statsGrid) {
    statsGrid.innerHTML = (C.stats || []).map((s) => `
      <div class="stat reveal">
        <span class="stat-number" data-count="${Number(s.value) || 0}">0</span>
        ${s.suffix ? `<span class="stat-suffix">${esc(s.suffix)}</span>` : ''}
        <p>${esc(s.label)}</p>
      </div>`).join('');
  }

  /* ---------- Contact ---------- */
  const CT = C.contact || {};
  const contactEl = document.getElementById('contact');
  if (contactEl) {
    document.getElementById('contact-eyebrow').textContent = sections.contact?.eyebrow || 'Contact';
    document.getElementById('contact-title').innerHTML = brize(CT.title || '');
    // Les lignes sans valeur (ex. téléphone pas encore défini) sont masquées.
    document.getElementById('contact-info').innerHTML = (CT.lines || []).filter((l) => l.value).map((l) => {
      const href = attr(l.link);
      return `<li><span>${esc(l.label)}</span>${href ? `<a href="${href}">${esc(l.value)}</a>` : `<a>${esc(l.value)}</a>`}</li>`;
    }).join('');
    document.getElementById('contact-note').textContent = CT.formNote || '';
    document.getElementById('contact-submit').textContent = CT.submitLabel || 'Envoyer';

    const form = document.getElementById('contact-form');
    const formError = document.getElementById('contact-error');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        formError.textContent = 'Merci de renseigner votre nom, un email valide et un message.';
        formError.hidden = false;
        form.querySelector(':invalid')?.focus();
        return;
      }
      formError.hidden = true;
      const d = new FormData(form);
      const subject = encodeURIComponent(`Projet — ${d.get('subject') || 'Demande de contact'}`);
      const body = encodeURIComponent(`Nom: ${d.get('name')}\nEmail: ${d.get('email')}\n\n${d.get('message')}`);
      window.location.href = `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`;
    });
  }

  /* ---------- Réseaux sociaux (contact + pied de page) ---------- */
  const socials = (C.socials || []).filter((s) => s.label && safeLinkUrl(s.url));
  const socialsHtml = socials.map((s) =>
    `<a href="${attr(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)}</a>`).join('');
  document.getElementById('contact-socials')?.replaceChildren();
  const contactSocials = document.getElementById('contact-socials');
  if (contactSocials) contactSocials.innerHTML = socialsHtml;
  document.getElementById('footer-socials').innerHTML = socialsHtml;

  /* ---------- Pages légales ---------- */
  const legalEl = document.getElementById('legal-page');
  const legalPages = (C.legal || []).filter((p) => p.title && (p.content || '').trim());
  const legalNav = document.getElementById('footer-legal');
  legalNav.innerHTML = legalPages.map((p, i) => `<button type="button" data-legal="${i}">${esc(p.title)}</button>`).join('');
  legalNav.querySelectorAll('[data-legal]').forEach((btn) => btn.addEventListener('click', () => {
    const page = legalPages[Number(btn.dataset.legal)];
    document.getElementById('legal-title').textContent = page.title;
    // Le contenu est du texte : chaque paragraphe est échappé puis mis en forme.
    document.getElementById('legal-content').innerHTML = String(page.content)
      .split(/\n{2,}/).map((para) => (/^#\s+/.test(para)
        ? `<h3>${esc(para.replace(/^#\s+/, ''))}</h3>`
        : `<p>${brize(para)}</p>`)).join('');
    openOverlay(legalEl, 'legal-open');
    legalEl.querySelector('.legal-scroll').scrollTop = 0;
  }));
  const closeLegal = () => closeOverlay(legalEl, 'legal-open');
  legalEl.querySelectorAll('[data-legal-close]').forEach((b) => b.addEventListener('click', closeLegal));

  /* ============ Défilement fluide ============ */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lenis = new Lenis({ smoothWheel: !reduceMotion, duration: reduceMotion ? 0.1 : 1.1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  /* ============ Navigation ============ */
  const nav = document.getElementById('nav');
  const progressBar = document.querySelector('#scroll-progress span');
  let lastScroll = 0;
  lenis.on('scroll', ({ scroll }) => {
    nav.classList.toggle('scrolled', scroll > 120);
    // La barre supérieure se rétracte vers le bas et réapparaît dès qu'on remonte.
    const goingDown = scroll > lastScroll && scroll > 400;
    nav.classList.toggle('hidden-nav', goingDown && !document.body.classList.contains('menu-open'));
    lastScroll = scroll;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (progressBar) progressBar.style.width = `${max > 0 ? Math.min(100, (scroll / max) * 100) : 0}%`;
  });

  const burger = document.getElementById('burger');
  const menuOverlay = document.getElementById('menu-overlay');
  const toggleMenu = (open) => {
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    menuOverlay.setAttribute('aria-hidden', String(!open));
  };
  burger.addEventListener('click', () => toggleMenu(!document.body.classList.contains('menu-open')));
  overlayLinks.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => toggleMenu(false)));
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (target) { e.preventDefault(); lenis.scrollTo(target, { duration: reduceMotion ? 0 : 1.4 }); }
    });
  });
  document.getElementById('to-top').addEventListener('click', () => lenis.scrollTo(0, { duration: reduceMotion ? 0 : 1.4 }));
  document.getElementById('scroll-cue')?.addEventListener('click', () => {
    const next = document.getElementById('hero').nextElementSibling;
    if (next) lenis.scrollTo(next, { duration: reduceMotion ? 0 : 1.4 });
  });

  // Souligne l'entrée de menu de la section en cours de lecture.
  const navMap = new Map();
  navLinks.querySelectorAll('a').forEach((a) => navMap.set(a.getAttribute('href').slice(1), a));
  if (navMap.size) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navMap.forEach((link) => link.classList.remove('current'));
        navMap.get(entry.target.id)?.classList.add('current');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navMap.forEach((_, id) => { const el = document.getElementById(id); if (el) spy.observe(el); });
  }

  /* ============ Apparition au scroll ============ */
  function initReveal(els) {
    els.forEach((el) => ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => el.classList.add('in') }));
  }
  initReveal(document.querySelectorAll('.reveal, .reveal-mask'));

  /* ============ Compteurs ============ */
  document.querySelectorAll('.stat-number').forEach((el) => {
    const target = parseInt(el.dataset.count, 10);
    ScrollTrigger.create({
      trigger: el, start: 'top 85%', once: true,
      onEnter: () => gsap.to(el, {
        textContent: target, duration: reduceMotion ? 0 : 1.6, ease: 'power2.out', snap: { textContent: 1 },
        onUpdate: () => { el.textContent = Math.round(gsap.getProperty(el, 'textContent')); },
      }),
    });
  });

  // La parallaxe du hero est désormais gérée par la couche d'expérience
  // (chorégraphie complète : zoom, dérive, fondu du titre) — deux animations
  // sur le même élément se seraient contredites.

  /* ============ Rendu initial des projets ============ */
  renderProjects(tabDefs[0]?.id || 'avenir');

  /* ============ Visualiseur de maquette + cinématique ============ */
  const viewerEl = document.getElementById('model-viewer');
  const models = C.maquette?.models || [];
  const modelUrl = (m) => visualUrl(C, m?.file) || m?.file || '';
  let stopCinematic = () => {};
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
    stopCinematic = () => {
      if (!viewerEl.classList.contains('cine')) return;
      viewerEl.classList.remove('cine');
      cineStop.hidden = true;
      viewer.stopCinematic();
    };
    cineBtn?.addEventListener('click', startCinematic);
    cineStop?.addEventListener('click', stopCinematic);
  }

  /* ============ Lecteur de films ============ */
  const filmModal = document.getElementById('film-modal');
  const filmVideo = filmModal.querySelector('.film-video');
  function openFilm(src) {
    const url = visualUrl(C, src);
    filmModal.classList.add('open');
    filmModal.setAttribute('aria-hidden', 'false');
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
  function closeFilm() {
    filmModal.classList.remove('open');
    filmModal.setAttribute('aria-hidden', 'true');
    filmVideo.pause(); filmVideo.removeAttribute('src'); filmVideo.load();
  }
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
    photoModal.setAttribute('aria-hidden', 'false');
  }
  function closePhoto() { photoModal.classList.remove('open'); photoModal.setAttribute('aria-hidden', 'true'); }
  photoModal.querySelectorAll('[data-photo-close]').forEach((el) => el.addEventListener('click', closePhoto));

  /* ============ Touches globales ============ */
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    stopCinematic();
    closeModal(); closeFilm(); closePhoto(); closeDetail(); closeCatalog(); closeLegal();
    toggleMenu(false);
  });

  /* ============ Panorama : ouverture d'un visuel ============ */
  document.querySelectorAll('#pano-track .pano-item').forEach((item) => {
    const it = panoItems[Number(item.dataset.i)];
    if (!it) return;
    const open = () => openItemModal({ title: it.title, place: it.place, desc: it.desc, image: it.image });
    item.addEventListener('click', open);
    item.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });

  /* ============ Couche d'expérience ============ */
  // Activée en dernier : elle transforme des éléments déjà rendus (titres
  // découpés, fonds, épinglage) et a besoin des mesures définitives.
  initExperience({ config: C.experience, chapters });

  // Le contenu a pu grandir après le rendu : on recalcule les déclencheurs.
  ScrollTrigger.refresh();
}
