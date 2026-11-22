/*
  Catalogue des supports pédagogiques, à intégrer sur reperes-astro.fr.
  À coller dans un bloc « HTML personnalisé » WordPress :

    <script src="https://abettembot.github.io/formation-astro/integration/integration.js"></script>

  Le script place juste après lui une iframe vers integration/ (le catalogue, lu en direct
  dans la page d'accueil du site), ajuste sa hauteur au contenu et fait défiler la page
  quand on clique sur une rubrique du sommaire. Rien à mettre à jour côté WordPress.
*/
(() => {
  const script = document.currentScript;
  const url = new URL('./', script.src);
  const origine = url.origin;

  const iframe = document.createElement('iframe');
  iframe.src = url.href;
  iframe.title = 'Supports pédagogiques Repères-Astro';
  iframe.setAttribute('scrolling', 'no');
  iframe.style.cssText = 'display:block;width:100%;height:1600px;border:0;margin:0;padding:0;overflow:hidden;background:transparent;color-scheme:dark;';
  // color-scheme identique à celui de la page intégrée : sinon le navigateur peint un fond opaque.
  script.after(iframe);

  // Hauteur des en-têtes fixes du thème, pour ne pas cacher le titre de la rubrique.
  const hauteurEntetes = () => {
    let h = 0;
    document.querySelectorAll('header, #header, .topbar, #wpadminbar').forEach((el) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if ((s.position === 'fixed' || s.position === 'sticky') && r.top <= 1 && r.height < 200) h = Math.max(h, r.bottom);
    });
    return h;
  };

  window.addEventListener('message', (e) => {
    if (e.origin !== origine || e.source !== iframe.contentWindow) return;
    const d = e.data || {};
    if (d.source !== 'reperes-catalogue') return;
    if (typeof d.hauteur === 'number') iframe.style.height = d.hauteur + 'px';
    if (typeof d.defiler === 'number') {
      const y = iframe.getBoundingClientRect().top + window.scrollY + d.defiler - hauteurEntetes() - 12;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  });
})();
