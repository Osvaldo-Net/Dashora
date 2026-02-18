
// -----------------------------------------------
// BOOKMARKS - ICON TABS
// -----------------------------------------------
function switchBmIconTab(tab) {
    bmIconMode = tab === 'bm-favicon' ? 'favicon' : 'url';
    document.querySelectorAll('#bookmarkForm .icon-tab').forEach(t =>
        t.classList.toggle('active', t.dataset.tab === tab)
    );
    document.getElementById('bm-icon-tab-favicon').classList.toggle('active', tab === 'bm-favicon');
    document.getElementById('bm-icon-tab-url').classList.toggle('active', tab === 'bm-url');
    if (tab === 'bm-url') {
        document.getElementById('bmIconUrlPreview').style.display = 'none';
        document.getElementById('bookmark-icon-url').value = '';
    }
}

function previewBmIconUrl() {
    const url  = document.getElementById('bookmark-icon-url').value.trim();
    const prev = document.getElementById('bmIconUrlPreview');
    const img  = document.getElementById('bmIconUrlImg');
    if (!prev || !img) return;
    if (url) { img.src = url; prev.style.display = 'flex'; } else { prev.style.display = 'none'; }
}

function updateBmFaviconPreview(url) {
    const box  = document.getElementById('bmFaviconBox');
    const hint = document.getElementById('bmFaviconHint');
    if (!box || !hint) return;
    if (!url) {
        box.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" style="fill:var(--text-secondary);opacity:0.4;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>';
        hint.textContent = 'Se detectará automáticamente al guardar la URL';
        return;
    }
    try {
        const faviconUrl = 'https://www.google.com/s2/favicons?sz=32&domain=' + new URL(url).origin;
        box.innerHTML = '<img src="' + faviconUrl + '" width="20" height="20" onerror="this.parentElement.innerHTML=\'<svg viewBox=\\\'0 0 24 24\\\' width=\\\'20\\\' height=\\\'20\\\' style=\\\'fill:var(--text-secondary)\\\'><path d=\\\'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z\\\'/></svg>\'">';
        hint.textContent = 'Favicon de ' + new URL(url).hostname;
    } catch { hint.textContent = 'URL inválida'; }
}

// -----------------------------------------------
// BOOKMARKS - GROUPS
// -----------------------------------------------
function getBmGroupMap() {
    const gm = {};
    localBmGroups.forEach(g => { if (!gm[g]) gm[g] = []; });
    bookmarks.forEach(b => { const n = b.group || 'Sin Grupo'; if (!gm[n]) gm[n] = []; gm[n].push(b); });
    return gm;
}

function updateBmGroupSelect() {
    const gm  = getBmGroupMap();
    const sel = document.getElementById('bookmark-group-select');
    if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">Sin grupo</option>' +
        Object.keys(gm).sort().map(g =>
            '<option value="' + escapeHtml(g) + '"' + (g === cv ? ' selected' : '') + '>' + escapeHtml(g) + '</option>'
        ).join('');
}

function toggleBmGroupCollapse(gn) {
    const i = collapsedBmGroups.indexOf(gn);
    if (i > -1) collapsedBmGroups.splice(i, 1); else collapsedBmGroups.push(gn);
    localStorage.setItem('collapsedBmGroups', JSON.stringify(collapsedBmGroups));
    renderBookmarks(bookmarks);
}

function renderBookmarks(list) {
    const container = document.getElementById('bookmarkGroupsContainer');
    const empty     = document.getElementById('bookmarksEmpty');
    if (!container) return;
    const gm = {};
    localBmGroups.forEach(g => { if (!gm[g]) gm[g] = []; });
    (list || []).forEach(b => { const n = b.group || 'Sin Grupo'; if (!gm[n]) gm[n] = []; gm[n].push(b); });
    const keys = Object.keys(gm);
    if (keys.length === 0 || (list && list.length === 0 && localBmGroups.length === 0)) {
        container.innerHTML = ''; if (empty) empty.style.display = 'block'; return;
    }
    if (empty) empty.style.display = 'none';
    container.innerHTML = '';
    keys.sort().forEach(gn => {
        const items = gm[gn];
        const sec = document.createElement('div'); sec.className = 'bm-group-section';
        const hdr = document.createElement('div'); hdr.className = 'group-header';
        const ttl = document.createElement('h2'); ttl.className = 'group-title';
        ttl.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>';
        ttl.appendChild(document.createTextNode(gn));
        const cb = document.createElement('span'); cb.className = 'group-count'; cb.textContent = items.length;
        ttl.appendChild(cb);

        const acts = document.createElement('div'); acts.className = 'group-actions';

        const collapseBtn = document.createElement('button');
        collapseBtn.className = 'group-collapse-btn' + (collapsedBmGroups.includes(gn) ? ' collapsed' : '');
        collapseBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>';
        collapseBtn.addEventListener('click', () => toggleBmGroupCollapse(gn)); acts.appendChild(collapseBtn);

        const renBtn = document.createElement('button'); renBtn.className = 'group-action-btn';
        renBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg> Renombrar';
        renBtn.addEventListener('click', () => openEditBmGroup(gn)); acts.appendChild(renBtn);

        const delBtn = document.createElement('button'); delBtn.className = 'group-action-btn danger';
        delBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg> Eliminar';
        delBtn.addEventListener('click', () => deleteBmGroup(gn)); acts.appendChild(delBtn);

        hdr.appendChild(ttl); hdr.appendChild(acts); sec.appendChild(hdr);

        const listEl = document.createElement('div');
        listEl.className = 'bookmarks-list' + (collapsedBmGroups.includes(gn) ? ' collapsed' : '');
        if (items.length === 0) {
            const e = document.createElement('div'); e.style.cssText = 'color:var(--text-secondary);font-size:0.85rem;padding:16px 0;opacity:0.6;'; e.textContent = 'Grupo vacío — agrega marcadores aquí.'; listEl.appendChild(e);
        } else { items.forEach(bm => listEl.appendChild(buildBookmarkItem(bm))); }
        sec.appendChild(listEl); container.appendChild(sec);
    });
    updateBmGroupSelect();
}

function buildBookmarkItem(bm) {
    const item = document.createElement('div'); item.className = 'bookmark-item';
    const faviconSrc = bm.icon || ('https://www.google.com/s2/favicons?sz=32&domain=' + (() => { try { return new URL(bm.url).origin; } catch { return bm.url; } })());

    const favicon = document.createElement('div'); favicon.className = 'bookmark-favicon';
    const img = document.createElement('img'); img.src = faviconSrc; img.width = 20; img.height = 20;
    img.onerror = () => { favicon.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" style="fill:var(--text-secondary)"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>'; };
    favicon.appendChild(img);

    const info = document.createElement('div'); info.className = 'bookmark-info';
    const name = document.createElement('div'); name.className = 'bookmark-name'; name.textContent = bm.name;
    const url  = document.createElement('div'); url.className  = 'bookmark-url';  url.textContent  = bm.url;
    info.appendChild(name); info.appendChild(url);

    const acts = document.createElement('div'); acts.className = 'bookmark-actions';
    const eb = document.createElement('button'); eb.className = 'bookmark-btn edit'; eb.title = 'Editar';
    eb.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>';
    eb.addEventListener('click', e => { e.stopPropagation(); openEditBookmark(bm.id); }); acts.appendChild(eb);

    const db = document.createElement('button'); db.className = 'bookmark-btn delete'; db.title = 'Eliminar';
    db.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>';
    db.addEventListener('click', e => { e.stopPropagation(); deleteBookmarkConfirm(bm.id, bm.name); }); acts.appendChild(db);

    item.appendChild(favicon); item.appendChild(info); item.appendChild(acts);
    item.addEventListener('click', () => window.open(bm.url, '_blank'));
    return item;
}

function filterBookmarks(query) {
    const clear = document.getElementById('bookmarkSearchClear'); if (clear) clear.style.display = query ? 'flex' : 'none';
    const q = query.toLowerCase().trim();
    const filtered = q ? bookmarks.filter(bm => bm.name.toLowerCase().includes(q) || bm.url.toLowerCase().includes(q)) : bookmarks;
    renderBookmarks(filtered);
}

function clearBookmarkSearch() {
    const i = document.getElementById('bookmarkSearchInput'); if (i) i.value = '';
    const c = document.getElementById('bookmarkSearchClear'); if (c) c.style.display = 'none';
    renderBookmarks(bookmarks);
}

// -----------------------------------------------
// BOOKMARKS - MODAL
// -----------------------------------------------
function openBookmarkModal() {
    bookmarkMode = 'add';
    document.getElementById('bookmarkModalTitle').textContent = 'Nuevo Marcador';
    document.getElementById('bookmarkModalSub').textContent   = 'Guarda un enlace rápido';
    document.getElementById('edit-bookmark-id').value = '';
    document.getElementById('bookmark-name').value    = '';
    document.getElementById('bookmark-url').value     = '';
    document.getElementById('bookmark-icon-url').value = '';
    document.getElementById('bmIconUrlPreview').style.display  = 'none';
    document.getElementById('bookmarkSubmitBtn').textContent   = 'Guardar Marcador';
    bmIconMode = 'favicon';
    switchBmIconTab('bm-favicon');
    updateBmFaviconPreview('');
    updateBmGroupSelect();
    document.getElementById('bookmark-group-select').value = '';
    document.getElementById('bookmarkModal').classList.add('active');
    setTimeout(() => document.getElementById('bookmark-name').focus(), 100);
}

function openEditBookmark(id) {
    const bm = bookmarks.find(b => b.id === id); if (!bm) return;
    bookmarkMode = 'edit';
    document.getElementById('bookmarkModalTitle').textContent = 'Editar Marcador';
    document.getElementById('bookmarkModalSub').textContent   = 'Modificando "' + bm.name + '"';
    document.getElementById('edit-bookmark-id').value = id;
    document.getElementById('bookmark-name').value    = bm.name;
    document.getElementById('bookmark-url').value     = bm.url;
    document.getElementById('bookmarkSubmitBtn').textContent = 'Guardar Cambios';
    updateBmGroupSelect();
    document.getElementById('bookmark-group-select').value = bm.group || '';
    if (bm.icon && bm.icon.startsWith('http')) {
        switchBmIconTab('bm-url'); bmIconMode = 'url';
        document.getElementById('bookmark-icon-url').value = bm.icon;
        previewBmIconUrl();
    } else {
        switchBmIconTab('bm-favicon'); bmIconMode = 'favicon';
        updateBmFaviconPreview(bm.url);
    }
    document.getElementById('bookmarkModal').classList.add('active');
    setTimeout(() => document.getElementById('bookmark-name').focus(), 100);
}

function closeBookmarkModal() {
    document.getElementById('bookmarkModal').classList.remove('active');
    document.getElementById('bookmarkForm').reset();
    bmIconMode = 'favicon'; switchBmIconTab('bm-favicon'); updateBmFaviconPreview('');
}

// -----------------------------------------------
// BOOKMARKS - API
// -----------------------------------------------
async function loadBookmarks() {
    try {
        const r = await fetch('/api/bookmarks');
        const t = await r.text();
        bookmarks = t ? JSON.parse(t) : [];
        if (!Array.isArray(bookmarks)) bookmarks = [];
        renderBookmarks(bookmarks);
    } catch(e) { console.error(e); renderBookmarks([]); }
}

function deleteBookmarkConfirm(id, name) {
    showConfirm('Eliminar marcador', '¿Eliminar "' + name + '"?', '\u{1F516}', 'Eliminar', async () => {
        try {
            await fetch('/api/bookmarks', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
            bookmarks = bookmarks.filter(b => b.id !== id);
            renderBookmarks(bookmarks);
            showToast('\u{1F5D1}\uFE0F "' + name + '" eliminado');
        } catch { showToast('\u2717 Error'); }
    });
}

// -----------------------------------------------
// BOOKMARK GROUPS - MODAL
// -----------------------------------------------
function openBookmarkGroupModal() {
    document.getElementById('bmGroupModalTitle').textContent = 'Nuevo Grupo';
    document.getElementById('bmGroupModalSub').textContent   = 'Crea un grupo para organizar tus marcadores';
    document.getElementById('edit-bm-group-old-name').value = '';
    document.getElementById('bm-group-name').value = '';
    document.getElementById('bmGroupSubmitBtn').textContent = 'Crear Grupo';
    document.getElementById('bookmarkGroupModal').classList.add('active');
    setTimeout(() => document.getElementById('bm-group-name').focus(), 100);
}

function openEditBmGroup(gn) {
    document.getElementById('bmGroupModalTitle').textContent = 'Renombrar Grupo';
    document.getElementById('bmGroupModalSub').textContent   = 'Modificando "' + gn + '"';
    document.getElementById('edit-bm-group-old-name').value = gn;
    document.getElementById('bm-group-name').value = gn;
    document.getElementById('bmGroupSubmitBtn').textContent = 'Guardar Nombre';
    document.getElementById('bookmarkGroupModal').classList.add('active');
    setTimeout(() => { const i = document.getElementById('bm-group-name'); i.focus(); i.select(); }, 100);
}

function closeBookmarkGroupModal() {
    document.getElementById('bookmarkGroupModal').classList.remove('active');
    document.getElementById('bookmarkGroupForm').reset();
}

async function deleteBmGroup(gn) {
    const gs = bookmarks.filter(b => (b.group || 'Sin Grupo') === gn);
    showConfirm('Eliminar grupo', '¿Eliminar "' + gn + '"?' + (gs.length > 0 ? ' Esto eliminará ' + gs.length + ' marcador(es).' : ''), '\u{1F4C1}', 'Eliminar', async () => {
        for (const b of gs) await fetch('/api/bookmarks', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: b.id }) });
        bookmarks     = bookmarks.filter(b => (b.group || 'Sin Grupo') !== gn);
        localBmGroups = localBmGroups.filter(g => g !== gn);
        renderBookmarks(bookmarks); showToast('\u{1F5D1}\uFE0F Grupo "' + gn + '" eliminado');
    });
}

// -----------------------------------------------
// BOOKMARKS - EVENT LISTENERS
// -----------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // Favicon preview on URL input
    const bmUrl = document.getElementById('bookmark-url');
    if (bmUrl) bmUrl.addEventListener('input', () => {
        if (bmIconMode === 'favicon') updateBmFaviconPreview(bmUrl.value.trim());
    });

    document.getElementById('bookmarkModal').addEventListener('click', e => {
        if (e.target.id === 'bookmarkModal') closeBookmarkModal();
    });

    document.getElementById('bookmarkForm').addEventListener('submit', async e => {
        e.preventDefault();
        const name   = document.getElementById('bookmark-name').value.trim();
        let   url    = document.getElementById('bookmark-url').value.trim();
        const group  = document.getElementById('bookmark-group-select').value;
        const editId = parseInt(document.getElementById('edit-bookmark-id').value) || 0;
        if (!name || !url) return;
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
        let icon = '';
        if (bmIconMode === 'url') icon = document.getElementById('bookmark-icon-url').value.trim();
        try {
            if (bookmarkMode === 'edit' && editId) {
                const r = await fetch('/api/bookmarks', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editId, name, url, icon, group: group || 'Sin Grupo' }) });
                const updated = await r.json();
                bookmarks = bookmarks.map(b => b.id === editId ? updated : b);
                showToast('\u270F\uFE0F "' + name + '" actualizado');
            } else {
                const r = await fetch('/api/bookmarks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, url, icon, group: group || 'Sin Grupo' }) });
                const newBm = await r.json(); bookmarks.push(newBm);
                showToast('\u2713 "' + name + '" guardado');
                if (group && group !== 'Sin Grupo') localBmGroups = localBmGroups.filter(g => g !== group);
            }
            renderBookmarks(bookmarks); closeBookmarkModal();
        } catch { showToast('\u2717 Error al guardar'); }
    });

    document.getElementById('bookmarkGroupModal').addEventListener('click', e => {
        if (e.target.id === 'bookmarkGroupModal') closeBookmarkGroupModal();
    });

    document.getElementById('bookmarkGroupForm').addEventListener('submit', async e => {
        e.preventDefault();
        const name    = document.getElementById('bm-group-name').value.trim(); if (!name) return;
        const oldName = document.getElementById('edit-bm-group-old-name').value;
        if (oldName) {
            if (name !== oldName) {
                const gs = bookmarks.filter(b => (b.group || 'Sin Grupo') === oldName);
                for (const b of gs) {
                    const r  = await fetch('/api/bookmarks', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...b, group: name }) });
                    const up = await r.json();
                    bookmarks = bookmarks.map(x => x.id === b.id ? up : x);
                }
                localBmGroups = localBmGroups.map(g => g === oldName ? name : g);
                renderBookmarks(bookmarks); showToast('\u270F\uFE0F Grupo renombrado a "' + name + '"');
            }
        } else {
            if (!localBmGroups.includes(name) && !bookmarks.some(b => (b.group || 'Sin Grupo') === name)) localBmGroups.push(name);
            renderBookmarks(bookmarks); updateBmGroupSelect(); showToast('\u{1F4C1} Grupo "' + name + '" creado');
        }
        closeBookmarkGroupModal();
    });
});
