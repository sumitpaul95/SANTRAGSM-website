
// Build full gallery grid + lightbox
(async () => {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;
  const res = await fetch('assets/data/gallery.json?v=3');
  const items = await res.json();

  // Verify images exist; skip broken/missing files
  const checks = await Promise.all(items.map(it => new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(it);
    img.onerror = () => resolve(null);
    img.src = it.src + (it.src.includes('?') ? '&' : '?') + 'cb=1'; // bypass cache
  })));
  const filtered = checks.filter(Boolean);

  // Sort newest first by number in filename
  const byNumDesc = (a, b) => {
    const na = parseInt((a.src.match(/(\d+)/) || [0])[0], 10) || 0;
    const nb = parseInt((b.src.match(/(\d+)/) || [0])[0], 10) || 0;
    return nb - na || b.src.localeCompare(a.src);
  };
  const ordered = filtered.sort(byNumDesc);

  grid.innerHTML = ordered.map(i => `
    <figure class="card hoverable">
      <img src="${i.src}" alt="${i.caption || 'Work proof'}" loading="lazy" data-caption="${i.caption || ''}">
    </figure>
  `).join('');
  // Reuse the lightbox binder in this file
  const lb = document.getElementById('lightbox');
  const img = lb.querySelector('img');
  const cap = lb.querySelector('.lightbox-caption');
  const cls = lb.querySelector('.lightbox-close');
  document.querySelectorAll('#galleryGrid img').forEach(el => el.addEventListener('click', () => {
    img.src = el.src; cap.textContent = el.dataset.caption || '';
    lb.classList.add('show'); lb.setAttribute('aria-hidden', 'false');
  }));
  const close = () => { lb.classList.remove('show'); lb.setAttribute('aria-hidden', 'true'); }
  cls?.addEventListener('click', close);
  lb.addEventListener('click', e => { if (e.target === lb) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
})();
