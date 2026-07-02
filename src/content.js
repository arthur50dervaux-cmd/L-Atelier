/**
 * Couche de contenu partagée entre le site public et l'administration.
 *
 * Tout le contenu du site vit dans public/content/site.json. Le site le
 * charge à l'exécution ; l'admin l'édite, le prévisualise (brouillon en
 * localStorage, lu quand l'URL contient ?preview=1) puis le publie.
 */

export const DRAFT_KEY = 'latelier:draft';
export const PUBLISH_KEY = 'latelier:publish-config';
export const SESSION_KEY = 'latelier:admin-session';

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

export function isPreview() {
  return new URLSearchParams(window.location.search).has('preview');
}

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
  if (value.startsWith('art-')) return (content.visuals || {})[value] || '';
  const upload = (content.__uploads || {})[value];
  if (upload && upload.dataUrl) return upload.dataUrl;
  return value;
}

export function visualClass(value) {
  return value && value.startsWith('art-') ? value : '';
}

/** Style background-image complet : photo au-dessus, dégradé de repli dessous. */
export function visualBackground(content, value) {
  const url = visualUrl(content, value);
  const gradient = value && value.startsWith('art-') ? ART_GRADIENTS[value] : '';
  if (url && gradient) return `url("${url}"), ${gradient}`;
  if (url) return `url("${url}")`;
  return gradient || '';
}

/** Applique la palette du thème sur les variables CSS du document. */
export function applyTheme(theme = {}) {
  const map = {
    bg: '--bg', bgLight: '--bg-light', cream: '--cream', creamDim: '--cream-dim',
    ink: '--ink', inkSoft: '--ink-soft', gold: '--gold', goldSoft: '--gold-soft',
    azur: '--azur', azurDeep: '--azur-deep', turquoise: '--turquoise',
    coral: '--coral', coralSoft: '--coral-soft', terracotta: '--terracotta',
    olive: '--olive', sand: '--sand', sea: '--sea', rose: '--rose',
  };
  const root = document.documentElement;
  Object.entries(map).forEach(([key, cssVar]) => {
    if (theme[key]) root.style.setProperty(cssVar, theme[key]);
  });
}

export async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Empreinte du mot de passe admin (salée pour ne pas être une empreinte "nue"). */
export function hashPassword(password) {
  return sha256(`latelier::${password}`);
}
