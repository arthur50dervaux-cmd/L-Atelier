/**
 * Données du site — éditez ce fichier pour mettre à jour les contenus.
 * Les sections Conception, Immobilier et Équipe sont générées à partir d'ici.
 */

/* ---------- CONCEPTION : projets par état ---------- */
export const projects = {
  avenir: [
    { title: 'Villa Aurore', place: 'Villefranche-sur-Mer', year: '2027', art: 'art-sea',
      desc: "Une villa belvédère en gradins sur la rade de Villefranche. Études en cours, dépôt de permis prévu au printemps." },
    { title: 'Refuge des Pins', place: 'Ramatuelle', year: '2027', art: 'art-villa',
      desc: "Maison-patio enfouie dans la pinède, pensée comme une clairière habitée ouverte sur la mer." },
    { title: 'Belvédère des Maures', place: 'Le Lavandou', year: '2028', art: 'art-cliff',
      desc: "Programme de trois villas en terrasses, reliées par un jardin méditerranéen en restanques." },
  ],
  concours: [
    { title: 'Cité des Vins', place: 'Bandol', status: 'Lauréat', art: 'art-vine',
      desc: "Œnothèque et belvédère viticole. Projet lauréat du concours, phase d'études lancée." },
    { title: 'Promenade du Littoral', place: 'Cannes', status: 'Finaliste', art: 'art-sea',
      desc: "Réaménagement d'un front de mer en promenade plantée. Projet finaliste, mention du jury." },
    { title: 'Pavillon Méditerranée', place: 'Marseille', status: 'En lice', art: 'art-villa',
      desc: "Pavillon culturel en bord de mer. Concours international en cours, rendu en préparation." },
  ],
  encours: [
    { title: 'Villa Belvédère', place: "Cap d'Antibes", progress: 78, phase: 'Gros œuvre achevé — finitions', art: 'art-sea',
      desc: "Chantier en phase de finitions. Pose des menuiseries et de la piscine à débordement en cours." },
    { title: 'Domaine de la Restanque', place: 'Bandol', progress: 45, phase: 'Charpente & couverture', art: 'art-domaine',
      desc: "Réhabilitation du chai et de la maison de maître. Charpente posée, début des aménagements paysagers." },
    { title: 'Suite Méridienne', place: 'Mougins', progress: 30, phase: 'Démolitions & second œuvre', art: 'art-interior',
      desc: "Réhabilitation intérieure d'une bastide. Curage terminé, lancement des réseaux et cloisonnements." },
  ],
  termines: [
    { title: 'Villa Horizon', place: 'Saint-Tropez', year: '2023', art: 'art-villa',
      desc: "Composition de volumes purs en béton clair et verre autour d'un patio à ciel ouvert." },
    { title: 'Maison des Vignes', place: 'Coteaux du Lubéron', year: '2022', art: 'art-vine',
      desc: "Demeure en pierre sèche et bois brut, enchâssée dans les rangs de vigne." },
    { title: 'Résidence des Calanques', place: 'Cassis', year: '2021', art: 'art-cliff',
      desc: "Résidence en terrasses ancrée dans la roche calcaire, toits végétalisés." },
  ],
};

/* ---------- IMMOBILIER : biens à la vente (façon agence) ----------
 * gallery : tableau de visuels — classe de dégradé (ex. 'art-sea') OU
 *   chemin d'image (ex. 'gallery/villa-1.jpg').
 * video   : chemin .mp4 optionnel (ex. 'films/villa.mp4').
 * map     : recherche affichée sur la carte (lien Google/OpenStreetMap).
 */
export const properties = [
  { title: 'Villa contemporaine vue mer', place: "Cap d'Antibes", region: 'Alpes-Maritimes',
    price: '9 800 000 €', surface: 420, rooms: 8, beds: 5, baths: 5, type: 'Villa', status: 'À vendre',
    art: 'art-sea', ref: 'AD-2401', dpe: 'B', map: "Cap d'Antibes, France", video: 'films/villa-horizon.mp4',
    gallery: ['art-sea', 'art-villa', 'art-interior', 'art-cliff'],
    desc: "Villa d'architecte ouverte sur la Méditerranée, piscine à débordement et accès mer privatif. Volumes baignés de lumière, matériaux nobles et domotique intégrée. Un manifeste d'art de vivre méditerranéen.",
    features: ['Piscine à débordement', 'Accès mer privatif', 'Vue panoramique 180°', 'Domotique', 'Garage 3 voitures', 'Pool-house'] },
  { title: 'Domaine viticole & maison de maître', place: 'Bandol', region: 'Var',
    price: '6 500 000 €', surface: 650, rooms: 12, beds: 7, baths: 6, type: 'Domaine', status: 'À vendre',
    art: 'art-domaine', ref: 'AD-2398', dpe: 'C', map: 'Bandol, France', video: 'films/maison-vignes.mp4',
    gallery: ['art-domaine', 'art-vine', 'art-interior', 'art-villa'],
    desc: "Domaine en production avec chai contemporain, oliveraie et bastide restaurée. Un ensemble rare alliant outil viticole d'exception et demeure de caractère, au cœur d'un terroir classé.",
    features: ['Vignoble en production', 'Chai contemporain', 'Oliveraie', 'Bastide restaurée', 'Caveau de dégustation', 'Source privée'] },
  { title: 'Penthouse front de mer', place: 'Cannes — Croisette', region: 'Alpes-Maritimes',
    price: '4 200 000 €', surface: 180, rooms: 5, beds: 3, baths: 3, type: 'Appartement', status: 'Sous compromis',
    art: 'art-villa', ref: 'AD-2389', dpe: 'B', map: 'Boulevard de la Croisette, Cannes',
    gallery: ['art-villa', 'art-sea', 'art-interior'],
    desc: "Dernier étage avec terrasse panoramique sur la baie. Prestations haut de gamme, exposition plein sud et services de standing. L'adresse la plus prisée de la Croisette.",
    features: ['Terrasse panoramique', 'Exposition plein sud', 'Conciergerie', 'Parking privé', 'Cave', 'Climatisation'] },
  { title: 'Mas provençal rénové', place: 'Mougins', region: 'Alpes-Maritimes',
    price: '3 350 000 €', surface: 310, rooms: 7, beds: 4, baths: 4, type: 'Villa', status: 'À vendre',
    art: 'art-interior', ref: 'AD-2377', dpe: 'C', map: 'Mougins, France',
    gallery: ['art-interior', 'art-villa', 'art-vine'],
    desc: "Bastide du XVIIIᵉ réhabilitée avec un soin d'orfèvre. Jardin méditerranéen, pool-house et matières authentiques. Le charme provençal sublimé par une rénovation contemporaine.",
    features: ['Jardin méditerranéen', 'Pool-house', 'Cheminées anciennes', 'Cuisine d’été', 'Oliviers centenaires', 'Puits'] },
  { title: 'Villa pieds dans l’eau', place: 'Cassis', region: 'Bouches-du-Rhône',
    price: '7 900 000 €', surface: 380, rooms: 9, beds: 6, baths: 5, type: 'Villa', status: 'À vendre',
    art: 'art-cliff', ref: 'AD-2365', dpe: 'B', map: 'Cassis, France', video: 'films/calanques.mp4',
    gallery: ['art-cliff', 'art-sea', 'art-villa', 'art-interior'],
    desc: "Demeure en terrasses dans les Calanques, ponton privé et vues à 180°. Une situation d'exception, au plus près de l'eau, dans l'un des sites naturels les plus protégés de Méditerranée.",
    features: ['Ponton privé', 'Accès direct à la mer', 'Terrasses étagées', 'Ascenseur', 'Spa', 'Local plongée'] },
  { title: 'Propriété de prestige', place: 'Saint-Tropez', region: 'Var',
    price: '12 500 000 €', surface: 540, rooms: 11, beds: 7, baths: 7, type: 'Villa', status: 'Vendu',
    art: 'art-sea', ref: 'AD-2312', dpe: 'A', map: 'Saint-Tropez, France',
    gallery: ['art-sea', 'art-villa', 'art-interior', 'art-cliff'],
    desc: "Propriété d'exception au calme absolu, parc paysager et plage privée. Le summum du luxe tropézien, dans un écrin de verdure préservé.",
    features: ['Plage privée', 'Parc paysager', 'Court de tennis', 'Maison d’amis', 'Héliport à proximité', 'Sécurité 24/7'] },
];

/* ---------- CINÉMATOGRAPHIQUE : films & photographies qualité cinéma ----------
 * type : 'Film' (ouvre le lecteur vidéo, nécessite `video`) ou 'Photo' (ouvre la visionneuse image).
 * cover : image de couverture (URL ou chemin local, ex. 'gallery/mon-rendu.jpg').
 */
export const cinema = [
  { title: 'Lueur d’Été', type: 'Film', category: 'Court-métrage', place: 'Cap d’Antibes',
    cover: 'art-sea', video: 'films/villa-horizon.mp4',
    desc: "Court-métrage tourné au lever du jour sur une villa face à la mer : la lumière comme unique personnage." },
  { title: 'Sel & Pierre', type: 'Photo', category: 'Série photographique', place: 'Calanques de Cassis',
    cover: 'art-cliff',
    desc: "Série en très haute définition sur la rencontre de la roche calcaire et de l'eau turquoise." },
  { title: 'Vendanges', type: 'Film', category: 'Time-lapse', place: 'Bandol',
    cover: 'art-vine', video: 'films/maison-vignes.mp4',
    desc: "Time-lapse d'une saison de vendanges, du bourgeon au pressoir, qualité cinéma 4K." },
  { title: 'Heures Bleues', type: 'Photo', category: 'Série photographique', place: 'Saint-Tropez',
    cover: 'art-villa',
    desc: "Portraits d'architecture à l'heure bleue : façades, ombres et reflets en très haute résolution." },
  { title: 'Promenade', type: 'Film', category: 'Survol aérien', place: 'Côte d’Azur',
    cover: 'art-domaine', video: 'films/calanques.mp4',
    desc: "Survol drone du littoral, étalonnage cinéma, pour faire ressentir l'échelle du paysage." },
  { title: 'Matières', type: 'Photo', category: 'Série photographique', place: 'Atelier',
    cover: 'art-interior',
    desc: "Gros plans sur la matière — pierre, bois brut, métal patiné — éclairés comme au cinéma." },
];

/* ---------- MOBILIER & DESIGN : pièces créées par l'atelier ---------- */
export const furniture = [
  { name: 'Console Calanque', category: 'Table', material: 'Chêne massif & laiton brossé',
    dimensions: '160 × 45 × 78 cm', edition: 'Pièce unique', price: 'Sur demande', art: 'art-design',
    desc: "Console aux lignes tendues, plateau en chêne massif veiné et piétement en laiton brossé patiné à la main." },
  { name: 'Fauteuil Restanque', category: 'Fauteuil', material: 'Lin écru & structure noyer',
    dimensions: '74 × 80 × 86 cm', edition: 'Série limitée — 12 ex.', price: 'Sur demande', art: 'art-interior',
    desc: "Fauteuil enveloppant inspiré des terrasses en pierre sèche, assise en lin écru et structure en noyer massif." },
  { name: 'Suspension Mistral', category: 'Luminaire', material: 'Albâtre & laiton',
    dimensions: 'Ø 38 × 42 cm', edition: 'Série limitée — 20 ex.', price: 'Sur demande', art: 'art-design',
    desc: "Suspension en albâtre translucide diffusant une lumière dorée, monture en laiton vieilli." },
  { name: 'Table Domaine', category: 'Table', material: 'Pierre calcaire & chêne',
    dimensions: '280 × 100 × 75 cm', edition: 'Pièce unique', price: 'Sur demande', art: 'art-domaine',
    desc: "Grande table de réception, plateau en pierre calcaire massif et piétement sculpté en chêne." },
  { name: 'Banquette Riviera', category: 'Fauteuil', material: 'Velours terracotta & bois flotté',
    dimensions: '190 × 70 × 78 cm', edition: 'Série limitée — 8 ex.', price: 'Sur demande', art: 'art-cliff',
    desc: "Banquette basse habillée de velours terracotta, structure en bois flotté brut." },
  { name: 'Guéridon Oliveraie', category: 'Table', material: 'Olivier massif',
    dimensions: 'Ø 55 × 48 cm', edition: 'Pièce unique', price: 'Sur demande', art: 'art-vine',
    desc: "Guéridon sculpté dans une loupe d'olivier centenaire, finition huilée à la main." },
  { name: 'Applique Calanque', category: 'Luminaire', material: 'Verre soufflé & bronze',
    dimensions: '24 × 18 × 30 cm', edition: 'Série limitée — 25 ex.', price: 'Sur demande', art: 'art-sea',
    desc: "Applique murale en verre soufflé teinté turquoise, monture en bronze patiné." },
  { name: 'Vase Sirocco', category: 'Objet', material: 'Grès émaillé',
    dimensions: 'Ø 24 × 46 cm', edition: 'Série limitée — 30 ex.', price: 'Sur demande', art: 'art-villa',
    desc: "Vase tourné en grès, émail sablé évoquant les vents chauds de Méditerranée." },
];

/* ---------- ÉQUIPE ---------- */
export const team = [
  { name: 'Le Fondateur', role: 'Architecte fondateur', initials: 'LA',
    bio: "Fondateur de l'atelier. Conçoit chaque projet à partir de son site, entre mer, falaises et vignes." },
  { name: 'Studio Conception', role: 'Architecture & BIM', initials: 'SC',
    bio: "L'équipe de conception : esquisses, modélisation Revit et maquettes numériques explorables." },
  { name: 'Pôle Rendu', role: 'Images & films', initials: 'PR',
    bio: "Production des rendus photoréalistes et des films de synthèse en très haute définition." },
  { name: 'Suivi de chantier', role: 'Direction de travaux', initials: 'DT',
    bio: "Coordination des artisans d'art et des entreprises, de l'ouverture du chantier à la livraison." },
];
