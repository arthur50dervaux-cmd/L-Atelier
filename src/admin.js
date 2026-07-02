import './admin.css';
import {
  fetchPublished, readDraft, DRAFT_KEY, PUBLISH_KEY, SESSION_KEY,
  hashPassword, ART_GRADIENTS, ART_KEYS, visualUrl,
} from './content.js';

/**
 * Administration du site — tout le contenu de public/content/site.json est
 * éditable ici : textes, couleurs, sections, projets, biens, maquettes 3D,
 * films, mobilier, équipe, contact… Le brouillon est conservé en local
 * (localStorage), prévisualisable sur le site (?preview=1), puis publié dans
 * le dépôt GitHub (le site se redéploie automatiquement).
 */

/* Empreinte du mot de passe par défaut ("atelier2026") si aucune n'est configurée. */
const DEFAULT_HASH = 'c1f64352efb87f56d333ff3d2a1c27f4f03edf539cb6535088eb8bafb7d2487b';

let published = null;
let draft = null;
let currentPanel = 'identite';
let saveTimer = null;
let memoryOnly = false; // brouillon trop lourd pour localStorage

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

const slug = (name) => name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/-+/g, '-');

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
  const wrap = el(`<label class="${full ? 'full' : ''}">${label}</label>`);
  const input = textarea
    ? el(`<textarea rows="${rows}"></textarea>`)
    : el(`<input type="${type}" />`);
  input.placeholder = placeholder;
  const v = get(path);
  input.value = v == null ? '' : v;
  input.addEventListener('input', () => set(path, type === 'number' ? Number(input.value) : input.value));
  wrap.append(input);
  if (help) wrap.append(el(`<span class="field-help">${help}</span>`));
  return wrap;
}

function fToggle(label, path) {
  const wrap = el(`<label class="switch"><input type="checkbox" /><span class="track"></span><span>${label}</span></label>`);
  const input = wrap.querySelector('input');
  input.checked = get(path) !== false;
  input.addEventListener('change', () => set(path, input.checked));
  return wrap;
}

function fSelect(label, path, options, opts = {}) {
  const wrap = el(`<label class="${opts.full ? 'full' : ''}">${label}</label>`);
  const select = el('<select></select>');
  options.forEach((o) => select.append(el(`<option value="${o.value}">${o.label}</option>`)));
  select.value = get(path) ?? options[0]?.value;
  select.addEventListener('change', () => set(path, select.value));
  wrap.append(select);
  return wrap;
}

function fColor(label, path) {
  const wrap = el(`<div class="color-field"><input type="color" /><div><div class="color-label">${label}</div><code></code></div></div>`);
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
  const wrap = el(`<div class="media-field ${full ? 'full' : ''}"><label>${label}</label></div>`);
  const row = el(`<div class="media-row"><input type="text" placeholder="art-sea, uploads/…, gallery/… ou https://…" /><button type="button" class="media-upload">↑ Téléverser</button></div>`);
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
      thumb.style.backgroundImage = [url ? `url("${url}")` : '', gradient].filter(Boolean).join(', ');
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
      const mb = (file.size / 1048576).toFixed(1);
      toast(`Fichier prêt (${mb} Mo) — il sera envoyé lors de la publication.`);
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
  if (help) wrap.append(el(`<span class="field-help">${help}</span>`));
  refresh();
  return wrap;
}

function fieldGrid(...fields) {
  const g = el('<div class="field-grid"></div>');
  g.append(...fields);
  return g;
}

function card(title, ...children) {
  const c = el(`<section class="card">${title ? `<h3>${title}</h3>` : ''}</section>`);
  c.append(...children);
  return c;
}

/* ============================ Éditeur de listes ============================ */
function listEditor({ path, newItem, itemTitle, buildFields, addLabel = '+ Ajouter un élément' }) {
  const wrap = el('<div></div>');
  const itemsEl = el('<div class="list-items"></div>');
  const addBtn = el(`<button type="button" class="list-add">${addLabel}</button>`);
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
      itemEl.querySelector('[data-del]').addEventListener('click', () => {
        if (!confirm('Supprimer cet élément ?')) return;
        get(path).splice(i, 1);
        openSet.delete(i);
        scheduleSave(); render();
      });
      itemsEl.append(itemEl);
    });
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

/* ============================ Panneaux ============================ */
const THEME_COLORS = [
  ['gold', 'Or'], ['goldSoft', 'Or doux'], ['azur', 'Azur'], ['azurDeep', 'Azur profond'],
  ['turquoise', 'Turquoise'], ['sea', 'Mer'], ['coral', 'Corail'], ['coralSoft', 'Corail doux'],
  ['terracotta', 'Terracotta'], ['olive', 'Olive'], ['sand', 'Sable'], ['rose', 'Rose'],
  ['bg', 'Fond de page'], ['bgLight', 'Fond secondaire'], ['cream', 'Clair (bandes sombres)'], ['creamDim', 'Clair doux'],
  ['ink', 'Encre (textes)'], ['inkSoft', 'Encre douce'],
];

const ACCENTS = ['azur', 'turquoise', 'gold', 'coral', 'olive'].map((v) => ({ value: v, label: v }));

const SECTION_DEFS = [
  { id: 'agence', name: 'Agence', head: false },
  { id: 'expertise', name: 'Expertise', head: true },
  { id: 'conception', name: 'Projets (conception)', head: true },
  { id: 'immobilier', name: 'Immobilier', head: true },
  { id: 'maquette', name: 'Maquette 3D', head: true },
  { id: 'films', name: 'Films', head: true },
  { id: 'cinema', name: 'Cinématographique', head: true },
  { id: 'mobilier', name: 'Mobilier & design', head: true },
  { id: 'equipe', name: 'Équipe', head: true },
  { id: 'philosophy', name: 'Approche', head: true },
  { id: 'stats', name: 'Chiffres clés', head: false },
  { id: 'contact', name: 'Contact', head: false },
];

function paneHeader(title, sub) {
  return [el(`<h2 class="pane-title">${title}</h2>`), el(`<p class="pane-sub">${sub}</p>`)];
}

function renderIdentite(pane) {
  pane.append(
    ...paneHeader('Identité & thème', 'Le nom, la marque et la palette méditerranéenne du site. Chaque couleur est appliquée partout, instantanément.'),
    card('Marque', fieldGrid(
      fText('Nom du site', 'brand.name'),
      fText('Monogramme', 'brand.mark', { help: 'Affiché dans le chargeur et le pied de page (ex. L\'A.)' }),
      fText('Phrase du chargeur', 'brand.loaderLabel', { full: true }),
    )),
    card('Référencement (SEO)', fieldGrid(
      fText('Titre de l\'onglet / Google', 'meta.title', { full: true }),
      fText('Description Google', 'meta.description', { textarea: true, full: true }),
    )),
    (() => {
      const c = card('Palette méditerranéenne');
      const grid = el('<div class="color-grid"></div>');
      THEME_COLORS.forEach(([key, label]) => grid.append(fColor(label, `theme.${key}`)));
      c.append(grid, el('<p class="field-help" style="margin-top:0.8rem">Astuce : « Or », « Azur », « Corail » et « Mer » portent l\'essentiel de l\'identité. Prévisualisez avant de publier.</p>'));
      return c;
    })(),
  );
}

function renderSections(pane) {
  pane.append(...paneHeader('Sections & menu', 'Activez ou masquez chaque section du site, renommez son entrée de menu et ses titres.'));
  SECTION_DEFS.forEach(({ id, name, head }) => {
    const fields = [
      fToggle('Visible sur le site', `sections.${id}.visible`),
      fText('Libellé dans le menu', `sections.${id}.navLabel`, { help: 'Laissez vide pour ne pas afficher dans le menu.' }),
    ];
    if (head) {
      fields.push(
        fText('Sur-titre', `sections.${id}.eyebrow`),
        fText('Titre', `sections.${id}.title`),
        fText('Sous-titre', `sections.${id}.sub`, { textarea: true, rows: 2, full: true }),
      );
    }
    if (id === 'contact') fields.splice(2, 0, fText('Sur-titre', 'sections.contact.eyebrow'));
    pane.append(card(name, fieldGrid(...fields)));
  });
}

function renderHero(pane) {
  pane.append(
    ...paneHeader('Accueil (hero)', 'Le diaporama plein écran d\'ouverture : chaque diapositive combine une photo et un titre, façon grande agence.'),
    card('Général', fieldGrid(
      fText('Invitation à défiler', 'hero.scrollCue'),
      fText('Durée par diapositive (secondes)', 'hero.interval', { type: 'number' }),
      fText('Manifeste (texte sous le hero)', 'manifesto', { textarea: true, rows: 3, full: true }),
    )),
    card('Diapositives', listEditor({
      path: 'hero.acts',
      newItem: () => ({ eyebrow: '', title: 'Nouveau titre', size: 'big', image: 'art-sea' }),
      itemTitle: (a) => (a.title || '').split('\n')[0],
      buildFields: (p) => [fieldGrid(
        fText('Sur-titre', `${p}.eyebrow`),
        fSelect('Taille', `${p}.size`, [{ value: 'big', label: 'Grand titre' }, { value: 'medium', label: 'Titre moyen' }]),
        fText('Titre', `${p}.title`, { textarea: true, rows: 2, full: true, help: 'Un retour à la ligne ici = un retour à la ligne à l\'écran.' }),
        fText('Ligne sous le titre', `${p}.role`),
        fMedia('Photo plein écran', `${p}.image`),
      )],
      addLabel: '+ Ajouter une diapositive',
    })),
  );
}

function renderAgence(pane) {
  pane.append(
    ...paneHeader('Agence', 'La présentation de l\'agence : portrait, texte et repères.'),
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
      newItem: () => ({ num: '0' + ((get('expertise') || []).length + 1), title: 'Savoir-faire', text: '', accent: 'azur' }),
      itemTitle: (s) => `${s.num} — ${s.title}`,
      buildFields: (p) => [fieldGrid(
        fText('Numéro', `${p}.num`),
        fText('Titre', `${p}.title`),
        fSelect('Couleur d\'accent', `${p}.accent`, ACCENTS),
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
  pane.append(...paneHeader('Projets d\'architecture', 'Vos projets classés par état : à venir, concours, en cours de chantier, terminés. Les visiteurs basculent entre les onglets.'));
  const tabs = get('projects.tabs') || [];
  pane.append(card('Libellés des onglets', fieldGrid(
    ...tabs.map((t, i) => fText(`Onglet « ${t.id} »`, `projects.tabs.${i}.label`)),
  )));
  const CATS = [
    ['avenir', 'Projets à venir'],
    ['concours', 'Projets de concours'],
    ['encours', 'Chantiers en cours'],
    ['termines', 'Projets terminés'],
  ];
  CATS.forEach(([id, label]) => {
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
      buildFields: (p, item) => [
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
  pane.append(
    ...paneHeader('Maquettes 3D (Revit)', 'Les maquettes explorables sur le site, avec vues, matériaux, ensoleillement et mode cinématique.'),
    el(`<div class="pane-warning"><strong>Depuis Revit :</strong> exportez votre maquette au format <strong>.glb</strong>
      (via l'export FBX/OBJ puis conversion, ou un plugin d'export glTF pour Revit), puis téléversez-la ci-dessous.
      Conseil : compressez le fichier (Draco / gltf-transform) et restez idéalement sous ~25&nbsp;Mo pour un chargement fluide.</div>`),
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
      fText('Durée d\'une boucle (secondes)', 'maquette.cinematic.duration', { type: 'number', help: 'La caméra parcourt la maquette en travelling continu ; la lumière balaie la journée.' }),
    )),
  );
}

function renderFilms(pane) {
  pane.append(
    ...paneHeader('Films', 'Le showreel principal et les films secondaires. Déposez vos .mp4 dans public/films/ ou téléversez-les.'),
    card('Showreel', fieldGrid(
      fText('Libellé du bouton', 'films.showreel.label'),
      fMedia('Fichier vidéo', 'films.showreel.file', { accept: 'video/*', preview: false, artChips: false }),
      fMedia('Image d\'attente', 'films.showreel.image'),
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
      buildFields: (p, item) => [fieldGrid(
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
    ...paneHeader('Mobilier & design', 'Les pièces dessinées et fabriquées par l\'atelier.'),
    card('', listEditor({
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
    ...paneHeader('Équipe', 'Les visages de l\'atelier.'),
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

function renderApproche(pane) {
  pane.append(
    ...paneHeader('Approche & chiffres', 'Les convictions de l\'agence et les chiffres clés animés.'),
    card('Convictions', listEditor({
      path: 'philosophy',
      newItem: () => ({ index: '0' + ((get('philosophy') || []).length + 1), title: 'Conviction', text: '', accent: 'gold' }),
      itemTitle: (p) => `${p.index} — ${p.title}`,
      buildFields: (p) => [fieldGrid(
        fText('Numéro', `${p}.index`),
        fText('Titre', `${p}.title`),
        fSelect('Couleur d\'accent', `${p}.accent`, ACCENTS),
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
    ...paneHeader('Contact & pied de page', 'Les coordonnées, le formulaire et le pied de page.'),
    card('Contact', fieldGrid(
      fText('Titre', 'contact.title', { textarea: true, rows: 3 }),
      fText('Email de réception', 'contact.email', { type: 'email', help: 'Reçoit les messages du formulaire et les demandes de visite.' }),
      fText('Note sous le formulaire', 'contact.formNote', { full: true }),
      fText('Libellé du bouton', 'contact.submitLabel'),
    )),
    card('Lignes de coordonnées', listEditor({
      path: 'contact.lines',
      newItem: () => ({ label: 'Intitulé', value: '', link: '' }),
      itemTitle: (l) => `${l.label} — ${l.value}`,
      buildFields: (p) => [fieldGrid(
        fText('Intitulé', `${p}.label`),
        fText('Valeur affichée', `${p}.value`),
        fText('Lien (optionnel)', `${p}.link`, { full: true, help: 'ex. mailto:…, tel:…, https://…' }),
      )],
      addLabel: '+ Ajouter une ligne',
    })),
    card('Pied de page', fieldGrid(
      fText('Texte du pied de page', 'footer.text', { full: true }),
    )),
  );
}

function renderReglages(pane) {
  pane.append(...paneHeader('Réglages & sécurité', 'Mot de passe, sauvegardes et remise à zéro du brouillon.'));

  // --- Mot de passe ---
  const pwCard = card('Mot de passe d\'accès');
  const pw1 = el('<input type="password" placeholder="Nouveau mot de passe (8 caractères min.)" />');
  const pw2 = el('<input type="password" placeholder="Confirmez le mot de passe" />');
  const pwBtn = el('<button type="button" class="btn-ghost" style="margin-top:0.8rem">Mettre à jour le mot de passe</button>');
  const l1 = el('<label>Nouveau mot de passe</label>'); l1.append(pw1);
  const l2 = el('<label>Confirmation</label>'); l2.append(pw2);
  pwCard.append(fieldGrid(l1, l2), pwBtn,
    el('<p class="field-help" style="margin-top:0.6rem">Le nouveau mot de passe devient actif pour tous après publication. Ce verrou protège l\'interface d\'édition ; la clé réelle de publication reste votre jeton GitHub, gardez-le secret.</p>'));
  pwBtn.addEventListener('click', async () => {
    if (pw1.value.length < 8) return toast('8 caractères minimum.', true);
    if (pw1.value !== pw2.value) return toast('Les deux mots de passe diffèrent.', true);
    set('admin.passwordHash', await hashPassword(pw1.value));
    pw1.value = pw2.value = '';
    toast('Mot de passe mis à jour — publiez pour l\'appliquer.');
  });
  pane.append(pwCard);

  // --- Sauvegarde / restauration ---
  const ioCard = card('Sauvegarde du contenu');
  const exportBtn = el('<button type="button" class="btn-ghost">⤓ Exporter le contenu (site.json)</button>');
  const importBtn = el('<button type="button" class="btn-ghost">⤒ Importer un contenu</button>');
  const importInput = el('<input type="file" accept="application/json" hidden />');
  const row = el('<div style="display:flex;gap:0.8rem;flex-wrap:wrap"></div>');
  row.append(exportBtn, importBtn, importInput);
  ioCard.append(row, el('<p class="field-help" style="margin-top:0.8rem">L\'export télécharge l\'intégralité du contenu. Vous pouvez aussi remplacer manuellement le fichier <code>public/content/site.json</code> du dépôt.</p>'));
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
      try {
        const data = JSON.parse(t);
        draft = data;
        draft.__uploads = draft.__uploads || {};
        saveDraft();
        openPanel(currentPanel);
        toast('Contenu importé dans le brouillon.');
      } catch {
        toast('Fichier JSON invalide.', true);
      }
    });
  });
  pane.append(ioCard);

  // --- Réinitialisation ---
  const resetCard = card('Abandonner le brouillon');
  const resetBtn = el('<button type="button" class="btn-danger">Revenir à la version publiée</button>');
  resetCard.append(resetBtn, el('<p class="field-help" style="margin-top:0.8rem">Supprime toutes les modifications non publiées et recharge le contenu actuellement en ligne.</p>'));
  resetBtn.addEventListener('click', () => {
    if (!confirm('Abandonner toutes les modifications non publiées ?')) return;
    draft = structuredClone(published);
    draft.__uploads = {};
    saveDraft();
    openPanel(currentPanel);
    toast('Brouillon réinitialisé.');
  });
  pane.append(resetCard);
}

const PANELS = [
  { id: 'identite', icon: '◈', label: 'Identité & thème', render: renderIdentite },
  { id: 'sections', icon: '☰', label: 'Sections & menu', render: renderSections },
  { id: 'hero', icon: '✦', label: 'Accueil (hero)', render: renderHero },
  { id: 'agence', icon: '⌂', label: 'Agence', render: renderAgence },
  { id: 'expertise', icon: '⬠', label: 'Expertise', render: renderExpertise },
  { id: 'projets', icon: '△', label: 'Projets', render: renderProjets },
  { id: 'immobilier', icon: '⌘', label: 'Immobilier', render: renderImmobilier },
  { id: 'maquettes', icon: '◱', label: 'Maquettes 3D', render: renderMaquettes },
  { id: 'films', icon: '▶', label: 'Films', render: renderFilms },
  { id: 'cinema', icon: '◉', label: 'Cinématographique', render: renderCinema },
  { id: 'mobilier', icon: '❖', label: 'Mobilier & design', render: renderMobilier },
  { id: 'equipe', icon: '☺', label: 'Équipe', render: renderEquipe },
  { id: 'approche', icon: '☀', label: 'Approche & chiffres', render: renderApproche },
  { id: 'contact', icon: '✉', label: 'Contact & pied de page', render: renderContactPane },
  { id: 'reglages', icon: '⚙', label: 'Réglages & sécurité', render: renderReglages },
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
}

function buildSidebar() {
  const side = $('#admin-sidebar');
  side.innerHTML = '';
  PANELS.forEach((p) => {
    const b = el(`<button type="button" data-panel="${p.id}"><span class="side-icon">${p.icon}</span>${p.label}</button>`);
    b.addEventListener('click', () => openPanel(p.id));
    side.append(b);
  });
}

/* ============================ Publication GitHub ============================ */
function readPublishConfig() {
  try { return JSON.parse(localStorage.getItem(PUBLISH_KEY)) || {}; } catch { return {}; }
}

function openPublishModal() {
  const cfg = readPublishConfig();
  $('#pub-owner').value = cfg.owner || 'arthur50dervaux-cmd';
  $('#pub-repo').value = cfg.repo || 'L-Atelier';
  $('#pub-branch').value = cfg.branch || 'main';
  $('#pub-token').value = cfg.token || '';
  $('#pub-remember').checked = !!cfg.remember;
  const uploads = Object.entries(draft.__uploads || {});
  $('#publish-files').innerHTML = `À publier :<ul>${uploads.map(([p, u]) =>
    `<li>${p} (${(u.size / 1048576).toFixed(1)} Mo)</li>`).join('')}<li>content/site.json (tout le contenu)</li></ul>`;
  $('#publish-log').hidden = true;
  $('#publish-log').textContent = '';
  $('#publish-modal').hidden = false;
}

async function ghRequest(cfg, method, path, body) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
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
    remember: $('#pub-remember').checked,
  };
  if (!cfg.owner || !cfg.repo || !cfg.token) return toast('Renseignez le propriétaire, le dépôt et le jeton.', true);
  localStorage.setItem(PUBLISH_KEY, JSON.stringify({ ...cfg, token: cfg.remember ? cfg.token : '' }));

  const logEl = $('#publish-log');
  logEl.hidden = false;
  const log = (m) => { logEl.textContent += m + '\n'; logEl.scrollTop = logEl.scrollHeight; };
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
  draft.__uploads = draft.__uploads || {};

  if (sessionStorage.getItem(SESSION_KEY) === 'ok') showApp();

  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pw = new FormData(e.target).get('password');
    const hash = await hashPassword(pw);
    const expected = draft.admin?.passwordHash || published.admin?.passwordHash || DEFAULT_HASH;
    if (hash === expected) {
      sessionStorage.setItem(SESSION_KEY, 'ok');
      showApp();
    } else {
      $('#login-error').hidden = false;
    }
  });
}

function showApp() {
  $('#login-screen').style.display = 'none';
  $('#admin-app').hidden = false;
  buildSidebar();
  openPanel(currentPanel);
  updateDirty();

  $('#btn-preview').addEventListener('click', () => {
    saveDraft();
    window.open('./?preview=1', '_blank');
  });
  $('#btn-publish').addEventListener('click', openPublishModal);
  $('#btn-do-publish').addEventListener('click', doPublish);
  document.querySelectorAll('[data-publish-close]').forEach((b) =>
    b.addEventListener('click', () => { $('#publish-modal').hidden = true; }));
  $('#btn-logout').addEventListener('click', () => {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.reload();
  });
  window.addEventListener('beforeunload', (e) => {
    if (memoryOnly && Object.keys(draft.__uploads || {}).length) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}

boot();
