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

## Mise en ligne (GitHub Pages)
Le déploiement est automatique via GitHub Actions
(`.github/workflows/deploy.yml`) à chaque push sur `main`.

**Activation (une seule fois) :**
1. Sur GitHub : **Settings → Pages → Build and deployment → Source = GitHub Actions**.
2. Fusionnez la branche sur `main` (ou poussez sur `main`).
3. Le site sera publié sur `https://<utilisateur>.github.io/<dépôt>/`.

Pour un **domaine personnalisé**, ajoutez-le dans Settings → Pages et
créez un fichier `public/CNAME` contenant le domaine.

## Pile technique
- **Vite** — build et dev server
- **Three.js** — scène 3D du hero + visualiseur de maquette (GLTF, OrbitControls)
- **GSAP + ScrollTrigger** — animations et caméra pilotée au scroll
- **Lenis** — défilement fluide
