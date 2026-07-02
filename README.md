# L'Atelier — Site de l'agence d'architecture

Site vitrine de l'agence **L'Atelier** (architecture & immobilier méditerranéen) :
hero cinématique 3D, projets par état (à venir / concours / en cours / terminés),
immobilier de prestige façon Kretz, **visualiseur de maquettes 3D Revit** avec
**mode cinématique** (travelling automatique, lumière dorée, letterbox cinéma),
films & photographies qualité cinéma, mobilier & design — et une
**administration complète** pour tout modifier sans toucher au code.
Construit avec **Vite + Three.js + GSAP + Lenis**.

## Administration du site (`/admin.html`)

Tout le contenu vit dans `public/content/site.json` et s'édite depuis
l'interface d'administration : textes, couleurs de la palette méditerranéenne,
sections visibles et menu, projets, biens immobiliers, maquettes 3D, films,
mobilier, équipe, contact…

1. Ouvrez `https://votre-site/admin.html` (lien discret « Admin » en pied de page).
2. Mot de passe par défaut : **`atelier2026`** — changez-le dès la première
   connexion (panneau **Réglages & sécurité**), puis publiez.
3. Modifiez ce que vous voulez : le brouillon est sauvegardé automatiquement
   sur votre appareil.
4. **Prévisualiser** ouvre le site avec votre brouillon (`/?preview=1`) —
   les visiteurs, eux, voient toujours la version publiée.
5. **Publier** envoie `site.json` (et vos fichiers téléversés, dans
   `public/uploads/`) directement dans ce dépôt GitHub : le site se
   redéploie automatiquement en une à deux minutes.

### Jeton de publication GitHub
La publication utilise l'API GitHub. Créez un jeton « fine-grained » :
**GitHub → Settings → Developer settings → Personal access tokens →
Fine-grained tokens → Generate new token**, limité à **ce dépôt uniquement**,
avec la seule permission **Contents : Read and write**. Collez-le dans la
fenêtre de publication (cochez « Mémoriser » uniquement sur un appareil sûr).

### Sécurité — à savoir
- Le site est statique : le mot de passe admin est un **verrou d'interface**
  (personne ne peut publier sans lui **et** sans le jeton GitHub), mais la
  véritable clé est le **jeton GitHub** — ne le partagez jamais.
- Le mot de passe n'est jamais stocké en clair (empreinte SHA-256 salée).
- `admin.html` est en `noindex` et n'apparaît pas dans le menu du site.

## Maquettes 3D (Revit) & mode cinématique

- Exportez votre maquette Revit au format **`.glb`** (plugin d'export glTF
  pour Revit, ou export FBX/OBJ puis conversion), idéalement compressée
  (Draco / `gltf-transform`) et sous ~25 Mo.
- Déposez le fichier dans `public/models/` **ou** téléversez-le depuis
  l'admin (panneau **Maquettes 3D**) — plusieurs maquettes possibles, un
  sélecteur apparaît au-dessus du visualiseur.
- Le visiteur dispose des vues (perspective / plan / façade), des matériaux
  (réaliste / maquette blanche / filaire), de l'étude d'ensoleillement, du
  plein écran et du bouton **✦ Cinématique** : la caméra parcourt la maquette
  en travelling continu, bandes cinéma et heure dorée comprises.

## Démarrer en local
```bash
npm install
npm run dev      # http://localhost:5173 (admin : /admin.html)
npm run build    # génère dist/
npm run preview  # prévisualise le build
```

## Ajouter vos contenus
| Contenu | Le plus simple | Alternative manuelle |
|---|---|---|
| Textes, couleurs, sections, projets, biens, équipe… | Admin (`/admin.html`) | éditer `public/content/site.json` |
| Photos / rendus HD | Admin → bouton « Téléverser » | déposer dans `public/gallery/` et référencer le chemin |
| Maquette 3D (Revit / scan) | Admin → Maquettes 3D | déposer dans `public/models/` (voir son README) |
| Films / rendus vidéo | Admin → Films | déposer dans `public/films/*.mp4` |

## Mise en ligne (gratuit, sécurisé, mondial)

Le site est statique : hébergement gratuit avec HTTPS automatique et CDN.

### 1. GitHub Pages — déjà configuré
Déploiement automatique via GitHub Actions (`.github/workflows/deploy.yml`)
à chaque push sur `main` — donc aussi à chaque **publication depuis l'admin**.
Activez **Settings → Pages → Source = GitHub Actions** si besoin.

### 2. Netlify
**Add new site → Import an existing project → GitHub** : `netlify.toml`
est déjà configuré (build `npm run build`, dossier `dist`). Chaque
publication admin (commit sur `main`) redéploie le site.

### 3. Cloudflare Pages
**Create a project** → connectez le dépôt. Build : `npm run build`,
sortie : `dist`. `public/_headers` applique les en-têtes de sécurité.

> **Sécurité** : en-têtes HTTP durcis (CSP, HSTS, X-Frame-Options…) définis
> dans `netlify.toml` et `public/_headers`. La CSP autorise uniquement
> `api.github.com` (publication admin) en plus du site lui-même.

## Pile technique
- **Vite** — build multi-pages (site + administration)
- **Three.js** — scène 3D du hero + visualiseur de maquettes (GLTF, OrbitControls, mode cinématique)
- **GSAP + ScrollTrigger** — animations et caméra pilotée au scroll
- **Lenis** — défilement fluide
- **Contenu** — `public/content/site.json`, édité et publié par l'admin (API GitHub)
