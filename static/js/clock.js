// -----------------------------------------------
// CLOCK — compatible con tarjeta unificada reloj+clima
// -----------------------------------------------
let selectedTimezone = localStorage.getItem('selectedTimezone') || 'auto';
let timeFormat = localStorage.getItem('timeFormat') || '24';

function toggleClockSettings() {
    const p = document.getElementById('clockSettingsPanel');
    if (!p) return;
    const open = p.style.display === 'none' || p.style.display === '';
    p.style.display = open ? 'block' : 'none';
}

function updateClock() {
    const now = new Date();
    const tz = selectedTimezone === 'auto'
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : selectedTimezone;
    const use12 = timeFormat === '12';

    let timeStr = now.toLocaleTimeString('es-ES', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: use12
    });

    const el = document.getElementById('clockTime');
    if (!el) return;

    if (use12) {
        const m = timeStr.match(/(a\.\s?m\.|p\.\s?m\.|AM|PM)/i);
        if (m) {
            const ampm = m[0].toLowerCase().includes('a') ? 'AM' : 'PM';
            el.innerHTML =
                timeStr.replace(m[0], '').trim() +
                '<span class="clock-ampm">' + ampm + '</span>';
        } else {
            el.textContent = timeStr;
        }
    } else {
        el.textContent = timeStr;
    }

    const ds = now.toLocaleDateString('es-ES', {
        timeZone: tz,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const dateEl = document.getElementById('clockDate');
    if (dateEl) dateEl.textContent = ds.charAt(0).toUpperCase() + ds.slice(1);

    const tzEl = document.getElementById('clockTimezone');
    if (tzEl) tzEl.textContent =
        tz === Intl.DateTimeFormat().resolvedOptions().timeZone
            ? tz + ' (Local)'
            : tz;
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

// Sincronizar selects con valores guardados al cargar
document.addEventListener('DOMContentLoaded', () => {
    const tzSel = document.getElementById('timezoneSelect');
    const fmtSel = document.getElementById('timeFormatSelect');

    if (tzSel) {
        tzSel.value = selectedTimezone;
        tzSel.addEventListener('change', changeTimezone);
    }
    if (fmtSel) {
        fmtSel.value = timeFormat;
        fmtSel.addEventListener('change', changeTimeFormat);
    }

    updateClock();
    setInterval(updateClock, 1000);
});
