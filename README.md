# L'Atelier — Site de l'agence d'architecture

Site vitrine de l'agence **L'Atelier** (architecture & immobilier méditerranéen),
dans une **interface éditoriale** inspirée des grandes agences d'architecture :
papier crème et grain, grands titres serif, sections numérotées, filets fins,
photos plein cadre, menu plein écran. Au programme : ouverture plein écran,
projets par état (à venir / concours / en cours / terminés), immobilier de
prestige avec pages de détail, **visualiseur de maquettes 3D Revit** avec
**mode cinématique**, films & photographies, mobilier & **catalogue PDF**,
études (ENSAP Bordeaux) — et une **administration complète** qui rend le site
modifiable à 100 % sans toucher au code.
Construit avec **Vite + Three.js + GSAP + Lenis**, sans aucune dépendance
externe à l'exécution.

## Administration du site (`/admin.html`)

Tout le contenu **et toute l'apparence** vivent dans `public/content/site.json`
et s'éditent depuis l'interface d'administration, répartie en 20 panneaux :

| Panneau | Ce qu'il pilote |
|---|---|
| Identité & thème | Nom, monogramme, 18 couleurs, 4 palettes prêtes à l'emploi |
| **Design & typographie** | Polices, graisses, échelle des titres, densité, interlettrage, largeur, filets, arrondis, grain, format des cartes, vitesse des animations, hauteur et voile du hero |
| **Sections, ordre & menu** | Visibilité, libellés, **ordre des sections** (flèches ↑↓) et **création de sections libres** |
| Accueil, Agence, Expertise, Projets, Immobilier, Maquettes 3D, Films, Cinéma, Mobilier, Équipe, Études | Le contenu de chaque section |
| **Sections libres** | Paragraphes et galerie des sections que vous avez créées |
| Approche & chiffres | Convictions et chiffres animés |
| Contact & pied de page | Coordonnées, **réseaux sociaux**, **pages légales**, pied de page |
| **Référencement** | Titres Google, partage sur les réseaux, données structurées |
| **Médiathèque** | Fichiers téléversés en attente de publication, poids, retrait |
| Réglages & sécurité | Mot de passe, session, **historique des versions**, export / import |

1. Ouvrez `https://votre-site/admin.html` (lien discret « Admin » en pied de page).
2. Mot de passe par défaut : **`atelier2026`** — changez-le dès la première
   connexion (panneau **Réglages & sécurité**), puis publiez.
3. Modifiez ce que vous voulez : le brouillon est sauvegardé automatiquement
   sur votre appareil, et les 10 dernières versions restent restaurables.
4. **Prévisualiser** ouvre le site avec votre brouillon (`/?preview=1`) —
   les visiteurs, eux, voient toujours la version publiée.
5. **Publier** envoie `site.json` (et vos fichiers téléversés, dans
   `public/uploads/`) directement dans ce dépôt GitHub : le site se
   redéploie automatiquement en une à deux minutes.

### Jeton de publication GitHub
La publication utilise l'API GitHub. Créez un jeton « fine-grained » :
**GitHub → Settings → Developer settings → Personal access tokens →
Fine-grained tokens → Generate new token**, limité à **ce dépôt uniquement**,
avec la seule permission **Contents : Read and write**.

Dans la fenêtre de publication, choisissez comment le jeton est conservé :
- **Ne pas conserver** (par défaut, le plus sûr) — à ressaisir à chaque publication ;
- **Jusqu'à la fermeture de l'onglet** — gardé en mémoire de session ;
- **Chiffré sur cet appareil** — chiffré en AES-GCM avec une clé dérivée de
  votre mot de passe d'administration ; sans ce mot de passe, le jeton stocké
  est illisible.

## Sécurité

Le site est statique : le mot de passe d'administration est un **verrou
d'interface** (personne ne peut publier sans lui **et** sans le jeton GitHub),
mais la véritable clé reste le **jeton GitHub** — ne le partagez jamais.

- **Mot de passe** : empreinte **PBKDF2-SHA256**, sel aléatoire, 310 000
  itérations (recommandation OWASP), comparaison à temps constant. Les
  anciennes empreintes SHA-256 sont migrées automatiquement à la connexion.
  Minimum 12 caractères, robustesse mesurée à la saisie.
- **Force brute** : après 5 échecs (réglable), l'accès est bloqué 1 min, puis
  2, 4, 8… jusqu'à 1 heure, avec compte à rebours affiché.
- **Session** : expire après 60 minutes (réglable) et se prolonge tant que
  vous travaillez ; la déconnexion efface le jeton de session.
- **Injections** : toutes les URL du contenu sont assainies avant affichage
  (`javascript:`, `data:text/html`, évasion de contexte CSS…) et tous les
  textes sont échappés. Un contenu importé ne peut pas exécuter de script.
- **CSP** : déclarée en balise `meta` dans les pages **et** dans
  `public/_headers`. GitHub Pages n'envoyant pas d'en-têtes personnalisés, la
  balise `meta` est ce qui protège réellement le site en ligne. Aucun script,
  aucune police, aucun cadre externe autorisés ; `base-uri`, `object-src` et
  `form-action` verrouillés.
- **Vie privée** : les polices sont auto-hébergées — aucune requête vers
  Google Fonts ni vers un service tiers.
- `admin.html` est en `noindex`, exclu du `robots.txt` et absent du menu.

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

## Catalogue PDF du mobilier

Le bouton « Ouvrir le catalogue » de la section Mobilier génère un catalogue
en pages A4 à partir de vos pièces : couverture, une fiche par pièce (photo,
matière, dimensions, édition, prix) et page de contact. Le bouton
**Enregistrer en PDF** ouvre l'impression du navigateur — choisissez
« Enregistrer au format PDF » pour obtenir un fichier prêt à envoyer.

## Pages légales

Les pages légales (mentions légales, confidentialité…) se créent dans
**Contact & pied de page → Pages légales**. Elles apparaissent dans le pied de
page et s'ouvrent sans quitter le site. Dans le contenu, une ligne vide sépare
les paragraphes et une ligne commençant par `#` devient un sous-titre.

## L'expérience de défilement

Le site se parcourt comme une séquence, sans aucune animation d'introduction :
tout se joue au défilement. Chaque effet se désactive séparément dans le
panneau **Expérience** de l'administration, et **tous** sont neutralisés pour
les visiteurs dont le système demande un mouvement réduit.

| Effet | Ce qu'il fait |
|---|---|
| Titres mot à mot | Chaque mot monte derrière un masque, en cascade |
| Manifeste vivant | Le texte s'allume mot après mot au rythme de la lecture |
| Chorégraphie du hero | L'image s'éloigne pendant que le titre s'efface : on « entre » dans le site |
| **Panorama** | Une bande d'images plein écran défile horizontalement pendant que la page reste épinglée |
| Curseur contextuel | Un anneau qui suit avec inertie, grossit et annonce l'action (« Découvrir », « Voir ») |
| Boutons aimantés | Les boutons se laissent attirer par le curseur, avec retour élastique |
| Bandeau défilant | Une ligne typographique géante qui accélère avec la vitesse de lecture |
| Fond évolutif | La couleur de page se transforme d'une section à l'autre, sans césure |
| Index de chapitre | Un repère discret à droite, soulignant la section en cours |

Sur écran tactile, curseur et aimantation sont ignorés ; sous 900 px, le
panorama devient une bande à faire glisser au doigt.

## Accessibilité & performance

- Lien d'évitement, focus visibles, cartes activables au clavier, libellés
  ARIA sur les couches plein écran, contraste respecté.
- Le réglage système **« mouvement réduit »** est respecté : aucune animation,
  contenu immédiatement visible.
- Images en chargement paresseux, photo d'accueil priorisée, polices variables
  (une requête par famille), défilement fluide désactivé si mouvement réduit.

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
| Textes, couleurs, design, sections, projets, biens, équipe… | Admin (`/admin.html`) | éditer `public/content/site.json` |
| Photos / rendus HD | Admin → bouton « Téléverser » | déposer dans `public/gallery/` et référencer le chemin |
| Maquette 3D (Revit / scan) | Admin → Maquettes 3D | déposer dans `public/models/` |
| Films / rendus vidéo | Admin → Films | déposer dans `public/films/*.mp4` |

## Mise en ligne

Le site est statique : hébergement gratuit avec HTTPS automatique et CDN.

- **GitHub Pages** — déjà configuré : déploiement automatique via GitHub
  Actions à chaque push sur `main`, donc aussi à chaque publication depuis
  l'admin. (**Settings → Pages → Source = GitHub Actions**.)
- **Netlify** — `netlify.toml` est déjà configuré (build `npm run build`,
  dossier `dist`).
- **Cloudflare Pages** — build `npm run build`, sortie `dist` ;
  `public/_headers` applique les en-têtes de sécurité.

## Pile technique
- **Vite** — build multi-pages (site + administration)
- **Three.js** — visualiseur de maquettes (GLTF, OrbitControls, mode cinématique)
- **GSAP + ScrollTrigger** — apparitions au scroll, compteurs, parallaxe
- **Lenis** — défilement fluide
- **Polices** — Cormorant Garamond & Jost, variables et auto-hébergées (SIL OFL)
- **Contenu** — `public/content/site.json`, édité et publié par l'admin (API GitHub)
