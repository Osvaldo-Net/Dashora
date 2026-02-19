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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            background_image: imageData,
            background_opacity: parseInt(document.getElementById('backgroundOpacity').value) || 50
        })
    });
    applyBackgroundImage(imageData);
    document.getElementById('backgroundUploadText').textContent = 'Imagen cargada \u2713';
    document.getElementById('removeBackgroundBtn').style.display = 'inline-flex';
    showToast('\u2713 Fondo sincronizado');
}

function applyBackgroundImage(imageData) {
    document.body.classList.add('has-background');

    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(img.width, 1920);
        canvas.height = Math.round(img.height * (canvas.width / img.width));

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const optimized = canvas.toDataURL('image/jpeg', 0.82);
        document.documentElement.style.setProperty('--background-image', 'url(' + optimized + ')');
    };
    img.src = imageData;
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
        await fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ background_image: s.background_image || '', background_opacity: parseInt(value) })
        });
    } catch {}
}

async function removeBackground() {
    try {
        await fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ background_image: '', background_opacity: 50 })
        });
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
