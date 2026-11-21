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
  rouge: 0xff5f4f,   // accent / sélection
  ambre: 0xffc861,
  etoile: 0xf6e7b0,  // lumière incidente
  orange: 0xff9a4a,
  corail: 0xff6b5e,
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
  lentille: () => new THREE.MeshStandardMaterial({ color: 0x6f8fb8, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.55 }),
};

// ---------- Aides géométriques ----------
export const axeX = (geo) => geo.rotateZ(-Math.PI / 2); // axe Y -> axe X
export const axeZ = (geo) => geo.rotateX(Math.PI / 2);  // axe Y -> axe Z
export function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
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
 *  - eclate : true pour afficher le curseur « Vue éclatée »
 *  - commandes : [{ type:"bascule", id, label, actif, onChange(v) }
 *                 | { type:"curseur", id, label, min, max, pas, valeur, format(v), onInput(v) }]
 *  - intro : () => HTML de la fiche affichée quand rien n'est sélectionné
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
    { type: "bascule", id: "anim", label: "Animation", actif: true }];
  const curseurs = commandes.filter((c) => c.type === "curseur");
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
      </div>`).join("")}
      <div class="toggles">
        ${bascules.map((b) => `<button id="t-${b.id}" type="button" aria-pressed="${!!b.actif}">${b.label}</button>`).join("")}
      </div>
      <div class="row" role="group" aria-label="Points de vue">
        ${cfg.vues.map((v) => `<button type="button" data-view="${v.id}">${v.label}</button>`).join("")}
      </div>
    </section>
    <section class="group" id="info" aria-live="polite"></section>
    <p class="hint">Glisser : tourner · Molette ou pincer : zoomer · Clic droit ou deux doigts : déplacer · Cliquer un élément : l'expliquer</p>`;
  document.body.append(stage, labelsEl, panel, notice);

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

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 400);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = cfg.distanceMin ?? 4;
  controls.maxDistance = cfg.distanceMax ?? 60;

  scene.add(new THREE.HemisphereLight(0xbcd0ff, 0x1a1410, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(6, 10, 8); scene.add(key);
  const rim = new THREE.DirectionalLight(0x8fb3ff, 0.8); rim.position.set(-8, 3, -6); scene.add(rim);

  // ciel étoilé de fond
  {
    const n = 900, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(110 + Math.random() * 40);
      pos.set([v.x, v.y, v.z], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x9fb0cc, size: 0.22, transparent: true, opacity: 0.7 })));
  }

  // ---------- État ----------
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const state = { explode: 0, explodeTarget: 0, selected: null, hovered: null };
  for (const b of bascules) state[b.id] = !!b.actif;
  for (const c of curseurs) state[c.id] = +c.valeur;

  const parts = [];
  const labels = [];
  const frameFns = [];
  let time = 0;

  const api = {
    THREE, scene, camera, renderer, controls, state, parts,
    get time() { return time; },
    get explode() { return ease(state.explode); },
    reduced,

    /** Déclare un élément sélectionnable (avec fiche et étiquette). */
    part(id, nom, opts = {}) {
      const group = new THREE.Group();
      scene.add(group);
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
        api.label(nom, () => p.ancre.clone().add(p.group.position), { partId: id });
      }
      return p;
    },
    /** Ajoute un mesh à un élément (le rend cliquable et surlignable). */
    add(p, m) {
      p.group.add(m);
      m.traverse((o) => { if (o.isMesh) { o.userData.partId = p.id; p.materials.add(o.material); } });
      return m;
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
  for (const c of curseurs) {
    const input = panel.querySelector(`#c-${c.id}`), out = panel.querySelector(`#o-${c.id}`);
    const upd = () => { state[c.id] = +input.value; out.textContent = c.format ? c.format(state[c.id]) : input.value; c.onInput && c.onInput(state[c.id]); };
    input.addEventListener("input", upd);
    c._init = upd;
  }

  // ---------- Sélection par clic ----------
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let pickList = [];
  function pick(ev) {
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
  let camAnim = null;
  function goView(id, instant = false) {
    const v = cfg.vues.find((x) => x.id === id) || cfg.vues[0];
    const to = { pos: new THREE.Vector3(...v.pos), target: new THREE.Vector3(...v.cible) };
    if (innerWidth < MOBILE) to.pos.sub(to.target).multiplyScalar(1.35).add(to.target);
    if (instant || reduced) { camera.position.copy(to.pos); controls.target.copy(to.target); return; }
    camAnim = { from: { pos: camera.position.clone(), target: controls.target.clone() }, to, t: 0 };
  }
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
    pickList = [];
    for (const p of parts) p.group.traverse((o) => o.isMesh && pickList.push(o));
    for (const b of bascules) b.onChange && b.onChange(state[b.id]);
    for (const c of curseurs) c._init();
    renderInfo();
    goView(cfg.vues[0].id, true);
    resize();

    const timer = new THREE.Timer();
    timer.connect(document);
    const v3 = new THREE.Vector3();
    const accent = new THREE.Color(COULEURS.rouge);

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
        camAnim.t = Math.min(1, camAnim.t + dt / 0.9);
        const k = ease(camAnim.t);
        camera.position.lerpVectors(camAnim.from.pos, camAnim.to.pos, k);
        controls.target.lerpVectors(camAnim.from.target, camAnim.to.target, k);
        if (camAnim.t >= 1) camAnim = null;
      }
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
