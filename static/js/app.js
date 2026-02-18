
// -----------------------------------------------
// GLOBALS
// -----------------------------------------------
let services = [];
let localGroups = [];
let bookmarks = [];
let localBmGroups = [];
let currentCalendarDate = new Date();
let confirmCallback = null;
let modalMode = 'add';
let draggedService = null;
let collapsedGroups = JSON.parse(localStorage.getItem('collapsedGroups') || '[]');
let collapsedBmGroups = JSON.parse(localStorage.getItem('collapsedBmGroups') || '[]');
let searchQuery = '';
let uploadedIconData = null;
let bmIconMode = 'favicon'; // 'favicon' | 'url'
let bookmarkMode = 'add';

// -----------------------------------------------
// PAGE TAB SWITCHING
// -----------------------------------------------
function switchPageTab(tab) {
    document.querySelectorAll('.page-tab').forEach(t => t.classList.toggle('active', t.id === 'tab-' + tab));
    document.querySelectorAll('.page-panel').forEach(p => p.classList.toggle('active', p.id === 'page-' + tab));
    localStorage.setItem('activePageTab', tab);

    if (tab === 'rss') {
        const t = document.documentElement.getAttribute('data-theme');
        const l = document.getElementById('theme-icon-light-rss');
        const d = document.getElementById('theme-icon-dark-rss');
        if (l) l.style.display = t === 'dark' ? 'block' : 'none';
        if (d) d.style.display = t === 'dark' ? 'none' : 'block';
    }

    if (tab === 'marcadores') {
        const t = document.documentElement.getAttribute('data-theme');
        updateThemeIconsBM(t);
    }
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
            const urlEl = card.querySelector('.service-url');
            if (!titleEl) return;
            const title = titleEl.textContent.toLowerCase();
            const desc = urlEl ? urlEl.textContent.toLowerCase() : '';
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
    const text = element.dataset.originalText;
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
// TOAST & CONFIRM
// -----------------------------------------------
function showToast(msg, duration = 2500) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.innerHTML = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), duration);
}

function showConfirm(title, msg, icon, okLabel, cb) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMsg').textContent = msg;
    document.getElementById('confirmIcon').textContent = icon || '\u26A0\uFE0F';
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

// -----------------------------------------------
// SIDEBAR
// -----------------------------------------------
function toggleSidebar() {
    const s = document.getElementById('sidebar');
    if (s.classList.contains('visible')) closeSidebar();
    else {
        s.classList.add('visible');
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

// -----------------------------------------------
// CLOCK
// -----------------------------------------------
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
    let timeStr = now.toLocaleTimeString('es-ES', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: use12 });
    if (use12) {
        const m = timeStr.match(/(a\.\s?m\.|p\.\s?m\.|AM|PM)/i);
        if (m) {
            const ampm = m[0].toLowerCase().includes('a') ? 'AM' : 'PM';
            document.getElementById('clockTime').innerHTML = timeStr.replace(m[0], '').trim() + '<span class="clock-ampm">' + ampm + '</span>';
        } else {
            document.getElementById('clockTime').textContent = timeStr;
        }
    } else {
        document.getElementById('clockTime').textContent = timeStr;
    }
    const ds = now.toLocaleDateString('es-ES', { timeZone: tz, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('clockDate').textContent = ds.charAt(0).toUpperCase() + ds.slice(1);
    document.getElementById('clockTimezone').textContent = tz === Intl.DateTimeFormat().resolvedOptions().timeZone ? tz + ' (Local)' : tz;
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

// -----------------------------------------------
// WEATHER
// -----------------------------------------------
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
                fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto'),
                fetch('https://nominatim.openstreetmap.org/reverse?lat=' + lat + '&lon=' + lon + '&format=json')
            ]);
            const data = await wr.json();
            const geo = await gr.json();
            const city = geo.address.city || geo.address.town || geo.address.village || 'Tu ubicación';
            const country = geo.address.country || '';
            const codes = {
                0:{i:'\u2600\uFE0F',d:'Despejado'}, 1:{i:'\u{1F324}\uFE0F',d:'Mayormente despejado'},
                2:{i:'\u26C5',d:'Parcialmente nublado'}, 3:{i:'\u2601\uFE0F',d:'Nublado'},
                45:{i:'\u{1F32B}\uFE0F',d:'Neblina'}, 48:{i:'\u{1F32B}\uFE0F',d:'Niebla'},
                51:{i:'\u{1F326}\uFE0F',d:'Llovizna ligera'}, 53:{i:'\u{1F326}\uFE0F',d:'Llovizna moderada'},
                55:{i:'\u{1F326}\uFE0F',d:'Llovizna densa'}, 61:{i:'\u{1F327}\uFE0F',d:'Lluvia ligera'},
                63:{i:'\u{1F327}\uFE0F',d:'Lluvia moderada'}, 65:{i:'\u{1F327}\uFE0F',d:'Lluvia fuerte'},
                71:{i:'\u{1F328}\uFE0F',d:'Nevada ligera'}, 73:{i:'\u{1F328}\uFE0F',d:'Nevada moderada'},
                75:{i:'\u2744\uFE0F',d:'Nevada fuerte'}, 80:{i:'\u{1F326}\uFE0F',d:'Chubascos ligeros'},
                81:{i:'\u{1F327}\uFE0F',d:'Chubascos moderados'}, 82:{i:'\u26C8\uFE0F',d:'Chubascos fuertes'},
                95:{i:'\u26C8\uFE0F',d:'Tormenta'}, 99:{i:'\u26C8\uFE0F',d:'Tormenta severa'}
            };
            const w = codes[data.current.weather_code] || {i:'\u{1F321}\uFE0F',d:'Clima desconocido'};
            wc.innerHTML =
                '<div class="weather-main"><div class="weather-icon">' + w.i + '</div>' +
                '<div class="weather-temp"><div class="weather-temp-value">' + Math.round(data.current.temperature_2m) + '°C</div>' +
                '<div class="weather-temp-desc">' + w.d + '</div></div></div>' +
                '<div class="weather-details">' +
                '<div class="weather-detail-item"><div class="weather-detail-label">Humedad</div><div class="weather-detail-value">' + data.current.relative_humidity_2m + '%</div></div>' +
                '<div class="weather-detail-item"><div class="weather-detail-label">Viento</div><div class="weather-detail-value">' + Math.round(data.current.wind_speed_10m) + ' km/h</div></div>' +
                '</div><div class="weather-location"><svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>' +
                city + (country ? ', ' + country : '') + '</div>';
        } catch {
            wc.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary);font-size:0.85rem;">Error al cargar el clima</div>';
        }
    }, () => {
        wc.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary);font-size:0.85rem;">No se pudo obtener la ubicación<br><small style="opacity:0.7;">Permite el acceso a tu ubicación</small></div>';
    });
}

// -----------------------------------------------
// CALENDAR
// -----------------------------------------------
function renderCalendar() {
    const y = currentCalendarDate.getFullYear(), m = currentCalendarDate.getMonth();
    const mn = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    document.getElementById('calendarMonth').textContent = mn[m] + ' ' + y;
    const firstDay = new Date(y, m, 1).getDay();
    const dim = new Date(y, m + 1, 0).getDate();
    const dipm = new Date(y, m, 0).getDate();
    const cd = document.getElementById('calendarDays');
    cd.innerHTML = '';
    const today = new Date();
    const isCur = today.getFullYear() === y && today.getMonth() === m;
    for (let i = firstDay - 1; i >= 0; i--) {
        const d = document.createElement('div'); d.className = 'calendar-day other-month'; d.textContent = dipm - i; cd.appendChild(d);
    }
    for (let day = 1; day <= dim; day++) {
        const d = document.createElement('div');
        d.className = 'calendar-day' + (isCur && day === today.getDate() ? ' today' : '');
        d.textContent = day; cd.appendChild(d);
    }
    const rem = (7 - cd.children.length % 7) % 7;
    for (let day = 1; day <= rem; day++) {
        const d = document.createElement('div'); d.className = 'calendar-day other-month'; d.textContent = day; cd.appendChild(d);
    }
}

function changeMonth(dir) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + dir);
    renderCalendar();
}

// -----------------------------------------------
// BACKGROUND
// -----------------------------------------------
function toggleBackgroundSettings() {
    const p = document.getElementById('backgroundSettingsPanel');
    p.style.display = p.style.display === 'none' ? 'block' : 'none';
}

async function handleBackgroundUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('\u26A0\uFE0F Solo se permiten archivos de imagen'); return; }
    if (file.size > 10 * 1024 * 1024) { showToast('\u26A0\uFE0F La imagen debe ser menor a 10MB'); return; }

    const reader = new FileReader();
    reader.onload = async e => {
        const img = new Image();
        img.onload = async () => {
            const canvas = document.createElement('canvas');
            const MAX = 1920;
            let w = img.width, h = img.height;
            if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
            if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
            canvas.width = w;
            canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            const imageData = canvas.toDataURL('image/jpeg', 0.82);
            if (imageData.length > 2 * 1024 * 1024) {
                const imageData2 = canvas.toDataURL('image/jpeg', 0.65);
                try { await guardarFondo(imageData2); }
                catch { showToast('\u2717 Imagen demasiado grande incluso comprimida'); }
                return;
            }
            try { await guardarFondo(imageData); }
            catch { showToast('\u2717 Error al guardar el fondo'); }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

async function guardarFondo(imageData) {
    await fetch('/api/settings', {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ background_image: imageData, background_opacity: parseInt(document.getElementById('backgroundOpacity').value) || 50 })
    });
    applyBackgroundImage(imageData);
    document.getElementById('backgroundUploadText').textContent = 'Imagen cargada \u2713';
    document.getElementById('removeBackgroundBtn').style.display = 'inline-flex';
    showToast('\u2713 Fondo sincronizado');
}

function applyBackgroundImage(imageData) {
    document.body.classList.add('has-background');
    document.documentElement.style.setProperty('--background-image', 'url(' + imageData + ')');
}

async function updateBackgroundOpacity(value) {
    document.getElementById('backgroundOpacityValue').textContent = value + '%';
    const old = document.getElementById('background-opacity-style');
    if (old) old.remove();
    const style = document.createElement('style');
    style.id = 'background-opacity-style';
    style.textContent = 'body::before { opacity: ' + (value / 100) + ' !important; }';
    document.head.appendChild(style);
    try {
        const r = await fetch('/api/settings');
        const s = await r.json();
        await fetch('/api/settings', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ background_image: s.background_image || '', background_opacity: parseInt(value) }) });
    } catch {}
}

async function removeBackground() {
    try {
        await fetch('/api/settings', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ background_image: '', background_opacity: 50 }) });
        document.body.classList.remove('has-background');
        document.documentElement.style.removeProperty('--background-image');
        const s = document.getElementById('background-opacity-style');
        if (s) s.remove();
        document.getElementById('backgroundUploadText').textContent = 'Subir imagen';
        document.getElementById('removeBackgroundBtn').style.display = 'none';
        document.getElementById('backgroundFile').value = '';
        document.getElementById('backgroundOpacity').value = 50;
        document.getElementById('backgroundOpacityValue').textContent = '50%';
        showToast('\u{1F5D1}\uFE0F Fondo eliminado');
    } catch { showToast('\u2717 Error'); }
}

async function loadBackgroundSettings() {
    try {
        const r = await fetch('/api/settings');
        const settings = await r.json();
        if (settings.background_image) {
            applyBackgroundImage(settings.background_image);
            document.getElementById('backgroundUploadText').textContent = 'Imagen cargada \u2713';
            document.getElementById('removeBackgroundBtn').style.display = 'inline-flex';
        }
        const opacity = settings.background_opacity || 50;
        document.getElementById('backgroundOpacity').value = opacity;
        document.getElementById('backgroundOpacityValue').textContent = opacity + '%';
        const old = document.getElementById('background-opacity-style');
        if (old) old.remove();
        const style = document.createElement('style');
        style.id = 'background-opacity-style';
        style.textContent = 'body::before { opacity: ' + (opacity / 100) + ' !important; }';
        document.head.appendChild(style);
    } catch {}
}

// -----------------------------------------------
// THEME
// -----------------------------------------------
function initTheme() {
    const s = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', s);
    updateThemeIcon(s);
    updateThemeIconsBM(s);
}

function toggleTheme() {
    const c = document.documentElement.getAttribute('data-theme');
    const n = c === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', n);
    localStorage.setItem('theme', n);
    updateThemeIcon(n);
    updateThemeIconsBM(n);
}

function updateThemeIcon(t) {
    const l = document.getElementById('theme-icon-light');
    const d = document.getElementById('theme-icon-dark');
    if (l) l.style.display = t === 'dark' ? 'block' : 'none';
    if (d) d.style.display = t === 'dark' ? 'none' : 'block';
}

function updateThemeIconsBM(t) {
    const l = document.getElementById('theme-icon-light-bm');
    const d = document.getElementById('theme-icon-dark-bm');
    if (l) l.style.display = t === 'dark' ? 'block' : 'none';
    if (d) d.style.display = t === 'dark' ? 'none' : 'block';
}

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

function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = String(s);
    return d.innerHTML;
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
    return (bytes/1024/1024).toFixed(1) + ' MB';
}

function initIconDragDrop() {
    const uploadArea = document.getElementById('fileUploadArea');
    if (!uploadArea) return;
    ['dragenter','dragover','dragleave','drop'].forEach(ev => uploadArea.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); }));
    ['dragenter','dragover'].forEach(ev => uploadArea.addEventListener(ev, () => uploadArea.classList.add('dragover')));
    ['dragleave','drop'].forEach(ev => uploadArea.addEventListener(ev, () => uploadArea.classList.remove('dragover')));
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
        const preview = document.getElementById('iconPreview'), previewImg = document.getElementById('iconPreviewImg');
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
        if (t.dataset.tab === tab || t.dataset.tab === (tab === 'url' ? 'url' : 'upload'))
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
    const prev = document.getElementById('iconPreview'), img = document.getElementById('iconPreviewImg');
    if (!prev || !img) return;
    if (url) { img.src = url; prev.style.display = 'flex'; uploadedIconData = null; }
    else { prev.style.display = 'none'; }
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
    const gm = getGroupMap(), con = document.getElementById('groupsContainer'), es = document.getElementById('emptyState');
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
        const cb = document.createElement('span'); cb.className = 'group-count'; cb.textContent = items.length; ttl.appendChild(cb);
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

function handleDragStart(e, service) { draggedService = service; e.target.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; }
function handleDragEnd(e) { e.target.classList.remove('dragging'); document.querySelectorAll('.services-grid').forEach(g => g.classList.remove('drag-over')); }
function handleDragOver(e) { if (e.preventDefault) e.preventDefault(); e.dataTransfer.dropEffect = 'move'; e.currentTarget.classList.add('drag-over'); return false; }
function handleDragLeave(e) { e.currentTarget.classList.remove('drag-over'); }

async function handleDrop(e) {
    if (e.stopPropagation) e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');
    const newGroup = e.currentTarget.dataset.group;
    if (draggedService && draggedService.group !== newGroup) {
        await updateServiceAPI(draggedService.id, draggedService.title, draggedService.icon, draggedService.url, draggedService.description, newGroup);
        showToast('\u{1F500} "' + draggedService.title + '" movido a "' + newGroup + '"');
    }
    return false;
}

function buildServiceCard(s) {
    const card = document.createElement('div'); card.className = 'service-card'; card.draggable = true;
    card.addEventListener('dragstart', e => handleDragStart(e, s));
    card.addEventListener('dragend', handleDragEnd);
    card.addEventListener('click', e => { if (!e.target.closest('.card-actions') && !card.classList.contains('dragging')) window.open(s.url, '_blank'); });
    const acts = document.createElement('div'); acts.className = 'card-actions';
    const eb = document.createElement('button'); eb.className = 'card-btn edit'; eb.title = 'Editar';
    eb.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>';
    eb.addEventListener('click', e => { e.stopPropagation(); openEditService(s); }); acts.appendChild(eb);
    const db = document.createElement('button'); db.className = 'card-btn delete'; db.title = 'Eliminar';
    db.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>';
    db.addEventListener('click', e => { e.stopPropagation(); deleteServiceConfirm(s.id, s.title); }); acts.appendChild(db);
    const iw = document.createElement('div'); iw.className = 'service-icon';
    if (s.icon) { const img = document.createElement('img'); img.src = s.icon; img.alt = s.title; img.addEventListener('error', () => setFallbackIcon(iw)); iw.appendChild(img); }
    else setFallbackIcon(iw);
    const te = document.createElement('div'); te.className = 'service-title'; te.textContent = s.title;
    const ue = document.createElement('div'); ue.className = 'service-url'; ue.textContent = s.description || s.url;
    card.appendChild(acts); card.appendChild(iw); card.appendChild(te); card.appendChild(ue);
    return card;
}

function updateGroupSelect() {
    const gm = getGroupMap(), sel = document.getElementById('service-group'), cv = sel.value;
    sel.innerHTML = '<option value="">Sin grupo</option>' +
        Object.keys(gm).sort().map(g => '<option value="' + escapeHtml(g) + '"' + (g === cv ? ' selected' : '') + '>' + escapeHtml(g) + '</option>').join('');
}

// -----------------------------------------------
// SERVICES API
// -----------------------------------------------
async function addServiceAPI(title, icon, url, description, group) {
    const r = await fetch('/api/services', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({title, icon, url, description: description||'', group: group||'Sin Grupo', order:0}) });
    const ns = await r.json(); services.push(ns);
    if (group) localGroups = localGroups.filter(g => g !== group);
    renderAll(); showToast('\u2713 "' + title + '" agregado');
}

async function updateServiceAPI(id, title, icon, url, description, group) {
    const r = await fetch('/api/services', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id, title, icon, url, description: description||'', group: group||'Sin Grupo', order:0}) });
    const up = await r.json(); services = services.map(s => s.id === id ? up : s);
    renderAll(); showToast('\u270F\uFE0F "' + title + '" actualizado');
}

async function deleteServiceConfirm(id, name) {
    showConfirm('Eliminar servicio', '¿Eliminar "' + name + '"? Esta acción no se puede deshacer.', '\u{1F5D1}\uFE0F', 'Eliminar', async () => {
        await fetch('/api/services', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id}) });
        services = services.filter(s => s.id !== id); renderAll(); showToast('\u{1F5D1}\uFE0F "' + name + '" eliminado');
    });
}

async function deleteGroup(gn) {
    const gs = services.filter(s => (s.group||'Sin Grupo') === gn);
    showConfirm('Eliminar grupo', '¿Eliminar "' + gn + '"?' + (gs.length > 0 ? ' Esto eliminará ' + gs.length + ' servicio(s).' : ''), '\u{1F4C1}', 'Eliminar', async () => {
        for (const s of gs) await fetch('/api/services', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id: s.id}) });
        localGroups = localGroups.filter(g => g !== gn); await loadServices(); showToast('\u{1F5D1}\uFE0F Grupo "' + gn + '" eliminado');
    });
}

async function renameGroup(oldName, newName) {
    const gs = services.filter(s => (s.group||'Sin Grupo') === oldName);
    for (const s of gs) await fetch('/api/services', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({...s, group: newName}) });
    localGroups = localGroups.map(g => g === oldName ? newName : g);
    await loadServices(); showToast('\u270F\uFE0F Grupo renombrado a "' + newName + '"');
}

// -----------------------------------------------
// MODAL SERVICIOS
// -----------------------------------------------
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
    document.getElementById('modalSub').textContent = 'Modificando "' + s.title + '"';
    document.getElementById('modalTabs').style.display = 'none';
    document.getElementById('edit-service-id').value = s.id;
    document.getElementById('title').value = s.title;
    document.getElementById('url').value = s.url;
    document.getElementById('description').value = s.description || '';
    document.getElementById('serviceSubmitBtn').textContent = 'Guardar Cambios';
    updateGroupSelect();
    document.getElementById('service-group').value = s.group || '';
    const cc = document.getElementById('char-count'); if (cc) cc.textContent = (s.description||'').length;
    uploadedIconData = null; document.getElementById('icon').value = '';
    const preview = document.getElementById('iconPreview'), previewImg = document.getElementById('iconPreviewImg');
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
    document.getElementById('modalSub').textContent = 'Modificando "' + gn + '"';
    document.getElementById('modalTabs').style.display = 'none';
    document.getElementById('edit-group-old-name').value = gn;
    document.getElementById('new-group-name').value = gn;
    document.getElementById('groupSubmitBtn').textContent = 'Guardar Nombre';
    document.getElementById('mainModal').classList.add('active');
    switchTab('group');
    setTimeout(() => document.getElementById('new-group-name').select(), 100);
}

function closeModal() {
    const m = document.getElementById('mainModal'); if (m) m.classList.remove('active');
    const sf = document.getElementById('serviceForm'); if (sf) sf.reset();
    const gf = document.getElementById('groupForm'); if (gf) gf.reset();
    const p = document.getElementById('iconPreview'); if (p) p.style.display = 'none';
    uploadedIconData = null; clearIconUpload(); switchIconTab('url');
    const cc = document.getElementById('char-count'); if (cc) cc.textContent = '0';
    modalMode = 'add';
}

function switchTab(tab) {
    ['service','group'].forEach(t => {
        document.getElementById('tab-' + t).classList.toggle('active', t === tab);
        document.getElementById('panel-' + t).classList.toggle('active', t === tab);
    });
}

document.getElementById('serviceForm').addEventListener('submit', async e => {
    e.preventDefault();
    const title = document.getElementById('title').value.trim();
    let icon = document.getElementById('icon').value.trim();
    const url = document.getElementById('url').value.trim();
    const description = document.getElementById('description').value.trim();
    const group = document.getElementById('service-group').value;
    const editId = parseInt(document.getElementById('edit-service-id').value) || 0;
    if (uploadedIconData) icon = uploadedIconData;
    if (!title || !url) return;
    if (modalMode === 'edit' && editId) await updateServiceAPI(editId, title, icon||'', url, description, group);
    else await addServiceAPI(title, icon||'', url, description, group);
    closeModal();
});

document.getElementById('groupForm').addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('new-group-name').value.trim();
    const oldName = document.getElementById('edit-group-old-name').value;
    if (!name) return;
    if (modalMode === 'edit' && oldName) { if (name !== oldName) await renameGroup(oldName, name); }
    else {
        if (!localGroups.includes(name) && !services.some(s => (s.group||'Sin Grupo') === name)) localGroups.push(name);
        renderAll(); showToast('\u{1F4C1} Grupo "' + name + '" creado');
    }
    closeModal();
});

document.getElementById('mainModal').addEventListener('click', e => { if (e.target.id === 'mainModal') closeModal(); });

// -----------------------------------------------
// SYSINFO
// -----------------------------------------------
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
        bar.innerHTML =
            '<div class="sysinfo-chip"><svg viewBox="0 0 24 24"><path d="M17 14h-1v-1h-2v1h-1v2h1v1h2v-1h1v-2zm-4-7h2V5h-2v2zm-4 7H8v-1H6v1H5v2h1v1h2v-1h1v-2zM9 7h2V5H9v2zm4 4h2V9h-2v2zm-4 0h2V9H9v2zM21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z"/></svg>CPU&nbsp;<span class="chip-value">' + d.cpu_percent + '%</span><div class="chip-bar"><div class="chip-bar-fill ' + cc + '" style="width:' + d.cpu_percent + '%"></div></div></div>' +
            '<div class="sysinfo-chip"><svg viewBox="0 0 24 24"><path d="M15 9H9v6h6V9zm-2 4h-2v-2h2v2zm8-2V9h-2V7c0-1.1-.9-2-2-2h-2V3h-2v2h-2V3H9v2H7C5.9 5 5 5.9 5 7v2H3v2h2v2H3v2h2v2c0 1.1.9 2 2 2h2v2h2v-2h2v2h2v-2h2c1.1 0 2-.9 2-2v-2h2v-2h-2v-2h2zm-4 6H7V7h10v10z"/></svg>RAM&nbsp;<span class="chip-value">' + d.ram_used_gb + '/' + d.ram_total_gb + ' GB</span><div class="chip-bar"><div class="chip-bar-fill ' + rc + '" style="width:' + d.ram_percent + '%"></div></div></div>' +
            '<div class="sysinfo-chip"><svg viewBox="0 0 24 24"><path d="M6 2h12l4 4v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 0v4h12V2M4 6v14h16V6H4zm8 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>Disco&nbsp;<span class="chip-value">' + d.disk_used_gb + '/' + d.disk_total_gb + ' GB</span><div class="chip-bar"><div class="chip-bar-fill ' + dc + '" style="width:' + d.disk_percent + '%"></div></div></div>' +
            '<div class="sysinfo-chip"><svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L12 15.45 7.77 18l1.12-4.81-3.73-3.23 4.92-.42L12 5l1.92 4.53 4.92.42-3.73 3.23L16.23 18z"/></svg>Up&nbsp;<span class="chip-value">' + d.uptime + '</span></div>';
    } catch(e) { const b = document.getElementById('sysinfo'); if (b) b.style.display = 'none'; }
}

// -----------------------------------------------
// BOOKMARKS - ICON TABS
// -----------------------------------------------
function switchBmIconTab(tab) {
    bmIconMode = tab === 'bm-favicon' ? 'favicon' : 'url';
    document.querySelectorAll('#bookmarkForm .icon-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.getElementById('bm-icon-tab-favicon').classList.toggle('active', tab === 'bm-favicon');
    document.getElementById('bm-icon-tab-url').classList.toggle('active', tab === 'bm-url');
    if (tab === 'bm-url') { document.getElementById('bmIconUrlPreview').style.display = 'none'; document.getElementById('bookmark-icon-url').value = ''; }
}

function previewBmIconUrl() {
    const url = document.getElementById('bookmark-icon-url').value.trim();
    const prev = document.getElementById('bmIconUrlPreview'), img = document.getElementById('bmIconUrlImg');
    if (!prev || !img) return;
    if (url) { img.src = url; prev.style.display = 'flex'; } else { prev.style.display = 'none'; }
}

function updateBmFaviconPreview(url) {
    const box = document.getElementById('bmFaviconBox'), hint = document.getElementById('bmFaviconHint');
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

document.addEventListener('DOMContentLoaded', () => {
    const bmUrl = document.getElementById('bookmark-url');
    if (bmUrl) bmUrl.addEventListener('input', () => { if (bmIconMode === 'favicon') updateBmFaviconPreview(bmUrl.value.trim()); });
});

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
    const gm = getBmGroupMap(), sel = document.getElementById('bookmark-group-select');
    if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">Sin grupo</option>' +
        Object.keys(gm).sort().map(g => '<option value="' + escapeHtml(g) + '"' + (g === cv ? ' selected' : '') + '>' + escapeHtml(g) + '</option>').join('');
}

function toggleBmGroupCollapse(gn) {
    const i = collapsedBmGroups.indexOf(gn);
    if (i > -1) collapsedBmGroups.splice(i, 1); else collapsedBmGroups.push(gn);
    localStorage.setItem('collapsedBmGroups', JSON.stringify(collapsedBmGroups));
    renderBookmarks(bookmarks);
}

function renderBookmarks(list) {
    const container = document.getElementById('bookmarkGroupsContainer'), empty = document.getElementById('bookmarksEmpty');
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
        const cb = document.createElement('span'); cb.className = 'group-count'; cb.textContent = items.length; ttl.appendChild(cb);
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
        const listEl = document.createElement('div'); listEl.className = 'bookmarks-list' + (collapsedBmGroups.includes(gn) ? ' collapsed' : '');
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
    const url = document.createElement('div'); url.className = 'bookmark-url'; url.textContent = bm.url;
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
    document.getElementById('bookmarkModalSub').textContent = 'Guarda un enlace rápido';
    document.getElementById('edit-bookmark-id').value = '';
    document.getElementById('bookmark-name').value = '';
    document.getElementById('bookmark-url').value = '';
    document.getElementById('bookmark-icon-url').value = '';
    document.getElementById('bmIconUrlPreview').style.display = 'none';
    document.getElementById('bookmarkSubmitBtn').textContent = 'Guardar Marcador';
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
    document.getElementById('bookmarkModalSub').textContent = 'Modificando "' + bm.name + '"';
    document.getElementById('edit-bookmark-id').value = id;
    document.getElementById('bookmark-name').value = bm.name;
    document.getElementById('bookmark-url').value = bm.url;
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

document.getElementById('bookmarkModal').addEventListener('click', e => { if (e.target.id === 'bookmarkModal') closeBookmarkModal(); });

document.getElementById('bookmarkForm').addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('bookmark-name').value.trim();
    let url = document.getElementById('bookmark-url').value.trim();
    const group = document.getElementById('bookmark-group-select').value;
    const editId = parseInt(document.getElementById('edit-bookmark-id').value) || 0;
    if (!name || !url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    let icon = '';
    if (bmIconMode === 'url') { icon = document.getElementById('bookmark-icon-url').value.trim(); }
    try {
        if (bookmarkMode === 'edit' && editId) {
            const r = await fetch('/api/bookmarks', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id: editId, name, url, icon, group: group||'Sin Grupo'}) });
            const updated = await r.json(); bookmarks = bookmarks.map(b => b.id === editId ? updated : b);
            showToast('\u270F\uFE0F "' + name + '" actualizado');
        } else {
            const r = await fetch('/api/bookmarks', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name, url, icon, group: group||'Sin Grupo'}) });
            const newBm = await r.json(); bookmarks.push(newBm);
            showToast('\u2713 "' + name + '" guardado');
            if (group && group !== 'Sin Grupo') localBmGroups = localBmGroups.filter(g => g !== group);
        }
        renderBookmarks(bookmarks); closeBookmarkModal();
    } catch { showToast('\u2717 Error al guardar'); }
});

function deleteBookmarkConfirm(id, name) {
    showConfirm('Eliminar marcador', '¿Eliminar "' + name + '"?', '\u{1F516}', 'Eliminar', async () => {
        try {
            await fetch('/api/bookmarks', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id}) });
            bookmarks = bookmarks.filter(b => b.id !== id); renderBookmarks(bookmarks);
            showToast('\u{1F5D1}\uFE0F "' + name + '" eliminado');
        } catch { showToast('\u2717 Error'); }
    });
}

// -----------------------------------------------
// BOOKMARK GROUPS MODAL
// -----------------------------------------------
function openBookmarkGroupModal() {
    document.getElementById('bmGroupModalTitle').textContent = 'Nuevo Grupo';
    document.getElementById('bmGroupModalSub').textContent = 'Crea un grupo para organizar tus marcadores';
    document.getElementById('edit-bm-group-old-name').value = '';
    document.getElementById('bm-group-name').value = '';
    document.getElementById('bmGroupSubmitBtn').textContent = 'Crear Grupo';
    document.getElementById('bookmarkGroupModal').classList.add('active');
    setTimeout(() => document.getElementById('bm-group-name').focus(), 100);
}

function openEditBmGroup(gn) {
    document.getElementById('bmGroupModalTitle').textContent = 'Renombrar Grupo';
    document.getElementById('bmGroupModalSub').textContent = 'Modificando "' + gn + '"';
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

document.getElementById('bookmarkGroupModal').addEventListener('click', e => { if (e.target.id === 'bookmarkGroupModal') closeBookmarkGroupModal(); });

document.getElementById('bookmarkGroupForm').addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('bm-group-name').value.trim(); if (!name) return;
    const oldName = document.getElementById('edit-bm-group-old-name').value;
    if (oldName) {
        if (name !== oldName) {
            const gs = bookmarks.filter(b => (b.group||'Sin Grupo') === oldName);
            for (const b of gs) {
                const r = await fetch('/api/bookmarks', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({...b, group: name}) });
                const up = await r.json(); bookmarks = bookmarks.map(x => x.id === b.id ? up : x);
            }
            localBmGroups = localBmGroups.map(g => g === oldName ? name : g);
            renderBookmarks(bookmarks); showToast('\u270F\uFE0F Grupo renombrado a "' + name + '"');
        }
    } else {
        if (!localBmGroups.includes(name) && !bookmarks.some(b => (b.group||'Sin Grupo') === name)) localBmGroups.push(name);
        renderBookmarks(bookmarks); updateBmGroupSelect(); showToast('\u{1F4C1} Grupo "' + name + '" creado');
    }
    closeBookmarkGroupModal();
});

async function deleteBmGroup(gn) {
    const gs = bookmarks.filter(b => (b.group||'Sin Grupo') === gn);
    showConfirm('Eliminar grupo', '¿Eliminar "' + gn + '"?' + (gs.length > 0 ? ' Esto eliminará ' + gs.length + ' marcador(es).' : ''), '\u{1F4C1}', 'Eliminar', async () => {
        for (const b of gs) { await fetch('/api/bookmarks', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id: b.id}) }); }
        bookmarks = bookmarks.filter(b => (b.group||'Sin Grupo') !== gn);
        localBmGroups = localBmGroups.filter(g => g !== gn);
        renderBookmarks(bookmarks); showToast('\u{1F5D1}\uFE0F Grupo "' + gn + '" eliminado');
    });
}

// -----------------------------------------------
// LOAD BOOKMARKS
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

// -----------------------------------------------
// INIT
// -----------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initSearch();
    initIconDragDrop();
    loadServices();
    loadSysInfo();
    loadBookmarks();
    updateClock();
    renderCalendar();
    loadWeather();
    loadBackgroundSettings();
    loadRSSFeeds();
    loadIntegrations();

    const savedTab = localStorage.getItem('activePageTab') || 'inicio';
    switchPageTab(savedTab);

    document.getElementById('timezoneSelect').value = selectedTimezone;
    document.getElementById('timezoneSelect').addEventListener('change', changeTimezone);
    document.getElementById('timeFormatSelect').value = timeFormat;
    document.getElementById('timeFormatSelect').addEventListener('change', changeTimeFormat);

    const descInput = document.getElementById('description'), charCount = document.getElementById('char-count');
    if (descInput && charCount) descInput.addEventListener('input', () => { charCount.textContent = descInput.value.length; });

    if (window.innerWidth > 1200) document.body.classList.add('sidebar-open');

    setInterval(updateClock, 1000);
    setInterval(loadSysInfo, 5000);
    setInterval(loadWeather, 600000);
});

// -----------------------------------------------
// RSS FEEDS
// -----------------------------------------------
let rssFeeds = [];
let rssMode = 'add';
let rssRefreshIntervals = new Map();

async function loadRSSFeeds() {
    try {
        const r = await fetch('/api/rss');
        rssFeeds = await r.json() || [];
        renderRSSFeeds();
        for (const feed of rssFeeds) {
            let items = [];
            try { items = JSON.parse(feed.cached_items || '[]'); } catch {}
            if (items.length === 0) {
                await fetchRSSContent(feed.id, true);
            }
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
    const empty = document.getElementById('rssEmpty');
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

    const header = document.createElement('div'); header.className = 'rss-feed-header';
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
    if (feed.last_fetch_at) {
        meta.innerHTML += ' &nbsp;•&nbsp; Última actualización: ' + new Date(feed.last_fetch_at).toLocaleString('es-ES');
    }

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
    const el = document.createElement('div'); el.className = 'rss-item';
    const itemLink = item.link || '';
    const itemTitle = (item.title || '').trim() || 'Sin título';
    if (itemLink) { el.style.cursor = 'pointer'; el.addEventListener('click', () => window.open(itemLink, '_blank')); }

    const bullet = document.createElement('div'); bullet.className = 'rss-item-bullet';
    const content = document.createElement('div'); content.className = 'rss-item-content';
    const titleEl = document.createElement('div'); titleEl.className = 'rss-item-title'; titleEl.textContent = itemTitle;
    const dateEl = document.createElement('div'); dateEl.className = 'rss-item-date';

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
        const r = await fetch('/api/rss/fetch', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({id: feedId}) });
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
        const metaEl = document.querySelector('#rss-feed-' + feedId + ' .rss-feed-meta');
        const feed = rssFeeds.find(f => f.id === feedId);
        if (feed) {
            feed.last_fetch_at = data.last_fetch;
            feed.cached_items = JSON.stringify(data.items || []);
            if (metaEl) {
                metaEl.innerHTML = '<svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg> Mostrando últimas ' + feed.max_entries + ' entradas &nbsp;•&nbsp; Última actualización: ' + new Date(data.last_fetch).toLocaleString('es-ES');
            }
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

function openRSSModal() {
    rssMode = 'add';
    document.getElementById('rssModalTitle').textContent = 'Nuevo Feed RSS';
    document.getElementById('rssModalSub').textContent = 'Configura un feed para recibir actualizaciones';
    document.getElementById('edit-rss-id').value = '';
    document.getElementById('rss-title').value = '';
    document.getElementById('rss-url').value = '';
    document.getElementById('rss-max-entries').value = '5';
    document.getElementById('rssSubmitBtn').textContent = 'Guardar Feed';
    document.getElementById('rssModal').classList.add('active');
    setTimeout(() => document.getElementById('rss-title').focus(), 100);
}

function openEditRSS(feed) {
    rssMode = 'edit';
    document.getElementById('rssModalTitle').textContent = 'Editar Feed RSS';
    document.getElementById('rssModalSub').textContent = 'Modificando "' + feed.title + '"';
    document.getElementById('edit-rss-id').value = feed.id;
    document.getElementById('rss-title').value = feed.title;
    document.getElementById('rss-url').value = feed.url;
    document.getElementById('rss-max-entries').value = feed.max_entries;
    document.getElementById('rssSubmitBtn').textContent = 'Guardar Cambios';
    document.getElementById('rssModal').classList.add('active');
    setTimeout(() => document.getElementById('rss-title').focus(), 100);
}

function closeRSSModal() {
    document.getElementById('rssModal').classList.remove('active');
    document.getElementById('rssForm').reset();
}

const rssForm = document.getElementById('rssForm');
if (rssForm) {
    rssForm.addEventListener('submit', async e => {
        e.preventDefault();
        const title = document.getElementById('rss-title').value.trim();
        const url = document.getElementById('rss-url').value.trim();
        const maxEntries = parseInt(document.getElementById('rss-max-entries').value) || 5;
        const editId = parseInt(document.getElementById('edit-rss-id').value) || 0;
        if (!title || !url) return;
        try {
            if (rssMode === 'edit' && editId) {
                await fetch('/api/rss', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id: editId, title, url, max_entries: maxEntries}) });
                showToast('\u270F\uFE0F Feed actualizado');
                await loadRSSFeeds();
                closeRSSModal();
            } else {
                const res = await fetch('/api/rss', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({title, url, max_entries: maxEntries}) });
                const newFeed = await res.json();
                showToast('\u2713 Feed guardado');
                await loadRSSFeeds();
                closeRSSModal();
                await fetchRSSContent(newFeed.id, false);
            }
        } catch { showToast('\u2717 Error al guardar'); }
    });
}

function deleteRSSConfirm(id, title) {
    showConfirm('Eliminar feed', '¿Eliminar "' + title + '"?', '\u{1F4F0}', 'Eliminar', async () => {
        try {
            await fetch('/api/rss', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id}) });
            if (rssRefreshIntervals.has(id)) { clearInterval(rssRefreshIntervals.get(id)); rssRefreshIntervals.delete(id); }
            rssFeeds = rssFeeds.filter(f => f.id !== id);
            renderRSSFeeds(); showToast('\u{1F5D1}\uFE0F Feed eliminado');
        } catch { showToast('\u2717 Error'); }
    });
}

const rssModal = document.getElementById('rssModal');
if (rssModal) {
    rssModal.addEventListener('click', e => { if (e.target.id === 'rssModal') closeRSSModal(); });
}

// ---------------------------------------------------------------
// INTEGRATIONS (Uptime Kuma + AdGuard Home + Syncthing)
// ---------------------------------------------------------------

let integrations = [];
let integrationMode = 'add';
let integrationSyncIntervals = new Map();

// --- LOAD & RENDER -----------------------------------------------
async function loadIntegrations() {
    try {
        const r = await fetch('/api/integrations');
        integrations = await r.json() || [];
        renderIntegrations();
        for (const it of integrations) {
            await syncIntegrationData(it.id, true);
        }
        integrations.forEach(it => startIntegrationSync(it.id));
    } catch(e) { console.error('loadIntegrations error:', e); renderIntegrations(); }
}

function startIntegrationSync(id) {
    if (integrationSyncIntervals.has(id)) clearInterval(integrationSyncIntervals.get(id));
    const interval = setInterval(() => syncIntegrationData(id, true), 60 * 1000);
    integrationSyncIntervals.set(id, interval);
}

function renderIntegrations() {
    const container = document.getElementById('integrationsContainer');
    const empty = document.getElementById('integrationsEmpty');
    if (!container) return;
    if (integrations.length === 0) {
        container.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
    }
    if (empty) empty.style.display = 'none';
    container.innerHTML = '';
    integrations.forEach(it => container.appendChild(buildIntegrationCard(it)));
}

// --- BUILD CARD --------------------------------------------------
function buildIntegrationCard(it) {
    const card = document.createElement('div');
    card.className = 'integration-card';
    card.id = 'integration-card-' + it.id;
    const isAdguard = it.itype === 'adguard';
    const isSyncthing = it.itype === 'syncthing';

    const header = document.createElement('div'); header.className = 'integration-card-header';
    const titleArea = document.createElement('div'); titleArea.className = 'integration-card-title-area';

    const badge = document.createElement('div');
    badge.className = 'integration-type-badge integration-type-' + (it.itype || 'uptime_kuma');
    if (isAdguard) {
        badge.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg> AdGuard Home';
    } else if (isSyncthing) {
        badge.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg> Syncthing';
    } else {
        badge.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><circle cx="12" cy="12" r="10"/></svg> Uptime Kuma';
    }

    const nameEl = document.createElement('div'); nameEl.className = 'integration-card-name'; nameEl.textContent = it.name;
    const urlEl = document.createElement('div'); urlEl.className = 'integration-card-url'; urlEl.textContent = it.url;
    titleArea.appendChild(badge); titleArea.appendChild(nameEl); titleArea.appendChild(urlEl);

    const actions = document.createElement('div'); actions.className = 'integration-card-actions';

    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'integration-btn refresh'; refreshBtn.title = 'Sincronizar ahora';
    refreshBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>';
    refreshBtn.addEventListener('click', () => syncIntegrationData(it.id, false)); actions.appendChild(refreshBtn);

    const editBtn = document.createElement('button');
    editBtn.className = 'integration-btn edit'; editBtn.title = 'Editar';
    editBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>';
    editBtn.addEventListener('click', () => openEditIntegration(it)); actions.appendChild(editBtn);

    const delBtn = document.createElement('button');
    delBtn.className = 'integration-btn delete'; delBtn.title = 'Eliminar';
    delBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>';
    delBtn.addEventListener('click', () => deleteIntegrationConfirm(it.id, it.name)); actions.appendChild(delBtn);

    header.appendChild(titleArea); header.appendChild(actions);
    card.appendChild(header);

    const meta = document.createElement('div'); meta.className = 'integration-meta'; meta.id = 'integration-meta-' + it.id;
    meta.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg> Sincronizando cada 60 s';
    if (it.last_sync) {
        meta.innerHTML += ' &nbsp;•&nbsp; Última sync: ' + new Date(it.last_sync).toLocaleString('es-ES');
    }
    card.appendChild(meta);

    const contentEl = document.createElement('div'); contentEl.className = 'uk-monitors-grid'; contentEl.id = 'uk-monitors-' + it.id;
    let cached = {}; try { cached = JSON.parse(it.cached_data || '{}'); } catch {}

    if (isAdguard) {
        if (cached && cached.total_queries !== undefined) renderAdguardCard(contentEl, cached);
        else contentEl.innerHTML = '<div class="uk-loading">Sincronizando con AdGuard Home...</div>';
    } else if (isSyncthing) {
        if (cached && cached.folders) renderSyncthingCard(contentEl, cached);
        else contentEl.innerHTML = '<div class="uk-loading">Sincronizando con Syncthing...</div>';
    } else {
        if (cached && cached.publicGroupList && cached.publicGroupList.length > 0) renderUptimeKumaMonitors(contentEl, cached);
        else contentEl.innerHTML = '<div class="uk-loading">Sincronizando con Uptime Kuma...</div>';
    }
    card.appendChild(contentEl);
    return card;
}

// --- RENDER UPTIME KUMA MONITORS ---------------------------------
function renderUptimeKumaMonitors(container, data) {
    container.innerHTML = '';

    let totalMonitors = 0, upCount = 0, downCount = 0, pendingCount = 0;
    const allMonitors = [];
    (data.publicGroupList || []).forEach(grp => {
        (grp.monitorList || []).forEach(m => {
            allMonitors.push({ ...m, groupName: grp.name });
            totalMonitors++;
        });
    });

    allMonitors.forEach(m => {
        const st = m.status !== undefined ? m.status : 1;
        if (st === 1) upCount++;
        else if (st === 0) downCount++;
        else pendingCount++;
    });

    const summary = document.createElement('div'); summary.className = 'uk-summary';
    const statusClass = downCount > 0 ? 'down' : 'up';
    const statusLabel = downCount > 0 ? `${downCount} caído${downCount > 1 ? 's' : ''}` : 'Todo operativo';
    summary.innerHTML =
        '<div class="uk-summary-status ' + statusClass + '">' +
        '<span class="uk-status-dot ' + statusClass + '"></span>' + statusLabel + '</div>' +
        '<div class="uk-summary-counts">' +
        '<span class="uk-count up"><svg viewBox="0 0 24 24" width="12" height="12"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' + upCount + ' operativos</span>' +
        (downCount > 0 ? '<span class="uk-count down"><svg viewBox="0 0 24 24" width="12" height="12"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>' + downCount + ' caídos</span>' : '') +
        '</div>';
    container.appendChild(summary);

    if (data.config && data.config.title) {
        const title = document.createElement('div'); title.className = 'uk-page-title';
        title.textContent = data.config.title;
        container.appendChild(title);
    }

    (data.publicGroupList || []).forEach(grp => {
        const groupEl = document.createElement('div'); groupEl.className = 'uk-group';

        const groupHeader = document.createElement('div'); groupHeader.className = 'uk-group-header';
        groupHeader.innerHTML = '<span class="uk-group-name">' + escapeHtml(grp.name) + '</span>' +
            '<span class="uk-group-count">' + (grp.monitorList || []).length + '</span>';
        groupEl.appendChild(groupHeader);

        const monitorsEl = document.createElement('div'); monitorsEl.className = 'uk-monitors';
        (grp.monitorList || []).forEach(m => {
            const st = m.status !== undefined ? m.status : 1;
            const statusMap = { 0: 'down', 1: 'up', 2: 'pending', 3: 'maintenance' };
            const labelMap = { 0: 'Caído', 1: 'Operativo', 2: 'Pendiente', 3: 'Mantenimiento' };
            const statusKey = statusMap[st] || 'pending';
            const statusText = labelMap[st] || 'Desconocido';

            const monEl = document.createElement('div'); monEl.className = 'uk-monitor';

            const tags = (m.tags || []).map(t =>
                '<span class="uk-tag" style="background:' + (t.color || '#6b7280') + '22;color:' + (t.color || '#6b7280') + ';border-color:' + (t.color || '#6b7280') + '44;">' + escapeHtml(t.name) + '</span>'
            ).join('');

            let certBadge = '';
            if (m.certExpiryDaysRemaining !== undefined) {
                const days = m.certExpiryDaysRemaining;
                const certClass = days < 14 ? 'cert-warn' : 'cert-ok';
                certBadge = '<span class="uk-cert ' + certClass + '"><svg viewBox="0 0 24 24" width="10" height="10"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg> ' + days + 'd</span>';
            }

            monEl.innerHTML =
                '<div class="uk-monitor-header">' +
                '<span class="uk-monitor-dot ' + statusKey + '"></span>' +
                '<span class="uk-monitor-name">' + escapeHtml(m.name) + '</span>' +
                '<span class="uk-monitor-status ' + statusKey + '">' + statusText + '</span>' +
                '</div>' +
                (tags || certBadge ? '<div class="uk-monitor-footer">' + tags + certBadge + '</div>' : '');

            monitorsEl.appendChild(monEl);
        });

        groupEl.appendChild(monitorsEl);
        container.appendChild(groupEl);
    });

    if (data.incidents && data.incidents.length > 0) {
        const incSection = document.createElement('div'); incSection.className = 'uk-incidents';
        const incTitle = document.createElement('div'); incTitle.className = 'uk-incidents-title';
        incTitle.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg> Incidentes activos';
        incSection.appendChild(incTitle);
        data.incidents.forEach(inc => {
            const incEl = document.createElement('div'); incEl.className = 'uk-incident';
            incEl.innerHTML =
                '<div class="uk-incident-title">' + escapeHtml(inc.title || 'Incidente') + '</div>' +
                '<div class="uk-incident-content">' + escapeHtml(inc.content || '') + '</div>';
            incSection.appendChild(incEl);
        });
        container.appendChild(incSection);
    }
}

// --- RENDER ADGUARD CARD -----------------------------------------
function renderAdguardCard(container, stats) {
    container.innerHTML = '';

    const statsRow = document.createElement('div'); statsRow.className = 'ag-stats-row';
    statsRow.innerHTML =
        '<div class="ag-stat"><div class="ag-stat-value">' + (stats.total_queries||0).toLocaleString() + '</div><div class="ag-stat-label">Consultas totales</div></div>' +
        '<div class="ag-stat"><div class="ag-stat-value ag-blocked">' + (stats.blocked_queries||0).toLocaleString() + '</div><div class="ag-stat-label">Bloqueadas</div></div>' +
        '<div class="ag-stat"><div class="ag-stat-value">' + (stats.blocked_percent||0) + '%</div><div class="ag-stat-label">% Bloqueado</div></div>' +
        '<div class="ag-stat"><div class="ag-stat-value">' + (stats.response_time_ms||0) + ' ms</div><div class="ag-stat-label">Latencia avg</div></div>';
    container.appendChild(statsRow);

    if (stats.series && stats.series.length > 0) {
        const chartSection = document.createElement('div'); chartSection.className = 'ag-chart-section';
        const chartTitle = document.createElement('div'); chartTitle.className = 'ag-chart-title'; chartTitle.textContent = 'Últimas 24 horas';
        chartSection.appendChild(chartTitle);
        const chart = document.createElement('div'); chart.className = 'ag-chart';
        stats.series.forEach((bar, i) => {
            const wrap = document.createElement('div'); wrap.className = 'ag-bar-wrap';
            const stack = document.createElement('div'); stack.className = 'ag-bar-stack';
            const total = document.createElement('div'); total.className = 'ag-bar-total';
            total.style.height = (bar.percent_total||0) + '%'; total.title = 'Total: ' + (bar.queries||0);
            const blocked = document.createElement('div'); blocked.className = 'ag-bar-blocked';
            blocked.style.height = (bar.percent_blocked||0) + '%'; blocked.title = 'Bloqueadas: ' + (bar.blocked||0);
            stack.appendChild(total); stack.appendChild(blocked); wrap.appendChild(stack);
            if (stats.time_labels && stats.time_labels[i]) {
                const lbl = document.createElement('div'); lbl.className = 'ag-bar-label'; lbl.textContent = stats.time_labels[i];
                wrap.appendChild(lbl);
            }
            chart.appendChild(wrap);
        });
        chartSection.appendChild(chart);
        const legend = document.createElement('div'); legend.className = 'ag-legend';
        legend.innerHTML = '<span class="ag-legend-item"><span class="ag-legend-dot total"></span>Consultas</span><span class="ag-legend-item"><span class="ag-legend-dot blocked"></span>Bloqueadas</span>';
        chartSection.appendChild(legend);
        container.appendChild(chartSection);
    }

    if (stats.top_domains && stats.top_domains.length > 0) {
        const topSection = document.createElement('div'); topSection.className = 'ag-top-section';
        const topTitle = document.createElement('div'); topTitle.className = 'ag-top-title';
        topTitle.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg> Top dominios bloqueados';
        topSection.appendChild(topTitle);
        stats.top_domains.forEach(d => {
            const row = document.createElement('div'); row.className = 'ag-domain-row';
            row.innerHTML =
                '<div class="ag-domain-info"><span class="ag-domain-name">' + escapeHtml(d.domain) + '</span><span class="ag-domain-count">' + (d.count||0).toLocaleString() + ' bloqueos</span></div>' +
                '<div class="ag-domain-bar-wrap"><div class="ag-domain-bar" style="width:' + (d.percent||0) + '%"></div><span class="ag-domain-pct">' + (d.percent||0) + '%</span></div>';
            topSection.appendChild(row);
        });
        container.appendChild(topSection);
    }
}

// --- RENDER SYNCTHING CARD ---------------------------------------
function renderSyncthingCard(container, stats) {
    container.innerHTML = '';

    if (!stats || !stats.folders) {
        container.innerHTML = '<div class="uk-loading">Sin datos de Syncthing</div>';
        return;
    }

    const folders = stats.folders || [];

    // Compute overall status
    const reachable = folders.filter(f => f.reachable);
    const allSynced = reachable.length > 0 && reachable.every(f => f.completion && f.completion.completion >= 100);
    const anySyncing = reachable.some(f => f.completion && f.completion.completion < 100 && f.completion.completion > 0);
    const anyError = folders.some(f => !f.reachable);

    let overallClass = 'synced', overallLabel = 'Todo sincronizado', overallIcon = '\u2713';
    if (anyError && reachable.length === 0) { overallClass = 'error'; overallLabel = 'Sin conexión'; overallIcon = '\u2717'; }
    else if (anyError) { overallClass = 'syncing'; overallLabel = 'Algunos errores'; overallIcon = '\u26A0\uFE0F'; }
    else if (anySyncing) { overallClass = 'syncing'; overallLabel = 'Sincronizando...'; overallIcon = '\u{1F504}'; }
    else if (!allSynced && reachable.length > 0) { overallClass = 'syncing'; overallLabel = 'Pendiente'; overallIcon = '\u23F3'; }

    // Header row
    const header = document.createElement('div');
    header.className = 'st-header';

    const leftGroup = document.createElement('div');
    leftGroup.style.cssText = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;';

    if (stats.version) {
        const verEl = document.createElement('div');
        verEl.className = 'st-version';
        verEl.innerHTML =
            '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>' +
            escapeHtml(stats.version);
        leftGroup.appendChild(verEl);
    }

    if (stats.my_id) {
        const idEl = document.createElement('div');
        idEl.className = 'st-device-id';
        idEl.title = stats.my_id;
        const shortId = stats.my_id.split('-')[0] + '-\u2026';
        idEl.textContent = shortId;
        leftGroup.appendChild(idEl);
    }

    const badge = document.createElement('div');
    badge.className = 'st-overall-badge ' + overallClass;
    badge.innerHTML =
        '<span style="font-size:0.9em;">' + overallIcon + '</span> ' +
        escapeHtml(overallLabel) +
        '<span style="font-weight:400;opacity:0.8;margin-left:4px;">(' + reachable.length + '/' + folders.length + ')</span>';

    header.appendChild(leftGroup);
    header.appendChild(badge);
    container.appendChild(header);

    // Folders grid
    if (folders.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'st-no-folders';
        empty.textContent = 'No se encontraron carpetas en Syncthing.';
        container.appendChild(empty);
        return;
    }

    const grid = document.createElement('div');
    grid.className = 'st-folders';

    folders.forEach(folder => {
        const comp = folder.completion || {};
        const pct = typeof comp.completion === 'number' ? comp.completion : 0;
        const folderReachable = folder.reachable !== false;

        let folderState = 'error';
        let statusLabel = 'No alcanzable';
        if (folderReachable) {
            if (pct >= 100) { folderState = 'synced'; statusLabel = 'Sincronizado'; }
            else if (pct > 0) { folderState = 'syncing'; statusLabel = 'Sincronizando'; }
            else { folderState = 'syncing'; statusLabel = 'Pendiente'; }
        }

        let progressClass = folderState === 'synced' ? 'complete' : folderState === 'error' ? 'error' : 'warning';

        const card = document.createElement('div');
        card.className = 'st-folder st-' + folderState;

        const fHeader = document.createElement('div');
        fHeader.className = 'st-folder-header';

        const icon = document.createElement('div');
        icon.className = 'st-folder-icon';
        icon.innerHTML = folderState === 'synced'
            ? '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-5 3l4 4-4 4-1.41-1.41L16.17 13H9v-2h7.17l-2.58-2.59L15 9z"/></svg>'
            : folderState === 'syncing'
            ? '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>'
            : '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>';

        const info = document.createElement('div');
        info.className = 'st-folder-info';

        const label = document.createElement('div');
        label.className = 'st-folder-label';
        label.textContent = folder.label || folder.folder_id;
        label.title = folder.label || folder.folder_id;

        const idEl = document.createElement('div');
        idEl.className = 'st-folder-id';
        idEl.textContent = folder.folder_id;

        info.appendChild(label);
        info.appendChild(idEl);

        const statusEl = document.createElement('div');
        statusEl.className = 'st-folder-status ' + folderState;
        statusEl.textContent = statusLabel;

        fHeader.appendChild(icon);
        fHeader.appendChild(info);
        fHeader.appendChild(statusEl);
        card.appendChild(fHeader);

        if (folderReachable) {
            const progressWrap = document.createElement('div');
            progressWrap.className = 'st-progress-wrap';

            const track = document.createElement('div');
            track.className = 'st-progress-track';

            const fill = document.createElement('div');
            fill.className = 'st-progress-fill ' + progressClass;
            fill.style.width = Math.min(100, Math.max(0, pct)) + '%';

            track.appendChild(fill);

            const pctEl = document.createElement('div');
            pctEl.className = 'st-progress-pct';
            pctEl.textContent = pct.toFixed(1) + '%';

            progressWrap.appendChild(track);
            progressWrap.appendChild(pctEl);
            card.appendChild(progressWrap);

            const statsRow = document.createElement('div');
            statsRow.className = 'st-folder-stats';

            if (comp.globalBytes !== undefined) {
                statsRow.appendChild(buildStFolderStat('Total', formatBytes(comp.globalBytes)));
            }
            if (comp.needBytes !== undefined && comp.needBytes > 0) {
                statsRow.appendChild(buildStFolderStat('Pendiente', formatBytes(comp.needBytes), 'warn'));
            }
            if (comp.needFiles !== undefined && comp.needFiles > 0) {
                statsRow.appendChild(buildStFolderStat('Archivos', comp.needFiles + ' archivos', 'warn'));
            }
            if (comp.needDeletes !== undefined && comp.needDeletes > 0) {
                statsRow.appendChild(buildStFolderStat('Borrar', comp.needDeletes + ' archivos', 'warn'));
            }
            if (comp.globalBytes !== undefined && comp.needBytes === 0) {
                statsRow.appendChild(buildStFolderStat('Almacenado', formatBytes(comp.localBytes || comp.globalBytes)));
            }

            if (statsRow.children.length > 0) {
                card.appendChild(statsRow);
            }
        } else {
            const errNote = document.createElement('div');
            errNote.style.cssText = 'font-size:0.75rem;color:var(--danger,#e74c3c);opacity:0.8;padding:4px 0;';
            errNote.textContent = 'No se puede conectar con esta carpeta.';
            card.appendChild(errNote);
        }

        grid.appendChild(card);
    });

    container.appendChild(grid);
}

function buildStFolderStat(label, value, cls) {
    const el = document.createElement('div');
    el.className = 'st-stat-item';
    el.innerHTML =
        '<span class="st-stat-label">' + escapeHtml(label) + '</span>' +
        '<span class="st-stat-value' + (cls ? ' ' + cls : '') + '">' + escapeHtml(String(value)) + '</span>';
    return el;
}

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
}

// --- SYNC (Uptime Kuma + AdGuard + Syncthing) --------------------
async function syncIntegrationData(id, silent = false) {
    const it = integrations.find(i => i.id === id);
    const refreshBtn = document.querySelector('#integration-card-' + id + ' .integration-btn.refresh');
    if (refreshBtn && !silent) refreshBtn.classList.add('spinning');

    try {
        if (it && it.itype === 'adguard') {
            const r = await fetch('/api/adguard/stats', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ id })
            });
            if (!r.ok) throw new Error((await r.text()) || 'HTTP ' + r.status);
            const result = await r.json();
            const monitorsEl = document.getElementById('uk-monitors-' + id);
            if (monitorsEl) renderAdguardCard(monitorsEl, result.stats);
            const metaEl = document.getElementById('integration-meta-' + id);
            if (metaEl) metaEl.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg> Sincronizando cada 60 s &nbsp;•&nbsp; Última sync: ' + new Date(result.last_sync).toLocaleString('es-ES');
            const itIdx = integrations.findIndex(i => i.id === id);
            if (itIdx !== -1) { integrations[itIdx].last_sync = result.last_sync; integrations[itIdx].cached_data = JSON.stringify(result.stats); }
            if (!silent) showToast('\u2713 AdGuard sincronizado');

        } else if (it && it.itype === 'syncthing') {
            const r = await fetch('/api/syncthing/stats', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ id })
            });
            if (!r.ok) throw new Error((await r.text()) || 'HTTP ' + r.status);
            const result = await r.json();
            const monitorsEl = document.getElementById('uk-monitors-' + id);
            if (monitorsEl) renderSyncthingCard(monitorsEl, result.stats);
            const metaEl = document.getElementById('integration-meta-' + id);
            if (metaEl) metaEl.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg> Sincronizando cada 60 s &nbsp;•&nbsp; Última sync: ' + new Date(result.last_sync).toLocaleString('es-ES');
            const itIdx = integrations.findIndex(i => i.id === id);
            if (itIdx !== -1) { integrations[itIdx].last_sync = result.last_sync; integrations[itIdx].cached_data = JSON.stringify(result.stats); }
            if (!silent) showToast('\u2713 Syncthing sincronizado');

        } else {
            const r = await fetch('/api/integrations/sync', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ id })
            });
            if (!r.ok) throw new Error('HTTP ' + r.status);
            const result = await r.json();
            const monitorsEl = document.getElementById('uk-monitors-' + id);
            if (monitorsEl) renderUptimeKumaMonitors(monitorsEl, result.data);
            const metaEl = document.getElementById('integration-meta-' + id);
            if (metaEl) metaEl.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg> Sincronizando cada 60 s &nbsp;•&nbsp; Última sync: ' + new Date(result.last_sync).toLocaleString('es-ES');
            const itIdx = integrations.findIndex(i => i.id === id);
            if (itIdx !== -1) { integrations[itIdx].last_sync = result.last_sync; integrations[itIdx].cached_data = JSON.stringify(result.data); }
            if (!silent) showToast('\u2713 Integración sincronizada');
        }
    } catch(e) {
        console.error('sync error:', e);
        if (!silent) showToast('\u2717 Error: ' + e.message);
        const monitorsEl = document.getElementById('uk-monitors-' + id);
        if (monitorsEl && (monitorsEl.innerHTML.includes('Sincronizando') || monitorsEl.innerHTML.includes('Cargando'))) {
            monitorsEl.innerHTML = '<div class="uk-loading" style="color:var(--danger,#e74c3c);opacity:0.8;">Error al conectar. Verifica URL y credenciales.</div>';
        }
    } finally {
        if (refreshBtn) refreshBtn.classList.remove('spinning');
    }
}

// --- MODAL -------------------------------------------------------
function onIntegrationTypeChange() {
    const type = document.getElementById('integration-type').value;
    const adguardCreds = document.getElementById('adguard-credentials');
    const syncthingCreds = document.getElementById('syncthing-credentials');
    const urlLabel = document.getElementById('integration-url-label');
    const urlInput = document.getElementById('integration-url');
    const urlHint = document.getElementById('integration-url-hint');

    // Hide all credential blocks first
    if (adguardCreds) adguardCreds.style.display = 'none';
    if (syncthingCreds) syncthingCreds.style.display = 'none';

    if (type === 'adguard') {
        if (adguardCreds) adguardCreds.style.display = 'block';
        urlLabel.textContent = 'URL de AdGuard Home';
        urlInput.placeholder = 'http://192.168.1.1:3000';
        urlHint.innerHTML = 'URL base sin slash final. Ej: <code style="background:var(--bg-secondary);padding:2px 6px;border-radius:4px;">http://192.168.1.1:3000</code>';
        document.getElementById('integration-name').placeholder = 'Ej: AdGuard Home';
    } else if (type === 'syncthing') {
        if (syncthingCreds) syncthingCreds.style.display = 'block';
        urlLabel.textContent = 'URL de Syncthing';
        urlInput.placeholder = 'http://192.168.1.1:8384';
        urlHint.innerHTML = 'URL base de la interfaz web. Ej: <code style="background:var(--bg-secondary);padding:2px 6px;border-radius:4px;">http://192.168.1.1:8384</code>';
        document.getElementById('integration-name').placeholder = 'Ej: Mi Syncthing';
    } else {
        urlLabel.textContent = 'URL de la API de Uptime Kuma';
        urlInput.placeholder = 'https://status.tudominio.com/api/status-page/pagina';
        urlHint.innerHTML = 'Formato: <code style="background:var(--bg-secondary);padding:2px 6px;border-radius:4px;">https://&lt;URL&gt;/api/status-page/&lt;slug&gt;</code>';
        document.getElementById('integration-name').placeholder = 'Ej: Mi Uptime Kuma';
    }
}

function openIntegrationModal() {
    integrationMode = 'add';
    document.getElementById('integrationModalTitle').textContent = 'Nueva Integración';
    document.getElementById('integrationModalSub').textContent = 'Conecta una herramienta externa';
    document.getElementById('edit-integration-id').value = '';
    document.getElementById('integration-name').value = '';
    document.getElementById('integration-url').value = '';
    document.getElementById('integration-type').value = 'uptime_kuma';
    const u = document.getElementById('integration-username'); if (u) u.value = '';
    const p = document.getElementById('integration-password'); if (p) p.value = '';
    const ak = document.getElementById('syncthing-apikey'); if (ak) ak.value = '';
    const sf = document.getElementById('syncthing-folders'); if (sf) sf.value = '';
    document.getElementById('integrationSubmitBtn').textContent = 'Guardar Integración';
    onIntegrationTypeChange();
    document.getElementById('integrationModal').classList.add('active');
    setTimeout(() => document.getElementById('integration-name').focus(), 100);
}

function openEditIntegration(it) {
    integrationMode = 'edit';
    document.getElementById('integrationModalTitle').textContent = 'Editar Integración';
    document.getElementById('integrationModalSub').textContent = 'Modificando "' + it.name + '"';
    document.getElementById('edit-integration-id').value = it.id;
    document.getElementById('integration-name').value = it.name;
    document.getElementById('integration-url').value = it.url;
    document.getElementById('integration-type').value = it.itype || 'uptime_kuma';
    document.getElementById('integrationSubmitBtn').textContent = 'Guardar Cambios';
    onIntegrationTypeChange();
    // No pre-llenamos contraseñas/api keys por seguridad
    document.getElementById('integrationModal').classList.add('active');
    setTimeout(() => document.getElementById('integration-name').focus(), 100);
}

function closeIntegrationModal() {
    document.getElementById('integrationModal').classList.remove('active');
    document.getElementById('integrationForm').reset();
}

document.addEventListener('DOMContentLoaded', () => {
    const integrationModal = document.getElementById('integrationModal');
    if (integrationModal) {
        integrationModal.addEventListener('click', e => { if (e.target.id === 'integrationModal') closeIntegrationModal(); });
    }

    const integrationForm = document.getElementById('integrationForm');
    if (integrationForm) {
        integrationForm.addEventListener('submit', async e => {
            e.preventDefault();
            const name = document.getElementById('integration-name').value.trim();
            const url = document.getElementById('integration-url').value.trim();
            const itype = document.getElementById('integration-type').value;
            const editId = parseInt(document.getElementById('edit-integration-id').value) || 0;
            const username = document.getElementById('integration-username')?.value.trim() || '';
            const password = document.getElementById('integration-password')?.value || '';
            const apikey = document.getElementById('syncthing-apikey')?.value.trim() || '';
            const folders = document.getElementById('syncthing-folders')?.value.trim() || '';
            if (!name || !url) return;
            try {
                let payload;
if (itype === 'syncthing') {
    payload = { name, url, itype, username: apikey, password: folders };
} else {
    payload = { name, url, itype, username, password };
}
                if (integrationMode === 'edit' && editId) {
                    await fetch('/api/integrations', {
                        method: 'PUT', headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ id: editId, ...payload })
                    });
                    showToast('\u270F\uFE0F Integración actualizada');
                    await loadIntegrations();
                    closeIntegrationModal();
                } else {
                    const res = await fetch('/api/integrations', {
                        method: 'POST', headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify(payload)
                    });
                    const newIt = await res.json();
                    showToast('\u2713 Integración guardada');
                    integrations.push(newIt);
                    renderIntegrations();
                    closeIntegrationModal();
                    startIntegrationSync(newIt.id);
                    await syncIntegrationData(newIt.id, false);
                }
            } catch { showToast('\u2717 Error al guardar'); }
        });
    }
});

function deleteIntegrationConfirm(id, name) {
    showConfirm('Eliminar integración', '¿Eliminar "' + name + '"?', '\u{1F9E9}', 'Eliminar', async () => {
        try {
            await fetch('/api/integrations', {
                method: 'DELETE', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ id })
            });
            if (integrationSyncIntervals.has(id)) {
                clearInterval(integrationSyncIntervals.get(id));
                integrationSyncIntervals.delete(id);
            }
            integrations = integrations.filter(i => i.id !== id);
            renderIntegrations();
            showToast('\u{1F5D1}\uFE0F Integración eliminada');
        } catch { showToast('\u2717 Error'); }
    });
}

// --- THEME ICONS INTEGRACIONES -----------------------------------
function updateThemeIconsINT(t) {
    const l = document.getElementById('theme-icon-light-int');
    const d = document.getElementById('theme-icon-dark-int');
    if (l) l.style.display = t === 'dark' ? 'block' : 'none';
    if (d) d.style.display = t === 'dark' ? 'none' : 'block';
}
