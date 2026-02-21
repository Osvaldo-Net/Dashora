// -----------------------------------------------
// WEATHER — con iconos Meteocons SVG animados
// https://bas.dev/work/meteocons
// -----------------------------------------------
async function loadWeather() {
    const wc = document.getElementById('weatherContent');
    if (!navigator.geolocation) {
        wc.innerHTML = '<div style="color:var(--text-secondary);font-size:.8rem;opacity:.6;">Geolocalización no disponible</div>';
        return;
    }
    wc.innerHTML = '<div style="color:var(--text-secondary);font-size:.8rem;opacity:.6;">Obteniendo ubicación...</div>';

    const SVG = {
        humidity: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`,
        wind:     `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></svg>`,
        location: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`
    };

    // Meteocons — CDN oficial
    // Formato: https://bmcdn.nl/assets/weather-icons/v3.0/fill/svg/NOMBRE.svg
    // Lista completa: https://bas.dev/work/meteocons
    const BASE = 'https://bmcdn.nl/assets/weather-icons/v3.0/fill/svg/';

    // Mapeo WMO code → icono Meteocons + descripción
    // Usamos variantes "day" de día o iconos neutros
    const codes = {
        0:  { icon: 'clear-day',                  d: 'Despejado' },
        1:  { icon: 'mostly-clear-day',            d: 'Mayormente despejado' },
        2:  { icon: 'partly-cloudy-day',           d: 'Parcialmente nublado' },
        3:  { icon: 'overcast',                    d: 'Nublado' },
        45: { icon: 'fog',                         d: 'Neblina' },
        48: { icon: 'fog',                         d: 'Niebla' },
        51: { icon: 'drizzle',                     d: 'Llovizna ligera' },
        53: { icon: 'drizzle',                     d: 'Llovizna moderada' },
        55: { icon: 'drizzle',                     d: 'Llovizna densa' },
        61: { icon: 'rain',                        d: 'Lluvia ligera' },
        63: { icon: 'rain',                        d: 'Lluvia moderada' },
        65: { icon: 'extreme-rain',                d: 'Lluvia fuerte' },
        71: { icon: 'snow',                        d: 'Nevada ligera' },
        73: { icon: 'snow',                        d: 'Nevada moderada' },
        75: { icon: 'extreme-snow',                d: 'Nevada fuerte' },
        77: { icon: 'snowflake',                   d: 'Granizo' },
        80: { icon: 'partly-cloudy-day-rain',      d: 'Chubascos ligeros' },
        81: { icon: 'rain',                        d: 'Chubascos moderados' },
        82: { icon: 'extreme-rain',                d: 'Chubascos fuertes' },
        85: { icon: 'partly-cloudy-day-snow',      d: 'Nieve en chubascos' },
        86: { icon: 'extreme-snow',                d: 'Nieve intensa' },
        95: { icon: 'thunderstorms',               d: 'Tormenta' },
        96: { icon: 'thunderstorms-rain',          d: 'Tormenta con granizo' },
        99: { icon: 'thunderstorms-extreme-rain',  d: 'Tormenta severa' }
    };

    navigator.geolocation.getCurrentPosition(async pos => {
        try {
            const { latitude: lat, longitude: lon } = pos.coords;
            const [wr, gr] = await Promise.all([
                fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto'),
                fetch('https://nominatim.openstreetmap.org/reverse?lat=' + lat + '&lon=' + lon + '&format=json')
            ]);
            const data = await wr.json();
            const geo  = await gr.json();

            let city = geo.address.city || geo.address.town || geo.address.village || geo.address.municipality || 'Tu ubicación';
            city = city.replace(/^(Perímetro Urbano|Urban Area|Ciudad de|City of)\s*/i, '').trim();
            if (city.length > 18) city = city.substring(0, 16) + '…';
            const country = geo.address.country_code ? geo.address.country_code.toUpperCase() : '';

            const w    = codes[data.current.weather_code] || { icon: 'not-available', d: 'Clima desconocido' };
            const temp = Math.round(data.current.temperature_2m);
            const hum  = data.current.relative_humidity_2m;
            const wind = Math.round(data.current.wind_speed_10m);

            const iconUrl = BASE + w.icon + '.svg';

            wc.innerHTML =
                '<div class="cw-weather-compact">' +
                    '<div class="cw-weather-icon-wrap">' +
                        '<img src="' + iconUrl + '" width="52" height="52" alt="' + w.d + '" ' +
                             'onerror="this.outerHTML=\'<span style=&quot;font-size:2rem;&quot;>🌡️</span>\'">' +
                    '</div>' +
                    '<div class="cw-weather-info">' +
                        '<div class="cw-weather-temp">' + temp + '°C</div>' +
                        '<div class="cw-weather-desc">' + w.d + '</div>' +
                        '<div class="cw-weather-meta">' +
                            '<span class="cw-weather-meta-item">' + SVG.humidity + ' ' + hum + '%</span>' +
                            '<span class="cw-weather-meta-sep">·</span>' +
                            '<span class="cw-weather-meta-item">' + SVG.wind + ' ' + wind + ' km/h</span>' +
                            '<span class="cw-weather-meta-sep">·</span>' +
                            '<span class="cw-weather-meta-item">' + SVG.location + ' ' + city + (country ? ', ' + country : '') + '</span>' +
                        '</div>' +
                    '</div>' +
                '</div>';

        } catch {
            wc.innerHTML = '<div style="color:var(--text-secondary);font-size:.8rem;opacity:.6;">Error al cargar el clima</div>';
        }
    }, () => {
        wc.innerHTML = '<div style="color:var(--text-secondary);font-size:.8rem;opacity:.6;">Permite el acceso a tu ubicación</div>';
    });
}
