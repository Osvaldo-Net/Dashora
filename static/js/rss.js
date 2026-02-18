
// -----------------------------------------------
// RSS FEEDS
// -----------------------------------------------
let rssFeeds = [];
let rssMode  = 'add';
let rssRefreshIntervals = new Map();

async function loadRSSFeeds() {
    try {
        const r = await fetch('/api/rss');
        rssFeeds = await r.json() || [];
        renderRSSFeeds();
        for (const feed of rssFeeds) {
            let items = [];
            try { items = JSON.parse(feed.cached_items || '[]'); } catch {}
            if (items.length === 0) await fetchRSSContent(feed.id, true);
        }
        rssFeeds.forEach(feed => startRSSRefresh(feed.id));
    } catch(e) { console.error(e); renderRSSFeeds(); }
}

function startRSSRefresh(feedId) {
    if (rssRefreshIntervals.has(feedId)) clearInterval(rssRefreshIntervals.get(feedId));
    const interval = setInterval(() => fetchRSSContent(feedId, true), 5 * 60 * 1000);
    rssRefreshIntervals.set(feedId, interval);
}

function renderRSSFeeds() {
    const container = document.getElementById('rssContainer');
    const empty     = document.getElementById('rssEmpty');
    if (!container) return;
    if (rssFeeds.length === 0) { container.innerHTML = ''; if (empty) empty.style.display = 'block'; return; }
    if (empty) empty.style.display = 'none';
    container.innerHTML = '';
    rssFeeds.forEach(feed => container.appendChild(buildRSSCard(feed)));
}

function buildRSSCard(feed) {
    const card = document.createElement('div');
    card.className = 'rss-feed-card';
    card.id = 'rss-feed-' + feed.id;

    const header    = document.createElement('div'); header.className = 'rss-feed-header';
    const titleArea = document.createElement('div'); titleArea.className = 'rss-feed-title-area';

    const title = document.createElement('div'); title.className = 'rss-feed-title';
    title.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M6.18 15.64c-1.12 0-2.03.91-2.03 2.03s.91 2.03 2.03 2.03 2.03-.91 2.03-2.03-.91-2.03-2.03-2.03zM4 8.5C7.04 8.5 10.04 9.65 12.35 11.96 14.66 14.27 15.81 17.27 15.81 20.31h2.52c0-7.91-6.45-14.36-14.36-14.36V8.5zm0-3.75C10.66 4.75 16.31 7.14 20.18 11 24.05 14.86 26.44 20.51 26.44 27.17h2.52C28.96 12.48 15.49-.99.01-.99v2.76z"/></svg>' + escapeHtml(feed.title);

    const urlEl = document.createElement('div'); urlEl.className = 'rss-feed-url'; urlEl.textContent = feed.url;
    titleArea.appendChild(title); titleArea.appendChild(urlEl);

    const actions = document.createElement('div'); actions.className = 'rss-feed-actions';

    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'rss-feed-btn refresh'; refreshBtn.title = 'Actualizar';
    refreshBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>';
    refreshBtn.addEventListener('click', () => fetchRSSContent(feed.id)); actions.appendChild(refreshBtn);

    const editBtn = document.createElement('button');
    editBtn.className = 'rss-feed-btn edit'; editBtn.title = 'Editar';
    editBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>';
    editBtn.addEventListener('click', () => openEditRSS(feed)); actions.appendChild(editBtn);

    const delBtn = document.createElement('button');
    delBtn.className = 'rss-feed-btn delete'; delBtn.title = 'Eliminar';
    delBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>';
    delBtn.addEventListener('click', () => deleteRSSConfirm(feed.id, feed.title)); actions.appendChild(delBtn);

    header.appendChild(titleArea); header.appendChild(actions);

    const meta = document.createElement('div'); meta.className = 'rss-feed-meta';
    meta.innerHTML = '<svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg> Mostrando últimas ' + feed.max_entries + ' entradas';
    if (feed.last_fetch_at) meta.innerHTML += ' &nbsp;•&nbsp; Última actualización: ' + new Date(feed.last_fetch_at).toLocaleString('es-ES');

    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'rss-items';
    itemsContainer.id = 'rss-items-' + feed.id;

    let items = [];
    try { items = JSON.parse(feed.cached_items || '[]'); } catch {}
    if (items.length === 0) {
        itemsContainer.innerHTML = '<div class="rss-loading">Cargando entradas...</div>';
    } else {
        items.forEach(item => itemsContainer.appendChild(buildRSSItem(item)));
    }

    card.appendChild(header); card.appendChild(meta); card.appendChild(itemsContainer);
    return card;
}

function buildRSSItem(item) {
    const el       = document.createElement('div'); el.className = 'rss-item';
    const itemLink  = item.link || '';
    const itemTitle = (item.title || '').trim() || 'Sin título';
    if (itemLink) { el.style.cursor = 'pointer'; el.addEventListener('click', () => window.open(itemLink, '_blank')); }

    const bullet  = document.createElement('div'); bullet.className = 'rss-item-bullet';
    const content = document.createElement('div'); content.className = 'rss-item-content';
    const titleEl = document.createElement('div'); titleEl.className = 'rss-item-title'; titleEl.textContent = itemTitle;
    const dateEl  = document.createElement('div'); dateEl.className  = 'rss-item-date';

    if (item.pubDate) {
        try {
            const d = new Date(item.pubDate);
            dateEl.textContent = !isNaN(d.getTime())
                ? d.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })
                : item.pubDate;
        } catch { dateEl.textContent = item.pubDate; }
    }

    content.appendChild(titleEl);
    if (dateEl.textContent) content.appendChild(dateEl);
    el.appendChild(bullet); el.appendChild(content);
    return el;
}

async function fetchRSSContent(feedId, silent = false) {
    const refreshBtn = document.querySelector('#rss-feed-' + feedId + ' .refresh');
    if (refreshBtn && !silent) refreshBtn.classList.add('spinning');
    try {
        const r = await fetch('/api/rss/fetch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: feedId }) });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const data = await r.json();

        const itemsContainer = document.getElementById('rss-items-' + feedId);
        if (itemsContainer) {
            itemsContainer.innerHTML = '';
            if (data.items && data.items.length > 0) {
                data.items.forEach(item => itemsContainer.appendChild(buildRSSItem(item)));
            } else {
                itemsContainer.innerHTML = '<div class="rss-loading" style="opacity:0.6;">No hay entradas disponibles</div>';
            }
        }

        const feed = rssFeeds.find(f => f.id === feedId);
        if (feed) {
            feed.last_fetch_at  = data.last_fetch;
            feed.cached_items   = JSON.stringify(data.items || []);
            const metaEl = document.querySelector('#rss-feed-' + feedId + ' .rss-feed-meta');
            if (metaEl) metaEl.innerHTML = '<svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg> Mostrando últimas ' + feed.max_entries + ' entradas &nbsp;•&nbsp; Última actualización: ' + new Date(data.last_fetch).toLocaleString('es-ES');
        }
        if (!silent) showToast('\u2713 Feed actualizado');
    } catch(e) {
        console.error('RSS fetch error:', e);
        if (!silent) showToast('\u2717 Error al actualizar feed');
        const itemsContainer = document.getElementById('rss-items-' + feedId);
        if (itemsContainer && itemsContainer.innerHTML.includes('Cargando')) {
            itemsContainer.innerHTML = '<div class="rss-loading" style="color:var(--danger,#e74c3c);opacity:0.8;">Error al cargar el feed</div>';
        }
    } finally {
        if (refreshBtn) refreshBtn.classList.remove('spinning');
    }
}

// -----------------------------------------------
// RSS - MODAL
// -----------------------------------------------
function openRSSModal() {
    rssMode = 'add';
    document.getElementById('rssModalTitle').textContent = 'Nuevo Feed RSS';
    document.getElementById('rssModalSub').textContent   = 'Configura un feed para recibir actualizaciones';
    document.getElementById('edit-rss-id').value   = '';
    document.getElementById('rss-title').value     = '';
    document.getElementById('rss-url').value       = '';
    document.getElementById('rss-max-entries').value = '5';
    document.getElementById('rssSubmitBtn').textContent = 'Guardar Feed';
    document.getElementById('rssModal').classList.add('active');
    setTimeout(() => document.getElementById('rss-title').focus(), 100);
}

function openEditRSS(feed) {
    rssMode = 'edit';
    document.getElementById('rssModalTitle').textContent = 'Editar Feed RSS';
    document.getElementById('rssModalSub').textContent   = 'Modificando "' + feed.title + '"';
    document.getElementById('edit-rss-id').value     = feed.id;
    document.getElementById('rss-title').value       = feed.title;
    document.getElementById('rss-url').value         = feed.url;
    document.getElementById('rss-max-entries').value = feed.max_entries;
    document.getElementById('rssSubmitBtn').textContent = 'Guardar Cambios';
    document.getElementById('rssModal').classList.add('active');
    setTimeout(() => document.getElementById('rss-title').focus(), 100);
}

function closeRSSModal() {
    document.getElementById('rssModal').classList.remove('active');
    document.getElementById('rssForm').reset();
}

function deleteRSSConfirm(id, title) {
    showConfirm('Eliminar feed', '¿Eliminar "' + title + '"?', '\u{1F4F0}', 'Eliminar', async () => {
        try {
            await fetch('/api/rss', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
            if (rssRefreshIntervals.has(id)) { clearInterval(rssRefreshIntervals.get(id)); rssRefreshIntervals.delete(id); }
            rssFeeds = rssFeeds.filter(f => f.id !== id);
            renderRSSFeeds(); showToast('\u{1F5D1}\uFE0F Feed eliminado');
        } catch { showToast('\u2717 Error'); }
    });
}

// -----------------------------------------------
// RSS - EVENT LISTENERS
// -----------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    const rssModal = document.getElementById('rssModal');
    if (rssModal) rssModal.addEventListener('click', e => { if (e.target.id === 'rssModal') closeRSSModal(); });

    const rssForm = document.getElementById('rssForm');
    if (rssForm) {
        rssForm.addEventListener('submit', async e => {
            e.preventDefault();
            const title      = document.getElementById('rss-title').value.trim();
            const url        = document.getElementById('rss-url').value.trim();
            const maxEntries = parseInt(document.getElementById('rss-max-entries').value) || 5;
            const editId     = parseInt(document.getElementById('edit-rss-id').value) || 0;
            if (!title || !url) return;
            try {
                if (rssMode === 'edit' && editId) {
                    await fetch('/api/rss', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editId, title, url, max_entries: maxEntries }) });
                    showToast('\u270F\uFE0F Feed actualizado');
                    await loadRSSFeeds(); closeRSSModal();
                } else {
                    const res    = await fetch('/api/rss', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, url, max_entries: maxEntries }) });
                    const newFeed = await res.json();
                    showToast('\u2713 Feed guardado');
                    await loadRSSFeeds(); closeRSSModal();
                    await fetchRSSContent(newFeed.id, false);
                }
            } catch { showToast('\u2717 Error al guardar'); }
        });
    }
});
