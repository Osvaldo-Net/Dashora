
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
                0:  { i: '\u2600\uFE0F', d: 'Despejado' },
                1:  { i: '\u{1F324}\uFE0F', d: 'Mayormente despejado' },
                2:  { i: '\u26C5', d: 'Parcialmente nublado' },
                3:  { i: '\u2601\uFE0F', d: 'Nublado' },
                45: { i: '\u{1F32B}\uFE0F', d: 'Neblina' },
                48: { i: '\u{1F32B}\uFE0F', d: 'Niebla' },
                51: { i: '\u{1F326}\uFE0F', d: 'Llovizna ligera' },
                53: { i: '\u{1F326}\uFE0F', d: 'Llovizna moderada' },
                55: { i: '\u{1F326}\uFE0F', d: 'Llovizna densa' },
                61: { i: '\u{1F327}\uFE0F', d: 'Lluvia ligera' },
                63: { i: '\u{1F327}\uFE0F', d: 'Lluvia moderada' },
                65: { i: '\u{1F327}\uFE0F', d: 'Lluvia fuerte' },
                71: { i: '\u{1F328}\uFE0F', d: 'Nevada ligera' },
                73: { i: '\u{1F328}\uFE0F', d: 'Nevada moderada' },
                75: { i: '\u2744\uFE0F', d: 'Nevada fuerte' },
                80: { i: '\u{1F326}\uFE0F', d: 'Chubascos ligeros' },
                81: { i: '\u{1F327}\uFE0F', d: 'Chubascos moderados' },
                82: { i: '\u26C8\uFE0F', d: 'Chubascos fuertes' },
                95: { i: '\u26C8\uFE0F', d: 'Tormenta' },
                99: { i: '\u26C8\uFE0F', d: 'Tormenta severa' }
            };

            const w = codes[data.current.weather_code] || { i: '\u{1F321}\uFE0F', d: 'Clima desconocido' };

            wc.innerHTML =
                '<div class="weather-main">' +
                  '<div class="weather-icon">' + w.i + '</div>' +
                  '<div class="weather-temp">' +
                    '<div class="weather-temp-value">' + Math.round(data.current.temperature_2m) + '°C</div>' +
                    '<div class="weather-temp-desc">' + w.d + '</div>' +
                  '</div>' +
                '</div>' +
                '<div class="weather-details">' +
                  '<div class="weather-detail-item"><div class="weather-detail-label">Humedad</div><div class="weather-detail-value">' + data.current.relative_humidity_2m + '%</div></div>' +
                  '<div class="weather-detail-item"><div class="weather-detail-label">Viento</div><div class="weather-detail-value">' + Math.round(data.current.wind_speed_10m) + ' km/h</div></div>' +
                '</div>' +
                '<div class="weather-location">' +
                  '<svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>' +
                  city + (country ? ', ' + country : '') +
                '</div>';
        } catch {
            wc.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary);font-size:0.85rem;">Error al cargar el clima</div>';
        }
    }, () => {
        wc.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary);font-size:0.85rem;">No se pudo obtener la ubicación<br><small style="opacity:0.7;">Permite el acceso a tu ubicación</small></div>';
    });
}
