import './admin.css';
import {
  fetchPublished, readDraft, DRAFT_KEY, PUBLISH_KEY, HISTORY_KEY,
  ART_GRADIENTS, ART_KEYS, visualUrl, safeLinkUrl,
  FONT_LABELS, DESIGN_DEFAULTS,
  createPasswordRecord, verifyPassword, passwordStrength,
  encryptSecret, decryptSecret,
  guardLockedFor, guardFailure, guardReset,
  startSession, readSession, touchSession, endSession,
} from './content.js';

/**
 * Administration du site — la totalité de public/content/site.json est
 * éditable ici : identité, palette, typographie et densité, ordre et
 * visibilité des sections, sections libres, projets, biens, maquettes 3D,
 * films, mobilier, équipe, études, mentions légales, référencement…
 *
 * Le brouillon est conservé en local (localStorage), prévisualisable sur le
 * site (?preview=1), puis publié dans le dépôt GitHub (le site se redéploie
 * automatiquement).
 */

/* Empreinte du mot de passe par défaut ("atelier2026") si aucune n'est configurée. */
const DEFAULT_HASH = 'c1f64352efb87f56d333ff3d2a1c27f4f03edf539cb6535088eb8bafb7d2487b';

let published = null;
let draft = null;
let currentPanel = 'identite';
let saveTimer = null;
let memoryOnly = false; // brouillon trop lourd pour localStorage
let sessionPassword = ''; // conservé en mémoire uniquement (déchiffrement du jeton)

/* ============================ Utilitaires ============================ */
const $ = (s, root = document) => root.querySelector(s);

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function get(path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), draft);
}

function set(path, value) {
  const keys = path.split('.');
  let o = draft;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (o[k] == null) o[k] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    o = o[k];
  }
  o[keys[keys.length - 1]] = value;
  scheduleSave();
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveDraft, 300);
}

function saveDraft() {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    memoryOnly = false;
  } catch {
    if (!memoryOnly) {
      memoryOnly = true;
      toast('Brouillon trop volumineux pour être conservé localement (gros fichiers). Publiez sans recharger la page.', true, 6000);
    }
  }
  updateDirty();
}

function stripUploads(c) {
  const clean = structuredClone(c);
  delete clean.__uploads;
  return clean;
}

function updateDirty() {
  const uploads = Object.keys(draft.__uploads || {}).length;
  const changed = JSON.stringify(stripUploads(draft)) !== JSON.stringify(stripUploads(published)) || uploads > 0;
  $('#dirty-badge').hidden = !changed;
}

let toastTimer = null;
function toast(msg, isError = false, ms = 3200) {
  const t = $('#admin-toast');
  t.textContent = msg;
  t.classList.toggle('error', isError);
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}

const slug = (name) => String(name).toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '') // retire les accents
  .replace(/[^a-z0-9.]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

function b64FromBytes(bytes) {
  let s = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) s += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  return btoa(s);
}
const b64FromText = (t) => b64FromBytes(new TextEncoder().encode(t));

/* ============================ Champs génériques ============================ */
function fText(label, path, opts = {}) {
  const { textarea = false, rows = 3, full = false, help = '', type = 'text', placeholder = '' } = opts;
  const wrap = el(`<label class="${full ? 'full' : ''}"></label>`);
  wrap.prepend(document.createTextNode(label));
  const input = textarea ? el(`<textarea rows="${rows}"></textarea>`) : el(`<input type="${type}" />`);
  input.placeholder = placeholder;
  const v = get(path);
  input.value = v == null ? '' : v;
  input.addEventListener('input', () => set(path, type === 'number' ? Number(input.value) : input.value));
  wrap.append(input);
  if (help) {
    const h = el('<span class="field-help"></span>');
    h.textContent = help;
    wrap.append(h);
  }
  return wrap;
}

function fRange(label, path, opts = {}) {
  const { min = 0, max = 2, step = 0.05, fallback = 1, unit = '', help = '' } = opts;
  const wrap = el('<div class="range-field"></div>');
  const head = el('<div class="range-head"></div>');
  const name = el('<span class="range-label"></span>');
  name.textContent = label;
  const out = el('<code></code>');
  const input = el(`<input type="range" min="${min}" max="${max}" step="${step}" />`);
  const current = get(path);
  input.value = current == null ? fallback : current;
  out.textContent = input.value + unit;
  input.addEventListener('input', () => { set(path, Number(input.value)); out.textContent = input.value + unit; });
  head.append(name, out);
  wrap.append(head, input);
  if (help) { const h = el('<span class="field-help"></span>'); h.textContent = help; wrap.append(h); }
  return wrap;
}

function fToggle(label, path, defaultOn = true) {
  const wrap = el('<label class="switch"><input type="checkbox" /><span class="track"></span><span class="switch-label"></span></label>');
  wrap.querySelector('.switch-label').textContent = label;
  const input = wrap.querySelector('input');
  const v = get(path);
  input.checked = v == null ? defaultOn : v !== false;
  input.addEventListener('change', () => set(path, input.checked));
  return wrap;
}

function fSelect(label, path, options, opts = {}) {
  const wrap = el(`<label class="${opts.full ? 'full' : ''}"></label>`);
  wrap.prepend(document.createTextNode(label));
  const select = el('<select></select>');
  options.forEach((o) => {
    const option = el('<option></option>');
    option.value = o.value;
    option.textContent = o.label;
    select.append(option);
  });
  select.value = get(path) ?? opts.fallback ?? options[0]?.value;
  select.addEventListener('change', () => set(path, select.value));
  wrap.append(select);
  if (opts.help) { const h = el('<span class="field-help"></span>'); h.textContent = opts.help; wrap.append(h); }
  return wrap;
}

function fColor(label, path) {
  const wrap = el('<div class="color-field"><input type="color" /><div><div class="color-label"></div><code></code></div></div>');
  wrap.querySelector('.color-label').textContent = label;
  const input = wrap.querySelector('input');
  const code = wrap.querySelector('code');
  input.value = get(path) || '#000000';
  code.textContent = input.value;
  input.addEventListener('input', () => { set(path, input.value); code.textContent = input.value; });
  return wrap;
}

/**
 * Champ média : chemin/URL + téléversement + aperçu + raccourcis "art-*"
 * (visuels d'ambiance). Les fichiers téléversés sont stockés dans le
 * brouillon (data-URL) et committés dans public/uploads/ à la publication.
 */
function fMedia(label, path, opts = {}) {
  const { accept = 'image/*', preview = true, artChips = true, full = true, help = '' } = opts;
  const wrap = el(`<div class="media-field ${full ? 'full' : ''}"><label></label></div>`);
  wrap.querySelector('label').textContent = label;
  const row = el('<div class="media-row"><input type="text" placeholder="art-sea, uploads/…, gallery/… ou https://…" /><button type="button" class="media-upload">↑ Téléverser</button></div>');
  const input = row.querySelector('input');
  const fileInput = el(`<input type="file" accept="${accept}" hidden />`);
  const thumb = el('<div class="media-thumb empty"></div>');
  input.value = get(path) || '';

  function refresh() {
    if (!preview) return;
    const url = visualUrl(draft, input.value);
    const gradient = input.value.startsWith('art-') ? ART_GRADIENTS[input.value] : '';
    if (url || gradient) {
      thumb.classList.remove('empty');
      thumb.style.backgroundImage = [url ? `url("${url.replace(/"/g, '%22')}")` : '', gradient].filter(Boolean).join(', ');
    } else thumb.classList.add('empty');
  }
  input.addEventListener('input', () => { set(path, input.value); refresh(); syncChips(); });
  row.querySelector('.media-upload').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const key = `uploads/${Date.now()}-${slug(file.name)}`;
      draft.__uploads = draft.__uploads || {};
      draft.__uploads[key] = { dataUrl: reader.result, size: file.size, type: file.type };
      input.value = key;
      set(path, key);
      refresh();
      toast(`Fichier prêt (${(file.size / 1048576).toFixed(1)} Mo) — il sera envoyé lors de la publication.`);
    };
    reader.readAsDataURL(file);
  });
  wrap.append(row, fileInput);

  let chipsEl = null;
  function syncChips() {
    if (!chipsEl) return;
    chipsEl.querySelectorAll('.art-chip').forEach((c) => c.classList.toggle('active', c.dataset.art === input.value));
  }
  if (artChips) {
    chipsEl = el('<div class="art-select"></div>');
    ART_KEYS.forEach((k) => {
      const chip = el(`<button type="button" class="art-chip" data-art="${k}" title="${k}"></button>`);
      chip.style.background = ART_GRADIENTS[k];
      chip.addEventListener('click', () => { input.value = k; set(path, k); refresh(); syncChips(); });
      chipsEl.append(chip);
    });
    wrap.append(chipsEl);
    syncChips();
  }
  if (preview) wrap.append(thumb);
  if (help) { const h = el('<span class="field-help"></span>'); h.textContent = help; wrap.append(h); }
  refresh();
  return wrap;
}

function fieldGrid(...fields) {
  const g = el('<div class="field-grid"></div>');
  g.append(...fields.filter(Boolean));
  return g;
}

function card(title, ...children) {
  const c = el('<section class="card"></section>');
  if (title) {
    const h = el('<h3></h3>');
    h.textContent = title;
    c.append(h);
  }
  c.append(...children.filter(Boolean));
  return c;
}

function note(text) {
  const p = el('<p class="field-help spaced"></p>');
  p.textContent = text;
  return p;
}

/* ============================ Éditeur de listes ============================ */
function listEditor({ path, newItem, itemTitle, buildFields, addLabel = '+ Ajouter un élément', duplicable = true }) {
  const wrap = el('<div></div>');
  const itemsEl = el('<div class="list-items"></div>');
  const addBtn = el('<button type="button" class="list-add"></button>');
  addBtn.textContent = addLabel;
  wrap.append(itemsEl, addBtn);
  const openSet = new Set();

  function render() {
    itemsEl.innerHTML = '';
    const list = get(path) || [];
    list.forEach((item, i) => {
      const itemEl = el(`<div class="list-item ${openSet.has(i) ? 'open' : ''}">
          <div class="list-item-head">
            <span class="list-item-title"></span>
            <span class="list-item-tools">
              <button type="button" data-up title="Monter">↑</button>
              <button type="button" data-down title="Descendre">↓</button>
              ${duplicable ? '<button type="button" data-dup title="Dupliquer">⧉</button>' : ''}
              <button type="button" data-del class="del" title="Supprimer">✕</button>
            </span>
          </div>
          <div class="list-item-body"></div>
        </div>`);
      itemEl.querySelector('.list-item-title').textContent = itemTitle(item, i) || `Élément ${i + 1}`;
      itemEl.querySelector('.list-item-body').append(...buildFields(`${path}.${i}`, item, i));
      itemEl.querySelector('.list-item-head').addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        itemEl.classList.toggle('open');
        if (itemEl.classList.contains('open')) openSet.add(i); else openSet.delete(i);
      });
      itemEl.querySelector('[data-up]').addEventListener('click', () => {
        if (i === 0) return;
        const l = get(path); [l[i - 1], l[i]] = [l[i], l[i - 1]];
        scheduleSave(); render();
      });
      itemEl.querySelector('[data-down]').addEventListener('click', () => {
        const l = get(path);
        if (i >= l.length - 1) return;
        [l[i + 1], l[i]] = [l[i], l[i + 1]];
        scheduleSave(); render();
      });
      itemEl.querySelector('[data-dup]')?.addEventListener('click', () => {
        const l = get(path);
        l.splice(i + 1, 0, structuredClone(l[i]));
        openSet.add(i + 1);
        scheduleSave(); render();
        toast('Élément dupliqué.');
      });
      itemEl.querySelector('[data-del]').addEventListener('click', () => {
        if (!confirm('Supprimer cet élément ?')) return;
        get(path).splice(i, 1);
        openSet.delete(i);
        scheduleSave(); render();
      });
      itemsEl.append(itemEl);
    });
    if (!list.length) itemsEl.append(note('Aucun élément pour le moment.'));
  }
  addBtn.addEventListener('click', () => {
    if (!get(path)) set(path, []);
    const l = get(path);
    l.push(newItem());
    openSet.add(l.length - 1);
    scheduleSave(); render();
  });
  render();
  return wrap;
}

/* ============================ Constantes d'édition ============================ */
const THEME_COLORS = [
  ['gold', 'Or'], ['goldSoft', 'Or doux'], ['azur', 'Azur'], ['azurDeep', 'Azur profond'],
  ['turquoise', 'Turquoise'], ['sea', 'Mer'], ['coral', 'Corail'], ['coralSoft', 'Corail doux'],
  ['terracotta', 'Terracotta'], ['olive', 'Olive'], ['sand', 'Sable'], ['rose', 'Rose'],
  ['bg', 'Fond de page'], ['bgLight', 'Fond secondaire'], ['cream', 'Clair (bandes sombres)'], ['creamDim', 'Clair doux'],
  ['ink', 'Encre (textes)'], ['inkSoft', 'Encre douce'],
];

/** Palettes prêtes à l'emploi, applicables en un clic. */
const PALETTES = {
  'Méditerranée (par défaut)': {
    bg: '#f6f2ea', bgLight: '#fdfbf6', cream: '#f6f2ea', creamDim: '#d8d1c2', ink: '#1b1a17', inkSoft: '#6f6a5f',
    gold: '#b9862f', goldSoft: '#d3ab63', azur: '#2a7e9b', azurDeep: '#0d3b4f', turquoise: '#3ea3b5',
    coral: '#c96f4a', coralSoft: '#dd9a7c', terracotta: '#b4512e', olive: '#7d8a4c', sand: '#ece5d4', sea: '#14505f', rose: '#c98a94',
  },
  'Béton & lin (froid, minimal)': {
    bg: '#f2f2f0', bgLight: '#fafafa', cream: '#f2f2f0', creamDim: '#c9c9c5', ink: '#17181a', inkSoft: '#6b6d70',
    gold: '#8c8878', goldSoft: '#b3ae9d', azur: '#5a6b78', azurDeep: '#22292e', turquoise: '#7f9aa3',
    coral: '#9a7f74', coralSoft: '#bda69c', terracotta: '#7a7266', olive: '#7b8072', sand: '#e3e3df', sea: '#2c3438', rose: '#b09a97',
  },
  'Terre brûlée (chaud, contrasté)': {
    bg: '#f5efe6', bgLight: '#fbf7f0', cream: '#f5efe6', creamDim: '#d6c9b6', ink: '#221a14', inkSoft: '#6d5c4c',
    gold: '#b5822c', goldSoft: '#d4a95f', azur: '#8a6b3f', azurDeep: '#3b2717', turquoise: '#a98a52',
    coral: '#c0562f', coralSoft: '#d98e6c', terracotta: '#a8391c', olive: '#8a7a3c', sand: '#ead9c0', sea: '#4a2d1a', rose: '#c08878',
  },
  'Nuit (sombre, galerie)': {
    bg: '#141414', bgLight: '#1c1c1c', cream: '#f2efe9', creamDim: '#a8a49c', ink: '#f2efe9', inkSoft: '#a8a49c',
    gold: '#c9a24a', goldSoft: '#e0c684', azur: '#5b93a8', azurDeep: '#0d1418', turquoise: '#6fb3b8',
    coral: '#cf7a55', coralSoft: '#e0a184', terracotta: '#d17a4f', olive: '#94a06a', sand: '#26262a', sea: '#101a1e', rose: '#d0959c',
  },
};

const ACCENTS = ['terracotta', 'gold', 'azur', 'turquoise', 'coral', 'olive', 'sea', 'rose']
  .map((v) => ({ value: v, label: v }));

/** Sections intégrées, dans leur ordre naturel de création. */
const SECTION_DEFS = {
  agence: { name: 'Agence', head: false },
  expertise: { name: 'Expertise', head: true },
  conception: { name: 'Projets (conception)', head: true },
  immobilier: { name: 'Immobilier', head: true },
  maquette: { name: 'Maquette 3D', head: true },
  films: { name: 'Films', head: true },
  cinema: { name: 'Cinématographique', head: true },
  mobilier: { name: 'Mobilier & design', head: true },
  equipe: { name: 'Équipe', head: true },
  ensap: { name: 'Études (ENSAP Bordeaux)', head: true },
  philosophy: { name: 'Approche', head: true },
  stats: { name: 'Chiffres clés', head: false },
  contact: { name: 'Contact', head: false },
};

const sectionName = (id) => SECTION_DEFS[id]?.name
  || (draft.customSections?.[id] ? `${draft.sections?.[id]?.title || 'Section libre'} (libre)` : id);

function paneHeader(title, sub) {
  const h = el('<h2 class="pane-title"></h2>');
  h.textContent = title;
  const p = el('<p class="pane-sub"></p>');
  p.textContent = sub;
  return [h, p];
}

/* ============================ Panneaux ============================ */

function renderIdentite(pane) {
  pane.append(
    ...paneHeader('Identité & thème', 'Le nom, la marque et les couleurs du site. Chaque couleur est appliquée partout, instantanément.'),
    card('Marque', fieldGrid(
      fText('Nom du site', 'brand.name'),
      fText('Monogramme', 'brand.mark', { help: "Affiché dans l'administration et le pied de page (ex. L'A.)" }),
      fText('Phrase du chargeur', 'brand.loaderLabel', { full: true }),
    )),
    (() => {
      const c = card('Palettes prêtes à l\'emploi');
      const row = el('<div class="preset-row"></div>');
      Object.entries(PALETTES).forEach(([name, palette]) => {
        const btn = el('<button type="button" class="preset"></button>');
        const swatches = el('<span class="preset-swatches"></span>');
        [palette.bg, palette.ink, palette.terracotta, palette.azur, palette.gold].forEach((color) => {
          const s = el('<span class="preset-swatch"></span>');
          s.style.background = color;
          swatches.append(s);
        });
        const label = el('<span class="preset-name"></span>');
        label.textContent = name;
        btn.append(swatches, label);
        btn.addEventListener('click', () => {
          if (!confirm(`Appliquer la palette « ${name} » ? Les couleurs actuelles seront remplacées.`)) return;
          draft.theme = { ...draft.theme, ...palette };
          saveDraft();
          openPanel('identite');
          toast('Palette appliquée — prévisualisez avant de publier.');
        });
        row.append(btn);
      });
      c.append(row, note('Une palette remplace les 18 couleurs ci-dessous ; vous pouvez ensuite ajuster chaque teinte à la main.'));
      return c;
    })(),
    (() => {
      const c = card('Palette détaillée');
      const grid = el('<div class="color-grid"></div>');
      THEME_COLORS.forEach(([key, label]) => grid.append(fColor(label, `theme.${key}`)));
      c.append(grid, note('« Terracotta » (couleur d\'accent par défaut), « Or », « Azur » et « Mer » portent l\'essentiel de l\'identité.'));
      return c;
    })(),
  );
}

function renderDesign(pane) {
  pane.append(
    ...paneHeader('Design & typographie', "L'apparence fine du site : polices, tailles, densité, filets, animations. Chaque réglage agit sur l'ensemble des pages."),
    card('Polices', fieldGrid(
      fSelect('Police des titres', 'design.titleFont', Object.entries(FONT_LABELS).map(([value, label]) => ({ value, label })), { fallback: DESIGN_DEFAULTS.titleFont }),
      fSelect('Police des textes', 'design.bodyFont', Object.entries(FONT_LABELS).map(([value, label]) => ({ value, label })), { fallback: DESIGN_DEFAULTS.bodyFont }),
      fSelect('Graisse des titres', 'design.titleWeight', [300, 400, 500, 600, 700].map((v) => ({ value: String(v), label: String(v) })), { fallback: '400' }),
      fSelect('Graisse des textes', 'design.bodyWeight', [300, 400, 500].map((v) => ({ value: String(v), label: String(v) })), { fallback: '300' }),
    ), note('Les deux polices sont hébergées par le site : aucune requête vers un service tiers, aucun ralentissement.')),
    card('Échelle & rythme', fieldGrid(
      fRange('Taille des titres', 'design.scale', { min: 0.75, max: 1.5, step: 0.05, fallback: 1, help: '1 = taille de référence.' }),
      fRange('Taille du texte courant', 'design.bodySize', { min: 0.85, max: 1.25, step: 0.01, fallback: 1, unit: ' rem' }),
      fRange('Espacement vertical', 'design.density', { min: 0.6, max: 1.6, step: 0.05, fallback: 1, help: 'Plus la valeur est haute, plus le site respire.' }),
      fRange('Interlettrage des libellés', 'design.tracking', { min: 0.4, max: 1.8, step: 0.05, fallback: 1 }),
      fText('Largeur maximale du contenu (px)', 'design.maxWidth', { type: 'number', help: 'ex. 1360. Au-delà, le contenu reste centré.' }),
      fSelect('Couleur d\'accent', 'design.accent', ACCENTS, { fallback: 'terracotta', help: 'Filets actifs, survols, numéros et détails.' }),
    )),
    card('Traits & angles', fieldGrid(
      fRange('Épaisseur des filets', 'design.hairline', { min: 0.5, max: 3, step: 0.5, fallback: 1, unit: ' px' }),
      fRange('Arrondi des cadres', 'design.radius', { min: 0, max: 24, step: 1, fallback: 0, unit: ' px' }),
      fRange('Arrondi des images', 'design.imageRounding', { min: 0, max: 32, step: 1, fallback: 0, unit: ' px' }),
      fRange('Grain du papier', 'design.grain', { min: 0, max: 0.12, step: 0.005, fallback: 0.035, help: 'Texture discrète sur le fond. 0 = surface lisse.' }),
      fSelect('Format des cartes de projet', 'design.cardRatio', [
        { value: '4/3', label: 'Paysage 4:3' }, { value: '3/2', label: 'Paysage 3:2' },
        { value: '16/9', label: 'Panoramique 16:9' }, { value: '1/1', label: 'Carré' }, { value: '3/4', label: 'Portrait 3:4' },
      ], { fallback: '4/3' }),
    )),
    card('Animations', fieldGrid(
      fRange('Vitesse des animations', 'design.motion', { min: 0.4, max: 2, step: 0.05, fallback: 1, help: 'Plus haut = plus lent et posé. Les visiteurs ayant demandé un mouvement réduit ne sont jamais animés.' }),
      fRange('Distance d\'apparition', 'design.revealDistance', { min: 0, max: 80, step: 2, fallback: 32, unit: ' px' }),
      fRange('Zoom des images au survol', 'design.hoverZoom', { min: 1, max: 1.2, step: 0.01, fallback: 1.05 }),
    )),
    card('Ouverture (hero)', fieldGrid(
      fRange('Hauteur de l\'image d\'accueil', 'design.heroHeight', { min: 60, max: 100, step: 1, fallback: 100, unit: ' % de l\'écran' }),
      fRange('Voile sombre sur la photo', 'design.heroOverlay', { min: 0, max: 0.85, step: 0.01, fallback: 0.42, help: 'Assure la lisibilité du titre sur une photo claire.' }),
    )),
    (() => {
      const c = card('Réinitialiser');
      const btn = el('<button type="button" class="btn-ghost">Revenir au design d\'origine</button>');
      btn.addEventListener('click', () => {
        if (!confirm('Rétablir tous les réglages de design par défaut ?')) return;
        draft.design = { ...DESIGN_DEFAULTS };
        saveDraft(); openPanel('design');
        toast('Design réinitialisé.');
      });
      c.append(btn);
      return c;
    })(),
  );
}

function renderSections(pane) {
  pane.append(...paneHeader('Sections, ordre & menu',
    'Activez, renommez, réordonnez chaque section — l\'ordre ci-dessous est exactement celui de la page — ou créez vos propres sections.'));

  // --- Ordre et réglages de chaque section ---
  const listCard = card('Ordre des sections');
  const list = el('<div class="list-items"></div>');
  const ids = Object.keys(draft.sections || {});

  function move(id, delta) {
    const keys = Object.keys(draft.sections);
    const i = keys.indexOf(id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= keys.length) return;
    [keys[i], keys[j]] = [keys[j], keys[i]];
    draft.sections = Object.fromEntries(keys.map((k) => [k, draft.sections[k]]));
    saveDraft();
    openPanel('sections');
  }

  ids.forEach((id, index) => {
    const cfg = draft.sections[id] || {};
    const isCustom = !!draft.customSections?.[id];
    const item = el(`<div class="list-item">
        <div class="list-item-head">
          <span class="list-item-title"></span>
          <span class="list-item-tools">
            <button type="button" data-up title="Monter">↑</button>
            <button type="button" data-down title="Descendre">↓</button>
            ${isCustom ? '<button type="button" data-del class="del" title="Supprimer la section libre">✕</button>' : ''}
          </span>
        </div>
        <div class="list-item-body"></div>
      </div>`);
    const title = item.querySelector('.list-item-title');
    title.textContent = `${String(index + 1).padStart(2, '0')} · ${sectionName(id)}${cfg.visible === false ? ' — masquée' : ''}`;
    if (cfg.visible === false) title.classList.add('muted');

    const head = SECTION_DEFS[id]?.head ?? true;
    const fields = [
      fToggle('Visible sur le site', `sections.${id}.visible`),
      fText('Libellé dans le menu', `sections.${id}.navLabel`, { help: 'Laissez vide pour ne pas afficher dans le menu.' }),
    ];
    if (head || isCustom) {
      fields.push(
        fText('Sur-titre', `sections.${id}.eyebrow`),
        fText('Titre', `sections.${id}.title`),
        fText('Sous-titre', `sections.${id}.sub`, { textarea: true, rows: 2, full: true }),
      );
    }
    if (id === 'contact') fields.splice(2, 0, fText('Sur-titre', 'sections.contact.eyebrow'));
    if (isCustom) {
      fields.push(fSelect('Fond de la section', `customSections.${id}.background`, [
        { value: '', label: 'Papier (clair)' }, { value: 'alt', label: 'Papier secondaire' }, { value: 'dark', label: 'Bande sombre' },
      ]));
    }
    item.querySelector('.list-item-body').append(fieldGrid(...fields));
    item.querySelector('.list-item-head').addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      item.classList.toggle('open');
    });
    item.querySelector('[data-up]').addEventListener('click', () => move(id, -1));
    item.querySelector('[data-down]').addEventListener('click', () => move(id, 1));
    item.querySelector('[data-del]')?.addEventListener('click', () => {
      if (!confirm(`Supprimer définitivement la section « ${sectionName(id)} » et son contenu ?`)) return;
      delete draft.sections[id];
      delete draft.customSections[id];
      saveDraft(); openPanel('sections');
      toast('Section supprimée.');
    });
    list.append(item);
  });
  listCard.append(list, note('Les flèches déplacent la section dans la page et renumérotent automatiquement les titres.'));
  pane.append(listCard);

  // --- Création d'une section libre ---
  const createCard = card('Créer une section libre');
  const nameInput = el('<input type="text" placeholder="ex. Chantiers, Presse, Distinctions…" />');
  const nameLabel = el('<label>Nom de la nouvelle section</label>');
  nameLabel.append(nameInput);
  const createBtn = el('<button type="button" class="btn-ghost">+ Créer la section</button>');
  createBtn.addEventListener('click', () => {
    const label = nameInput.value.trim();
    if (!label) return toast('Donnez un nom à la section.', true);
    const base = `custom-${slug(label) || 'section'}`;
    let id = base;
    let n = 2;
    while (draft.sections[id]) { id = `${base}-${n++}`; }
    draft.customSections = draft.customSections || {};
    draft.customSections[id] = { background: 'alt', paragraphs: [''], items: [] };
    // Insérée avant le contact pour rester au-dessus du pied de page.
    const keys = Object.keys(draft.sections);
    const at = keys.indexOf('contact');
    const entry = { visible: true, navLabel: label, eyebrow: label, title: label, sub: '' };
    keys.splice(at === -1 ? keys.length : at, 0, id);
    draft.sections = Object.fromEntries(keys.map((k) => [k, k === id ? entry : draft.sections[k]]));
    saveDraft();
    openPanel('libres');
    toast(`Section « ${label} » créée — remplissez son contenu ici.`);
  });
  createCard.append(fieldGrid(nameLabel), createBtn,
    note('Une section libre accueille des paragraphes et une galerie de vignettes cliquables. Son contenu s\'édite dans « Sections libres ».'));
  pane.append(createCard);
}

function renderLibres(pane) {
  pane.append(...paneHeader('Sections libres', 'Le contenu des sections que vous avez créées : paragraphes et galerie. Leur titre, leur ordre et leur visibilité se règlent dans « Sections, ordre & menu ».'));
  const customs = Object.keys(draft.customSections || {});
  if (!customs.length) {
    pane.append(card('', note('Aucune section libre pour le moment. Créez-en une depuis « Sections, ordre & menu ».')));
    return;
  }
  customs.forEach((id) => {
    pane.append(card(sectionName(id),
      listEditor({
        path: `customSections.${id}.paragraphs`,
        newItem: () => 'Nouveau paragraphe…',
        itemTitle: (p) => String(p).slice(0, 60) || 'Paragraphe vide',
        buildFields: (p) => [fText('Texte', p, { textarea: true, rows: 4, full: true })],
        addLabel: '+ Ajouter un paragraphe',
      }),
      el('<h4 class="card-sub">Galerie</h4>'),
      listEditor({
        path: `customSections.${id}.items`,
        newItem: () => ({ title: 'Nouvel élément', caption: '', text: '', image: 'art-villa' }),
        itemTitle: (it) => it.title || 'Élément',
        buildFields: (p) => [fieldGrid(
          fText('Titre', `${p}.title`),
          fText('Légende courte', `${p}.caption`),
          fMedia('Visuel', `${p}.image`),
          fText('Texte', `${p}.text`, { textarea: true, full: true }),
        )],
        addLabel: '+ Ajouter un élément',
      })));
  });
}

function renderHero(pane) {
  pane.append(
    ...paneHeader('Accueil (hero)', "L'ouverture du site : une grande photo fixe et un titre, sans animation d'introduction."),
    card('Ouverture', fieldGrid(
      fMedia('Photo plein écran', 'hero.image'),
      fText('Sur-titre', 'hero.eyebrow'),
      fText('Titre', 'hero.title', { textarea: true, rows: 2, full: true, help: 'Un retour à la ligne ici = un retour à la ligne à l\'écran.' }),
      fText('Ligne sous le titre', 'hero.role'),
      fText('Invitation à défiler', 'hero.scrollCue'),
    ), note('La hauteur de l\'image et l\'intensité du voile sombre se règlent dans « Design & typographie ».')),
    card('Manifeste', fieldGrid(
      fText('Texte sous le hero', 'manifesto', { textarea: true, rows: 3, full: true, help: 'Laissez vide pour supprimer complètement ce bloc.' }),
    )),
  );
}

function renderAgence(pane) {
  pane.append(
    ...paneHeader('Agence', "La présentation de l'agence : portrait, texte et repères."),
    card('Présentation', fieldGrid(
      fText('Sur-titre', 'agence.eyebrow'),
      fText('Titre', 'agence.title', { textarea: true, rows: 2 }),
      fMedia('Image du portrait', 'agence.portraitImage'),
      fText('Initiales sur le portrait', 'agence.portraitInitials'),
      fText('Légende du portrait', 'agence.portraitCaption', { full: true }),
    )),
    card('Paragraphes', listEditor({
      path: 'agence.paragraphs',
      newItem: () => 'Nouveau paragraphe…',
      itemTitle: (p) => String(p).slice(0, 60),
      buildFields: (p) => [fText('Texte', p, { textarea: true, rows: 4, full: true })],
      addLabel: '+ Ajouter un paragraphe',
    })),
    card('Repères (liste sous le texte)', listEditor({
      path: 'agence.timeline',
      newItem: () => ({ label: 'Repère', text: '' }),
      itemTitle: (t) => t.label,
      buildFields: (p) => [fieldGrid(fText('Intitulé', `${p}.label`), fText('Texte', `${p}.text`, { full: true }))],
      addLabel: '+ Ajouter un repère',
    })),
  );
}

function renderExpertise(pane) {
  pane.append(
    ...paneHeader('Expertise', 'Les savoir-faire présentés en cartes numérotées.'),
    card('', listEditor({
      path: 'expertise',
      newItem: () => ({ num: `0${(get('expertise') || []).length + 1}`, title: 'Savoir-faire', text: '' }),
      itemTitle: (s) => `${s.num} — ${s.title}`,
      buildFields: (p) => [fieldGrid(
        fText('Numéro', `${p}.num`),
        fText('Titre', `${p}.title`),
        fText('Texte', `${p}.text`, { textarea: true, full: true }),
      )],
      addLabel: '+ Ajouter un savoir-faire',
    })),
  );
}

function projectFields(category) {
  return (p) => {
    const fields = [fText('Titre', `${p}.title`), fText('Lieu', `${p}.place`)];
    if (category === 'concours') fields.push(fText('Résultat', `${p}.status`, { help: 'ex. Lauréat, Finaliste, En lice, Mention du jury' }));
    else if (category === 'encours') fields.push(
      fText('Avancement (%)', `${p}.progress`, { type: 'number' }),
      fText('Phase du chantier', `${p}.phase`, { help: 'ex. Gros œuvre, Charpente & couverture…' }),
    );
    else fields.push(fText('Année', `${p}.year`));
    fields.push(fMedia('Visuel', `${p}.image`), fText('Description', `${p}.desc`, { textarea: true, full: true }));
    return [fieldGrid(...fields)];
  };
}

function renderProjets(pane) {
  pane.append(...paneHeader("Projets d'architecture", 'Vos projets classés par état : à venir, concours, en cours de chantier, terminés. Les visiteurs basculent entre les onglets.'));
  const tabs = get('projects.tabs') || [];
  pane.append(card('Libellés des onglets', fieldGrid(
    ...tabs.map((t, i) => fText(`Onglet « ${t.id} »`, `projects.tabs.${i}.label`)),
  )));
  [
    ['avenir', 'Projets à venir'],
    ['concours', 'Projets de concours'],
    ['encours', 'Chantiers en cours'],
    ['termines', 'Projets terminés'],
  ].forEach(([id, label]) => {
    pane.append(card(label, listEditor({
      path: `projects.${id}`,
      newItem: () => (id === 'concours'
        ? { title: 'Nouveau concours', place: '', status: 'En lice', image: 'art-villa', desc: '' }
        : id === 'encours'
          ? { title: 'Nouveau chantier', place: '', progress: 0, phase: '', image: 'art-villa', desc: '' }
          : { title: 'Nouveau projet', place: '', year: '', image: 'art-villa', desc: '' }),
      itemTitle: (i) => i.title,
      buildFields: projectFields(id),
      addLabel: '+ Ajouter un projet',
    })));
  });
}

function renderImmobilier(pane) {
  pane.append(
    ...paneHeader('Immobilier', 'Les biens à la vente, présentés façon agence de prestige avec page de détail, galerie et film.'),
    card('', listEditor({
      path: 'properties',
      newItem: () => ({
        title: 'Nouveau bien', place: '', region: '', price: '', surface: 0, rooms: 0, beds: 0, baths: 0,
        type: 'Villa', status: 'À vendre', image: 'art-villa', ref: '', dpe: '', map: '', video: '',
        gallery: ['art-villa'], desc: '', features: [],
      }),
      itemTitle: (b) => `${b.title} — ${b.place}`,
      buildFields: (p) => [
        fieldGrid(
          fText('Titre', `${p}.title`), fText('Ville / lieu', `${p}.place`), fText('Région', `${p}.region`),
          fText('Prix affiché', `${p}.price`), fText('Surface (m²)', `${p}.surface`, { type: 'number' }),
          fText('Pièces', `${p}.rooms`, { type: 'number' }), fText('Chambres', `${p}.beds`, { type: 'number' }),
          fText('Salles de bain', `${p}.baths`, { type: 'number' }),
          fText('Type', `${p}.type`, { help: 'ex. Villa, Appartement, Domaine — sert de filtre.' }),
          fSelect('Statut', `${p}.status`, ['À vendre', 'Sous compromis', 'Vendu'].map((v) => ({ value: v, label: v }))),
          fText('Référence', `${p}.ref`), fText('DPE', `${p}.dpe`),
          fText('Adresse pour la carte', `${p}.map`, { full: true }),
          fMedia('Visuel principal', `${p}.image`),
          fMedia('Film du bien (.mp4)', `${p}.video`, { accept: 'video/*', preview: false, artChips: false }),
          fText('Description', `${p}.desc`, { textarea: true, full: true }),
        ),
        card('Galerie photo', listEditor({
          path: `${p}.gallery`,
          newItem: () => 'art-villa',
          itemTitle: (v) => String(v),
          buildFields: (gp) => [fMedia('Visuel', gp)],
          addLabel: '+ Ajouter une photo',
        })),
        card('Prestations', listEditor({
          path: `${p}.features`,
          newItem: () => 'Nouvelle prestation',
          itemTitle: (v) => String(v),
          buildFields: (fp) => [fText('Prestation', fp, { full: true })],
          addLabel: '+ Ajouter une prestation',
        })),
      ],
      addLabel: '+ Ajouter un bien',
    })),
  );
}

function renderMaquettes(pane) {
  const warn = el('<div class="pane-warning"></div>');
  warn.innerHTML = '<strong>Depuis Revit :</strong> exportez votre maquette au format <strong>.glb</strong> '
    + "(via l'export FBX/OBJ puis conversion, ou un plugin d'export glTF pour Revit), puis téléversez-la ci-dessous. "
    + 'Conseil : compressez le fichier (Draco / gltf-transform) et restez idéalement sous ~25&nbsp;Mo pour un chargement fluide.';
  pane.append(
    ...paneHeader('Maquettes 3D (Revit)', 'Les maquettes explorables sur le site, avec vues, matériaux, ensoleillement et mode cinématique.'),
    warn,
    card('Maquettes', listEditor({
      path: 'maquette.models',
      newItem: () => ({ name: 'Nouvelle maquette', file: 'models/maquette.glb', desc: '' }),
      itemTitle: (m) => m.name,
      buildFields: (p) => [fieldGrid(
        fText('Nom affiché', `${p}.name`),
        fMedia('Fichier .glb', `${p}.file`, { accept: '.glb,.gltf,model/gltf-binary', preview: false, artChips: false, help: 'Chemin (models/…) ou téléversement. Les fichiers téléversés sont envoyés à la publication.' }),
        fText('Note interne', `${p}.desc`, { full: true }),
      )],
      addLabel: '+ Ajouter une maquette',
    })),
    card('Mode cinématique', fieldGrid(
      fText("Durée d'une boucle (secondes)", 'maquette.cinematic.duration', { type: 'number', help: 'La caméra parcourt la maquette en travelling continu ; la lumière balaie la journée.' }),
    )),
  );
}

function renderFilms(pane) {
  pane.append(
    ...paneHeader('Films', 'Le showreel principal et les films secondaires. Déposez vos .mp4 dans public/films/ ou téléversez-les.'),
    card('Showreel', fieldGrid(
      fText('Libellé du bouton', 'films.showreel.label'),
      fMedia('Fichier vidéo', 'films.showreel.file', { accept: 'video/*', preview: false, artChips: false }),
      fMedia("Image d'attente", 'films.showreel.image'),
    )),
    card('Autres films', listEditor({
      path: 'films.items',
      newItem: () => ({ label: 'Nouveau film', file: '', image: 'art-villa' }),
      itemTitle: (f) => f.label,
      buildFields: (p) => [fieldGrid(
        fText('Libellé', `${p}.label`),
        fMedia('Fichier vidéo', `${p}.file`, { accept: 'video/*', preview: false, artChips: false }),
        fMedia('Vignette', `${p}.image`),
      )],
      addLabel: '+ Ajouter un film',
    })),
  );
}

function renderCinema(pane) {
  pane.append(
    ...paneHeader('Cinématographique', 'Courts-métrages, time-lapses et séries photographiques qualité cinéma.'),
    card('', listEditor({
      path: 'cinema',
      newItem: () => ({ title: 'Nouvelle œuvre', type: 'Photo', category: 'Série photographique', place: '', image: 'art-sea', desc: '' }),
      itemTitle: (c) => `${c.type} — ${c.title}`,
      buildFields: (p) => [fieldGrid(
        fText('Titre', `${p}.title`),
        fSelect('Type', `${p}.type`, [{ value: 'Film', label: 'Film' }, { value: 'Photo', label: 'Photographie' }]),
        fText('Catégorie affichée', `${p}.category`),
        fText('Lieu', `${p}.place`),
        fMedia('Visuel', `${p}.image`),
        fMedia('Fichier vidéo (si film)', `${p}.video`, { accept: 'video/*', preview: false, artChips: false }),
        fText('Description', `${p}.desc`, { textarea: true, full: true }),
      )],
      addLabel: '+ Ajouter une œuvre',
    })),
  );
}

function renderMobilier(pane) {
  pane.append(
    ...paneHeader('Mobilier & design', "Les pièces dessinées et fabriquées par l'atelier. Le catalogue PDF se génère automatiquement à partir de cette liste (photos, matières, dimensions, éditions, prix)."),
    card('Catalogue (PDF)', fieldGrid(
      fText('Libellé du bouton sur le site', 'furnitureCatalog.buttonLabel'),
      fText('Titre de couverture', 'furnitureCatalog.title'),
      fText('Sous-titre de couverture', 'furnitureCatalog.subtitle', { textarea: true, rows: 2, full: true }),
      fMedia('Photo de couverture', 'furnitureCatalog.cover'),
      fText('Titre de la dernière page', 'furnitureCatalog.contactTitle'),
      fText('Mention de la dernière page', 'furnitureCatalog.note', { textarea: true, full: true, help: 'ex. conditions, prix indicatifs, adaptation des pièces…' }),
    )),
    card('Pièces', listEditor({
      path: 'furniture',
      newItem: () => ({ name: 'Nouvelle pièce', category: 'Objet', material: '', dimensions: '', edition: 'Pièce unique', price: 'Sur demande', image: 'art-design', desc: '' }),
      itemTitle: (f) => f.name,
      buildFields: (p) => [fieldGrid(
        fText('Nom', `${p}.name`),
        fText('Catégorie', `${p}.category`, { help: 'ex. Table, Fauteuil, Luminaire, Objet — sert de filtre.' }),
        fText('Matière', `${p}.material`),
        fText('Dimensions', `${p}.dimensions`),
        fText('Édition', `${p}.edition`),
        fText('Prix', `${p}.price`),
        fMedia('Visuel', `${p}.image`),
        fText('Description', `${p}.desc`, { textarea: true, full: true }),
      )],
      addLabel: '+ Ajouter une pièce',
    })),
  );
}

function renderEquipe(pane) {
  pane.append(
    ...paneHeader('Équipe', "Les visages de l'atelier."),
    card('', listEditor({
      path: 'team',
      newItem: () => ({ name: 'Nouveau membre', role: '', initials: 'NM', bio: '' }),
      itemTitle: (m) => m.name,
      buildFields: (p) => [fieldGrid(
        fText('Nom', `${p}.name`),
        fText('Rôle', `${p}.role`),
        fText('Initiales', `${p}.initials`),
        fMedia('Photo (optionnelle)', `${p}.photo`, { artChips: false }),
        fText('Biographie', `${p}.bio`, { textarea: true, full: true }),
      )],
      addLabel: '+ Ajouter un membre',
    })),
  );
}

function renderEnsap(pane) {
  pane.append(
    ...paneHeader('Études — ENSAP Bordeaux', "Votre parcours à l'école d'architecture et une sélection de travaux d'école."),
    card("L'école", fieldGrid(
      fText('Nom court', 'ensap.school.name'),
      fText('Lieu', 'ensap.school.place'),
      fText('Nom complet', 'ensap.school.fullName', { full: true }),
      fText('Site web', 'ensap.school.url', { help: 'ex. https://www.bordeaux.archi.fr — laissez vide pour masquer le bouton.' }),
      fText('Libellé du lien', 'ensap.school.linkLabel'),
    )),
    card('Présentation', listEditor({
      path: 'ensap.paragraphs',
      newItem: () => 'Nouveau paragraphe…',
      itemTitle: (p) => String(p).slice(0, 60),
      buildFields: (p) => [fText('Texte', p, { textarea: true, rows: 4, full: true })],
      addLabel: '+ Ajouter un paragraphe',
    })),
    card('Parcours (liste sous le texte)', listEditor({
      path: 'ensap.cursus',
      newItem: () => ({ label: 'Étape', text: '' }),
      itemTitle: (t) => t.label,
      buildFields: (p) => [fieldGrid(fText('Intitulé', `${p}.label`), fText('Texte', `${p}.text`, { full: true }))],
      addLabel: '+ Ajouter une étape',
    })),
    card("Travaux d'école", listEditor({
      path: 'ensap.works',
      newItem: () => ({ title: 'Nouveau travail', category: 'Atelier de projet', year: '', image: 'art-villa', desc: '' }),
      itemTitle: (w) => w.title,
      buildFields: (p) => [fieldGrid(
        fText('Titre', `${p}.title`),
        fText('Catégorie', `${p}.category`, { help: 'ex. Atelier de projet, Analyse, Workshop, Mémoire' }),
        fText('Année / niveau', `${p}.year`, { help: 'ex. Licence 2 — 2025 (affiché sur la carte)' }),
        fMedia('Visuel', `${p}.image`),
        fText('Description', `${p}.desc`, { textarea: true, full: true }),
      )],
      addLabel: '+ Ajouter un travail',
    })),
  );
}

function renderApproche(pane) {
  pane.append(
    ...paneHeader('Approche & chiffres', "Les convictions de l'agence et les chiffres clés animés."),
    card('Convictions', listEditor({
      path: 'philosophy',
      newItem: () => ({ index: `0${(get('philosophy') || []).length + 1}`, title: 'Conviction', text: '' }),
      itemTitle: (p) => `${p.index} — ${p.title}`,
      buildFields: (p) => [fieldGrid(
        fText('Numéro', `${p}.index`),
        fText('Titre', `${p}.title`),
        fText('Texte', `${p}.text`, { textarea: true, full: true }),
      )],
      addLabel: '+ Ajouter une conviction',
    })),
    card('Chiffres clés', listEditor({
      path: 'stats',
      newItem: () => ({ value: 0, suffix: '', label: 'Nouveau chiffre' }),
      itemTitle: (s) => `${s.value}${s.suffix || ''} — ${s.label}`,
      buildFields: (p) => [fieldGrid(
        fText('Valeur', `${p}.value`, { type: 'number' }),
        fText('Suffixe', `${p}.suffix`, { help: 'ex. + ou %' }),
        fText('Légende', `${p}.label`, { full: true }),
      )],
      addLabel: '+ Ajouter un chiffre',
    })),
  );
}

function renderContactPane(pane) {
  pane.append(
    ...paneHeader('Contact, réseaux & pied de page', 'Les coordonnées, les réseaux sociaux, les mentions légales et le pied de page.'),
    card('Contact', fieldGrid(
      fText('Titre', 'contact.title', { textarea: true, rows: 3 }),
      fText('Email de réception', 'contact.email', { type: 'email', help: 'Reçoit les messages du formulaire et les demandes de visite.' }),
      fText('Téléphone (fiche Google)', 'contact.phone', { help: 'ex. +33 6 12 34 56 78 — sert aux données structurées.' }),
      fText('Ville', 'contact.city', { help: 'Affichée dans les données structurées du référencement.' }),
      fText('Note sous le formulaire', 'contact.formNote', { full: true }),
      fText('Libellé du bouton', 'contact.submitLabel'),
    )),
    card('Lignes de coordonnées', listEditor({
      path: 'contact.lines',
      newItem: () => ({ label: 'Intitulé', value: '', link: '' }),
      itemTitle: (l) => `${l.label} — ${l.value || '(vide : masquée sur le site)'}`,
      buildFields: (p) => [fieldGrid(
        fText('Intitulé', `${p}.label`),
        fText('Valeur affichée', `${p}.value`, { help: 'Laissez vide pour masquer la ligne (ex. téléphone à définir plus tard).' }),
        fText('Lien (optionnel)', `${p}.link`, { full: true, help: 'ex. mailto:…, tel:+33612345678, https://…' }),
      )],
      addLabel: '+ Ajouter une ligne',
    })),
    card('Réseaux sociaux', listEditor({
      path: 'socials',
      newItem: () => ({ label: 'Instagram', url: '' }),
      itemTitle: (s) => `${s.label}${s.url ? '' : ' — (vide : masqué)'}`,
      buildFields: (p) => [fieldGrid(
        fText('Nom du réseau', `${p}.label`, { help: 'ex. Instagram, LinkedIn, Pinterest, YouTube…' }),
        fText('Lien du profil', `${p}.url`, { full: true, help: 'ex. https://www.instagram.com/votrecompte — laissez vide pour masquer.' }),
      )],
      addLabel: '+ Ajouter un réseau',
    })),
    card('Pages légales', listEditor({
      path: 'legal',
      newItem: () => ({ title: 'Mentions légales', content: '' }),
      itemTitle: (p) => p.title,
      buildFields: (p) => [fieldGrid(
        fText('Titre de la page', `${p}.title`),
        fText('Contenu', `${p}.content`, {
          textarea: true, rows: 10, full: true,
          help: 'Une ligne vide sépare les paragraphes. Une ligne commençant par « # » devient un sous-titre.',
        }),
      )],
      addLabel: '+ Ajouter une page légale',
    }), note('Ces pages apparaissent dans le pied de page et s\'ouvrent sans quitter le site.')),
    card('Pied de page', fieldGrid(
      fText('Texte du pied de page', 'footer.text', { full: true }),
    )),
  );
}

function renderSeo(pane) {
  pane.append(
    ...paneHeader('Référencement & partage', 'Ce que Google affiche et ce qui apparaît quand on partage le lien du site.'),
    card('Moteurs de recherche', fieldGrid(
      fText("Titre de l'onglet / Google", 'meta.title', { full: true }),
      fText('Description Google', 'meta.description', { textarea: true, full: true, help: 'Environ 150 caractères, phrase complète.' }),
      fText('Adresse canonique', 'meta.canonical', { full: true, help: "L'adresse officielle du site, ex. https://mondomaine.fr/" }),
    )),
    card('Partage sur les réseaux', fieldGrid(
      fText('Titre partagé', 'meta.ogTitle', { full: true, help: 'Laissez vide pour réutiliser le titre Google.' }),
      fText('Description partagée', 'meta.ogDescription', { textarea: true, full: true }),
      fMedia("Image de partage", 'meta.ogImage', { help: "Idéalement 1200 × 630 px. Par défaut : la photo d'accueil." }),
    )),
    card('Données structurées', fieldGrid(
      fSelect('Type d\'activité déclaré', 'seo.schemaType', [
        { value: 'ProfessionalService', label: 'Service professionnel' },
        { value: 'ArchitecturalService', label: "Agence d'architecture" },
        { value: 'RealEstateAgent', label: 'Agence immobilière' },
        { value: 'Organization', label: 'Organisation' },
      ], { fallback: 'ProfessionalService' }),
    ), fToggle('Publier les données structurées (recommandé)', 'seo.structuredData'),
    note('Les données structurées décrivent votre activité à Google : nom, contact, réseaux sociaux et ville.')),
  );
}

function renderMediatheque(pane) {
  pane.append(...paneHeader('Médiathèque', 'Les fichiers que vous avez téléversés et qui partiront à la prochaine publication.'));
  const uploads = Object.entries(draft.__uploads || {});
  const c = card('Fichiers en attente de publication');
  if (!uploads.length) {
    c.append(note('Aucun fichier en attente. Les visuels téléversés depuis les autres panneaux apparaîtront ici avant publication.'));
  } else {
    const grid = el('<div class="media-grid"></div>');
    let total = 0;
    uploads.forEach(([key, up]) => {
      total += up.size || 0;
      const item = el('<div class="media-item"></div>');
      const thumb = el('<div class="media-thumb"></div>');
      if ((up.type || '').startsWith('image/')) thumb.style.backgroundImage = `url("${up.dataUrl}")`;
      else { thumb.classList.add('empty'); thumb.textContent = (up.type || 'fichier').split('/')[0]; }
      const name = el('<code class="media-name"></code>');
      name.textContent = key;
      const size = el('<span class="field-help"></span>');
      size.textContent = `${((up.size || 0) / 1048576).toFixed(2)} Mo`;
      const del = el('<button type="button" class="btn-danger small">Retirer</button>');
      del.addEventListener('click', () => {
        if (!confirm(`Retirer « ${key} » ? Les blocs qui l'utilisent afficheront leur dégradé de repli.`)) return;
        delete draft.__uploads[key];
        saveDraft(); openPanel('mediatheque');
      });
      item.append(thumb, name, size, del);
      grid.append(item);
    });
    c.append(grid, note(`${uploads.length} fichier(s) — ${(total / 1048576).toFixed(1)} Mo au total. GitHub refuse les fichiers de plus de 100 Mo.`));
  }
  pane.append(c);
  pane.append(card('Dossiers du dépôt', note(
    'Vous pouvez aussi déposer vos fichiers directement dans le dépôt : public/gallery/ pour les photos, '
    + 'public/films/ pour les vidéos, public/models/ pour les maquettes .glb. Référencez-les ensuite par leur chemin '
    + '(ex. gallery/villa.jpg) dans les champs « visuel ».',
  )));
}

function renderReglages(pane) {
  pane.append(...paneHeader('Réglages & sécurité', 'Mot de passe, durée de session, sauvegardes, historique et remise à zéro.'));

  // --- Mot de passe ---
  const pwCard = card("Mot de passe d'accès");
  const pw1 = el('<input type="password" placeholder="Nouveau mot de passe (12 caractères min.)" autocomplete="new-password" />');
  const pw2 = el('<input type="password" placeholder="Confirmez le mot de passe" autocomplete="new-password" />');
  const meter = el('<div class="pw-meter"><span></span></div>');
  const meterLabel = el('<span class="field-help"></span>');
  const pwBtn = el('<button type="button" class="btn-ghost spaced">Mettre à jour le mot de passe</button>');
  const l1 = el('<label>Nouveau mot de passe</label>'); l1.append(pw1);
  const l2 = el('<label>Confirmation</label>'); l2.append(pw2);
  const STRENGTH = ['très faible', 'faible', 'moyen', 'bon', 'excellent'];
  pw1.addEventListener('input', () => {
    const score = passwordStrength(pw1.value);
    meter.querySelector('span').style.width = `${(score / 4) * 100}%`;
    meter.dataset.score = String(score);
    meterLabel.textContent = pw1.value ? `Robustesse : ${STRENGTH[score]}` : '';
  });
  pwCard.append(fieldGrid(l1, l2), meter, meterLabel, pwBtn, note(
    "Le mot de passe est transformé par PBKDF2 (310 000 itérations) : même volée, l'empreinte ne permet pas de retrouver "
    + "le mot de passe par force brute. Il devient actif pour tous après publication. Ce verrou protège l'interface ; "
    + 'la clé réelle de publication reste votre jeton GitHub.',
  ));
  pwBtn.addEventListener('click', async () => {
    if (pw1.value.length < 12) return toast('12 caractères minimum.', true);
    if (pw1.value !== pw2.value) return toast('Les deux mots de passe diffèrent.', true);
    if (passwordStrength(pw1.value) < 2) return toast('Mot de passe trop prévisible — mélangez majuscules, chiffres et symboles.', true);
    set('admin.password', await createPasswordRecord(pw1.value));
    delete draft.admin.passwordHash; // l'ancienne empreinte SHA-256 n'a plus lieu d'être
    sessionPassword = pw1.value;
    saveDraft();
    pw1.value = ''; pw2.value = '';
    meter.querySelector('span').style.width = '0%'; meterLabel.textContent = '';
    toast("Mot de passe mis à jour — publiez pour l'appliquer.");
  });
  pane.append(pwCard);

  // --- Session ---
  pane.append(card('Session', fieldGrid(
    fText('Durée avant déconnexion (minutes)', 'admin.sessionTtl', { type: 'number', help: 'La session se prolonge tant que vous travaillez. Par défaut : 60 minutes.' }),
    fText('Tentatives avant blocage', 'admin.maxAttempts', { type: 'number', help: 'Au-delà, l\'accès est bloqué 1 min, puis 2, 4, 8… jusqu\'à 1 heure.' }),
  )));

  // --- Historique ---
  const histCard = card('Historique du brouillon');
  const history = readHistory();
  if (!history.length) histCard.append(note('Aucune version enregistrée pour le moment. Une version est conservée à chaque publication et à chaque import.'));
  else {
    const list = el('<div class="list-items"></div>');
    history.forEach((snap, i) => {
      const row = el('<div class="history-row"></div>');
      const label = el('<span></span>');
      label.textContent = `${new Date(snap.at).toLocaleString('fr-FR')} — ${snap.label}`;
      const btn = el('<button type="button" class="btn-ghost small">Restaurer</button>');
      btn.addEventListener('click', () => {
        if (!confirm('Remplacer le brouillon actuel par cette version ?')) return;
        pushHistory('avant restauration');
        const uploads = draft.__uploads;
        draft = structuredClone(snap.data);
        draft.__uploads = uploads || {};
        saveDraft(); openPanel(currentPanel);
        toast('Version restaurée dans le brouillon.');
      });
      row.append(label, btn);
      list.append(row);
    });
    histCard.append(list, note(`${history.length} version(s) conservée(s) sur cet appareil (10 au maximum).`));
  }
  pane.append(histCard);

  // --- Sauvegarde / restauration ---
  const ioCard = card('Sauvegarde du contenu');
  const exportBtn = el('<button type="button" class="btn-ghost">⤓ Exporter le contenu (site.json)</button>');
  const importBtn = el('<button type="button" class="btn-ghost">⤒ Importer un contenu</button>');
  const importInput = el('<input type="file" accept="application/json" hidden />');
  const row = el('<div class="btn-row"></div>');
  row.append(exportBtn, importBtn, importInput);
  ioCard.append(row, note("L'export télécharge l'intégralité du contenu. Vous pouvez aussi remplacer manuellement le fichier public/content/site.json du dépôt."));
  exportBtn.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(stripUploads(draft), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'site.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  importBtn.addEventListener('click', () => importInput.click());
  importInput.addEventListener('change', () => {
    const file = importInput.files[0];
    if (!file) return;
    file.text().then((t) => {
      let data;
      try { data = JSON.parse(t); } catch { return toast('Fichier JSON invalide.', true); }
      if (!data || typeof data !== 'object' || !data.sections) {
        return toast('Ce fichier ne ressemble pas à un contenu de site (clé « sections » absente).', true);
      }
      pushHistory('avant import');
      const uploads = draft.__uploads;
      draft = data;
      draft.__uploads = uploads || {};
      migrate();
      saveDraft();
      openPanel(currentPanel);
      toast('Contenu importé dans le brouillon.');
      return undefined;
    });
  });
  pane.append(ioCard);

  // --- Réinitialisation ---
  const resetCard = card('Abandonner le brouillon');
  const resetBtn = el('<button type="button" class="btn-danger">Revenir à la version publiée</button>');
  resetCard.append(resetBtn, note('Supprime toutes les modifications non publiées et recharge le contenu actuellement en ligne.'));
  resetBtn.addEventListener('click', () => {
    if (!confirm('Abandonner toutes les modifications non publiées ?')) return;
    pushHistory('avant réinitialisation');
    draft = structuredClone(published);
    draft.__uploads = {};
    migrate();
    saveDraft();
    openPanel(currentPanel);
    toast('Brouillon réinitialisé.');
  });
  pane.append(resetCard);
}

/* ============================ Historique ============================ */
function readHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch { return []; }
}

function pushHistory(label) {
  try {
    const history = readHistory();
    history.unshift({ at: Date.now(), label, data: stripUploads(draft) });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 10)));
  } catch { /* stockage plein : l'historique est un confort, pas une garantie */ }
}

/* ============================ Navigation de l'admin ============================ */
const PANELS = [
  { id: 'identite', icon: '◈', label: 'Identité & thème', render: renderIdentite, keywords: 'couleur palette marque nom logo' },
  { id: 'design', icon: '✦', label: 'Design & typographie', render: renderDesign, keywords: 'police taille densité animation grain arrondi accent' },
  { id: 'sections', icon: '☰', label: 'Sections, ordre & menu', render: renderSections, keywords: 'ordre menu visible masquer créer réordonner' },
  { id: 'hero', icon: '⌂', label: 'Accueil (hero)', render: renderHero, keywords: 'accueil photo titre manifeste' },
  { id: 'agence', icon: '❖', label: 'Agence', render: renderAgence, keywords: 'présentation portrait repères' },
  { id: 'expertise', icon: '⬠', label: 'Expertise', render: renderExpertise, keywords: 'savoir-faire services' },
  { id: 'projets', icon: '△', label: 'Projets', render: renderProjets, keywords: 'chantier concours livré conception' },
  { id: 'immobilier', icon: '⌘', label: 'Immobilier', render: renderImmobilier, keywords: 'bien vente villa prix dpe' },
  { id: 'maquettes', icon: '◱', label: 'Maquettes 3D', render: renderMaquettes, keywords: 'revit glb 3d cinématique' },
  { id: 'films', icon: '▶', label: 'Films', render: renderFilms, keywords: 'vidéo showreel mp4' },
  { id: 'cinema', icon: '◉', label: 'Cinématographique', render: renderCinema, keywords: 'photo série court-métrage' },
  { id: 'mobilier', icon: '✚', label: 'Mobilier & catalogue', render: renderMobilier, keywords: 'meuble pdf catalogue prix' },
  { id: 'equipe', icon: '☺', label: 'Équipe', render: renderEquipe, keywords: 'membre collaborateur' },
  { id: 'ensap', icon: '✎', label: 'Études — ENSAP', render: renderEnsap, keywords: 'école bordeaux travaux' },
  { id: 'libres', icon: '＋', label: 'Sections libres', render: renderLibres, keywords: 'personnalisée custom galerie' },
  { id: 'approche', icon: '☀', label: 'Approche & chiffres', render: renderApproche, keywords: 'conviction statistiques' },
  { id: 'contact', icon: '✉', label: 'Contact & pied de page', render: renderContactPane, keywords: 'email téléphone réseaux mentions légales' },
  { id: 'seo', icon: '⌕', label: 'Référencement', render: renderSeo, keywords: 'google seo partage og description' },
  { id: 'mediatheque', icon: '▤', label: 'Médiathèque', render: renderMediatheque, keywords: 'fichier image upload' },
  { id: 'reglages', icon: '⚙', label: 'Réglages & sécurité', render: renderReglages, keywords: 'mot de passe session sauvegarde historique' },
];

function openPanel(id) {
  currentPanel = id;
  const pane = $('#admin-pane');
  pane.innerHTML = '';
  const def = PANELS.find((p) => p.id === id) || PANELS[0];
  def.render(pane);
  document.querySelectorAll('#admin-sidebar button').forEach((b) => b.classList.toggle('active', b.dataset.panel === id));
  pane.scrollTop = 0;
  window.scrollTo(0, 0);
  touchSession();
}

function buildSidebar(filter = '') {
  const side = $('#admin-sidebar');
  side.innerHTML = '';
  const q = filter.trim().toLowerCase();
  const shown = PANELS.filter((p) => !q || `${p.label} ${p.keywords}`.toLowerCase().includes(q));
  shown.forEach((p) => {
    const b = el('<button type="button"></button>');
    b.dataset.panel = p.id;
    const icon = el('<span class="side-icon"></span>');
    icon.textContent = p.icon;
    b.append(icon, document.createTextNode(p.label));
    b.classList.toggle('active', p.id === currentPanel);
    b.addEventListener('click', () => openPanel(p.id));
    side.append(b);
  });
  if (!shown.length) side.append(note('Aucun réglage ne correspond.'));
}

/* ============================ Publication GitHub ============================ */
function readPublishConfig() {
  try { return JSON.parse(localStorage.getItem(PUBLISH_KEY)) || {}; } catch { return {}; }
}

async function openPublishModal() {
  const cfg = readPublishConfig();
  $('#pub-owner').value = cfg.owner || 'arthur50dervaux-cmd';
  $('#pub-repo').value = cfg.repo || 'L-Atelier';
  $('#pub-branch').value = cfg.branch || 'main';
  $('#pub-storage').value = cfg.storage || 'none';

  // Le jeton n'est jamais conservé en clair : session, ou chiffré par le mot de passe.
  let token = '';
  if (cfg.storage === 'session') token = sessionStorage.getItem('latelier:token') || '';
  else if (cfg.storage === 'encrypted' && cfg.encrypted && sessionPassword) {
    try { token = await decryptSecret(cfg.encrypted, sessionPassword); }
    catch { toast('Jeton chiffré illisible — ressaisissez-le.', true); }
  }
  $('#pub-token').value = token;

  const uploads = Object.entries(draft.__uploads || {});
  const box = $('#publish-files');
  box.innerHTML = '';
  const title = el('<p></p>');
  title.textContent = 'À publier :';
  const ul = el('<ul></ul>');
  uploads.forEach(([p, u]) => {
    const li = el('<li></li>');
    li.textContent = `${p} (${(u.size / 1048576).toFixed(1)} Mo)`;
    ul.append(li);
  });
  const li = el('<li></li>');
  li.textContent = 'content/site.json (tout le contenu)';
  ul.append(li);
  box.append(title, ul);

  $('#publish-log').hidden = true;
  $('#publish-log').textContent = '';
  $('#publish-modal').hidden = false;
}

async function ghRequest(cfg, method, path, body) {
  return fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function getFileSha(cfg, filePath) {
  const dir = filePath.split('/').slice(0, -1).join('/');
  const name = filePath.split('/').pop();
  const res = await ghRequest(cfg, 'GET', `/repos/${cfg.owner}/${cfg.repo}/contents/${dir}?ref=${cfg.branch}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Lecture du dossier ${dir} impossible (${res.status})`);
  const entries = await res.json();
  const entry = Array.isArray(entries) ? entries.find((e) => e.name === name) : null;
  return entry ? entry.sha : null;
}

async function doPublish() {
  const cfg = {
    owner: $('#pub-owner').value.trim(),
    repo: $('#pub-repo').value.trim(),
    branch: $('#pub-branch').value.trim() || 'main',
    token: $('#pub-token').value.trim(),
    storage: $('#pub-storage').value,
  };
  if (!cfg.owner || !cfg.repo || !cfg.token) return toast('Renseignez le propriétaire, le dépôt et le jeton.', true);

  // Conservation du jeton selon le choix : rien, session, ou chiffré localement.
  const stored = { owner: cfg.owner, repo: cfg.repo, branch: cfg.branch, storage: cfg.storage };
  sessionStorage.removeItem('latelier:token');
  if (cfg.storage === 'session') sessionStorage.setItem('latelier:token', cfg.token);
  else if (cfg.storage === 'encrypted') {
    if (!sessionPassword) toast('Reconnectez-vous pour chiffrer le jeton — il ne sera pas conservé cette fois.', true);
    else stored.encrypted = await encryptSecret(cfg.token, sessionPassword);
  }
  localStorage.setItem(PUBLISH_KEY, JSON.stringify(stored));

  const logEl = $('#publish-log');
  logEl.hidden = false;
  const log = (m) => { logEl.textContent += `${m}\n`; logEl.scrollTop = logEl.scrollHeight; };
  const btn = $('#btn-do-publish');
  btn.disabled = true;

  try {
    const files = Object.entries(draft.__uploads || {}).map(([p, u]) => ({
      path: `public/${p}`,
      base64: u.dataUrl.split(',')[1],
      label: p,
    }));
    files.push({
      path: 'public/content/site.json',
      base64: b64FromText(JSON.stringify(stripUploads(draft), null, 2)),
      label: 'content/site.json',
    });

    for (const f of files) {
      log(`→ Envoi de ${f.label}…`);
      const sha = await getFileSha(cfg, f.path);
      const res = await ghRequest(cfg, 'PUT', `/repos/${cfg.owner}/${cfg.repo}/contents/${f.path}`, {
        message: `Mise à jour du site via l'administration — ${f.label}`,
        content: f.base64,
        branch: cfg.branch,
        ...(sha ? { sha } : {}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`${f.label} : ${res.status} ${err.message || ''}`);
      }
      log(`  ✓ ${f.label} publié`);
    }

    pushHistory('publication');
    published = stripUploads(draft);
    draft.__uploads = {};
    saveDraft();
    log('✓ Publication terminée. Le site se met à jour automatiquement (1 à 2 minutes).');
    toast('Site publié — mise en ligne dans 1 à 2 minutes.');
  } catch (e) {
    log(`✗ Erreur : ${e.message}`);
    log('Vérifiez le jeton (permission « Contents : Read and write » sur ce dépôt) et réessayez.');
    toast('La publication a échoué — voir le journal.', true);
  } finally {
    btn.disabled = false;
  }
  return undefined;
}

/* ============================ Migrations du contenu ============================ */
/**
 * Complète un contenu ancien avec les nouveautés, sans jamais écraser ce que
 * l'utilisateur a déjà saisi : l'admin doit pouvoir ouvrir un site.json publié
 * avant l'ajout d'une fonctionnalité.
 */
function migrate() {
  draft.__uploads = draft.__uploads || {};

  // Hero « diaporama » (acts) → hero fixe.
  if (draft.hero?.acts?.length && !draft.hero.title) {
    const a = draft.hero.acts[0];
    draft.hero = {
      scrollCue: draft.hero.scrollCue || 'Découvrir',
      eyebrow: a.eyebrow || '', title: a.title || '', role: a.role || '', image: a.image || 'art-sea',
    };
  }

  draft.sections = draft.sections || {};
  // Section Études, insérée avant « Approche » pour rester dans l'ordre de la page.
  if (!draft.sections.ensap) {
    const keys = Object.keys(draft.sections);
    const at = keys.indexOf('philosophy');
    const entry = structuredClone(published?.sections?.ensap) || {
      visible: true, navLabel: 'ENSAP Bordeaux', eyebrow: 'ENSAP Bordeaux', title: "Mes études d'architecture", sub: '',
    };
    keys.splice(at === -1 ? keys.length : at, 0, 'ensap');
    draft.sections = Object.fromEntries(keys.map((k) => [k, k === 'ensap' ? entry : draft.sections[k]]));
  }
  if (!draft.ensap) draft.ensap = structuredClone(published?.ensap) || { paragraphs: [], cursus: [], school: {}, works: [] };

  draft.design = { ...DESIGN_DEFAULTS, ...(draft.design || {}) };
  draft.customSections = draft.customSections || {};
  draft.socials = draft.socials || [];
  draft.legal = draft.legal || [];
  draft.seo = { schemaType: 'ProfessionalService', structuredData: true, ...(draft.seo || {}) };
  draft.admin = draft.admin || {};
  if (draft.admin.sessionTtl == null) draft.admin.sessionTtl = 60;
  if (draft.admin.maxAttempts == null) draft.admin.maxAttempts = 5;
  draft.furnitureCatalog = draft.furnitureCatalog || {};
}

/* ============================ Connexion & démarrage ============================ */
async function boot() {
  try {
    published = await fetchPublished();
  } catch {
    published = readDraft();
    if (!published) {
      $('#login-error').textContent = 'Impossible de charger le contenu du site.';
      $('#login-error').hidden = false;
      return;
    }
    toast('Contenu publié inaccessible — brouillon local chargé.', true);
    published = structuredClone(published);
  }
  draft = readDraft() || structuredClone(published);
  migrate();

  const lockEl = $('#login-lock');
  const submitBtn = $('#login-submit');
  let lockTimer = null;
  function refreshLock() {
    const left = guardLockedFor();
    if (left <= 0) {
      lockEl.hidden = true;
      submitBtn.disabled = false;
      clearInterval(lockTimer);
      lockTimer = null;
      return;
    }
    const s = Math.ceil(left / 1000);
    lockEl.textContent = `Trop de tentatives — nouvel essai possible dans ${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s.`;
    lockEl.hidden = false;
    submitBtn.disabled = true;
    if (!lockTimer) lockTimer = setInterval(refreshLock, 1000);
  }
  refreshLock();

  if (readSession()) showApp();

  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (guardLockedFor() > 0) return;
    const pw = new FormData(e.target).get('password');
    const record = draft.admin?.password || published.admin?.password;
    const legacy = draft.admin?.passwordHash || published.admin?.passwordHash || DEFAULT_HASH;
    const ok = await verifyPassword(pw, record, legacy);
    if (!ok) {
      guardFailure(Number(draft.admin?.maxAttempts) || 5);
      $('#login-error').hidden = false;
      refreshLock();
      return;
    }
    guardReset();
    sessionPassword = pw;
    // Migration silencieuse : l'ancienne empreinte SHA-256 devient un PBKDF2.
    if (!record) {
      draft.admin = draft.admin || {};
      draft.admin.password = await createPasswordRecord(pw);
      delete draft.admin.passwordHash;
      saveDraft();
    }
    startSession(Number(draft.admin?.sessionTtl) || 60);
    showApp();
  });
}

function showApp() {
  $('#login-screen').style.display = 'none';
  $('#admin-app').hidden = false;
  buildSidebar();
  openPanel(currentPanel);
  updateDirty();

  $('#admin-search').addEventListener('input', (e) => buildSidebar(e.target.value));
  $('#btn-preview').addEventListener('click', () => {
    saveDraft();
    window.open('./?preview=1', '_blank', 'noopener');
  });
  $('#btn-publish').addEventListener('click', openPublishModal);
  $('#btn-do-publish').addEventListener('click', doPublish);
  document.querySelectorAll('[data-publish-close]').forEach((b) =>
    b.addEventListener('click', () => { $('#publish-modal').hidden = true; }));
  $('#btn-logout').addEventListener('click', () => {
    endSession();
    sessionStorage.removeItem('latelier:token');
    sessionPassword = '';
    window.location.reload();
  });

  // La session se prolonge tant que l'on travaille, et expire sinon.
  ['click', 'keydown'].forEach((evt) => document.addEventListener(evt, touchSession, { passive: true }));
  setInterval(() => {
    if (!readSession()) {
      sessionPassword = '';
      toast('Session expirée — reconnexion nécessaire.', true, 5000);
      setTimeout(() => window.location.reload(), 1500);
    }
  }, 30000);

  window.addEventListener('beforeunload', (e) => {
    if (memoryOnly && Object.keys(draft.__uploads || {}).length) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}

boot();
