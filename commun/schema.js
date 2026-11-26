// =====================================================================
// Boîte à outils commune des schémas 3D — Supports pédagogiques astro
// Gère : scène, ciel étoilé, éclairage, caméra et vues, panneau,
// commandes, étiquettes, sélection par clic, fiches, vue éclatée,
// animation. Chaque schéma ne décrit que ses objets et ses textes.
// Modifier ce fichier change le comportement de TOUS les schémas.
// =====================================================================
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export { THREE };

// ---------- Couleurs 3D (alignées sur charte.css) ----------
export const COULEURS = {
  accent: 0x5b9bd5,  // bleu acier Repères-Astro : sélection et survol
  ambre: 0xffc861,   // lumière des astres (progression étoile → corail)
  etoile: 0xf6e7b0,  // lumière incidente
  orange: 0xff9a4a,
  corail: 0xff6b5e,
  laser: 0xff2d2d,   // faisceau d'un collimateur laser (rouge 650 nm)
  // couleurs du spectre (chromatisme, dispersion) : bleu saturé, distinct de l'accent de l'interface
  rouge: 0xff4b3e,   // raie C, 656 nm
  vert: 0x58e07a,    // raie e, 546 nm
  bleu: 0x4f6bff,    // raie F, 486 nm
  violet: 0xb062ff,  // raie g, 436 nm
  // température de l'air (turbulence, convection) : air frais, distinct du bleu de l'interface ; l'air chaud prend l'orange
  froid: 0x8fd3cf,
};
export const css = (hex) => "#" + hex.toString(16).padStart(6, "0");

// ---------- Matériaux standard (fabriques : un matériau neuf par appel) ----------
export const materiaux = {
  peinture: () => new THREE.MeshStandardMaterial({ color: 0xe9edf2, roughness: 0.35, metalness: 0.05, side: THREE.DoubleSide }),
  flocage: () => new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: 1, metalness: 0, side: THREE.BackSide }),
  miroir: () => new THREE.MeshStandardMaterial({ color: 0xe6edf5, roughness: 0.06, metalness: 1 }),
  verre: () => new THREE.MeshStandardMaterial({ color: 0x9fc7c0, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.85 }),
  noir: () => new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.55, metalness: 0.4 }),
  alu: () => new THREE.MeshStandardMaterial({ color: 0xb9c0ca, roughness: 0.3, metalness: 0.85 }),
  caoutchouc: () => new THREE.MeshStandardMaterial({ color: 0x121214, roughness: 0.95 }),
  // panneau de bois (contreplaqué, aggloméré) : caisse et plateau d'une monture Dobson
  bois: () => new THREE.MeshStandardMaterial({ color: 0xa47548, roughness: 0.75, metalness: 0 }),
  // sol d'un paysage (herbe sombre), éclairé par le Soleil du schéma
  sol: () => new THREE.MeshStandardMaterial({ color: 0x34462f, roughness: 1, metalness: 0, envMapIntensity: 0.3 }),
  // eau de mer (océans, enveloppe déformée par la marée) : bleu sourd, translucide pour laisser voir le globe
  eau: (opacite = 0.5) => new THREE.MeshStandardMaterial({ color: 0x6aa8d8, roughness: 0.35, metalness: 0, transparent: true, opacity: opacite, depthWrite: false, envMapIntensity: 0 }),
  // bulle d'air (cellule de turbulence, panache chaud) : très translucide, surlignable.
  // Sur un InstancedMesh, garder le blanc par défaut et colorer chaque instance (setColorAt).
  air: (couleur = 0xffffff, opacite = 0.22) => new THREE.MeshStandardMaterial({ color: couleur, roughness: 1, metalness: 0, transparent: true, opacity: opacite, depthWrite: false, envMapIntensity: 0.4 }),
  lentille: () => new THREE.MeshStandardMaterial({ color: 0x6f8fb8, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.55 }),
  // globe oculaire (œil de l'observateur) : blanc laiteux translucide, laisse voir les rayons à l'intérieur
  oeil: () => new THREE.MeshStandardMaterial({ color: 0xe8e2d6, roughness: 0.45, metalness: 0, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }),
  // silicium d'un capteur (photodiodes) : gris bleuté, translucide pour laisser voir les charges à l'intérieur
  silicium: () => new THREE.MeshStandardMaterial({ color: 0x5a6478, roughness: 0.3, metalness: 0.4, transparent: true, opacity: 0.4, depthWrite: false }),
  // filtre coloré (matrice de Bayer, filtre d'imagerie) : couleur vive, à peine translucide.
  // Sur un InstancedMesh, garder le blanc par défaut et colorer chaque instance (setColorAt).
  filtre: (couleur = 0xffffff) => new THREE.MeshStandardMaterial({ color: couleur, roughness: 0.25, metalness: 0, transparent: true, opacity: 0.85 }),
  // astre éclairé par une seule source (planète, Lune) : mat. Pour une face de nuit vraiment sombre,
  // le schéma met aussi scene.environment à null (l'environnement éclaire sinon tout l'objet).
  astre: (map) => new THREE.MeshStandardMaterial({ map, roughness: 1, metalness: 0, envMapIntensity: 0 }),
  // objet lumineux par lui-même (Soleil, repère toujours visible) : insensible à l'éclairage
  lumineux: (couleur, opacite = 1) => new THREE.MeshBasicMaterial({ color: couleur, transparent: opacite < 1, opacity: opacite, side: THREE.DoubleSide, toneMapped: false, depthWrite: opacite >= 1 }),
  // ombre portée par un astre sphérique (Lune, Terre) sur un autre, éclairés par des rayons parallèles.
  // Se pose sur une sphère à peine plus grande que l'astre qui reçoit l'ombre. Le schéma met à jour
  // uniforms.centre (centre de l'astre qui fait de l'ombre) à chaque image. Options :
  //  rayon (de l'astre qui fait de l'ombre), direction (sens des rayons, +X par défaut),
  //  penteOmbre / pentePenombre (rétrécissement de l'ombre / élargissement de la pénombre par unité de distance),
  //  couleur, opacite (ombre) · couleurPenombre, opacitePenombre · opaciteAnti (au-delà de la pointe de l'ombre)
  //  couleurBord, largeurBord (liseré coloré au bord intérieur de l'ombre, 0 = aucun)
  ombre: (o = {}) => new THREE.ShaderMaterial({
    uniforms: {
      centre: { value: new THREE.Vector3() },
      direction: { value: (o.direction || new THREE.Vector3(1, 0, 0)).clone().normalize() },
      rayon: { value: o.rayon ?? 1 },
      penteOmbre: { value: o.penteOmbre ?? 0.05 },
      pentePenombre: { value: o.pentePenombre ?? 0.05 },
      couleur: { value: new THREE.Color(o.couleur ?? 0x000000) },
      opacite: { value: o.opacite ?? 0.9 },
      couleurPenombre: { value: new THREE.Color(o.couleurPenombre ?? 0x000000) },
      opacitePenombre: { value: o.opacitePenombre ?? 0.6 },
      opaciteAnti: { value: o.opaciteAnti ?? 0.6 },
      couleurBord: { value: new THREE.Color(o.couleurBord ?? 0x000000) },
      largeurBord: { value: o.largeurBord ?? 0 },
    },
    vertexShader: `varying vec3 vMonde;
      void main() { vec4 m = modelMatrix * vec4(position, 1.0); vMonde = m.xyz; gl_Position = projectionMatrix * viewMatrix * m; }`,
    fragmentShader: `uniform vec3 centre, direction, couleur, couleurPenombre, couleurBord;
      uniform float rayon, penteOmbre, pentePenombre, opacite, opacitePenombre, opaciteAnti, largeurBord;
      varying vec3 vMonde;
      void main() {
        vec3 d = vMonde - centre;
        float s = dot(d, direction);
        if (s <= 0.0) discard;
        float rho = length(d - s * direction);
        float ro = rayon - s * penteOmbre, ra = abs(ro), rp = rayon + s * pentePenombre;
        float f = fwidth(rho) * 1.5 + 1e-4;
        float dans = 1.0 - smoothstep(ra - f, ra + f, rho);
        float t = clamp((rho - ra) / max(rp - ra, 1e-4), 0.0, 1.0);
        float aP = opacitePenombre * pow(1.0 - t, 1.5);
        vec3 cO = ro >= 0.0 ? couleur : couleurPenombre;
        if (largeurBord > 0.0 && ro > 0.0) cO = mix(cO, couleurBord, smoothstep(ra - largeurBord, ra, rho));
        float a = mix(aP, ro >= 0.0 ? opacite : opaciteAnti, dans);
        if (a < 0.003) discard;
        gl_FragColor = vec4(mix(couleurPenombre, cO, dans), a);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, toneMapped: false,
  }),
};

// ---------- Textures d'astres dessinées (aucune image à télécharger) ----------
/** Suite pseudo-aléatoire reproductible (même graine = même dessin). */
export function alea(graine) { let x = graine; return () => (x = (x * 16807) % 2147483647) / 2147483647; }
const DEG = Math.PI / 180;
function canvasDessin(w, h, dessin) {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  dessin(cv.getContext("2d"), w, h);
  return cv;
}
const versTexture = (cv) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
// coordonnées équirectangulaires : longitude −180…180, latitude −90…90
const ux = (lon, w) => (0.5 + lon / 360) * w, vy = (lat, h) => (90 - lat) / 180 * h;
let _cvTerre, _cvLune, _face;
function cvTerre() {
  return _cvTerre ??= canvasDessin(1024, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#2a5d8f"); g.addColorStop(0.5, "#1c4a7e"); g.addColorStop(1, "#2a5d8f");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const r = alea(11);
    // continents schématiques : [longitude, latitude, étendue en longitude, en latitude, nombre de taches]
    const CONT = [[-100, 48, 28, 14, 70], [-75, 62, 25, 8, 30], [-42, 73, 10, 6, 18], [-60, -15, 14, 22, 60], [15, 52, 18, 8, 40],
      [20, 5, 18, 22, 70], [90, 52, 50, 13, 110], [80, 22, 12, 8, 25], [105, 15, 10, 8, 20], [135, -25, 15, 9, 35]];
    for (const [lon, lat, dl, db, n] of CONT) {
      for (let i = 0; i < n; i++) {
        const lo = lon + (r() - 0.5) * 2 * dl, la = lat + (r() - 0.5) * 2 * db, rad = (3 + r() * 6) / 180 * h;
        ctx.fillStyle = la > 55 ? "#7d8a6a" : la < 25 && la > -25 && r() < 0.5 ? "#a8915e" : r() < 0.5 ? "#4f7a3c" : "#638a48";
        for (const dx of [0, -w, w]) { ctx.beginPath(); ctx.ellipse(ux(lo, w) + dx, vy(la, h), rad / Math.max(0.35, Math.cos(la * DEG)), rad, 0, 0, 2 * Math.PI); ctx.fill(); }
      }
    }
    // calottes polaires
    for (const [y0, y1] of [[0, 0.1], [1, 0.92]]) {
      const gg = ctx.createLinearGradient(0, y0 * h, 0, y1 * h);
      gg.addColorStop(0, "#f2f5f8"); gg.addColorStop(0.7, "#e6ecf2"); gg.addColorStop(1, "rgba(230,236,242,0)");
      ctx.fillStyle = gg; ctx.fillRect(0, Math.min(y0, y1) * h, w, Math.abs(y1 - y0) * h);
    }
  });
}
// Mers lunaires de la face visible : [latitude, longitude, rayon en degrés]
const MERS = [[33, -16, 11], [28, 17, 8], [8, 31, 9], [17, 59, 5], [18, -57, 15], [-21, -17, 8], [-8, 51, 7],
  [56, 0, 4], [-15, 35, 4], [-24, -39, 4], [3, -20, 6], [40, -30, 6]];
function cvLune() {
  return _cvLune ??= canvasDessin(1024, 512, (ctx, w, h) => {
    ctx.fillStyle = "#a4a39e"; ctx.fillRect(0, 0, w, h);
    const r = alea(5);
    for (let i = 0; i < 900; i++) { // grain et petits cratères
      const x = r() * w, y = r() * h, rad = 1 + r() * r() * 9;
      ctx.fillStyle = r() < 0.5 ? "rgba(70,70,68,0.18)" : "rgba(230,230,225,0.16)";
      ctx.beginPath(); ctx.arc(x, y, rad, 0, 2 * Math.PI); ctx.fill();
    }
    ctx.fillStyle = "rgba(68,68,70,0.55)";
    for (const [la, lo, rd] of MERS) {
      for (let k = 0; k < 6; k++) { // contour irrégulier
        const a = r() * 2 * Math.PI, d = rd * 0.35 * r();
        const la2 = la + Math.sin(a) * d, lo2 = lo + Math.cos(a) * d, rr = rd * (0.65 + r() * 0.35) / 180 * h;
        ctx.beginPath(); ctx.ellipse(ux(lo2, w), vy(la2, h), rr / Math.cos(la2 * DEG), rr, 0, 0, 2 * Math.PI); ctx.fill();
      }
    }
  });
}
let _cvMars;
function cvMars() {
  return _cvMars ??= canvasDessin(1024, 512, (ctx, w, h) => {
    ctx.fillStyle = "#b8643a"; ctx.fillRect(0, 0, w, h);
    const r = alea(23);
    for (let i = 0; i < 700; i++) { // nuances de poussière claire et sombre
      const x = r() * w, y = r() * h, rad = 4 + r() * 22;
      ctx.fillStyle = r() < 0.5 ? "rgba(214,140,90,0.18)" : "rgba(120,58,34,0.16)";
      ctx.beginPath(); ctx.ellipse(x, y, rad * 1.6, rad, 0, 0, 2 * Math.PI); ctx.fill();
    }
    // grandes régions sombres schématiques : [longitude, latitude, étendue en longitude, en latitude, nombre de taches]
    const SOMBRES = [[70, 10, 12, 18, 40], [20, -12, 40, 8, 60], [-60, -25, 35, 9, 50], [-120, 15, 15, 10, 25], [150, -15, 25, 8, 35]];
    for (const [lon, lat, dl, db, n] of SOMBRES) {
      for (let i = 0; i < n; i++) {
        const lo = lon + (r() - 0.5) * 2 * dl, la = lat + (r() - 0.5) * 2 * db, rad = (2 + r() * 5) / 180 * h;
        ctx.fillStyle = "rgba(96,48,30,0.35)";
        for (const dx of [0, -w, w]) { ctx.beginPath(); ctx.ellipse(ux(lo, w) + dx, vy(la, h), rad / Math.max(0.35, Math.cos(la * DEG)), rad, 0, 0, 2 * Math.PI); ctx.fill(); }
      }
    }
    // calottes polaires
    for (const [y0, y1] of [[0, 0.07], [1, 0.95]]) {
      const gg = ctx.createLinearGradient(0, y0 * h, 0, y1 * h);
      gg.addColorStop(0, "#f4efe8"); gg.addColorStop(0.6, "#eadfd2"); gg.addColorStop(1, "rgba(234,223,210,0)");
      ctx.fillStyle = gg; ctx.fillRect(0, Math.min(y0, y1) * h, w, Math.abs(y1 - y0) * h);
    }
  });
}
let _cvVenus, _cvMercure;
function cvVenus() {
  return _cvVenus ??= canvasDessin(512, 256, (ctx, w, h) => {
    ctx.fillStyle = "#e8d9a8"; ctx.fillRect(0, 0, w, h);
    const r = alea(31);
    for (let i = 0; i < 260; i++) { // bandes de nuages étirées en longitude
      const y = r() * h, rad = 3 + r() * 10;
      ctx.fillStyle = r() < 0.5 ? "rgba(250,240,205,0.22)" : "rgba(190,165,110,0.14)";
      ctx.beginPath(); ctx.ellipse(r() * w, y, rad * 6, rad, 0, 0, 2 * Math.PI); ctx.fill();
    }
  });
}
function cvMercure() {
  return _cvMercure ??= canvasDessin(512, 256, (ctx, w, h) => {
    ctx.fillStyle = "#9b958d"; ctx.fillRect(0, 0, w, h);
    const r = alea(17);
    for (let i = 0; i < 600; i++) { // cratères et nuances
      const rad = 1 + r() * r() * 8;
      ctx.fillStyle = r() < 0.5 ? "rgba(70,66,62,0.22)" : "rgba(215,210,200,0.18)";
      ctx.beginPath(); ctx.arc(r() * w, r() * h, rad, 0, 2 * Math.PI); ctx.fill();
    }
  });
}
export const textures = {
  /** Vénus : couche de nuages jaune pâle, presque uniforme. Texture pour une sphère. */
  venus: () => versTexture(cvVenus()),
  /** Mercure : sol gris criblé de cratères. Texture pour une sphère. */
  mercure: () => versTexture(cvMercure()),
  /** Terre schématique (océans, continents, calottes) : texture pour une sphère. */
  terre: () => versTexture(cvTerre()),
  /** Mars schématique (sol orangé, régions sombres, calottes polaires) : texture pour une sphère. */
  mars: () => versTexture(cvMars()),
  /** Lune avec ses mers : texture pour une sphère. Face visible (longitude 0) côté +X local : tourner la sphère pour la présenter à la Terre. */
  lune: () => versTexture(cvLune()),
  /** Face visible de la Lune vue de la Terre, nord en haut : canvas carré de 256 px (bord adouci) pour les dessins 2D. */
  faceLune() {
    if (_face) return _face;
    const N = 256, src = cvLune(), px = src.getContext("2d").getImageData(0, 0, src.width, src.height).data;
    const cv = document.createElement("canvas"); cv.width = cv.height = N;
    const ctx = cv.getContext("2d"), img = ctx.createImageData(N, N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = (i + 0.5) / N * 2 - 1, y = 1 - (j + 0.5) / N * 2, q = x * x + y * y;
      if (q > 1) continue;
      const z = Math.sqrt(1 - q), lat = Math.asin(y), lon = Math.atan2(x, z);
      const u = Math.floor((0.5 + lon / (2 * Math.PI)) * src.width), v = Math.floor((0.5 - lat / Math.PI) * src.height);
      const s = (v * src.width + u) * 4, k = (j * N + i) * 4, assomb = 0.82 + 0.18 * z;
      img.data[k] = px[s] * assomb; img.data[k + 1] = px[s + 1] * assomb; img.data[k + 2] = px[s + 2] * assomb;
      img.data[k + 3] = 255 * Math.min(1, (1 - Math.sqrt(q)) * N / 2); // bord adouci
    }
    ctx.putImageData(img, 0, 0);
    return (_face = cv);
  },
};

// ---------- Aides géométriques ----------
export const axeX = (geo) => geo.rotateZ(-Math.PI / 2); // axe Y -> axe X
export const axeZ = (geo) => geo.rotateX(Math.PI / 2);  // axe Y -> axe Z
export function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}
/** Lentille de révolution d'axe X, de rayon R (lumière venant de +X).
 *  Face avant x = xv − sf·q, face arrière x = xv − t + sb·q, avec q = (r/R)² :
 *  sf > 0 face avant bombée, sf < 0 creuse ; sb > 0 face arrière bombée. */
export function lentille(R, xv, t, sf, sb) {
  const pts = [], n = 20;
  for (let i = 0; i <= n; i++) { const r = Math.max(0.001, (i / n) * R), q = (r / R) ** 2; pts.push(new THREE.Vector2(r, xv - sf * q)); }
  for (let i = n; i >= 0; i--) { const r = Math.max(0.001, (i / n) * R), q = (r / R) ** 2; pts.push(new THREE.Vector2(r, xv - t + sb * q)); }
  const g = new THREE.LatheGeometry(pts, 72);
  g.rotateZ(-Math.PI / 2);
  const m = new THREE.Mesh(g, materiaux.lentille());
  m.material.side = THREE.DoubleSide;
  if (sf < 0) m.material.opacity = 0.7; // lentille divergente (flint) un peu plus dense
  return m;
}
/** Lentilles d'un objectif de lunette de rayon R centré en xo (épaisseurs et courbures exagérées).
 *  type : "simple" (lentille seule), "achro" (crown + flint accolés), "ed" (ED + flint, lame d'air), "apo" (triplet).
 *  Renvoie [{ xv, t, sf, sb, verre }] de l'avant vers l'arrière, à passer à lentille(R, xv, t, sf, sb). */
export function objectifLunette(type, R, xo) {
  const tC = 0.1 + 0.1 * R, sF = 0.05 + 0.04 * R, sB = 0.04 + 0.03 * R, tF = 0.04 + 0.03 * R;
  if (type === "simple") return [{ xv: xo + tC / 2, t: tC, sf: sF, sb: sB, verre: "crown" }];
  if (type === "apo") {
    const t1 = tC * 0.85, t3 = 0.08 + 0.06 * R, gap = 0.02;
    const x0 = xo + (t1 + tF + t3 + 2 * gap) / 2;
    return [
      { xv: x0, t: t1, sf: sF * 0.85, sb: sB, verre: "ed" },
      { xv: x0 - t1 - gap, t: tF, sf: -sB, sb: 0, verre: "flint" },
      { xv: x0 - t1 - tF - 2 * gap, t: t3, sf: -0.005, sb: 0.03 + 0.02 * R, verre: "crown" },
    ];
  }
  const gap = type === "ed" ? 0.025 : 0.004, x0 = xo + (tC + gap + tF) / 2;
  return [
    { xv: x0, t: tC, sf: sF, sb: sB, verre: type === "ed" ? "ed" : "crown" },
    { xv: x0 - tC - gap, t: tF, sf: -sB, sb: 0.01, verre: "flint" },
  ];
}
let _halo;
export function textureHalo() {
  if (_halo) return _halo;
  const cv = document.createElement("canvas"); cv.width = cv.height = 64;
  const ctx = cv.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.25, "rgba(255,255,255,0.8)"); g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  _halo = new THREE.CanvasTexture(cv); _halo.colorSpace = THREE.SRGBColorSpace;
  return _halo;
}
/** Tronc de cône d'axe X (cône d'ombre, faisceau) : rayon r0 à l'abscisse s0, r1 à l'abscisse s1.
 *  Surface semi-transparente soulignée de 4 génératrices. Renvoie un groupe. */
export function troncCone(r0, r1, s0, s1, couleur, opRemplissage = 0.1, opBord = 0.5) {
  const h = s1 - s0, grp = new THREE.Group(), pts = [];
  grp.add(mesh(axeX(new THREE.CylinderGeometry(r1, r0, h, 64, 1, true)), materiaux.lumineux(couleur, opRemplissage), s0 + h / 2, 0, 0));
  for (let i = 0; i < 4; i++) {
    const c = Math.cos(i * Math.PI / 2), s = Math.sin(i * Math.PI / 2);
    pts.push(new THREE.Vector3(s0, r0 * c, r0 * s), new THREE.Vector3(s1, r1 * c, r1 * s));
  }
  grp.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color: couleur, transparent: true, opacity: opBord, depthWrite: false })));
  return grp;
}
/** Petit halo lumineux (foyer, tache de lumière) : sprite additif de diamètre « taille ». */
export function halo(couleur, taille = 0.5) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: textureHalo(), color: couleur, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.setScalar(taille);
  return s;
}
/** Faisceau de rayons lumineux : lignes fines colorées par segment + particules qui avancent le long des trajets.
 *  Renvoie { group, photons, poser(liste), animer(time, parTrajet) } ; le groupe est à ajouter à la scène.
 *  liste : [{ pts: [[x,y,z] ou Vector3, ...], cols: [couleur de chaque segment] }] — poser() peut être rappelé à tout moment. */
export function faisceau(opacite = 0.55, taille = 0.42, maxPh = 64) {
  const group = new THREE.Group();
  const lignes = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: opacite, depthWrite: false }));
  group.add(lignes);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(maxPh * 3), 3));
  geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(maxPh * 3), 3));
  const photons = new THREE.Points(geo, new THREE.PointsMaterial({ size: taille, map: textureHalo(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  photons.frustumCulled = false;
  group.add(photons);
  const c = new THREE.Color();
  const arr = (p) => (p.isVector3 ? p.toArray() : p);
  let trajets = [];
  return {
    group, photons,
    poser(liste) {
      trajets = liste.filter((t) => t.pts.length > 1).map((t) => {
        const pts = t.pts.map(arr), lens = []; let total = 0;
        for (let i = 0; i < pts.length - 1; i++) {
          const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1], pts[i + 1][2] - pts[i][2]);
          lens.push(l); total += l;
        }
        return { pts, cols: t.cols, lens, total };
      });
      const pos = [], col = [];
      for (const t of trajets) for (let i = 0; i < t.pts.length - 1; i++) {
        c.setHex(t.cols[i]);
        pos.push(...t.pts[i], ...t.pts[i + 1]);
        col.push(c.r, c.g, c.b, c.r, c.g, c.b);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
      lignes.geometry.dispose(); lignes.geometry = g;
    },
    animer(time, parTrajet = 5) {
      const P = geo.attributes.position, C = geo.attributes.color;
      let k = 0;
      for (const t of trajets) for (let j = 0; j < parTrajet && k < maxPh; j++, k++) {
        let s = (time * 3.2 + j * t.total / parTrajet) % t.total, i = 0;
        while (i < t.lens.length - 1 && s > t.lens[i]) { s -= t.lens[i]; i++; }
        const a = t.pts[i], b = t.pts[i + 1], f = Math.min(1, s / Math.max(t.lens[i], 1e-9));
        P.setXYZ(k, a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f);
        c.setHex(t.cols[i]); C.setXYZ(k, c.r, c.g, c.b);
      }
      geo.setDrawRange(0, k);
      P.needsUpdate = true; C.needsUpdate = true;
    },
  };
}
// ---------- Image d'une étoile vue au télescope (pour un encart « Vu à l'oculaire ») ----------
const ARCSEC = 206264.8; // secondes d'arc par radian
function besselJ1(x) {
  const ax = Math.abs(x);
  if (ax < 8) {
    const y = x * x;
    return x * (72362614232.0 + y * (-7895059235.0 + y * (242396853.1 + y * (-2972611.439 + y * (15704.48260 + y * -30.16036606)))))
      / (144725228442.0 + y * (2300535178.0 + y * (18583304.74 + y * (99447.43394 + y * (376.9991397 + y)))));
  }
  const z = 8 / ax, y = z * z, xx = ax - 2.356194491;
  const a1 = 1.0 + y * (0.183105e-2 + y * (-0.3516396496e-4 + y * (0.2457520174e-5 + y * -0.240337019e-6)));
  const a2 = 0.04687499995 + y * (-0.2002690873e-3 + y * (0.8449199096e-5 + y * (-0.88228987e-6 + y * 0.105787412e-6)));
  const r = Math.sqrt(0.636619772 / ax) * (Math.cos(xx) * a1 - z * Math.sin(xx) * a2);
  return x < 0 ? -r : r;
}
const jinc = (v) => (v < 1e-6 ? 1 : 2 * besselJ1(v) / v);
/**
 * Image d'une étoile au foyer d'un télescope à symétrie de révolution : canvas carré de n px.
 * Tache géométrique (rayons répartis sur la pupille, obstruction centrale comprise), puis convolution
 * par la figure de diffraction de l'ouverture obstruée (λ = 550 nm). Convient du point net (anneaux)
 * jusqu'au disque défocalisé troué par l'ombre du secondaire.
 * o : D, F (diamètre et focale résultante, mm) · obstruction (rapport des diamètres)
 *     ecart(rho) : distance (mm), le long du faisceau, entre le point où le rayon de hauteur relative rho (0…1)
 *                  croise l'axe et le plan observé (positive si le plan est avant le croisement)
 *     auPoint : true pour se placer au plan de meilleure mise au point (tache la plus petite)
 *     champ : largeur de l'image en secondes d'arc · n (81) · rayons (par diamètre, 160) · gamma (0,5)
 */
export function imageEtoile(o) {
  const NI = o.n || 81, champ = o.champ, px = champ / NI, eps = o.obstruction || 0, nr = o.rayons || 160;
  const N = o.F / o.D;
  const pup = [];
  for (let i = 0; i < nr; i++) for (let j = 0; j < nr; j++) {
    const y = ((i + 0.5) / nr) * 2 - 1, z = ((j + 0.5) / nr) * 2 - 1, r = Math.hypot(y, z);
    if (r <= 1 && r >= eps) pup.push([y, z, r, o.ecart(r)]);
  }
  let c = 0;
  if (o.auPoint) { // plan qui minimise la tache (moindres carrés)
    let a = 0, b = 0;
    for (const p of pup) { a += p[2] * p[2] * p[3]; b += p[2] * p[2]; }
    c = b ? -a / b : 0;
  }
  let acc = new Float32Array(NI * NI);
  const k = ARCSEC / (2 * N * o.F) / px; // mm d'écart → pixels
  for (const [y, z, , e] of pup) {
    const x = NI / 2 + y * (e + c) * k - 0.5, yy = NI / 2 + z * (e + c) * k - 0.5;
    const i = Math.floor(x), j = Math.floor(yy), fx = x - i, fy = yy - j;
    for (const [di, dj, w] of [[0, 0, (1 - fx) * (1 - fy)], [1, 0, fx * (1 - fy)], [0, 1, (1 - fx) * fy], [1, 1, fx * fy]]) {
      const ii = i + di, jj = j + dj;
      if (ii >= 0 && jj >= 0 && ii < NI && jj < NI) acc[jj * NI + ii] += w;
    }
  }
  if (champ > 60) { // grand champ : lisse le grain dû à l'échantillonnage des rayons
    const b = new Float32Array(NI * NI);
    for (let j = 0; j < NI; j++) for (let i = 0; i < NI; i++) {
      let s = 0, n = 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const x = i + di, y = j + dj;
        if (x >= 0 && y >= 0 && x < NI && y < NI) { s += acc[y * NI + x]; n++; }
      }
      b[j * NI + i] = s / n;
    }
    acc = b;
  }
  // figure de diffraction (disque circulaire de 8 à 9 anneaux), échantillonnée finement dans chaque pixel
  const vpar = Math.PI * o.D / 5.5e-4 / ARCSEC; // argument de la fonction d'Airy par seconde d'arc
  const KR = Math.min(40, Math.ceil(30 / vpar / px));
  if (KR > 0) {
    const KW = 2 * KR + 1, K = new Float32Array(KW * KW);
    let s = 0;
    for (let y = -KR; y <= KR; y++) for (let x = -KR; x <= KR; x++) {
      if (x * x + y * y > KR * KR) continue;
      let v = 0;
      for (let sy = -1; sy <= 1; sy++) for (let sx = -1; sx <= 1; sx++) {
        const t = vpar * px * Math.hypot(x + sx / 3, y + sy / 3);
        const a = (jinc(t) - eps * eps * jinc(eps * t)) / (1 - eps * eps);
        v += a * a;
      }
      K[(y + KR) * KW + x + KR] = v; s += v;
    }
    const out = new Float32Array(NI * NI);
    for (let j = 0; j < NI; j++) for (let i = 0; i < NI; i++) {
      const w = acc[j * NI + i];
      if (!w) continue;
      for (let ky = -KR; ky <= KR; ky++) {
        const y = j + ky;
        if (y < 0 || y >= NI) continue;
        for (let kx = -KR; kx <= KR; kx++) { const x = i + kx; if (x >= 0 && x < NI) out[y * NI + x] += w * K[(ky + KR) * KW + kx + KR] / s; }
      }
    }
    acc = out;
  }
  // luminosité : l'étoile reste bien visible, qu'elle soit nette ou étalée
  let max = 0;
  for (const v of acc) if (v > max) max = v;
  const ref = max * 0.8 || 1, g = o.gamma ?? 0.5;
  const cv = document.createElement("canvas"); cv.width = cv.height = NI;
  const ctx = cv.getContext("2d"), img = ctx.createImageData(NI, NI);
  for (let q = 0; q < NI * NI; q++) {
    const v = Math.min(1, Math.pow(acc[q] / ref, g));
    img.data[q * 4] = 255 * v; img.data[q * 4 + 1] = 244 * v; img.data[q * 4 + 2] = 214 * v; img.data[q * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}
/** Points répartis uniformément dans la pupille (disque unité), sans la partie masquée au centre
 *  (obstruction : rapport des rayons). Renvoie [[u, v], ...]. */
export function pupille(n = 13, obstruction = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const u = (i + 0.5) / n * 2 - 1, v = (j + 0.5) / n * 2 - 1, r = Math.hypot(u, v);
    if (r <= 1 && r >= obstruction) pts.push([u, v]);
  }
  return pts;
}
/**
 * Petit champ d'étoiles photographié : canvas carré de n px couvrant « champ » secondes d'arc.
 * Toutes les étoiles ont la même tache, décrite par les points d'impact des rayons
 * (en ″, x vers la droite, y vers le bas, 0 = image idéale), lissée par la turbulence (sigma, ″).
 * o : n (101) · champ (100) · sigma (1) · graine (7, position des étoiles) · gain (60, luminosité)
 */
export function champEtoiles(impacts, o = {}) {
  const NI = o.n ?? 101, PX = (o.champ ?? 100) / NI, SIG = o.sigma ?? 1, gain = o.gain ?? 60;
  let m = 1;
  for (const [x, y] of impacts) m = Math.max(m, Math.abs(x), Math.abs(y));
  // noyau : les impacts sont accumulés sur la grille (répartition bilinéaire), puis lissés par un flou gaussien séparable
  const sg = SIG / PX, GR = Math.ceil(3 * sg), KR = Math.ceil(m / PX) + GR + 1, KW = 2 * KR + 1;
  let K = new Float32Array(KW * KW);
  for (const [ix, iy] of impacts) {
    const x = ix / PX + KR, y = iy / PX + KR, i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
    K[j * KW + i] += (1 - fx) * (1 - fy); K[j * KW + i + 1] += fx * (1 - fy);
    K[(j + 1) * KW + i] += (1 - fx) * fy; K[(j + 1) * KW + i + 1] += fx * fy;
  }
  const g = []; for (let d = -GR; d <= GR; d++) g.push(Math.exp(-(d * d) / (2 * sg * sg)));
  for (const horiz of [true, false]) {
    const out = new Float32Array(KW * KW);
    for (let y = 0; y < KW; y++) for (let x = 0; x < KW; x++) {
      let s = 0;
      for (let d = -GR; d <= GR; d++) {
        const xx = horiz ? x + d : x, yy = horiz ? y : y + d;
        if (xx >= 0 && yy >= 0 && xx < KW && yy < KW) s += K[yy * KW + xx] * g[d + GR];
      }
      out[y * KW + x] = s;
    }
    K = out;
  }
  let somme = 0;
  for (let q = 0; q < K.length; q++) somme += K[q];
  for (let q = 0; q < K.length; q++) K[q] /= somme;
  // étoiles : une brillante au centre, d'autres plus faibles, de teintes variées
  const r = alea(o.graine ?? 7), etoiles = [];
  for (let i = 0; i < 9; i++) etoiles.push([r() * 0.8 + 0.1, r() * 0.8 + 0.1, i === 0 ? 3 : 0.3 + r() * 1.2, r()]);
  etoiles[0][0] = etoiles[0][1] = 0.5;
  const acc = [0, 1, 2].map(() => new Float32Array(NI * NI));
  for (const [fx, fy, br, teinte] of etoiles) {
    const cx = Math.round(fx * NI), cy = Math.round(fy * NI);
    const col = teinte < 0.3 ? [1, 0.86, 0.7] : teinte > 0.75 ? [0.8, 0.88, 1] : [1, 0.97, 0.92];
    for (let y = -KR; y <= KR; y++) {
      const py = cy + y; if (py < 0 || py >= NI) continue;
      for (let x = -KR; x <= KR; x++) {
        const px = cx + x; if (px < 0 || px >= NI) continue;
        const k = K[(y + KR) * KW + x + KR] * br;
        for (let c = 0; c < 3; c++) acc[c][py * NI + px] += k * col[c];
      }
    }
  }
  const cv = document.createElement("canvas"); cv.width = cv.height = NI;
  const ctx = cv.getContext("2d"), img = ctx.createImageData(NI, NI);
  for (let q = 0; q < NI * NI; q++) {
    for (let c = 0; c < 3; c++) img.data[q * 4 + c] = 255 * Math.sqrt(1 - Math.exp(-gain * acc[c][q]));
    img.data[q * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}
/** Dessine côte à côte des vues rondes (champ d'oculaire) dans le canvas d'un encart d'aperçu.
 *  vues : [{ image (canvas ou null), titre }] — à rappeler quand l'encart change de taille. */
export function vuesRondes(canvas, vues) {
  const dpr = Math.min(devicePixelRatio, 2), W = canvas.clientWidth;
  if (!W) return;
  const gap = 10, lab = 20, n = vues.length, s = Math.floor((W - gap * (n - 1)) / n), H = s + lab;
  if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); canvas.style.height = H + "px";
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  vues.forEach((v, i) => {
    const x = i * (s + gap);
    ctx.save();
    ctx.beginPath(); ctx.arc(x + s / 2, s / 2, s / 2 - 1, 0, 2 * Math.PI); ctx.clip();
    ctx.fillStyle = "#000"; ctx.fillRect(x, 0, s, s);
    ctx.imageSmoothingEnabled = true;
    if (v.image) ctx.drawImage(v.image, x, 0, s, s);
    ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x + s / 2, s / 2, s / 2 - 1, 0, 2 * Math.PI); ctx.stroke();
    ctx.font = "11.5px Arial"; ctx.textAlign = "center"; ctx.fillStyle = "#c4d0e0";
    ctx.fillText(v.titre, x + s / 2, s + 14);
  });
}
/** Vide un groupe en libérant géométries et matériaux (avant de le reconstruire). */
export function vider(g) { g.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); }); g.clear(); }
/** Légende colorée (liste d'étapes) pour la fiche d'introduction. */
export function legende(items) {
  return `<ol class="legend">${items.map((it) => `<li><span class="sw" style="background:${css(it.couleur)}"></span><span>${it.texte}</span></li>`).join("")}</ol>`;
}

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const MOBILE = 760;

/**
 * Crée un schéma.
 * @param {object} cfg
 *  - surtitre, titre, sousTitre : en-tête du panneau
 *  - vues : [{ id, label, pos:[x,y,z], cible:[x,y,z] }] — la première est la vue de départ
 *           pos et cible peuvent être des fonctions (renvoyant un tableau ou un Vector3).
 *           Options : fov (champ en degrés, 38 par défaut), exacte:true (pas de recul sur mobile),
 *           suivre:true (la caméra suit pos/cible à chaque image jusqu'à ce que l'utilisateur bouge la vue),
 *           immersif:true (vue « par les yeux » : la caméra reste au point pos et tourne sur elle-même ;
 *           glisser oriente le regard, la molette ou le pincement élargit ou resserre le champ,
 *           entre fovMin et fovMax, 30° et 120° par défaut ; implique exacte)
 *  - eclate : true pour afficher le curseur « Vue éclatée »
 *  - animation : false pour retirer le bouton « Animation » (schéma sans rien d'animé)
 *  - commandes : [{ type:"bascule", id, label, actif, onChange(v) }
 *                 | { type:"curseur", id, label, min, max, pas, valeur, format(v), onInput(v), retour }
 *                   (retour : libellé d'un bouton qui remet le curseur à sa valeur de départ)
 *                 | { type:"raccourcis", id, label, boutons:[{ id, label, onClick() }] }]
 *                 Un bouton de raccourci a l'id HTML « r-<id> » (aria-pressed réglable par le schéma).
 *  - intro : () => HTML de la fiche affichée quand rien n'est sélectionné
 *  - apercu : { titre } — encart fixe sur le côté de la vue 3D, avec un canvas et une légende
 *             que le schéma dessine (api.apercu = { el, canvas, legende }). Un bouton bascule entre
 *             deux tailles (normale, ×1,5) ; le canvas doit donc lire sa largeur à chaque dessin.
 *             Sur ordinateur, il s'ouvre agrandi.
 *             Plusieurs encarts : passer un tableau [{ titre }, { titre }] ; ils s'empilent dans une
 *             colonne et api.apercus les donne dans l'ordre (api.apercu reste le premier).
 *  - aide : texte d'aide en bas du panneau (remplace le texte par défaut)
 */
export function createSchema(cfg) {
  document.body.classList.add("schema");

  // ---------- DOM ----------
  const stage = document.createElement("div"); stage.id = "stage";
  const labelsEl = document.createElement("div"); labelsEl.id = "labels";
  const panel = document.createElement("aside"); panel.id = "panel";
  const notice = document.createElement("div"); notice.id = "notice"; notice.hidden = true;
  const commandes = cfg.commandes || [];
  const bascules = [...commandes.filter((c) => c.type === "bascule"),
    { type: "bascule", id: "labels", label: "Étiquettes", actif: true },
    ...(cfg.animation === false ? [] : [{ type: "bascule", id: "anim", label: "Animation", actif: true }])];
  const curseurs = commandes.filter((c) => c.type === "curseur");
  const raccourcis = commandes.filter((c) => c.type === "raccourcis");
  panel.innerHTML = `
    <header>
      <a class="home" href="../">← Tous les supports</a>
      <div class="eyebrow">${cfg.surtitre}</div>
      <h1>${cfg.titre}</h1>
      ${cfg.sousTitre ? `<p>${cfg.sousTitre}</p>` : ""}
    </header>
    <section class="group" aria-label="Affichage">
      ${cfg.eclate ? `
      <div class="slider">
        <label for="explode">Vue éclatée</label>
        <input id="explode" type="range" min="0" max="100" value="0">
        <output id="explodeOut">0 %</output>
      </div>
      <div class="row"><button id="btnExplode" type="button">Éclater</button></div>` : ""}
      ${curseurs.map((c) => `
      <div class="slider">
        <label for="c-${c.id}">${c.label}</label>
        <input id="c-${c.id}" type="range" min="${c.min}" max="${c.max}" step="${c.pas ?? 1}" value="${c.valeur}">
        <output id="o-${c.id}"></output>
      </div>${c.retour ? `
      <div class="row"><button id="z-${c.id}" type="button">${c.retour}</button></div>` : ""}`).join("")}
      ${raccourcis.map((c) => `
      <div class="raccourcis" role="group" aria-label="${c.label}">
        <span class="lib">${c.label}</span>
        <div class="toggles">${c.boutons.map((b) => `<button id="r-${b.id}" type="button" aria-pressed="false">${b.label}</button>`).join("")}</div>
      </div>`).join("")}
      <div class="toggles">
        ${bascules.map((b) => `<button id="t-${b.id}" type="button" aria-pressed="${!!b.actif}">${b.label}</button>`).join("")}
      </div>
      <div class="row" role="group" aria-label="Points de vue">
        ${cfg.vues.map((v) => `<button type="button" data-view="${v.id}">${v.label}</button>`).join("")}
      </div>
    </section>
    <section class="group" id="info" aria-live="polite"></section>
    <p class="hint">${cfg.aide ?? "Glisser : tourner · Molette ou pincer : zoomer · Clic droit ou deux doigts : déplacer · Cliquer un élément : l'expliquer"}</p>`;
  // logo de l'association, discret dans un coin de la vue 3D
  const brand = document.createElement("a");
  brand.className = "brand";
  brand.href = "https://reperes-astro.fr";
  brand.target = "_blank"; brand.rel = "noopener";
  brand.title = "Repères-Astro";
  brand.innerHTML = `<img src="${new URL("images/logo-reperes-astro.png", import.meta.url)}" alt="Repères-Astro.fr" width="323" height="100">`;
  document.body.append(stage, labelsEl, panel, notice, brand);
  // encarts d'aperçu (optionnels), dessinés par le schéma, empilés dans une colonne sur le côté
  const apercus = [];
  if (cfg.apercu) {
    const colonne = document.createElement("div"); colonne.id = "apercus";
    document.body.append(colonne);
    for (const a of [].concat(cfg.apercu)) {
      const fig = document.createElement("figure"); fig.className = "apercu";
      fig.innerHTML = `<div class="tete"><div class="eyebrow">${a.titre}</div><button type="button" class="taille" aria-pressed="false">Agrandir</button></div><canvas class="ecran"></canvas><figcaption></figcaption>`;
      colonne.append(fig);
      // deux tailles. Sur ordinateur, l'encart s'ouvre toujours agrandi (bouton « Réduire ») ;
      // sur téléphone, il garde la taille choisie la dernière fois sur cet appareil (petit au départ).
      const btn = fig.querySelector(".taille");
      const taille = (grand, retenir = true) => {
        fig.classList.toggle("grand", grand);
        btn.setAttribute("aria-pressed", String(grand));
        btn.textContent = grand ? "Réduire" : "Agrandir";
        if (retenir) try { localStorage.setItem("apercu-grand", grand ? "1" : "0"); } catch {}
      };
      if (innerWidth > MOBILE) taille(true, false);
      else {
        let pref = false;
        try { pref = localStorage.getItem("apercu-grand") === "1"; } catch {}
        taille(pref, false);
      }
      btn.addEventListener("click", () => taille(!fig.classList.contains("grand")));
      apercus.push({ el: fig, canvas: fig.querySelector("canvas"), legende: fig.querySelector("figcaption") });
    }
  }
  const apercu = apercus[0] || null;

  // ---------- Rendu ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.6;

  const FOV = cfg.fov ?? 38;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 400);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = cfg.distanceMin ?? 4;
  controls.maxDistance = cfg.distanceMax ?? 60;

  // éclairage par défaut (exposé en api.lumieres : un schéma peut le régler)
  const ambiance = new THREE.HemisphereLight(0xbcd0ff, 0x1a1410, 0.7); scene.add(ambiance);
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(6, 10, 8); scene.add(key);
  const rim = new THREE.DirectionalLight(0x8fb3ff, 0.8); rim.position.set(-8, 3, -6); scene.add(rim);

  // ciel étoilé de fond (exposé en api.ciel : un schéma peut le faire tourner)
  const TAILLE_ETOILE = 0.22;
  const ciel = (() => {
    const n = 900, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(110 + Math.random() * 40);
      pos.set([v.x, v.y, v.z], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x9fb0cc, size: TAILLE_ETOILE, transparent: true, opacity: 0.7 }));
    scene.add(pts);
    return pts;
  })();

  // ---------- État ----------
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const state = { explode: 0, explodeTarget: 0, selected: null, hovered: null };
  for (const b of bascules) state[b.id] = !!b.actif;
  for (const c of curseurs) state[c.id] = +c.valeur;

  const parts = [];
  const labels = [];
  const frameFns = [];
  let time = 0;
  let pickSale = true; // liste des meshes cliquables à recalculer (pièce ajoutée ou reconstruite)

  const api = {
    THREE, scene, camera, renderer, controls, state, parts, ciel, apercu, apercus,
    lumieres: { ambiance, principale: key, contre: rim },
    get time() { return time; },
    get explode() { return ease(state.explode); },
    reduced,

    /** Déclare un élément sélectionnable (avec fiche et étiquette).
     *  opts.parent : groupe auquel l'attacher (pièce mobile, ex. axe d'une monture) ;
     *  eclate et ancre sont alors exprimés dans le repère de ce groupe. */
    part(id, nom, opts = {}) {
      const group = new THREE.Group();
      (opts.parent || scene).add(group);
      const p = {
        id, nom, group,
        eclate: new THREE.Vector3(...(opts.eclate || [0, 0, 0])),
        ancre: new THREE.Vector3(...(opts.ancre || [0, 0, 0])),
        texte: opts.texte || "", chiffres: opts.chiffres || "",
        extra: opts.extra, bind: opts.bind,
        materials: new Set(),
      };
      parts.push(p);
      if (opts.etiquette !== false) {
        // l'étiquette disparaît quand l'élément est masqué (lui ou un groupe parent)
        api.label(nom, () => p.group.localToWorld(p.ancre.clone()), { partId: id, visible: () => {
          for (let o = p.group; o; o = o.parent) if (!o.visible) return false;
          return true;
        } });
      }
      return p;
    },
    /** Ajoute un mesh à un élément (le rend cliquable et surlignable). */
    add(p, m) {
      p.group.add(m);
      m.traverse((o) => { if (o.isMesh) { o.userData.partId = p.id; p.materials.add(o.material); } });
      pickSale = true;
      return m;
    },
    /** Retire tous les meshes d'un élément, pour le reconstruire avec S.add (ex. changement de modèle).
     *  L'élément garde son étiquette et sa fiche ; p.eclate, p.ancre, p.texte et p.chiffres restent modifiables. */
    viderElement(p) {
      vider(p.group);
      p.materials.clear();
      pickSale = true;
    },
    /** Étiquette libre. opts : { partId, lumiere:true, visible:() => bool } */
    label(texte, getPos, opts = {}) {
      const el = document.createElement("div");
      el.className = "lbl" + (opts.lumiere ? " light" : "");
      el.textContent = texte;
      if (opts.partId) {
        el.tabIndex = 0; el.setAttribute("role", "button");
        el.addEventListener("click", () => select(opts.partId));
        el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(opts.partId); } });
        el.addEventListener("pointerenter", () => { state.hovered = opts.partId; });
        el.addEventListener("pointerleave", () => { if (state.hovered === opts.partId) state.hovered = null; });
      }
      labelsEl.appendChild(el);
      const L = { el, getPos, ...opts };
      labels.push(L);
      return L;
    },
    /** Fonction appelée à chaque image : fn({ dt, time, explode }) */
    onFrame(fn) { frameFns.push(fn); },
    /** Affiche (texte) ou masque (null) le bandeau d'avertissement. */
    notice(texte) { notice.hidden = !texte; if (texte) notice.textContent = texte; },
    /** Change une commande depuis le script. Curseur : met la valeur et appelle onInput.
     *  Bascule : met l'état et le bouton à jour, sans appeler onChange. */
    regler(id, valeur) {
      const c = curseurs.find((x) => x.id === id);
      if (c) { panel.querySelector(`#c-${id}`).value = valeur; c._init(); return; }
      if (bascules.some((x) => x.id === id)) {
        state[id] = !!valeur;
        panel.querySelector(`#t-${id}`).setAttribute("aria-pressed", String(state[id]));
      }
    },
    select: (id) => select(id),
    refreshInfo: () => renderInfo(),
    vue: (id) => goView(id),
    start,
  };

  // ---------- Fiches ----------
  const info = panel.querySelector("#info");
  function renderInfo() {
    const p = parts.find((x) => x.id === state.selected);
    if (!p) {
      info.innerHTML = cfg.intro ? cfg.intro() : "";
      return;
    }
    info.innerHTML = `
      <div class="eyebrow">Élément sélectionné</div>
      <h2>${p.nom}</h2>
      <p>${p.texte}</p>
      ${p.chiffres ? `<p class="spec">${p.chiffres}</p>` : ""}
      ${p.extra ? p.extra() : ""}
      <button class="back" type="button">← Retour à la vue d'ensemble</button>`;
    info.querySelector(".back").addEventListener("click", () => select(null));
    if (p.bind) p.bind(info);
  }
  function select(id) {
    state.selected = id && state.selected !== id ? id : null;
    for (const L of labels) L.el.classList.toggle("on", !!L.partId && L.partId === state.selected);
    renderInfo();
  }

  // ---------- Commandes ----------
  const explodeInput = panel.querySelector("#explode");
  const explodeOut = panel.querySelector("#explodeOut");
  const btnExplode = panel.querySelector("#btnExplode");
  if (explodeInput) {
    explodeInput.addEventListener("input", () => { state.explodeTarget = state.explode = explodeInput.value / 100; });
    btnExplode.addEventListener("click", () => { state.explodeTarget = state.explodeTarget > 0.5 ? 0 : 1; });
  }
  for (const b of bascules) {
    const btn = panel.querySelector(`#t-${b.id}`);
    btn.addEventListener("click", () => {
      state[b.id] = !state[b.id];
      btn.setAttribute("aria-pressed", String(state[b.id]));
      b.onChange && b.onChange(state[b.id]);
    });
  }
  for (const c of raccourcis) for (const b of c.boutons) panel.querySelector(`#r-${b.id}`).addEventListener("click", () => b.onClick());
  for (const c of curseurs) {
    const input = panel.querySelector(`#c-${c.id}`), out = panel.querySelector(`#o-${c.id}`);
    const upd = () => { state[c.id] = +input.value; out.textContent = c.format ? c.format(state[c.id]) : input.value; c.onInput && c.onInput(state[c.id]); };
    input.addEventListener("input", upd);
    c._init = upd;
    if (c.retour) panel.querySelector(`#z-${c.id}`).addEventListener("click", () => { input.value = c.valeur; upd(); });
  }

  // ---------- Sélection par clic ----------
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let pickList = [];
  function pick(ev) {
    if (pickSale) {
      pickList = [];
      for (const p of parts) p.group.traverse((o) => o.isMesh && pickList.push(o));
      pickSale = false;
    }
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(pickList, false).find((h) => {
      for (let o = h.object; o; o = o.parent) if (!o.visible) return false;
      return true;
    });
    return hit ? hit.object.userData.partId : null;
  }
  let downAt = null;
  renderer.domElement.addEventListener("pointerdown", (e) => { downAt = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener("pointerup", (e) => {
    if (!downAt) return;
    const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]);
    downAt = null;
    if (moved < 6) select(pick(e));
  });
  renderer.domElement.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || e.buttons) return;
    state.hovered = pick(e);
    renderer.domElement.style.cursor = state.hovered ? "pointer" : "";
  });

  // ---------- Vues caméra ----------
  let camAnim = null, vueSuivie = null;
  const vec = (x) => { const r = typeof x === "function" ? x() : x; return r.isVector3 ? r.clone() : new THREE.Vector3(...r); };
  function cadrage(v) {
    const to = { pos: vec(v.pos), target: vec(v.cible), fov: v.fov ?? FOV };
    // vue immersive : la cible est posée juste devant l'œil, la caméra tourne donc sur elle-même
    if (v.immersif) to.target.sub(to.pos).setLength(0.01).add(to.pos);
    else if (innerWidth < MOBILE && !v.exacte) to.pos.sub(to.target).multiplyScalar(1.35).add(to.target);
    return to;
  }
  // ---------- Vue immersive (par les yeux) ----------
  // réglages des commandes du schéma, mis de côté pendant la vue immersive
  let immersif = null, orbite = null;
  function entrerImmersif(v) {
    if (!orbite) orbite = { minDistance: controls.minDistance, rotateSpeed: controls.rotateSpeed, zoom: controls.enableZoom, pan: controls.enablePan };
    immersif = v;
    controls.minDistance = 0;
    controls.enableZoom = controls.enablePan = false;
    controls.rotateSpeed = -0.35; // négatif : le ciel suit la souris ou le doigt
  }
  /** distance:false garde la distance libre (fin du trajet de la caméra qui sort de la vue immersive). */
  function quitterImmersif(distance = true) {
    if (immersif) { controls.enableZoom = orbite.zoom; controls.enablePan = orbite.pan; controls.rotateSpeed = orbite.rotateSpeed; immersif = null; }
    if (distance && orbite) { controls.minDistance = orbite.minDistance; orbite = null; }
  }
  function changerChamp(k) {
    if (!immersif || camAnim) return;
    const fov = Math.min(immersif.fovMax ?? 120, Math.max(immersif.fovMin ?? 30, camera.fov * k));
    if (fov !== camera.fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
  }
  renderer.domElement.addEventListener("wheel", (e) => {
    if (!immersif) return;
    e.preventDefault();
    changerChamp(Math.exp(e.deltaY * 0.001));
  }, { passive: false });
  const doigts = new Map();
  let ecartPrec = 0;
  const ecart = () => { const [a, b] = [...doigts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  renderer.domElement.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "touch") return;
    doigts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (doigts.size === 2) ecartPrec = ecart();
  });
  renderer.domElement.addEventListener("pointermove", (e) => {
    if (!doigts.has(e.pointerId)) return;
    doigts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (doigts.size === 2) { const d = ecart(); if (ecartPrec > 0 && d > 0) changerChamp(ecartPrec / d); ecartPrec = d; }
  });
  for (const t of ["pointerup", "pointercancel"]) renderer.domElement.addEventListener(t, (e) => { doigts.delete(e.pointerId); ecartPrec = 0; });
  function applyCam(c) {
    camera.position.copy(c.pos); controls.target.copy(c.target);
    if (camera.fov !== c.fov) { camera.fov = c.fov; camera.updateProjectionMatrix(); }
  }
  function goView(id, instant = false) {
    const v = cfg.vues.find((x) => x.id === id) || cfg.vues[0];
    vueSuivie = v.suivre ? v : null;
    // en entrant dans une vue immersive, on libère tout de suite la distance ; en en sortant, à la fin du trajet
    if (v.immersif) entrerImmersif(v);
    else quitterImmersif(instant || reduced);
    const to = cadrage(v);
    if (instant || reduced) { applyCam(to); return; }
    camAnim = { v, from: { pos: camera.position.clone(), target: controls.target.clone(), fov: camera.fov }, to, t: 0 };
  }
  // l'utilisateur reprend la main : la vue cesse de suivre l'objet mobile
  controls.addEventListener("start", () => { vueSuivie = null; });
  panel.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => goView(b.dataset.view)));

  // ---------- Taille : centre de vue décalé hors du panneau ----------
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    const shift = panel.offsetWidth + 20;
    if (w > MOBILE) { camera.aspect = (w + shift) / h; camera.setViewOffset(w + shift, h, 0, 0, w, h); }
    else { camera.aspect = w / (h * 1.4); camera.setViewOffset(w, h * 1.4, 0, h * 0.4, w, h); }
    camera.updateProjectionMatrix();
  }
  addEventListener("resize", resize);

  // ---------- Boucle ----------
  function start() {
    pickSale = true;
    for (const b of bascules) b.onChange && b.onChange(state[b.id]);
    for (const c of curseurs) c._init();
    renderInfo();
    goView(cfg.vues[0].id, true);
    resize();

    const timer = new THREE.Timer();
    timer.connect(document);
    const v3 = new THREE.Vector3();
    const accent = new THREE.Color(COULEURS.accent);

    renderer.setAnimationLoop(() => {
      timer.update();
      const dt = Math.min(timer.getDelta(), 0.05);
      if (state.anim && !reduced) time += dt;

      // vue éclatée
      if (state.explode !== state.explodeTarget) {
        const step = dt * (reduced ? 10 : 1.4);
        state.explode = state.explode < state.explodeTarget
          ? Math.min(state.explodeTarget, state.explode + step)
          : Math.max(state.explodeTarget, state.explode - step);
        if (explodeInput) explodeInput.value = Math.round(state.explode * 100);
      }
      if (explodeInput) {
        explodeOut.textContent = Math.round(state.explode * 100) + " %";
        btnExplode.textContent = state.explodeTarget > 0.5 ? "Assembler" : "Éclater";
      }
      const e = ease(state.explode);
      for (const p of parts) p.group.position.copy(p.eclate).multiplyScalar(e);

      // surbrillance
      for (const p of parts) {
        const on = p.id === state.selected ? 0.35 : p.id === state.hovered ? 0.18 : 0;
        for (const m of p.materials) if (m.emissive) { m.emissive.copy(accent); m.emissiveIntensity = on; }
      }

      for (const fn of frameFns) fn({ dt, time, explode: e });

      // caméra
      if (camAnim) {
        if (camAnim.v.suivre) camAnim.to = cadrage(camAnim.v);
        camAnim.t = Math.min(1, camAnim.t + dt / 0.9);
        const k = ease(camAnim.t);
        camera.position.lerpVectors(camAnim.from.pos, camAnim.to.pos, k);
        controls.target.lerpVectors(camAnim.from.target, camAnim.to.target, k);
        const fov = camAnim.from.fov + (camAnim.to.fov - camAnim.from.fov) * k;
        if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
        if (camAnim.t >= 1) { if (!camAnim.v.immersif) quitterImmersif(); camAnim = null; }
      } else if (vueSuivie) applyCam(cadrage(vueSuivie));
      ciel.material.size = TAILLE_ETOILE * camera.fov / FOV; // taille apparente constante quand on zoome
      controls.update();
      renderer.render(scene, camera);

      // étiquettes
      const w = innerWidth, h = innerHeight;
      for (const L of labels) {
        const show = state.labels && (!L.visible || L.visible());
        if (!show) { L.el.hidden = true; continue; }
        v3.copy(L.getPos()).project(camera);
        if (v3.z > 1) { L.el.hidden = true; continue; }
        L.el.hidden = false;
        L.el.style.transform = `translate(${(v3.x * 0.5 + 0.5) * w}px, ${(-v3.y * 0.5 + 0.5) * h - 10}px) translate(-50%, -100%)`;
      }
    });
  }

  return api;
}
