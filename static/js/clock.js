
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

    if (use12) {
        const m = timeStr.match(/(a\.\s?m\.|p\.\s?m\.|AM|PM)/i);
        if (m) {
            const ampm = m[0].toLowerCase().includes('a') ? 'AM' : 'PM';
            document.getElementById('clockTime').innerHTML =
                timeStr.replace(m[0], '').trim() +
                '<span class="clock-ampm">' + ampm + '</span>';
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
    document.getElementById('clockTimezone').textContent =
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
