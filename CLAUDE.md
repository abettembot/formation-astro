# Supports pédagogiques astro

Site statique de schémas 3D interactifs pour les formations et stages du club d'astronomie.
Publié sur GitHub Pages : https://abettembot.github.io/formation-astro/ (dépôt `abettembot/formation-astro`, branche `main`, publication automatique à chaque push).
Tout le contenu visible est en français.

## Règle d'or : la charte est commune
Le style et le comportement de tous les supports viennent de deux fichiers partagés. **Ne jamais recopier ni redéfinir leur contenu dans une page.**

- `commun/charte.css` : couleurs, polices, panneau, boutons, curseurs, étiquettes, fiches, bandeau, mise en page mobile, page d'accueil.
- `commun/schema.js` : la boîte à outils 3D (`createSchema`). Elle gère la scène, le ciel étoilé, l'éclairage, la caméra et les points de vue, le panneau, les commandes, les étiquettes, la sélection par clic, les fiches, la vue éclatée et l'animation.

Pour faire évoluer la charte ou un comportement commun, on modifie ces fichiers : tous les supports suivent. Un besoin propre à un seul schéma qui pourrait resservir s'ajoute à `schema.js` (nouvelle option, nouveau type de commande), pas dans la page.
Après une modification de `commun/`, vérifier que **tous** les schémas existants fonctionnent encore.

## Identité Repères-Astro
La charte reprend le modèle PowerPoint de l'association (`D:\astro\TemplatePowerPoint\Template Reperes Astro.pptx`).
- Couleurs : fond nuit `#070b14` → bleu nuit `#0e1830`, titres `#f6f9fd`, texte `#c4d0e0`, accent bleu acier `#5b9bd5`, bleu clair `#7eb4e8`, filets blancs à 12 %.
- Polices : Georgia pour les titres (graisse normale), Arial pour tout le reste. Surtitres en Arial gras, en capitales espacées (`.eyebrow`), couleur accent.
- Logo : `commun/images/logo-reperes-astro.png` (blanc sur transparent), avec un lien vers https://reperes-astro.fr. `schema.js` l'ajoute automatiquement, de façon discrète, en bas à droite de chaque schéma. L'accueil l'affiche en couverture et en pied de page.
- Photo de couverture : `commun/images/m42-orion.jpg`, la photo de la page titre du modèle. Toujours la créditer « © SLO ».

## Page d'accueil : à mettre à jour à chaque ajout
**Chaque nouveau support doit être ajouté au catalogue de `index.html`, dans le même commit que le support lui-même.** Un support absent de l'accueil est considéré comme non terminé.
Le catalogue est rangé en quatre rubriques (`section.rubrique`, avec un lien dans le sommaire `.sommaire`) : « Les instruments », « Utiliser son instrument », « Astrophotographie », « Le ciel et ses phénomènes ». Une nouvelle rubrique s'ajoute seulement si aucune ne convient.
Une carte `<a class="card">` par support, placée dans sa rubrique à sa place pédagogique (du plus simple au plus avancé), avec :
- une vignette `img.vignette` (`commun/images/vignettes/<nom-du-schema>.webp`, 720 × 405, capture du rendu 3D sans panneau ni étiquettes) ;
- une catégorie (`.cat`, « Thème · Sous-thème »), un titre `h3`, une phrase de description et 2 à 4 mots-clés (`.tags`).
Si un support est modifié de façon notable, mettre sa carte (et sa vignette si l'aspect change) à jour.

## Structure
- `index.html` : accueil (couverture + catalogue des supports).
- `<nom-du-schema>/index.html` : un dossier par schéma (nom en minuscules avec tirets). Modèle de référence : `telescope-newton/index.html`.
- `.nojekyll` : désactive Jekyll sur GitHub Pages.

## Créer un nouveau schéma
1. Copier l'en-tête `<head>` du télescope à l'identique (charset, viewport, lien `../commun/charte.css`, import map Three.js `three@0.186.1`), en changeant seulement `<title>` et `description`.
2. Dans le `<script type="module">`, importer depuis `../commun/schema.js` et appeler `createSchema({...})` :
   - `surtitre` : « Support de formation · <Thème> » (Optique, Mécanique céleste, Instruments, Ciel…).
   - `titre` : nom de l'objet ou du phénomène, sans explication.
   - `sousTitre` : l'exemple concret retenu, en police mono (ex. « Exemple : Newton 200/1000 · f/5 », « Latitude 47° N »).
   - `eclate: true` seulement si l'objet se démonte.
   - `commandes` : bascules et curseurs propres au schéma. « Étiquettes » et « Animation » sont ajoutées automatiquement, ne pas les redéclarer. Un schéma sans rien d'animé passe `animation: false` (exemple : `champ-de-vision`).
   - `vues` : 3 à 4 points de vue. La première est la vue de départ et s'appelle « 3/4 » quand c'est une vue en perspective.
   - `intro` : la fiche de vue d'ensemble, avec un `eyebrow`, une `legende([...])` en étapes colorées si le phénomène se déroule dans le temps ou l'espace, et une ligne `spec` de conclusion.
   - Une vue peut suivre une pièce mobile : `pos` et `cible` en fonctions, avec `fov`, `exacte: true` et `suivre: true` (exemple : vue « Viseur polaire » de `monture-equatoriale`).
3. Déclarer chaque élément avec `S.part(id, nom, { eclate, ancre, texte, chiffres, extra, bind, parent })`, puis ajouter ses meshes avec `S.add(part, mesh(...))`. `parent` attache l'élément à un groupe mobile (axe d'une monture) ; `ancre` est alors dans le repère de ce groupe. Pour proposer plusieurs modèles d'un même instrument, vider et reconstruire chaque élément avec `S.viderElement(part)` puis `S.add` (exemple : `lunette-astronomique`).
4. Les phénomènes animés passent par `S.onFrame(({ dt, time, explode }) => ...)`. Utiliser `time`, qui s'arrête quand « Animation » est désactivée. Ajouter les étiquettes libres avec `S.label(texte, () => position, { lumiere: true, visible })`.
5. Terminer par `S.start()`.
6. Ajouter la carte au catalogue de l'accueil (obligatoire, voir plus haut).

## Charte visuelle 3D
- Matériaux : uniquement les fabriques `materiaux` (peinture, flocage, miroir, verre, noir, alu, caoutchouc, lentille). Ajouter un nouveau matériau dans `schema.js` s'il en manque un.
- Couleurs des phénomènes : `COULEURS` (etoile → ambre → orange → corail pour une progression de lumière). Le bleu `accent` est réservé à la sélection et à l'interface.
- Lumière et rayons : lignes fines semi-transparentes et particules lumineuses (`textureHalo()`) qui se déplacent le long du trajet.
- Échelle : 1 unité = une dimension réaliste choisie pour le schéma (ex. 100 mm), indiquée en commentaire en tête du script.

## Rédaction
- Ton : clair et direct, pour des adultes débutants ou intermédiaires, en phrases courtes. Pas de jargon sans explication.
- Fiche d'un élément : `texte` de 2 à 4 phrases (à quoi il sert, comment il fonctionne, l'idée clé à retenir), `chiffres` sur une ligne avec des valeurs réelles séparées par « · ».
- Libellés des boutons : un nom court (« Trajet lumière », « Tube en coupe »), avec une majuscule initiale seulement.
- Exactitude scientifique : géométrie et chiffres justes, exemples tirés du matériel courant d'un club.

## Aperçu local, puis mise en ligne (obligatoire)
**Ne jamais faire de `git push` sans que l'utilisateur ait validé l'aperçu local.** Le push met immédiatement le site en ligne pour tout le club.

1. Après chaque modification du site (nouveau support, retouche de la charte, de `commun/` ou de l'accueil), lancer l'aperçu local depuis la racine du dépôt, en arrière-plan : `python apercu.py` (port 8000, sans cache navigateur : sinon une page neuve peut tourner avec un ancien `schema.js` et rester vide). L'utilisateur peut aussi double-cliquer sur `apercu.cmd`, qui lance le même serveur et ouvre le navigateur.
2. Donner à l'utilisateur les liens à vérifier : http://localhost:8000/ (accueil) et http://localhost:8000/<nom-du-schema>/ pour chaque support touché. Si `commun/` a changé, donner le lien de **chaque** schéma existant.
3. Vérifier soi-même ce qu'on peut (console sans erreur, rendu dans le navigateur intégré), puis demander explicitement à l'utilisateur s'il valide la mise en ligne.
4. Seulement après son accord : faire le commit (s'il n'est pas déjà fait), puis `git push`. Le site se met à jour en une à deux minutes sur https://abettembot.github.io/formation-astro/. Vérifier ensuite la version en ligne.

Un commit local sans push est possible à tout moment. Seul le push attend la validation.
Authentification : Git utilise la connexion GitHub CLI du compte perso `abettembot`, réglée pour ce dépôt uniquement. Ne jamais passer par Chrome, où l'utilisateur est connecté avec son compte pro. Si une autorisation GitHub est nécessaire, l'ouvrir dans le navigateur intégré.
