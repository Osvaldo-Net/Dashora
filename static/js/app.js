// -----------------------------------------------
// APP INIT
// -----------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // Tema
    initTheme();
    // Búsqueda de servicios
    initSearch();
    // Drag & drop de iconos
    initIconDragDrop();

    // Cargar datos en paralelo (más rápido que secuencial)
    Promise.all([
        loadServices(),
        loadBookmarks(),
        loadRSSFeeds(),
        loadIntegrations(),
        loadBackgroundSettings()
    ]);

    // Sysinfo: primera carga inmediata
    loadSysInfo();

    // Sidebar y reloj
    updateClock();
    renderCalendar();
    loadWeather();

    // Restaurar pestaña activa
    const savedTab = localStorage.getItem('activePageTab') || 'inicio';
    switchPageTab(savedTab);

    // Configuración de reloj
    document.getElementById('timezoneSelect').value = selectedTimezone;
    document.getElementById('timezoneSelect').addEventListener('change', changeTimezone);
    document.getElementById('timeFormatSelect').value = timeFormat;
    document.getElementById('timeFormatSelect').addEventListener('change', changeTimeFormat);

    // Auto-abrir sidebar en pantallas grandes
    if (window.innerWidth > 1200) document.body.classList.add('sidebar-open');

    // ─── Intervalos de actualización ──────────────────
    setInterval(updateClock,    1000);   // Reloj: cada segundo (necesario)
    setInterval(loadSysInfo,   60000);   // Sysinfo: cada 60s (antes: 5s → -92% requests)
    setInterval(loadWeather,  600000);   // Clima: cada 10 min (sin cambio)
});
