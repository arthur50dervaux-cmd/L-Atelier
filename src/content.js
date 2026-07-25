/**
 * Couche partagée entre le site public et l'administration.
 *
 * Tout le contenu du site vit dans public/content/site.json. Le site le
 * charge à l'exécution ; l'admin l'édite, le prévisualise (brouillon en
 * localStorage, lu quand l'URL contient ?preview=1) puis le publie.
 *
 * Ce module concentre aussi les fonctions sensibles : assainissement des
 * URL (anti-XSS), empreinte de mot de passe (PBKDF2), chiffrement du jeton
 * de publication (AES-GCM) et application du thème / de la typographie.
 */

export const DRAFT_KEY = 'latelier:draft';
export const PUBLISH_KEY = 'latelier:publish-config';
export const SESSION_KEY = 'latelier:admin-session';
export const GUARD_KEY = 'latelier:auth-guard';
export const HISTORY_KEY = 'latelier:draft-history';

/* Dégradés de repli des visuels "art-*" (restent visibles si la photo ne charge pas). */
export const ART_GRADIENTS = {
  'art-sea': 'linear-gradient(160deg, #1a6f8a 0%, #2aa5c4 40%, #e0a04b 78%, #f4d28a 100%)',
  'art-vine': 'linear-gradient(160deg, #38491f 0%, #7a8a3c 45%, #c7a83f 80%, #e6d27a 100%)',
  'art-villa': 'linear-gradient(160deg, #1c2733 0%, #3a5266 40%, #7da0b4 75%, #d8e4ea 100%)',
  'art-cliff': 'linear-gradient(160deg, #3a2b20 0%, #a06a45 45%, #d99a65 72%, #1a8fb3 100%)',
  'art-interior': 'linear-gradient(160deg, #2a1f1a 0%, #7a4f2c 45%, #c08a52 80%, #e6cba3 100%)',
  'art-domaine': 'linear-gradient(160deg, #25321d 0%, #6b6b2c 40%, #c79a40 75%, #e0703f 100%)',
  'art-design': 'linear-gradient(160deg, #3a2418 0%, #8a5a35 45%, #d9a35c 78%, #efc878 100%)',
};

export const ART_KEYS = Object.keys(ART_GRADIENTS);

/* ============================ Assainissement ============================ */

/**
 * URL de lien sûre. Seuls http(s), mailto, tel et les chemins relatifs sont
 * acceptés : cela neutralise `javascript:`, `data:text/html` et consorts, qui
 * pourraient sinon être injectés via un contenu édité ou un brouillon importé.
 */
export function safeLinkUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  // Les caractères de contrôle servent à masquer un schéma (ex. "java\0script:").
  const clean = raw.replace(/[\u0000-\u001f\u007f]/g, '');
  if (/^(https?:|mailto:|tel:)/i.test(clean)) return clean;
  // Chemins relatifs, ancres et racine — jamais de schéma implicite (//host).
  if (/^\/\//.test(clean)) return '';
  if (/^[#/.]/.test(clean)) return clean;
  if (/^[\w./-]+$/.test(clean)) return clean;
  return '';
}

/**
 * URL de média sûre : accepte en plus les data-URL d'image / vidéo / modèle
 * (les téléversements non encore publiés sont des data-URL) et les blob:.
 */
export function safeMediaUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const clean = raw.replace(/[\u0000-\u001f\u007f]/g, '');
  if (/^data:(image|video|audio|model|application\/octet-stream)[/;]/i.test(clean)) return clean;
  if (/^blob:/i.test(clean)) return clean;
  return safeLinkUrl(clean);
}

/** Échappe une URL pour un `url("…")` CSS (empêche toute évasion du contexte). */
export function cssUrl(value) {
  const url = safeMediaUrl(value);
  if (!url) return '';
  return `url("${url.replace(/["\\]/g, '\\$&').replace(/[\n\r]/g, '')}")`;
}

export function isPreview() {
  return new URLSearchParams(window.location.search).has('preview');
}

/* ============================ Contenu ============================ */

export function readDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function fetchPublished() {
  const res = await fetch('content/site.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`site.json introuvable (${res.status})`);
  return res.json();
}

/** Contenu à afficher : brouillon (préversion) ou contenu publié. */
export async function loadContent() {
  if (isPreview()) {
    const draft = readDraft();
    if (draft) return draft;
  }
  return fetchPublished();
}

/**
 * Résout un visuel : classe "art-*" (dégradé + photo d'habillage), chemin
 * local ("uploads/…", "gallery/…"), ou URL complète. Les fichiers téléversés
 * mais pas encore publiés sont résolus via le brouillon (data-URL).
 */
export function visualUrl(content, value) {
  if (!value) return '';
  const key = String(value);
  if (key.startsWith('art-')) return safeMediaUrl((content.visuals || {})[key] || '');
  const upload = (content.__uploads || {})[key];
  if (upload && upload.dataUrl) return safeMediaUrl(upload.dataUrl);
  return safeMediaUrl(key);
}

export function visualClass(value) {
  return value && String(value).startsWith('art-') ? value : '';
}

/** Style background-image complet : photo au-dessus, dégradé de repli dessous. */
export function visualBackground(content, value) {
  const url = cssUrl(visualUrl(content, value));
  const gradient = value && String(value).startsWith('art-') ? ART_GRADIENTS[value] : '';
  if (url && gradient) return `${url}, ${gradient}`;
  if (url) return url;
  return gradient || '';
}

/* ============================ Thème & design ============================ */

const THEME_VARS = {
  bg: '--bg', bgLight: '--bg-light', cream: '--cream', creamDim: '--cream-dim',
  ink: '--ink', inkSoft: '--ink-soft', gold: '--gold', goldSoft: '--gold-soft',
  azur: '--azur', azurDeep: '--azur-deep', turquoise: '--turquoise',
  coral: '--coral', coralSoft: '--coral-soft', terracotta: '--terracotta',
  olive: '--olive', sand: '--sand', sea: '--sea', rose: '--rose',
};

/** Familles proposées dans l'admin (toutes disponibles sans requête externe). */
export const FONT_STACKS = {
  cormorant: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
  jost: "'Jost', 'Helvetica Neue', Arial, sans-serif",
  georgia: "Georgia, 'Times New Roman', serif",
  times: "'Times New Roman', Times, serif",
  helvetica: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  system: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  mono: "ui-monospace, 'SFMono-Regular', Menlo, monospace",
};

export const FONT_LABELS = {
  cormorant: 'Cormorant Garamond (serif éditorial)',
  jost: 'Jost (sans géométrique)',
  georgia: 'Georgia (serif classique)',
  times: 'Times New Roman (serif de labeur)',
  helvetica: 'Helvetica Neue (sans neutre)',
  system: 'Police du système (la plus rapide)',
  mono: 'Monospace (technique)',
};

/** Valeurs de repli du système de design, toutes surchargeables par l'admin. */
export const DESIGN_DEFAULTS = {
  titleFont: 'cormorant',
  bodyFont: 'jost',
  scale: 1,
  bodySize: 1,
  titleWeight: 400,
  bodyWeight: 300,
  tracking: 1,
  density: 1,
  maxWidth: 1360,
  hairline: 1,
  radius: 0,
  imageRounding: 0,
  motion: 1,
  revealDistance: 32,
  hoverZoom: 1.05,
  grain: 0.035,
  heroOverlay: 0.42,
  heroHeight: 100,
  cardRatio: '4/3',
  accent: 'terracotta',
};

const num = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/** Applique la palette du thème sur les variables CSS du document. */
export function applyTheme(theme = {}) {
  const root = document.documentElement;
  Object.entries(THEME_VARS).forEach(([key, cssVar]) => {
    const value = theme[key];
    // Seules les couleurs CSS simples sont acceptées (pas d'expression arbitraire).
    if (typeof value === 'string'
      && /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%/]+\)|hsla?\([\d\s.,%/a-z]+\))$/i.test(value.trim())) {
      root.style.setProperty(cssVar, value.trim());
    }
  });
}

/**
 * Applique le système de design (typographie, densité, animations) : chaque
 * réglage de l'admin devient une variable CSS, ce qui rend l'apparence du
 * site entièrement pilotable sans toucher au code.
 */
export function applyDesign(design = {}) {
  const d = { ...DESIGN_DEFAULTS, ...design };
  const root = document.documentElement;
  const set = (name, value) => root.style.setProperty(name, value);

  set('--serif', FONT_STACKS[d.titleFont] || FONT_STACKS.cormorant);
  set('--sans', FONT_STACKS[d.bodyFont] || FONT_STACKS.jost);
  set('--scale', String(num(d.scale, 1)));
  set('--body-size', `${num(d.bodySize, 1)}rem`);
  set('--title-weight', String(num(d.titleWeight, 400)));
  set('--body-weight', String(num(d.bodyWeight, 300)));
  set('--tracking', String(num(d.tracking, 1)));
  set('--density', String(num(d.density, 1)));
  set('--max-width', `${num(d.maxWidth, 1360)}px`);
  set('--hairline', `${num(d.hairline, 1)}px`);
  set('--radius', `${num(d.radius, 0)}px`);
  set('--image-radius', `${num(d.imageRounding, 0)}px`);
  set('--motion', String(num(d.motion, 1)));
  set('--reveal-y', `${num(d.revealDistance, 32)}px`);
  set('--hover-zoom', String(num(d.hoverZoom, 1.05)));
  set('--grain-opacity', String(num(d.grain, 0.035)));
  set('--hero-overlay', String(num(d.heroOverlay, 0.42)));
  set('--hero-height', `${num(d.heroHeight, 100)}svh`);
  set('--card-ratio', /^[\d]+\s*\/\s*[\d]+$/.test(String(d.cardRatio)) ? String(d.cardRatio) : '4/3');
  set('--accent', THEME_VARS[d.accent] ? `var(${THEME_VARS[d.accent]})` : 'var(--terracotta)');
}

/* ============================ Sécurité ============================ */

const enc = new TextEncoder();

export async function sha256(text) {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Ancienne empreinte (SHA-256 salée) — conservée pour migrer les comptes. */
export function hashPassword(password) {
  return sha256(`latelier::${password}`);
}

const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex) => new Uint8Array((String(hex).match(/.{1,2}/g) || []).map((b) => parseInt(b, 16)));

export const PBKDF2_ITERATIONS = 310000;

async function deriveBits(password, salt, iterations, bits = 256) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, bits);
}

/**
 * Crée l'enregistrement d'un mot de passe : PBKDF2-SHA256, sel aléatoire et
 * 310 000 itérations (recommandation OWASP). Une empreinte volée ne permet
 * plus d'essayer des millions de mots de passe à la seconde.
 */
export async function createPasswordRecord(password, iterations = PBKDF2_ITERATIONS) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await deriveBits(password, salt, iterations);
  return { algo: 'pbkdf2-sha256', iterations, salt: toHex(salt), hash: toHex(bits) };
}

/** Comparaison à temps constant (évite de fuiter l'empreinte par la durée). */
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Vérifie un mot de passe contre un enregistrement PBKDF2 ou, à défaut,
 * contre l'ancienne empreinte SHA-256 (migration transparente).
 */
export async function verifyPassword(password, record, legacyHash) {
  if (record && record.algo === 'pbkdf2-sha256' && record.salt && record.hash) {
    const bits = await deriveBits(password, fromHex(record.salt), Number(record.iterations) || PBKDF2_ITERATIONS);
    return timingSafeEqual(toHex(bits), String(record.hash));
  }
  if (legacyHash) return timingSafeEqual(await hashPassword(password), String(legacyHash));
  return false;
}

/** Mots de passe trop devinables : le mot seul, éventuellement suivi de chiffres. */
const COMMON_WORDS = ['azerty', 'qwerty', 'motdepasse', 'password', 'atelier', 'admin', 'bonjour', 'soleil'];

/** Estimation simple de la robustesse d'un mot de passe (0 à 4). */
export function passwordStrength(password) {
  const pw = String(password || '');
  let score = 0;
  if (pw.length >= 12) score++;
  if (pw.length >= 16) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^\w\s]/.test(pw)) score++;

  // On ne disqualifie que les mots de passe réellement triviaux : une suite
  // d'un même caractère, une séquence de clavier, ou un mot courant seul
  // (« atelier2026 »). Un mot courant *inclus* dans une longue phrase de passe
  // reste parfaitement valable.
  const letters = pw.toLowerCase().replace(/[^a-z]/g, '');
  const trivial = /^(.)\1+$/.test(pw)
    || /^(1234|12345|abcd|0000)/.test(pw)
    || (COMMON_WORDS.includes(letters) && pw.length < 16);
  if (trivial) score = 0;
  return Math.min(score, 4);
}

/* ---- Chiffrement du jeton de publication (AES-GCM, clé dérivée du mot de passe) ---- */

async function deriveAesKey(password, salt) {
  const bits = await deriveBits(password, salt, PBKDF2_ITERATIONS);
  return crypto.subtle.importKey('raw', bits, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptSecret(plaintext, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(password, salt);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
  return { v: 1, salt: toHex(salt), iv: toHex(iv), data: toHex(ct) };
}

export async function decryptSecret(payload, password) {
  if (!payload || !payload.salt || !payload.iv || !payload.data) return '';
  const key = await deriveAesKey(password, fromHex(payload.salt));
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromHex(payload.iv) }, key, fromHex(payload.data),
  );
  return new TextDecoder().decode(plain);
}

/* ---- Protection contre les tentatives répétées (force brute) ---- */

export function readGuard() {
  try { return JSON.parse(localStorage.getItem(GUARD_KEY)) || { fails: 0, until: 0 }; }
  catch { return { fails: 0, until: 0 }; }
}

function writeGuard(guard) {
  try { localStorage.setItem(GUARD_KEY, JSON.stringify(guard)); } catch { /* stockage plein */ }
}

/** Millisecondes de blocage restantes, 0 si l'accès est ouvert. */
export function guardLockedFor() {
  const { until } = readGuard();
  return Math.max(0, Number(until || 0) - Date.now());
}

/** Enregistre un échec : blocage progressif à partir de la 5ᵉ tentative. */
export function guardFailure(maxAttempts = 5) {
  const guard = readGuard();
  guard.fails = Number(guard.fails || 0) + 1;
  if (guard.fails >= maxAttempts) {
    const over = guard.fails - maxAttempts;
    // 1 min, 2 min, 4 min… plafonné à 1 heure.
    guard.until = Date.now() + Math.min(60000 * 2 ** over, 3600000);
  }
  writeGuard(guard);
  return guard;
}

export function guardReset() {
  try { localStorage.removeItem(GUARD_KEY); } catch { /* ignoré */ }
}

/* ---- Session d'administration (expiration + inactivité) ---- */

export function startSession(ttlMinutes = 60) {
  const ttl = Math.max(1, Number(ttlMinutes) || 60) * 60000;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ at: Date.now(), ttl }));
}

export function readSession() {
  try {
    const s = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    if (!s || !s.at) return null;
    if (Date.now() - s.at > s.ttl) { sessionStorage.removeItem(SESSION_KEY); return null; }
    return s;
  } catch { return null; }
}

export function touchSession() {
  const s = readSession();
  if (s) startSession(s.ttl / 60000);
}

export function endSession() {
  sessionStorage.removeItem(SESSION_KEY);
}
