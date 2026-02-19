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
let bmIconMode = 'favicon';
let bookmarkMode = 'add';

// -----------------------------------------------
// UTILIDADES
// -----------------------------------------------
function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = String(s);
    return d.innerHTML;
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
}

// -----------------------------------------------
// TOAST
// -----------------------------------------------
function showToast(msg, duration = 2500) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.innerHTML = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), duration);
}

// -----------------------------------------------
// CONFIRM DIALOG
// -----------------------------------------------
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

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('confirmOkBtn').addEventListener('click', () => {
        if (confirmCallback) confirmCallback();
        closeConfirm();
    });

    document.getElementById('confirmModal').addEventListener('click', e => {
        if (e.target.id === 'confirmModal') closeConfirm();
    });
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
// PAGE TAB SWITCHING
// -----------------------------------------------
function switchPageTab(tab) {
    // Tabs superiores (desktop)
    document.querySelectorAll('.page-tab').forEach(t =>
        t.classList.toggle('active', t.id === 'tab-' + tab)
    );

    // Bottom nav (móvil)
    document.querySelectorAll('.bottom-nav-item').forEach(t =>
        t.classList.toggle('active', t.dataset.tab === tab)
    );

    // Paneles de contenido
    document.querySelectorAll('.page-panel').forEach(p =>
        p.classList.toggle('active', p.id === 'page-' + tab)
    );

    localStorage.setItem('activePageTab', tab);

    // Sincronizar iconos de tema según tab
    const theme = document.documentElement.getAttribute('data-theme');

    if (tab === 'rss') {
        const l = document.getElementById('theme-icon-light-rss');
        const d = document.getElementById('theme-icon-dark-rss');
        if (l) l.style.display = theme === 'dark' ? 'block' : 'none';
        if (d) d.style.display = theme === 'dark' ? 'none' : 'block';
    }

    if (tab === 'marcadores') {
        updateThemeIconsBM(theme);
    }

    if (tab === 'integraciones') {
        updateThemeIconsINT(theme);
    }
}

// -----------------------------------------------
// THEME
// -----------------------------------------------
function initTheme() {
    const s = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', s);
    updateThemeIcon(s);
    updateThemeIconsBM(s);
    updateThemeIconsINT(s);
}

function toggleTheme() {
    const c = document.documentElement.getAttribute('data-theme');
    const n = c === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', n);
    localStorage.setItem('theme', n);
    updateThemeIcon(n);
    updateThemeIconsBM(n);
    updateThemeIconsINT(n);
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

function updateThemeIconsINT(t) {
    const l = document.getElementById('theme-icon-light-int');
    const d = document.getElementById('theme-icon-dark-int');
    if (l) l.style.display = t === 'dark' ? 'block' : 'none';
    if (d) d.style.display = t === 'dark' ? 'none' : 'block';
}
