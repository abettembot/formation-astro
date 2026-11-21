# Supports pédagogiques astro

Site statique de schémas 3D interactifs pour les formations du club d'astronomie, publié sur GitHub Pages. Tout le contenu est en français.

## Structure
- `index.html` : page d'accueil, une carte `<a class="card">` par schéma (le plus récent en premier).
- `<nom-du-schema>/index.html` : un schéma = un dossier = une page HTML autonome (CSS et JS inline, pas de build).
- `.nojekyll` : désactive Jekyll sur GitHub Pages.

## Conventions pour un nouveau schéma
- Partir de `telescope-newton/index.html` comme modèle : même structure de page (canvas plein écran + panneau à gauche, en bas sur mobile), même lien `← Tous les supports` vers `../`.
- Three.js chargé par import map depuis jsDelivr, version épinglée (actuellement `three@0.186.1`) ; addons via `three/addons/`.
- Charte : univers sombre « nuit d'observation », polices Sora / IBM Plex Sans / IBM Plex Mono, accent rouge `#ff5f4f`, lumière ambre `#ffc861`.
- Interactions attendues : OrbitControls (tourner/zoomer/déplacer), étiquettes cliquables, fiche explicative par élément, points de vue prédéfinis, animation désactivable, respect de `prefers-reduced-motion`.
- Exactitude scientifique : géométrie et chiffres réalistes, avec des exemples concrets (matériel courant d'un club).
- Ajouter la carte correspondante dans `index.html`.
