// -----------------------------------------------
// ICON HELPERS (SERVICES)
// -----------------------------------------------
function setFallbackIcon(wrapper) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.classList.add('icon-fallback');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z');
    svg.appendChild(path);
    wrapper.innerHTML = '';
    wrapper.appendChild(svg);
}

function initIconDragDrop() {
    const uploadArea = document.getElementById('fileUploadArea');
    if (!uploadArea) return;
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev =>
        uploadArea.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); })
    );
    ['dragenter', 'dragover'].forEach(ev => uploadArea.addEventListener(ev, () => uploadArea.classList.add('dragover')));
    ['dragleave', 'drop'].forEach(ev => uploadArea.addEventListener(ev, () => uploadArea.classList.remove('dragover')));
    uploadArea.addEventListener('drop', e => {
        const files = e.dataTransfer.files;
        if (files.length > 0) handleIconUpload({ target: { files: [files[0]] } });
    });
}

function handleIconUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('\u26A0\uFE0F Solo se permiten archivos de imagen'); return; }
    if (file.size > 2 * 1024 * 1024) { showToast('\u26A0\uFE0F La imagen debe ser menor a 2MB'); return; }
    const reader = new FileReader();
    reader.onload = e => {
        uploadedIconData = e.target.result;
        const preview = document.getElementById('iconPreview');
        const previewImg = document.getElementById('iconPreviewImg');
        if (previewImg && preview) { previewImg.src = uploadedIconData; preview.style.display = 'flex'; }
        const label = document.getElementById('fileUploadArea')?.querySelector('.file-upload-label');
        if (label) label.innerHTML =
            '<img src="' + uploadedIconData + '" style="width:48px;height:48px;object-fit:contain;border-radius:8px;">' +
            '<span style="font-weight:500;color:var(--text-primary);">' + escapeHtml(file.name) + '</span>' +
            '<small>' + formatFileSize(file.size) + '</small>';
        showToast('\u2713 Icono cargado');
    };
    reader.readAsDataURL(file);
}

function clearIconUpload() {
    uploadedIconData = null;
    const fi = document.getElementById('iconFile');
    if (fi) fi.value = '';
    const ua = document.getElementById('fileUploadArea');
    if (ua) ua.innerHTML =
        '<input type="file" id="iconFile" accept="image/*" onchange="handleIconUpload(event)" style="display:none;">' +
        '<label for="iconFile" class="file-upload-label">' +
        '<svg viewBox="0 0 24 24" width="32" height="32"><path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/></svg>' +
        '<span>Click para seleccionar imagen</span><small>PNG, JPG, SVG, GIF (máx. 2MB)</small></label>';
    const p = document.getElementById('iconPreview');
    if (p) p.style.display = 'none';
    initIconDragDrop();
}

function switchIconTab(tab) {
    document.querySelectorAll('.icon-tab[data-tab]').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tab);
    });
    document.getElementById('icon-tab-url').classList.toggle('active', tab === 'url');
    document.getElementById('icon-tab-upload').classList.toggle('active', tab === 'upload');
    if (tab === 'url') { uploadedIconData = null; const fi = document.getElementById('iconFile'); if (fi) fi.value = ''; }
    else { document.getElementById('icon').value = ''; }
    if (!uploadedIconData && !document.getElementById('icon').value) {
        const p = document.getElementById('iconPreview');
        if (p) p.style.display = 'none';
    }
}

function previewIconUrl() {
    const url = document.getElementById('icon').value.trim();
    const prev = document.getElementById('iconPreview');
    const img  = document.getElementById('iconPreviewImg');
    if (!prev || !img) return;
    if (url) { img.src = url; prev.style.display = 'flex'; uploadedIconData = null; }
    else { prev.style.display = 'none'; }
}

// -----------------------------------------------
// SEARCH (INICIO)
// -----------------------------------------------
function initSearch() {
    const si = document.getElementById('searchInput');
    const sc = document.getElementById('searchClear');
    if (!si) return;
    si.addEventListener('input', e => {
        searchQuery = e.target.value.toLowerCase().trim();
        sc.style.display = searchQuery ? 'flex' : 'none';
        performSearch();
    });
    document.addEventListener('keydown', e => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (document.getElementById('mainModal').classList.contains('active')) return;
        if (e.key === '/') { e.preventDefault(); si.focus(); }
        if (e.key === 'Escape' && searchQuery) clearSearch();
    });
}

function performSearch() {
    const container = document.getElementById('groupsContainer');
    if (!searchQuery) {
        container.classList.remove('search-active');
        document.querySelectorAll('.service-card').forEach(card => {
            card.classList.remove('search-match');
            const titleEl = card.querySelector('.service-title');
            if (titleEl && titleEl.dataset.originalText) {
                titleEl.textContent = titleEl.dataset.originalText;
                delete titleEl.dataset.originalText;
            }
        });
        document.querySelectorAll('.group-section').forEach(s => s.classList.remove('has-matches'));
        return;
    }
    container.classList.add('search-active');
    let totalMatches = 0;
    document.querySelectorAll('.group-section').forEach(section => {
        let groupHasMatches = false;
        section.querySelectorAll('.service-card').forEach(card => {
            const titleEl = card.querySelector('.service-title');
            const urlEl   = card.querySelector('.service-url');
            if (!titleEl) return;
            const title = titleEl.textContent.toLowerCase();
            const desc  = urlEl ? urlEl.textContent.toLowerCase() : '';
            if (title.includes(searchQuery) || desc.includes(searchQuery)) {
                card.classList.add('search-match');
                groupHasMatches = true;
                totalMatches++;
                highlightText(titleEl, searchQuery);
            } else {
                card.classList.remove('search-match');
            }
        });
        section.classList.toggle('has-matches', groupHasMatches);
    });
    if (totalMatches === 0) showNoResultsMessage();
    else removeNoResultsMessage();
}

function highlightText(element, query) {
    if (!element.dataset.originalText) element.dataset.originalText = element.textContent;
    const text  = element.dataset.originalText;
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) { element.textContent = text; return; }
    element.innerHTML =
        escapeHtml(text.substring(0, index)) +
        '<span class="search-highlight">' + escapeHtml(text.substring(index, index + query.length)) + '</span>' +
        escapeHtml(text.substring(index + query.length));
}

function clearSearch() {
    const si = document.getElementById('searchInput');
    if (si) {
        si.value = '';
        searchQuery = '';
        document.getElementById('searchClear').style.display = 'none';
        performSearch();
        si.blur();
    }
}

function showNoResultsMessage() {
    removeNoResultsMessage();
    const container = document.getElementById('groupsContainer');
    const el = document.createElement('div');
    el.id = 'noSearchResults';
    el.className = 'empty-state';
    el.innerHTML =
        '<div class="empty-state-icon">&#128269;</div>' +
        '<div class="empty-state-text">No se encontraron resultados</div>' +
        '<p class="empty-state-description">No hay servicios que coincidan con "' + escapeHtml(searchQuery) + '"</p>' +
        '<button class="btn btn-secondary" onclick="clearSearch()" style="margin-top:20px;max-width:200px;">Limpiar búsqueda</button>';
    container.appendChild(el);
}

function removeNoResultsMessage() {
    const e = document.getElementById('noSearchResults');
    if (e) e.remove();
}

// -----------------------------------------------
// SERVICES RENDER
// -----------------------------------------------
async function loadServices() {
    try {
        const r = await fetch('/api/services');
        const t = await r.text();
        services = t ? JSON.parse(t) : [];
        if (!Array.isArray(services)) services = [];
        renderAll();
    } catch(e) { console.error(e); }
}

function getGroupMap() {
    const gm = {};
    localGroups.forEach(g => { if (!gm[g]) gm[g] = []; });
    services.forEach(s => { const n = s.group || 'Sin Grupo'; if (!gm[n]) gm[n] = []; gm[n].push(s); });
    return gm;
}

function renderAll() {
    const gm  = getGroupMap();
    const con = document.getElementById('groupsContainer');
    const es  = document.getElementById('emptyState');
    if (Object.keys(gm).length === 0) { con.innerHTML = ''; es.style.display = 'block'; return; }
    es.style.display = 'none';
    con.innerHTML = '';
    Object.keys(gm).sort().forEach(gn => {
        const items = gm[gn];
        const sec = document.createElement('div'); sec.className = 'group-section';
        const hdr = document.createElement('div'); hdr.className = 'group-header';
        const ttl = document.createElement('h2'); ttl.className = 'group-title';
        ttl.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>';
        ttl.appendChild(document.createTextNode(gn));
        const cb = document.createElement('span'); cb.className = 'group-count'; cb.textContent = items.length;
        ttl.appendChild(cb);

        const acts = document.createElement('div'); acts.className = 'group-actions';

        const collapseBtn = document.createElement('button');
        collapseBtn.className = 'group-collapse-btn' + (collapsedGroups.includes(gn) ? ' collapsed' : '');
        collapseBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>';
        collapseBtn.addEventListener('click', () => toggleGroupCollapse(gn));
        acts.appendChild(collapseBtn);

        const eb = document.createElement('button'); eb.className = 'group-action-btn';
        eb.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg> Renombrar';
        eb.addEventListener('click', () => openEditGroup(gn)); acts.appendChild(eb);

        const db = document.createElement('button'); db.className = 'group-action-btn danger';
        db.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg> Eliminar';
        db.addEventListener('click', () => deleteGroup(gn)); acts.appendChild(db);

        hdr.appendChild(ttl); hdr.appendChild(acts); sec.appendChild(hdr);

        const grid = document.createElement('div');
        grid.className = 'services-grid' + (collapsedGroups.includes(gn) ? ' collapsed' : '');
        grid.dataset.group = gn;

        if (items.length === 0) {
            const e = document.createElement('div');
            e.style.cssText = 'color:var(--text-secondary);font-size:0.85rem;padding:20px;opacity:0.6;';
            e.textContent = 'Grupo vacío — agrega servicios aquí.';
            grid.appendChild(e);
        } else {
            items.forEach(s => grid.appendChild(buildServiceCard(s)));
        }
        sec.appendChild(grid); con.appendChild(sec);
    });
    updateGroupSelect();
}

function toggleGroupCollapse(gn) {
    const i = collapsedGroups.indexOf(gn);
    if (i > -1) collapsedGroups.splice(i, 1); else collapsedGroups.push(gn);
    localStorage.setItem('collapsedGroups', JSON.stringify(collapsedGroups));
    renderAll();
}

// -----------------------------------------------
// DRAG MANUAL CON MOUSEMOVE (sin HTML5 drag API)
// Funciona así:
//  1. mousedown → iniciar timer de 300ms
//  2. Si pasan 300ms sin soltar → activar modo drag
//  3. mousemove → mover clon flotante
//  4. mouseup   → detectar el grid destino y hacer drop
//  5. Si soltó antes de 300ms → es un click normal
// -----------------------------------------------

let _drag = null; // estado global del drag activo

function initManualDrag(card, service) {
    const DELAY = 300;

    card.addEventListener('mousedown', e => {
        if (e.button !== 0 || e.target.closest('.card-actions')) return;
        e.preventDefault(); // evitar selección de texto

        const startX = e.clientX;
        const startY = e.clientY;
        let   active = false;
        let   clone  = null;
        let   timer  = null;

        // Rect original para posicionar el clon
        const rect = card.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        function startDrag() {
            active = true;
            card.classList.add('dragging');
            document.body.style.cursor = 'grabbing';
            document.body.style.userSelect = 'none';

            // Crear clon visual flotante
            clone = card.cloneNode(true);
            clone.style.cssText = [
                'position:fixed',
                'pointer-events:none',
                'z-index:9999',
                'width:' + rect.width + 'px',
                'opacity:0.85',
                'transform:rotate(3deg) scale(1.05)',
                'box-shadow:0 20px 40px rgba(0,0,0,0.25)',
                'transition:none',
                'left:' + (e.clientX - offsetX) + 'px',
                'top:'  + (e.clientY - offsetY) + 'px',
            ].join(';');
            document.body.appendChild(clone);

            // Highlight de todos los grids como drop targets
            document.querySelectorAll('.services-grid').forEach(g => {
                g.classList.add('drag-target');
            });

            _drag = { service, card };
        }

        function onMove(e) {
            if (!active) return;
            clone.style.left = (e.clientX - offsetX) + 'px';
            clone.style.top  = (e.clientY - offsetY) + 'px';

            // Highlight del grid bajo el cursor
            document.querySelectorAll('.services-grid').forEach(g => g.classList.remove('drag-over'));
            const el = document.elementFromPoint(e.clientX, e.clientY);
            if (el) {
                const grid = el.closest('.services-grid');
                if (grid) grid.classList.add('drag-over');
            }
        }

        function onUp(e) {
            clearTimeout(timer);
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);

            document.body.style.cursor = '';
            document.body.style.userSelect = '';

            if (!active) {
                // No hubo drag → es click normal
                window.open(service.url, '_blank');
                return;
            }

            // Limpiar visual
            card.classList.remove('dragging');
            if (clone) clone.remove();
            document.querySelectorAll('.services-grid').forEach(g => {
                g.classList.remove('drag-over');
                g.classList.remove('drag-target');
            });

            // Detectar grid destino
            const el = document.elementFromPoint(e.clientX, e.clientY);
            if (el) {
                const grid = el.closest('.services-grid');
                if (grid && grid.dataset.group && grid.dataset.group !== (service.group || 'Sin Grupo')) {
                    const newGroup = grid.dataset.group;
                    updateServiceAPI(service.id, service.title, service.icon, service.url, service.description, newGroup)
                        .then(() => showToast('\u{1F500} "' + service.title + '" movido a "' + newGroup + '"'));
                }
            }

            _drag = null;
        }

        // Iniciar timer — si pasan 300ms sin soltar, activar drag
        timer = setTimeout(() => {
            startDrag();
        }, DELAY);

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });
}

// Drop zones: necesitamos resaltar grids durante el drag
// Añadir estilos dinámicos una sola vez
(function injectDragStyles() {
    if (document.getElementById('_dragStyles')) return;
    const st = document.createElement('style');
    st.id = '_dragStyles';
    st.textContent = `
        .services-grid.drag-target {
            outline: 2px dashed var(--accent);
            outline-offset: 4px;
            border-radius: 12px;
        }
        .services-grid.drag-over {
            background: var(--accent-dim) !important;
            outline-color: var(--accent);
        }
    `;
    document.head.appendChild(st);
})();

// -----------------------------------------------
// BUILD SERVICE CARD
// -----------------------------------------------
function buildServiceCard(s) {
    const card = document.createElement('div');
    card.className = 'service-card';
    // Sin draggable nativo
    card.draggable = false;

    const acts = document.createElement('div'); acts.className = 'card-actions';
    const eb = document.createElement('button'); eb.className = 'card-btn edit'; eb.title = 'Editar';
    eb.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>';
    eb.addEventListener('click', e => { e.stopPropagation(); openEditService(s); }); acts.appendChild(eb);

    const db = document.createElement('button'); db.className = 'card-btn delete'; db.title = 'Eliminar';
    db.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>';
    db.addEventListener('click', e => { e.stopPropagation(); deleteServiceConfirm(s.id, s.title); }); acts.appendChild(db);

    const iw = document.createElement('div'); iw.className = 'service-icon';
    if (s.icon) {
        const img = document.createElement('img');
        img.src = s.icon; img.alt = s.title;
        img.addEventListener('error', () => setFallbackIcon(iw));
        iw.appendChild(img);
    } else { setFallbackIcon(iw); }

    const te = document.createElement('div'); te.className = 'service-title'; te.textContent = s.title;
    const ue = document.createElement('div'); ue.className = 'service-url';   ue.textContent = s.description || s.url;

    card.appendChild(acts); card.appendChild(iw); card.appendChild(te); card.appendChild(ue);

    initManualDrag(card, s);

    return card;
}

function updateGroupSelect() {
    const gm  = getGroupMap();
    const sel = document.getElementById('service-group');
    const cv  = sel.value;
    sel.innerHTML = '<option value="">Sin grupo</option>' +
        Object.keys(gm).sort().map(g =>
            '<option value="' + escapeHtml(g) + '"' + (g === cv ? ' selected' : '') + '>' + escapeHtml(g) + '</option>'
        ).join('');
}

// -----------------------------------------------
// SERVICES API
// -----------------------------------------------
async function addServiceAPI(title, icon, url, description, group) {
    const r  = await fetch('/api/services', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, icon, url, description: description || '', group: group || 'Sin Grupo', order: 0 }) });
    const ns = await r.json();
    services.push(ns);
    if (group) localGroups = localGroups.filter(g => g !== group);
    renderAll(); showToast('\u2713 "' + title + '" agregado');
}

async function updateServiceAPI(id, title, icon, url, description, group) {
    const r  = await fetch('/api/services', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, title, icon, url, description: description || '', group: group || 'Sin Grupo', order: 0 }) });
    const up = await r.json();
    services = services.map(s => s.id === id ? up : s);
    renderAll(); showToast('\u270F\uFE0F "' + title + '" actualizado');
}

async function deleteServiceConfirm(id, name) {
    showConfirm('Eliminar servicio', '¿Eliminar "' + name + '"? Esta acción no se puede deshacer.', '\u{1F5D1}\uFE0F', 'Eliminar', async () => {
        await fetch('/api/services', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
        services = services.filter(s => s.id !== id);
        renderAll(); showToast('\u{1F5D1}\uFE0F "' + name + '" eliminado');
    });
}

async function deleteGroup(gn) {
    const gs = services.filter(s => (s.group || 'Sin Grupo') === gn);
    showConfirm('Eliminar grupo', '¿Eliminar "' + gn + '"?' + (gs.length > 0 ? ' Esto eliminará ' + gs.length + ' servicio(s).' : ''), '\u{1F4C1}', 'Eliminar', async () => {
        for (const s of gs) await fetch('/api/services', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id }) });
        localGroups = localGroups.filter(g => g !== gn);
        await loadServices(); showToast('\u{1F5D1}\uFE0F Grupo "' + gn + '" eliminado');
    });
}

async function renameGroup(oldName, newName) {
    const gs = services.filter(s => (s.group || 'Sin Grupo') === oldName);
    for (const s of gs) await fetch('/api/services', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...s, group: newName }) });
    localGroups = localGroups.map(g => g === oldName ? newName : g);
    await loadServices(); showToast('\u270F\uFE0F Grupo renombrado a "' + newName + '"');
}

// -----------------------------------------------
// SYSINFO
// -----------------------------------------------
async function loadSysInfo() {
    try {
        const r = await fetch('/api/sysinfo');
        const t = await r.text();
        if (!t) return;
        const d = JSON.parse(t);

        const rows = document.getElementById('sysinfoRows');
        if (!rows) return;

        const cls = pct => pct > 80 ? 'danger' : pct > 60 ? 'warn' : 'ok';

        const svgCpu  = `<svg viewBox="0 0 24 24" width="13" height="13"><path d="M17 14h-1v-1h-2v1h-1v2h1v1h2v-1h1v-2zm-4-7h2V5h-2v2zm-4 7H8v-1H6v1H5v2h1v1h2v-1h1v-2zM9 7h2V5H9v2zm4 4h2V9h-2v2zm-4 0h2V9H9v2zM21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z"/></svg>`;
        const svgRam  = `<svg viewBox="0 0 24 24" width="13" height="13"><path d="M15 9H9v6h6V9zm-2 4h-2v-2h2v2zm8-2V9h-2V7c0-1.1-.9-2-2-2h-2V3h-2v2h-2V3H9v2H7C5.9 5 5 5.9 5 7v2H3v2h2v2H3v2h2v2c0 1.1.9 2 2 2h2v2h2v-2h2v2h2v-2h2c1.1 0 2-.9 2-2v-2h2v-2h-2v-2h2zm-4 6H7V7h10v10z"/></svg>`;
        const svgDisk = `<svg viewBox="0 0 24 24" width="13" height="13"><path d="M6 2h12l4 4v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 0v4h12V2M4 6v14h16V6H4zm8 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>`;
        const svgUp   = `<svg viewBox="0 0 24 24" width="13" height="13"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L12 15.45 7.77 18l1.12-4.81-3.73-3.23 4.92-.42L12 5l1.92 4.53 4.92.42-3.73 3.23L16.23 18z"/></svg>`;

        function metricRow(icon, label, value, pct) {
            const c = cls(pct);
            return `
            <div class="sysinfo-widget-row">
                <div class="sysinfo-widget-row-top">
                    <span class="sysinfo-widget-row-label">${icon}${escapeHtml(label)}</span>
                    <div class="sysinfo-widget-row-right">
                        <span class="sysinfo-widget-row-value">${escapeHtml(String(value))}</span>
                        <span class="sysinfo-pct-badge ${c}">${pct}%</span>
                    </div>
                </div>
                <div class="sysinfo-widget-track">
                    <div class="sysinfo-widget-fill ${c}" style="width:${Math.min(pct, 100)}%"></div>
                </div>
            </div>`;
        }

        let html = '';
        html += metricRow(svgCpu, 'CPU', `${d.cpu_percent}%`, d.cpu_percent);
        html += metricRow(svgRam, 'RAM', `${d.ram_used_gb} / ${d.ram_total_gb} GB`, d.ram_percent);

        if (Array.isArray(d.disks) && d.disks.length > 0) {
            d.disks.forEach(disk => {
                html += metricRow(svgDisk, disk.name, `${disk.used_gb} / ${disk.total_gb} GB`, disk.percent);
            });
        } else {
            html += metricRow(svgDisk, 'Disco', `${d.disk_used_gb} / ${d.disk_total_gb} GB`, d.disk_percent);
        }

        html += `
        <div class="sysinfo-widget-divider"></div>
        <div class="sysinfo-widget-uptime-row">
            <span class="sysinfo-widget-uptime-label">${svgUp}Uptime</span>
            <span class="sysinfo-widget-uptime-value">${escapeHtml(d.uptime)}</span>
        </div>`;

        rows.innerHTML = html;

    } catch(e) {
        const rows = document.getElementById('sysinfoRows');
        if (rows) rows.style.display = 'none';
    }
}
// -----------------------------------------------
// MODAL SERVICIOS / GRUPOS
// -----------------------------------------------
function openModal(tab) {
    modalMode = 'add';
    document.getElementById('modalTitle').textContent = 'Agregar';
    document.getElementById('modalSub').textContent   = 'Elige qué quieres crear';
    document.getElementById('modalTabs').style.display = 'flex';
    document.getElementById('edit-service-id').value   = '';
    document.getElementById('edit-group-old-name').value = '';
    document.getElementById('serviceSubmitBtn').textContent = 'Agregar Servicio';
    document.getElementById('groupSubmitBtn').textContent   = 'Crear Grupo';
    document.getElementById('iconPreview').style.display   = 'none';
    uploadedIconData = null;
    clearIconUpload();
    switchIconTab('url');
    const cc = document.getElementById('char-count'); if (cc) cc.textContent = '0';
    document.getElementById('mainModal').classList.add('active');
    switchTab(tab || 'service');
}

function openEditService(s) {
    modalMode = 'edit';
    document.getElementById('modalTitle').textContent = 'Editar Servicio';
    document.getElementById('modalSub').textContent   = 'Modificando "' + s.title + '"';
    document.getElementById('modalTabs').style.display = 'none';
    document.getElementById('edit-service-id').value   = s.id;
    document.getElementById('title').value       = s.title;
    document.getElementById('url').value         = s.url;
    document.getElementById('description').value = s.description || '';
    document.getElementById('serviceSubmitBtn').textContent = 'Guardar Cambios';
    updateGroupSelect();
    document.getElementById('service-group').value = s.group || '';
    const cc = document.getElementById('char-count'); if (cc) cc.textContent = (s.description || '').length;
    uploadedIconData = null;
    document.getElementById('icon').value = '';
    const preview    = document.getElementById('iconPreview');
    const previewImg = document.getElementById('iconPreviewImg');
    if (preview) preview.style.display = 'none';
    if (s.icon) {
        if (s.icon.startsWith('data:image')) {
            uploadedIconData = s.icon; switchIconTab('upload');
            if (previewImg && preview) { previewImg.src = s.icon; preview.style.display = 'flex'; }
            const label = document.getElementById('fileUploadArea')?.querySelector('.file-upload-label');
            if (label) label.innerHTML = '<img src="' + s.icon + '" style="width:48px;height:48px;object-fit:contain;border-radius:8px;"><span style="font-weight:500;color:var(--text-primary);">Imagen actual</span><small>Click para cambiar</small>';
        } else { document.getElementById('icon').value = s.icon; switchIconTab('url'); previewIconUrl(); }
    } else { switchIconTab('url'); clearIconUpload(); }
    document.getElementById('mainModal').classList.add('active');
    switchTab('service');
}

function openEditGroup(gn) {
    modalMode = 'edit';
    document.getElementById('modalTitle').textContent = 'Renombrar Grupo';
    document.getElementById('modalSub').textContent   = 'Modificando "' + gn + '"';
    document.getElementById('modalTabs').style.display = 'none';
    document.getElementById('edit-group-old-name').value = gn;
    document.getElementById('new-group-name').value      = gn;
    document.getElementById('groupSubmitBtn').textContent = 'Guardar Nombre';
    document.getElementById('mainModal').classList.add('active');
    switchTab('group');
    setTimeout(() => document.getElementById('new-group-name').select(), 100);
}

function closeModal() {
    const m = document.getElementById('mainModal'); if (m) m.classList.remove('active');
    const sf = document.getElementById('serviceForm'); if (sf) sf.reset();
    const gf = document.getElementById('groupForm');  if (gf) gf.reset();
    const p  = document.getElementById('iconPreview'); if (p) p.style.display = 'none';
    uploadedIconData = null; clearIconUpload(); switchIconTab('url');
    const cc = document.getElementById('char-count'); if (cc) cc.textContent = '0';
    modalMode = 'add';
}

function switchTab(tab) {
    ['service', 'group'].forEach(t => {
        document.getElementById('tab-' + t).classList.toggle('active', t === tab);
        document.getElementById('panel-' + t).classList.toggle('active', t === tab);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('serviceForm').addEventListener('submit', async e => {
        e.preventDefault();
        const title       = document.getElementById('title').value.trim();
        let   icon        = document.getElementById('icon').value.trim();
        const url         = document.getElementById('url').value.trim();
        const description = document.getElementById('description').value.trim();
        const group       = document.getElementById('service-group').value;
        const editId      = parseInt(document.getElementById('edit-service-id').value) || 0;
        if (uploadedIconData) icon = uploadedIconData;
        if (!title || !url) return;
        if (modalMode === 'edit' && editId) await updateServiceAPI(editId, title, icon || '', url, description, group);
        else await addServiceAPI(title, icon || '', url, description, group);
        closeModal();
    });

    document.getElementById('groupForm').addEventListener('submit', async e => {
        e.preventDefault();
        const name    = document.getElementById('new-group-name').value.trim();
        const oldName = document.getElementById('edit-group-old-name').value;
        if (!name) return;
        if (modalMode === 'edit' && oldName) { if (name !== oldName) await renameGroup(oldName, name); }
        else {
            if (!localGroups.includes(name) && !services.some(s => (s.group || 'Sin Grupo') === name)) localGroups.push(name);
            renderAll(); showToast('\u{1F4C1} Grupo "' + name + '" creado');
        }
        closeModal();
    });

    document.getElementById('mainModal').addEventListener('click', e => { if (e.target.id === 'mainModal') closeModal(); });

    const descInput = document.getElementById('description');
    const charCount = document.getElementById('char-count');
    if (descInput && charCount) descInput.addEventListener('input', () => { charCount.textContent = descInput.value.length; });
});
