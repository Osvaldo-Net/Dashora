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

    // Cargar datos
    loadServices();
    loadSysInfo();
    loadBookmarks();
    loadRSSFeeds();
    loadIntegrations();
    loadBackgroundSettings();

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

    // Intervalos de actualización
    setInterval(updateClock,   1000);
    setInterval(loadSysInfo,   5000);
    setInterval(loadWeather, 600000);
});
