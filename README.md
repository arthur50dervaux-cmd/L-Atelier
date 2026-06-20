# Atelier Dervaux — Site de l'agence d'architecture

Site vitrine d'agence d'architecture : hero cinématique 3D (paysage
méditerranéen généré en temps réel), expertise, projets filtrables,
**visualiseur de maquette 3D** (Revit / scan), **films de rendus**, et
contact. Construit avec **Vite + Three.js + GSAP + Lenis**.

## Démarrer en local
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # génère dist/
npm run preview  # prévisualise le build
```

## Ajouter vos contenus
| Contenu | Où le déposer | Détails |
|---|---|---|
| Maquette 3D (Revit / scan) | `public/models/maquette.glb` | voir `public/models/README.md` |
| Films / rendus vidéo | `public/films/*.mp4` | voir `public/films/README.md` |
| Photos / rendus HD | `public/gallery/*` + `data-image` | voir `public/gallery/README.md` |
| Textes, projets | `index.html` | tout est éditable directement |

## Mise en ligne (gratuit, sécurisé, mondial)

Le site est statique : il peut être hébergé gratuitement avec HTTPS
automatique et un CDN mondial. Trois options, par ordre de recommandation.

### 1. Netlify — recommandé (le plus simple)
1. Créez un compte sur [netlify.com](https://www.netlify.com) (gratuit).
2. **Add new site → Import an existing project → GitHub**, choisissez ce dépôt.
3. Netlify lit `netlify.toml` (build = `npm run build`, dossier `dist`) — validez.
4. Le site est publié sur `https://<nom>.netlify.app` en ~1 min, redéployé à chaque push.
5. Domaine perso : **Domain settings → Add a custom domain** (SSL gratuit inclus).

### 2. Cloudflare Pages — alternative (réseau ultra-rapide)
1. [pages.cloudflare.com](https://pages.cloudflare.com) → **Create a project** → connectez le dépôt.
2. Build command : `npm run build` · Output directory : `dist`.
3. Publié sur `https://<projet>.pages.dev`. Le fichier `public/_headers` applique
   les en-têtes de sécurité.

### 3. GitHub Pages — déjà configuré
Déploiement automatique via GitHub Actions (`.github/workflows/deploy.yml`).
Activez **Settings → Pages → Source = GitHub Actions**, puis poussez sur `main`.
Publié sur `https://<utilisateur>.github.io/<dépôt>/`.

> **Sécurité** : en-têtes HTTP durcis (CSP, HSTS, X-Frame-Options, etc.)
> définis dans `netlify.toml` et `public/_headers`. HTTPS est automatique
> et gratuit sur les trois plateformes — le site est accessible à tous,
> partout, en toute sécurité.

## Pile technique
- **Vite** — build et dev server
- **Three.js** — scène 3D du hero + visualiseur de maquette (GLTF, OrbitControls)
- **GSAP + ScrollTrigger** — animations et caméra pilotée au scroll
- **Lenis** — défilement fluide
