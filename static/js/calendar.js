
// -----------------------------------------------
// CALENDAR
// -----------------------------------------------
function renderCalendar() {
    const y = currentCalendarDate.getFullYear();
    const m = currentCalendarDate.getMonth();
    const mn = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

    document.getElementById('calendarMonth').textContent = mn[m] + ' ' + y;

    const firstDay = new Date(y, m, 1).getDay();
    const dim     = new Date(y, m + 1, 0).getDate();
    const dipm    = new Date(y, m, 0).getDate();
    const cd      = document.getElementById('calendarDays');
    cd.innerHTML  = '';

    const today  = new Date();
    const isCur  = today.getFullYear() === y && today.getMonth() === m;

    // Días del mes anterior
    for (let i = firstDay - 1; i >= 0; i--) {
        const d = document.createElement('div');
        d.className = 'calendar-day other-month';
        d.textContent = dipm - i;
        cd.appendChild(d);
    }

    // Días del mes actual
    for (let day = 1; day <= dim; day++) {
        const d = document.createElement('div');
        d.className = 'calendar-day' + (isCur && day === today.getDate() ? ' today' : '');
        d.textContent = day;
        cd.appendChild(d);
    }

    // Relleno del mes siguiente
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
