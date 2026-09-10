// Redirect direct/bookmark visits on production only. When running from a local
// file (file://) the site shouldn’t attempt to bounce back to the live domain.
(function () {
  const ua = navigator.userAgent.toLowerCase();
  const isBot = /(googlebot|bingbot|duckduckbot|baiduspider|yandexbot|slurp|facebookexternalhit|twitterbot)/.test(ua);
  const isLocal = location.protocol === 'file:';
  const noRef = !document.referrer || !document.referrer.startsWith(location.origin);
  const isHome = location.pathname === '/' || /\/index\.html?$/i.test(location.pathname);
  // Only redirect on production (HTTP/HTTPS) when the visitor is not a bot,
  // has no internal referrer and isn’t on the home page.
  if (!isBot && !isLocal && noRef && !isHome) {
   // location.replace('https://santragsm.paulsumit.com/');
  }
})();

// Populate a small proof grid on the home page and enable lightbox
async function loadRecentProof() {

  const target = document.getElementById('recent-proof-grid');
  if (!target) return;

  // Always pull the latest JSON
  const res = await fetch('assets/data/gallery.json?v=3');
  const items = await res.json();

  // Keep only images that actually load (skip deleted/missing)
  const verified = await Promise.all(items.map(async (it) => {
    const ok = await new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = it.src + (it.src.includes('?') ? '&' : '?') + 'cb=1';
    });
    return ok ? it : null;
  }));
  const filtered = verified.filter(Boolean);

  // Sort by the number in the filename (e.g., proof_47 > proof_45)
  const byNumDesc = (a, b) => {
    const na = parseInt((a.src.match(/(\d+)/) || [0])[0], 10) || 0;
    const nb = parseInt((b.src.match(/(\d+)/) || [0])[0], 10) || 0;
    return nb - na || b.src.localeCompare(a.src);
  };
  const ordered = filtered.sort(byNumDesc).slice(0, 8);

  target.innerHTML = ordered.map(i => `
    <figure class="card hoverable">
      <img src="${i.src}" alt="${i.caption || 'Work proof'}" loading="lazy" data-caption="${i.caption || ''}">
    </figure>
  `).join('');

  bindLightbox('#recent-proof-grid img');
}
function bindLightbox(sel) {
  const imgs = document.querySelectorAll(sel);
  const lb = document.getElementById('lightbox');
  if (!lb) return;
  const img = lb.querySelector('img');
  const cap = lb.querySelector('.lightbox-caption');
  const cls = lb.querySelector('.lightbox-close');
  imgs.forEach(el => el.addEventListener('click', () => {
    img.src = el.src; cap.textContent = el.dataset.caption || '';
    lb.classList.add('show'); lb.setAttribute('aria-hidden', 'false');
  }));
  const close = () => { lb.classList.remove('show'); lb.setAttribute('aria-hidden', 'true'); }
  cls?.addEventListener('click', close);
  lb.addEventListener('click', e => { if (e.target === lb) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}

/* === Build full gallery grid on gallery.html (merged from gallery.js) === */
async function buildGallery() {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;

  const res = await fetch('assets/data/gallery.json?v=3');
  const items = await res.json();

  const checks = await Promise.all(items.map(it => new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(it);
    img.onerror = () => resolve(null);
    img.src = it.src + (it.src.includes('?') ? '&' : '?') + 'cb=1';
  })));
  const filtered = checks.filter(Boolean);

  grid.innerHTML = filtered.map(it => `
    <figure class="tile">
      <img src="${it.src}" alt="Work proof" loading="lazy" data-caption="${it.caption || ''}">
    </figure>
  `).join('');

  bindLightbox('#galleryGrid img');
}

/* === Tool Rent page: search filter === */
function filterTools() {
  const box = document.getElementById('toolSearch');
  if (!box) return;
  const q = box.value.toLowerCase();
  const rows = document.querySelectorAll('#toolsTable tbody tr');
  rows.forEach(r => r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none');
}

/* Desktop-only ripple on buttons & nav */
function enableRipple() {
  if (window.innerWidth < 1024) return;

  const targets = Array.from(document.querySelectorAll('.btn, .nav a'));
  targets.forEach(el => {
    // make sure ripple is positioned correctly
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';

    el.addEventListener('click', (e) => {
      // don’t show ripple for modified clicks (new tab, etc.)
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const rect = el.getBoundingClientRect();
      const r = document.createElement('span');
      r.className = 'ripple';
      r.style.left = (e.clientX - rect.left) + 'px';
      r.style.top = (e.clientY - rect.top) + 'px';
      el.appendChild(r);
      r.addEventListener('animationend', () => r.remove());
    });
  });
}

/* Desktop-only: magnetic hover on nav tabs & buttons */
function enableMagneticTabsAndButtons() {
  if (window.innerWidth < 1024) return;

  const targets = document.querySelectorAll('.btn, .nav a');
  const MAX_TILT = 6;   // degrees
  const MAX_MOVE = 6;   // px
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  targets.forEach(el => {
    let raf = null;
    let state = { rx: 0, ry: 0, tx: 0, ty: 0 };

    function apply() {
      raf = null;
      el.style.setProperty('--mag-rx', state.rx.toFixed(2) + 'deg');
      el.style.setProperty('--mag-ry', state.ry.toFixed(2) + 'deg');
      el.style.setProperty('--mag-tx', state.tx.toFixed(2) + 'px');
      el.style.setProperty('--mag-ty', state.ty.toFixed(2) + 'px');
    }

    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;   // 0..1
      const y = (e.clientY - r.top) / r.height;  // 0..1

      state.ry = (x - 0.5) * MAX_TILT;  // rotateY
      state.rx = (0.5 - y) * MAX_TILT;  // rotateX
      state.tx = (x - 0.5) * MAX_MOVE;  // translateX
      state.ty = (y - 0.5) * MAX_MOVE;  // translateY

      if (!raf) raf = requestAnimationFrame(apply);
    });

    el.addEventListener('mouseleave', () => {
      state = { rx: 0, ry: 0, tx: 0, ty: 0 };
      if (!raf) raf = requestAnimationFrame(apply);
    });
  });
}

/* Desktop-only: Scroll-to-top Floating Action Button */
function enableScrollTopFab() {
  if (window.innerWidth < 1024) return;

  // avoid duplicates if init runs twice
  if (document.querySelector('.fab-top')) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const btn = document.createElement('button');
  btn.className = 'fab-top';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Scroll to top');
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 5l-7 7h4v7h6v-7h4l-7-7z" fill="currentColor"/>
    </svg>
  `;
  document.body.appendChild(btn);

  // throttle scroll handler with rAF
  let ticking = false;
  const revealAt = 600; // px
  function onScroll() {
    const y = window.scrollY || document.documentElement.scrollTop;
    if (!ticking) {
      window.requestAnimationFrame(() => {
        btn.classList.toggle('fab-show', y > revealAt);
        ticking = false;
      });
      ticking = true;
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // initial state

  btn.addEventListener('click', () => {
    if (prefersReduced) {
      window.scrollTo(0, 0);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
}

/* Tiny perf touch: default non-critical images to async/lazy */
function enablePerfTweaks() {
  try {
    document.querySelectorAll('img').forEach(img => {
      const alt = (img.getAttribute('alt') || '').toLowerCase();
      const isLogo = img.classList.contains('brand-logo') || alt.includes('logo');
      if (!img.decoding) img.decoding = 'async';
      // keep logos/hero eager; others lazy
      if (!isLogo && !img.loading) img.loading = 'lazy';
    });
  } catch (e) { /* no-op */ }
}

/* === Inject LocalBusiness schema on every page === */
function injectLocalBusinessSchema() {
  if (document.getElementById('schema-org-localbusiness')) return; // avoid duplicate
  const data = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": "https://www.santragsm.paulsumit.com/#org",
    "name": "SANTRA GSM",
    "alternateName": ["Santra GSM", "SantraGSM", "Santra Mobile"],
    "url": "https://www.santragsm.paulsumit.com/",
    "logo": "https://www.santragsm.paulsumit.com/assets/images/logo/logo-sg-512.png",
    "image": "https://www.santragsm.paulsumit.com/assets/images/logo/logo-sg-512.png",
    "telephone": "+91 9332939950",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Habra",
      "addressRegion": "West Bengal",
      "addressCountry": "IN"
    },
    "areaServed": "IN",
    "sameAs": [
      "https://wa.me/919332939950",
      "https://t.me/+uSauzsRunW80MDE1"
    ]
  };
  const s = document.createElement('script');
  s.type = 'application/ld+json';
  s.id = 'schema-org-localbusiness';
  s.textContent = JSON.stringify(data);
  document.head.appendChild(s);
}

/* === Init on every page === */
document.addEventListener('DOMContentLoaded', () => {
  injectLocalBusinessSchema();
  loadRecentProof();        // harmless on pages without #recent-proof-grid
  buildGallery();           // harmless on pages without #galleryGrid
  window.filterTools = filterTools; // for onclick="filterTools()" on tools page

  // Desktop enhancements
  enableRipple();                    // from Step 3
  enableMagneticTabsAndButtons();    // from Step 4
  enableScrollTopFab();              // NEW: neon scroll-to-top
  enablePerfTweaks();                // NEW: small image decoding/lazy tweak
});
