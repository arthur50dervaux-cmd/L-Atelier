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

/* ---------- IMMOBILIER : biens à la vente (façon agence) ---------- */
export const properties = [
  { title: 'Villa contemporaine vue mer', place: "Cap d'Antibes", region: 'Alpes-Maritimes',
    price: '9 800 000 €', surface: 420, rooms: 8, beds: 5, type: 'Villa', status: 'À vendre', art: 'art-sea',
    desc: "Villa d'architecte ouverte sur la Méditerranée, piscine à débordement, accès mer privatif." },
  { title: 'Domaine viticole & maison de maître', place: 'Bandol', region: 'Var',
    price: '6 500 000 €', surface: 650, rooms: 12, beds: 7, type: 'Domaine', status: 'À vendre', art: 'art-domaine',
    desc: "Domaine en production avec chai contemporain, oliveraie et bastide restaurée." },
  { title: 'Penthouse front de mer', place: 'Cannes — Croisette', region: 'Alpes-Maritimes',
    price: '4 200 000 €', surface: 180, rooms: 5, beds: 3, type: 'Appartement', status: 'Sous compromis', art: 'art-villa',
    desc: "Dernier étage avec terrasse panoramique sur la baie, prestations haut de gamme." },
  { title: 'Mas provençal rénové', place: 'Mougins', region: 'Alpes-Maritimes',
    price: '3 350 000 €', surface: 310, rooms: 7, beds: 4, type: 'Villa', status: 'À vendre', art: 'art-interior',
    desc: "Bastide du XVIIIᵉ réhabilitée, jardin méditerranéen et pool-house." },
  { title: 'Villa pieds dans l’eau', place: 'Cassis', region: 'Bouches-du-Rhône',
    price: '7 900 000 €', surface: 380, rooms: 9, beds: 6, type: 'Villa', status: 'À vendre', art: 'art-cliff',
    desc: "Demeure en terrasses dans les Calanques, ponton privé et vues à 180°." },
  { title: 'Propriété de prestige', place: 'Saint-Tropez', region: 'Var',
    price: '12 500 000 €', surface: 540, rooms: 11, beds: 7, type: 'Villa', status: 'Vendu', art: 'art-sea',
    desc: "Propriété d'exception au calme absolu, parc paysager et plage privée." },
];

/* ---------- ÉQUIPE ---------- */
export const team = [
  { name: 'Arthur Dervaux', role: 'Architecte fondateur', initials: 'AD',
    bio: "Fondateur de l'atelier. Conçoit chaque projet à partir de son site, entre mer, falaises et vignes." },
  { name: 'Studio Conception', role: 'Architecture & BIM', initials: 'SC',
    bio: "L'équipe de conception : esquisses, modélisation Revit et maquettes numériques explorables." },
  { name: 'Pôle Rendu', role: 'Images & films', initials: 'PR',
    bio: "Production des rendus photoréalistes et des films de synthèse en très haute définition." },
  { name: 'Suivi de chantier', role: 'Direction de travaux', initials: 'DT',
    bio: "Coordination des artisans d'art et des entreprises, de l'ouverture du chantier à la livraison." },
];
