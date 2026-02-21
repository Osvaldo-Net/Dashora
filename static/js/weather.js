// -----------------------------------------------
// WEATHER — formato compacto para tarjeta unificada
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

            const codes = {
                0:  { i: '☀️',  d: 'Despejado' },
                1:  { i: '🌤️', d: 'Mayormente despejado' },
                2:  { i: '⛅',  d: 'Parcialmente nublado' },
                3:  { i: '☁️',  d: 'Nublado' },
                45: { i: '🌫️', d: 'Neblina' },
                48: { i: '🌫️', d: 'Niebla' },
                51: { i: '🌦️', d: 'Llovizna ligera' },
                53: { i: '🌦️', d: 'Llovizna moderada' },
                55: { i: '🌦️', d: 'Llovizna densa' },
                61: { i: '🌧️', d: 'Lluvia ligera' },
                63: { i: '🌧️', d: 'Lluvia moderada' },
                65: { i: '🌧️', d: 'Lluvia fuerte' },
                71: { i: '🌨️', d: 'Nevada ligera' },
                73: { i: '🌨️', d: 'Nevada moderada' },
                75: { i: '❄️',  d: 'Nevada fuerte' },
                80: { i: '🌦️', d: 'Chubascos ligeros' },
                81: { i: '🌧️', d: 'Chubascos moderados' },
                82: { i: '⛈️', d: 'Chubascos fuertes' },
                95: { i: '⛈️', d: 'Tormenta' },
                99: { i: '⛈️', d: 'Tormenta severa' }
            };

            const w    = codes[data.current.weather_code] || { i: '🌡️', d: 'Clima desconocido' };
            const temp = Math.round(data.current.temperature_2m);
            const hum  = data.current.relative_humidity_2m;
            const wind = Math.round(data.current.wind_speed_10m);

            wc.innerHTML =
                '<div class="cw-weather-compact">' +
                    '<div class="cw-weather-icon">' + w.i + '</div>' +
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
