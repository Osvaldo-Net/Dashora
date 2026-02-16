
// Variables globales
let services = [];
let localGroups = [];
let currentCalendarDate = new Date();
let confirmCallback = null;
let modalMode = 'add';
let draggedService = null;
let collapsedGroups = JSON.parse(localStorage.getItem('collapsedGroups') || '[]');

/* TOAST - CORREGIDO */
function showToast(msg, duration = 2500) {
    const t = document.getElementById('toast');
    if (!t) return;

    t.innerHTML = msg;
    t.classList.add('show');

    setTimeout(() => {
        t.classList.remove('show');
    }, duration);
}

/* CONFIRM */
function showConfirm(title, msg, icon, okLabel, cb) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMsg').textContent = msg;
    document.getElementById('confirmIcon').textContent = icon || '??';
    document.getElementById('confirmOkBtn').textContent = okLabel || 'Eliminar';
    confirmCallback = cb;
    document.getElementById('confirmModal').classList.add('active');
}

function closeConfirm() {
    document.getElementById('confirmModal').classList.remove('active');
    confirmCallback = null;
}

document.getElementById('confirmOkBtn').addEventListener('click', () => {
    if (confirmCallback) confirmCallback();
    closeConfirm();
});

document.getElementById('confirmModal').addEventListener('click', e => {
    if (e.target.id === 'confirmModal') closeConfirm();
});

/* COLLAPSE GROUPS */
function toggleGroupCollapse(groupName) {
    const idx = collapsedGroups.indexOf(groupName);
    if (idx > -1) {
        collapsedGroups.splice(idx, 1);
    } else {
        collapsedGroups.push(groupName);
    }
    localStorage.setItem('collapsedGroups', JSON.stringify(collapsedGroups));
    renderAll();
}

/* SIDEBAR */
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar.classList.contains('visible')) {
        closeSidebar();
    } else {
        sidebar.classList.add('visible');
        document.getElementById('sidebarOverlay').classList.add('visible');
        document.getElementById('sidebarToggle').classList.add('open');
        document.body.classList.add('sidebar-open');
    }
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('visible');
    document.getElementById('sidebarOverlay').classList.remove('visible');
    document.getElementById('sidebarToggle').classList.remove('open');
    document.body.classList.remove('sidebar-open');
}

/* CLOCK */
let selectedTimezone = localStorage.getItem('selectedTimezone') || 'auto';
let timeFormat = localStorage.getItem('timeFormat') || '24';

function toggleClockSettings() {
    const p = document.getElementById('clockSettingsPanel');
    p.style.display = p.style.display === 'none' ? 'block' : 'none';
}

function updateClock() {
    const now = new Date();
    const tz = selectedTimezone === 'auto' ? Intl.DateTimeFormat().resolvedOptions().timeZone : selectedTimezone;
    const use12 = timeFormat === '12';

    let timeStr = now.toLocaleTimeString('es-ES', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: use12
    });

    if (use12) {
        const m = timeStr.match(/(a\.\s?m\.|p\.\s?m\.|AM|PM)/i);
        if (m) {
            const ampm = m[0].toLowerCase().includes('a') ? 'AM' : 'PM';
            document.getElementById('clockTime').innerHTML = `${timeStr.replace(m[0],'').trim()}<span class="clock-ampm">${ampm}</span>`;
        } else {
            document.getElementById('clockTime').textContent = timeStr;
        }
    } else {
        document.getElementById('clockTime').textContent = timeStr;
    }

    const ds = now.toLocaleDateString('es-ES', {
        timeZone: tz,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    document.getElementById('clockDate').textContent = ds.charAt(0).toUpperCase() + ds.slice(1);

    const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
    document.getElementById('clockTimezone').textContent = tz === local ? `${tz} (Local)` : tz;
}

function changeTimezone() {
    selectedTimezone = document.getElementById('timezoneSelect').value;
    localStorage.setItem('selectedTimezone', selectedTimezone);
    updateClock();
}

function changeTimeFormat() {
    timeFormat = document.getElementById('timeFormatSelect').value;
    localStorage.setItem('timeFormat', timeFormat);
    updateClock();
}

/* WEATHER */
async function loadWeather() {
    const wc = document.getElementById('weatherContent');
    if (!navigator.geolocation) {
        wc.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary);font-size:0.85rem;">Geolocalización no disponible</div>';
        return;
    }

    wc.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary);font-size:0.85rem;">Obteniendo ubicación...</div>';

    navigator.geolocation.getCurrentPosition(async pos => {
        try {
            const { latitude: lat, longitude: lon } = pos.coords;
            const [wr, gr] = await Promise.all([
                fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`),
                fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
            ]);

            const data = await wr.json();
            const geo = await gr.json();
            const city = geo.address.city || geo.address.town || geo.address.village || 'Tu ubicación';
            const country = geo.address.country || '';

            const codes = {
                0: {i:'\u2600\uFE0F', d:'Despejado'},
                1: {i:'\uD83C\uDF24\uFE0F', d:'Mayormente despejado'},
                2: {i:'\u26C5', d:'Parcialmente nublado'},
                3: {i:'\u2601\uFE0F', d:'Nublado'},
                45: {i:'\uD83C\uDF2B\uFE0F', d:'Neblina'},
                48: {i:'\uD83C\uDF2B\uFE0F', d:'Niebla'},
                51: {i:'\uD83C\uDF26\uFE0F', d:'Llovizna ligera'},
                53: {i:'\uD83C\uDF26\uFE0F', d:'Llovizna moderada'},
                55: {i:'\uD83C\uDF27\uFE0F', d:'Llovizna densa'},
                61: {i:'\uD83C\uDF27\uFE0F', d:'Lluvia ligera'},
                63: {i:'\uD83C\uDF27\uFE0F', d:'Lluvia moderada'},
                65: {i:'\uD83C\uDF27\uFE0F', d:'Lluvia fuerte'},
                71: {i:'\uD83C\uDF28\uFE0F', d:'Nevada ligera'},
                73: {i:'\uD83C\uDF28\uFE0F', d:'Nevada moderada'},
                75: {i:'\u2744\uFE0F', d:'Nevada fuerte'},
                80: {i:'\uD83C\uDF26\uFE0F', d:'Chubascos ligeros'},
                81: {i:'\uD83C\uDF27\uFE0F', d:'Chubascos moderados'},
                82: {i:'\u26C8\uFE0F', d:'Chubascos fuertes'},
                95: {i:'\u26C8\uFE0F', d:'Tormenta'},
                99: {i:'\u26C8\uFE0F', d:'Tormenta severa'}
            };

            const w = codes[data.current.weather_code] || {i:'\uD83C\uDF21\uFE0F', d:'Clima desconocido'};

            wc.innerHTML = `
                <div class="weather-main">
                    <div class="weather-icon">${w.i}</div>
                    <div class="weather-temp">
                        <div class="weather-temp-value">${Math.round(data.current.temperature_2m)}°C</div>
                        <div class="weather-temp-desc">${w.d}</div>
                    </div>
                </div>
                <div class="weather-details">
                    <div class="weather-detail-item">
                        <div class="weather-detail-label">Humedad</div>
                        <div class="weather-detail-value">${data.current.relative_humidity_2m}%</div>
                    </div>
                    <div class="weather-detail-item">
                        <div class="weather-detail-label">Viento</div>
                        <div class="weather-detail-value">${Math.round(data.current.wind_speed_10m)} km/h</div>
                    </div>
                </div>
                <div class="weather-location">
                    <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                    ${city}${country ? ', ' + country : ''}
                </div>
            `;
        } catch {
            wc.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary);font-size:0.85rem;">Error al cargar el clima</div>';
        }
    }, () => {
        wc.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary);font-size:0.85rem;">No se pudo obtener la ubicación<br><small style="opacity:0.7;">Permite el acceso a tu ubicación</small></div>';
    });
}

/* CALENDAR */
function renderCalendar() {
    const y = currentCalendarDate.getFullYear();
    const m = currentCalendarDate.getMonth();
    const mn = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

    document.getElementById('calendarMonth').textContent = `${mn[m]} ${y}`;

    const firstDay = new Date(y, m, 1).getDay();
    const dim = new Date(y, m + 1, 0).getDate();
    const dipm = new Date(y, m, 0).getDate();

    const cd = document.getElementById('calendarDays');
    cd.innerHTML = '';

    const today = new Date();
    const isCur = today.getFullYear() === y && today.getMonth() === m;

    for (let i = firstDay - 1; i >= 0; i--) {
        const d = document.createElement('div');
        d.className = 'calendar-day other-month';
        d.textContent = dipm - i;
        cd.appendChild(d);
    }

    for (let day = 1; day <= dim; day++) {
        const d = document.createElement('div');
        d.className = 'calendar-day' + (isCur && day === today.getDate() ? ' today' : '');
        d.textContent = day;
        cd.appendChild(d);
    }

    const rem = (7 - cd.children.length % 7) % 7;
    for (let day = 1; day <= rem; day++) {
        const d = document.createElement('div');
        d.className = 'calendar-day other-month';
        d.textContent = day;
        cd.appendChild(d);
    }
}

function changeMonth(dir) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + dir);
    renderCalendar();
}

/* THEME */
function initTheme() {
    const s = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', s);
    updateThemeIcon(s);
}

function toggleTheme() {
    const c = document.documentElement.getAttribute('data-theme');
    const n = c === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', n);
    localStorage.setItem('theme', n);
    updateThemeIcon(n);
}

function updateThemeIcon(t) {
    document.getElementById('theme-icon-light').style.display = t === 'dark' ? 'block' : 'none';
    document.getElementById('theme-icon-dark').style.display = t === 'dark' ? 'none' : 'block';
}

/* ICON HELPERS */
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

function previewIcon() {
    const url = document.getElementById('icon').value.trim();
    const prev = document.getElementById('iconPreview');
    const img = document.getElementById('iconPreviewImg');

    if (!prev || !img) return;

    if (url) {
        img.src = url;
        prev.style.display = 'flex';
    } else {
        prev.style.display = 'none';
    }
}

/* DATA */
async function loadServices() {
    try {
        const r = await fetch('/api/services');
        const t = await r.text();
        services = t ? JSON.parse(t) : [];
        if (!Array.isArray(services)) services = [];
        renderAll();
    } catch(e) {
        console.error('Error:', e);
    }
}

function getGroupMap() {
    const gm = {};
    localGroups.forEach(g => {
        if (!gm[g]) gm[g] = [];
    });

    services.forEach(s => {
        const n = s.group || 'Sin Grupo';
        if (!gm[n]) gm[n] = [];
        gm[n].push(s);
    });

    return gm;
}

function renderAll() {
    const gm = getGroupMap();
    const con = document.getElementById('groupsContainer');
    const es = document.getElementById('emptyState');

    if (Object.keys(gm).length === 0) {
        con.innerHTML = '';
        es.style.display = 'block';
        return;
    }

    es.style.display = 'none';
    con.innerHTML = '';

    Object.keys(gm).sort().forEach(gn => {
        const items = gm[gn];
        const sec = document.createElement('div');
        sec.className = 'group-section';

        const hdr = document.createElement('div');
        hdr.className = 'group-header';

        const ttl = document.createElement('h2');
        ttl.className = 'group-title';
        ttl.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>`;
        ttl.appendChild(document.createTextNode(gn));

        const cb = document.createElement('span');
        cb.className = 'group-count';
        cb.textContent = items.length;
        ttl.appendChild(cb);

        const acts = document.createElement('div');
        acts.className = 'group-actions';

        // Botón de colapsar/expandir
        const collapseBtn = document.createElement('button');
        collapseBtn.className = 'group-collapse-btn' + (collapsedGroups.includes(gn) ? ' collapsed' : '');
        collapseBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>`;
        collapseBtn.addEventListener('click', () => toggleGroupCollapse(gn));
        acts.appendChild(collapseBtn);

        const eb = document.createElement('button');
        eb.className = 'group-action-btn';
        eb.innerHTML = `<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg> Renombrar`;
        eb.addEventListener('click', () => openEditGroup(gn));
        acts.appendChild(eb);

        const db = document.createElement('button');
        db.className = 'group-action-btn danger';
        db.innerHTML = `<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg> Eliminar`;
        db.addEventListener('click', () => deleteGroup(gn));
        acts.appendChild(db);

        hdr.appendChild(ttl);
        hdr.appendChild(acts);
        sec.appendChild(hdr);

        const grid = document.createElement('div');
        grid.className = 'services-grid' + (collapsedGroups.includes(gn) ? ' collapsed' : '');
        grid.dataset.group = gn;

        // Drag & drop events
        grid.addEventListener('dragover', handleDragOver);
        grid.addEventListener('dragleave', handleDragLeave);
        grid.addEventListener('drop', handleDrop);

        if (items.length === 0) {
            const e = document.createElement('div');
            e.style.cssText = 'color:var(--text-secondary);font-size:0.85rem;padding:20px;opacity:0.6;';
            e.textContent = 'Grupo vacío — agrega servicios aquí.';
            grid.appendChild(e);
        } else {
            items.forEach(s => grid.appendChild(buildServiceCard(s)));
        }

        sec.appendChild(grid);
        con.appendChild(sec);
    });

    updateGroupSelect();
}

/* DRAG & DROP */
function handleDragStart(e, service) {
    draggedService = service;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.innerHTML);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.services-grid').forEach(grid => {
        grid.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
    return false;
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

async function handleDrop(e) {
    if (e.stopPropagation) e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');

    const targetGrid = e.currentTarget;
    const newGroup = targetGrid.dataset.group;

    if (draggedService && draggedService.group !== newGroup) {
        await updateService(draggedService.id, draggedService.title, draggedService.icon, draggedService.url, newGroup);
        showToast(`\uD83D\uDCE6 "${draggedService.title}" movido a "${newGroup}"`);
    }

    return false;
}

function buildServiceCard(s) {
    const card = document.createElement('div');
    card.className = 'service-card';
    card.draggable = true;

    card.addEventListener('dragstart', (e) => handleDragStart(e, s));
    card.addEventListener('dragend', handleDragEnd);
    card.addEventListener('click', e => {
        if (!e.target.closest('.card-actions') && !card.classList.contains('dragging')) {
            window.open(s.url, '_blank');
        }
    });

    const acts = document.createElement('div');
    acts.className = 'card-actions';

    const eb = document.createElement('button');
    eb.className = 'card-btn edit';
    eb.title = 'Editar';
    eb.innerHTML = `<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`;
    eb.addEventListener('click', e => {
        e.stopPropagation();
        openEditService(s);
    });
    acts.appendChild(eb);

    const db = document.createElement('button');
    db.className = 'card-btn delete';
    db.title = 'Eliminar';
    db.innerHTML = `<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;
    db.addEventListener('click', e => {
        e.stopPropagation();
        deleteService(s.id, s.title);
    });
    acts.appendChild(db);

    const iw = document.createElement('div');
    iw.className = 'service-icon';

    if (s.icon) {
        const img = document.createElement('img');
        img.src = s.icon;
        img.alt = s.title;
        img.addEventListener('error', () => setFallbackIcon(iw));
        iw.appendChild(img);
    } else {
        setFallbackIcon(iw);
    }

    const te = document.createElement('div');
    te.className = 'service-title';
    te.textContent = s.title;

    const ue = document.createElement('div');
    ue.className = 'service-url';
    ue.textContent = s.url;

    card.appendChild(acts);
    card.appendChild(iw);
    card.appendChild(te);
    card.appendChild(ue);

    return card;
}

function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = String(s);
    return d.innerHTML;
}

function updateGroupSelect() {
    const gm = getGroupMap();
    const sel = document.getElementById('service-group');
    const cv = sel.value;

    sel.innerHTML = '<option value="">Sin grupo</option>' +
        Object.keys(gm).sort().map(g =>
            `<option value="${escapeHtml(g)}"${g === cv ? ' selected' : ''}>${escapeHtml(g)}</option>`
        ).join('');
}

/* API */
async function addService(title, icon, url, group) {
    const r = await fetch('/api/services', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            title,
            icon,
            url,
            group: group || 'Sin Grupo',
            order: 0
        })
    });

    const ns = await r.json();
    services.push(ns);

    if (group) {
        localGroups = localGroups.filter(g => g !== group);
    }

    renderAll();
    showToast(`\u2705 "${title}" agregado`);
}

async function updateService(id, title, icon, url, group) {
    const r = await fetch('/api/services', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            id,
            title,
            icon,
            url,
            group: group || 'Sin Grupo',
            order: 0
        })
    });

    const up = await r.json();
    services = services.map(s => s.id === id ? up : s);
    renderAll();
    showToast(`\u270F\uFE0F "${title}" actualizado`);
}

async function deleteService(id, name) {
    showConfirm(
        'Eliminar servicio',
        `¿Eliminar "${name}"? Esta acción no se puede deshacer.`,
        '???',
        'Eliminar',
        async () => {
            await fetch('/api/services', {
                method: 'DELETE',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({id})
            });

            services = services.filter(s => s.id !== id);
            renderAll();
            showToast(`\uD83D\uDDD1\uFE0F "${name}" eliminado`);
        }
    );
}

async function deleteGroup(gn) {
    const gs = services.filter(s => (s.group || 'Sin Grupo') === gn);
    const extra = gs.length > 0 ? ` Esto también eliminará ${gs.length} servicio(s) dentro del grupo.` : '';

    showConfirm(
        `Eliminar grupo`,
        `¿Eliminar el grupo "${gn}"?${extra}`,
        '??',
        'Eliminar grupo',
        async () => {
            for (const s of gs) {
                await fetch('/api/services', {
                    method: 'DELETE',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({id: s.id})
                });
            }

            localGroups = localGroups.filter(g => g !== gn);
            await loadServices();
            showToast(`\uD83D\uDDD1\uFE0F Grupo "${gn}" eliminado`);
        }
    );
}

async function renameGroup(oldName, newName) {
    const gs = services.filter(s => (s.group || 'Sin Grupo') === oldName);

    for (const s of gs) {
        await fetch('/api/services', {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({...s, group: newName})
        });
    }

    localGroups = localGroups.map(g => g === oldName ? newName : g);
    await loadServices();
    showToast(`\u270F\uFE0F Grupo renombrado a "${newName}"`);
}

/* MODAL */
function openModal(tab) {
    modalMode = 'add';
    document.getElementById('modalTitle').textContent = 'Agregar';
    document.getElementById('modalSub').textContent = 'Elige qué quieres crear';
    document.getElementById('modalTabs').style.display = 'flex';
    document.getElementById('edit-service-id').value = '';
    document.getElementById('edit-group-old-name').value = '';
    document.getElementById('serviceSubmitBtn').textContent = 'Agregar Servicio';
    document.getElementById('groupSubmitBtn').textContent = 'Crear Grupo';
    document.getElementById('iconPreview').style.display = 'none';
    document.getElementById('mainModal').classList.add('active');
    switchTab(tab || 'service');
}

function openEditService(s) {
    modalMode = 'edit';
    document.getElementById('modalTitle').textContent = 'Editar Servicio';
    document.getElementById('modalSub').textContent = `Modificando "${s.title}"`;
    document.getElementById('modalTabs').style.display = 'none';
    document.getElementById('edit-service-id').value = s.id;
    document.getElementById('title').value = s.title;
    document.getElementById('icon').value = s.icon || '';
    document.getElementById('url').value = s.url;
    document.getElementById('serviceSubmitBtn').textContent = 'Guardar Cambios';
    updateGroupSelect();
    document.getElementById('service-group').value = s.group || '';
    document.getElementById('mainModal').classList.add('active');
    switchTab('service');
    previewIcon();
}

function openEditGroup(gn) {
    modalMode = 'edit';
    document.getElementById('modalTitle').textContent = 'Renombrar Grupo';
    document.getElementById('modalSub').textContent = `Modificando "${gn}"`;
    document.getElementById('modalTabs').style.display = 'none';
    document.getElementById('edit-group-old-name').value = gn;
    document.getElementById('new-group-name').value = gn;
    document.getElementById('groupSubmitBtn').textContent = 'Guardar Nombre';
    document.getElementById('mainModal').classList.add('active');
    switchTab('group');
    setTimeout(() => document.getElementById('new-group-name').select(), 100);
}

function closeModal() {
    document.getElementById('mainModal').classList.remove('active');
    document.getElementById('serviceForm').reset();
    document.getElementById('groupForm').reset();
    document.getElementById('iconPreview').style.display = 'none';
    modalMode = 'add';
}

function switchTab(tab) {
    ['service', 'group'].forEach(t => {
        document.getElementById(`tab-${t}`).classList.toggle('active', t === tab);
        document.getElementById(`panel-${t}`).classList.toggle('active', t === tab);
    });
}

/* FORM HANDLERS */
document.getElementById('serviceForm').addEventListener('submit', async e => {
    e.preventDefault();

    const title = document.getElementById('title').value.trim();
    const icon = document.getElementById('icon').value.trim();
    const url = document.getElementById('url').value.trim();
    const group = document.getElementById('service-group').value;
    const editId = parseInt(document.getElementById('edit-service-id').value) || 0;

    if (!title || !url) return;

    if (modalMode === 'edit' && editId) {
        await updateService(editId, title, icon || '', url, group);
    } else {
        await addService(title, icon || '', url, group);
    }

    closeModal();
});

document.getElementById('groupForm').addEventListener('submit', async e => {
    e.preventDefault();

    const name = document.getElementById('new-group-name').value.trim();
    const oldName = document.getElementById('edit-group-old-name').value;

    if (!name) return;

    if (modalMode === 'edit' && oldName) {
        if (name !== oldName) {
            await renameGroup(oldName, name);
        }
    } else {
        if (!localGroups.includes(name) && !services.some(s => (s.group || 'Sin Grupo') === name)) {
            localGroups.push(name);
        }
        renderAll();
        showToast(`\uD83D\uDCC1 Grupo "${name}" creado`);
    }

    closeModal();
});

document.getElementById('mainModal').addEventListener('click', e => {
    if (e.target.id === 'mainModal') closeModal();
});

/* SYSINFO */
async function loadSysInfo() {
    try {
        const r = await fetch('/api/sysinfo');
        const t = await r.text();
        if (!t) return;

        const d = JSON.parse(t);
        const bar = document.getElementById('sysinfo');
        if (!bar) return;

        const cc = d.cpu_percent > 80 ? 'danger' : d.cpu_percent > 60 ? 'warn' : '';
        const rc = d.ram_percent > 80 ? 'danger' : d.ram_percent > 60 ? 'warn' : '';
        const dc = d.disk_percent > 80 ? 'danger' : d.disk_percent > 60 ? 'warn' : '';

        bar.innerHTML = `
            <div class="sysinfo-chip">
                <svg viewBox="0 0 24 24"><path d="M17 14h-1v-1h-2v1h-1v2h1v1h2v-1h1v-2zm-4-7h2V5h-2v2zm-4 7H8v-1H6v1H5v2h1v1h2v-1h1v-2zM9 7h2V5H9v2zm4 4h2V9h-2v2zm-4 0h2V9H9v2zM21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z"/></svg>
                CPU&nbsp;<span class="chip-value">${d.cpu_percent}%</span>
                <div class="chip-bar"><div class="chip-bar-fill ${cc}" style="width:${d.cpu_percent}%"></div></div>
            </div>
            <div class="sysinfo-chip">
                <svg viewBox="0 0 24 24"><path d="M15 9H9v6h6V9zm-2 4h-2v-2h2v2zm8-2V9h-2V7c0-1.1-.9-2-2-2h-2V3h-2v2h-2V3H9v2H7C5.9 5 5 5.9 5 7v2H3v2h2v2H3v2h2v2c0 1.1.9 2 2 2h2v2h2v-2h2v2h2v-2h2c1.1 0 2-.9 2-2v-2h2v-2h-2v-2h2zm-4 6H7V7h10v10z"/></svg>
                RAM&nbsp;<span class="chip-value">${d.ram_used_gb}/${d.ram_total_gb} GB</span>
                <div class="chip-bar"><div class="chip-bar-fill ${rc}" style="width:${d.ram_percent}%"></div></div>
            </div>
            <div class="sysinfo-chip">
                <svg viewBox="0 0 24 24"><path d="M6 2h12l4 4v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 0v4h12V2M4 6v14h16V6H4zm8 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>
                Disco&nbsp;<span class="chip-value">${d.disk_used_gb}/${d.disk_total_gb} GB</span>
                <div class="chip-bar"><div class="chip-bar-fill ${dc}" style="width:${d.disk_percent}%"></div></div>
            </div>
            <div class="sysinfo-chip">
                <svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L12 15.45 7.77 18l1.12-4.81-3.73-3.23 4.92-.42L12 5l1.92 4.53 4.92.42-3.73 3.23L16.23 18z"/></svg>
                Up&nbsp;<span class="chip-value">${d.uptime}</span>
            </div>
        `;
    } catch(e) {
        const b = document.getElementById('sysinfo');
        if (b) b.style.display = 'none';
    }
}

/* INIT */
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadServices();
    loadSysInfo();
    updateClock();
    renderCalendar();
    loadWeather();

    document.getElementById('timezoneSelect').value = selectedTimezone;
    document.getElementById('timezoneSelect').addEventListener('change', changeTimezone);
    document.getElementById('timeFormatSelect').value = timeFormat;
    document.getElementById('timeFormatSelect').addEventListener('change', changeTimeFormat);

    if (window.innerWidth > 1200) {
        document.body.classList.add('sidebar-open');
    }

    setInterval(updateClock, 1000);
    setInterval(loadSysInfo, 5000);
    setInterval(loadWeather, 600000);
});
