// -----------------------------------------------
// INTEGRATIONS
// -----------------------------------------------
let integrations = [];
let integrationMode = 'add';
let integrationSyncIntervals = new Map();

// -----------------------------------------------
// LOAD & RENDER
// -----------------------------------------------
async function loadIntegrations() {
    try {
        const r = await fetch('/api/integrations');
        integrations = await r.json() || [];
        renderIntegrations();
        // Sync inicial en paralelo (antes: en serie con for...of await)
        await Promise.all(integrations.map(it => syncIntegrationData(it.id, true)));
        integrations.forEach(it => startIntegrationSync(it.id));
    } catch(e) { console.error('loadIntegrations error:', e); renderIntegrations(); }
}

function startIntegrationSync(id) {
    if (integrationSyncIntervals.has(id)) clearInterval(integrationSyncIntervals.get(id));
    const interval = setInterval(() => {
        // Solo sincronizar si la página es visible y la pestaña de integraciones está activa
        if (document.visibilityState === 'visible' &&
            document.getElementById('page-integraciones')?.classList.contains('active')) {
            syncIntegrationData(id, true);
        }
    }, 60 * 1000);
    integrationSyncIntervals.set(id, interval);
}

function renderIntegrations() {
    const container = document.getElementById('integrationsContainer');
    const empty     = document.getElementById('integrationsEmpty');
    if (!container) return;
    if (integrations.length === 0) { container.innerHTML = ''; if (empty) empty.style.display = 'block'; return; }
    if (empty) empty.style.display = 'none';
    container.innerHTML = '';
    integrations.forEach(it => container.appendChild(buildIntegrationCard(it)));
}

// -----------------------------------------------
// COLLAPSIBLE SECTION HELPER
// -----------------------------------------------
function buildCollapsibleSection(id, summaryHTML, detailHTML, startCollapsed = true) {
    const wrapper = document.createElement('div');
    wrapper.className = 'int-collapsible' + (startCollapsed ? ' collapsed' : '');
    wrapper.id = 'collapsible-' + id;

    const summary = document.createElement('div');
    summary.className = 'int-collapsible-summary';
    summary.innerHTML = summaryHTML +
        `<button class="int-collapse-btn" onclick="toggleIntCollapsible('${id}')">
            <span class="int-collapse-label">${startCollapsed ? 'Ver detalles' : 'Ocultar'}</span>
            <svg viewBox="0 0 24 24" width="14" height="14"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
        </button>`;
    wrapper.appendChild(summary);

    const detail = document.createElement('div');
    detail.className = 'int-collapsible-detail';
    detail.innerHTML = detailHTML;
    wrapper.appendChild(detail);

    return wrapper;
}

function toggleIntCollapsible(id) {
    const wrapper = document.getElementById('collapsible-' + id);
    if (!wrapper) return;
    const isCollapsed = wrapper.classList.toggle('collapsed');
    const btn = wrapper.querySelector('.int-collapse-label');
    if (btn) btn.textContent = isCollapsed ? 'Ver detalles' : 'Ocultar';
}

// -----------------------------------------------
// BUILD CARD
// -----------------------------------------------
function buildIntegrationCard(it) {
    const card = document.createElement('div');
    card.className = 'integration-card';
    card.id = 'integration-card-' + it.id;
    const isAdguard   = it.itype === 'adguard';
    const isSyncthing = it.itype === 'syncthing';

    const header    = document.createElement('div'); header.className = 'integration-card-header';
    const titleArea = document.createElement('div'); titleArea.className = 'integration-card-title-area';

    const badge = document.createElement('div');
    badge.className = 'integration-type-badge integration-type-' + (it.itype || 'uptime_kuma');
    if (isAdguard) {
        badge.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg> AdGuard Home';
    } else if (isSyncthing) {
        badge.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg> Syncthing';
    } else {
        badge.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><circle cx="12" cy="12" r="10"/></svg> Uptime Kuma';
    }

    const nameEl = document.createElement('div'); nameEl.className = 'integration-card-name'; nameEl.textContent = it.name;
    const urlEl  = document.createElement('div'); urlEl.className  = 'integration-card-url';  urlEl.textContent  = it.url;
    titleArea.appendChild(badge); titleArea.appendChild(nameEl); titleArea.appendChild(urlEl);

    const actions = document.createElement('div'); actions.className = 'integration-card-actions';

    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'integration-btn refresh'; refreshBtn.title = 'Sincronizar ahora';
    refreshBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>';
    refreshBtn.addEventListener('click', () => syncIntegrationData(it.id, false)); actions.appendChild(refreshBtn);

    const editBtn = document.createElement('button');
    editBtn.className = 'integration-btn edit'; editBtn.title = 'Editar';
    editBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>';
    editBtn.addEventListener('click', () => openEditIntegration(it)); actions.appendChild(editBtn);

    const delBtn = document.createElement('button');
    delBtn.className = 'integration-btn delete'; delBtn.title = 'Eliminar';
    delBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>';
    delBtn.addEventListener('click', () => deleteIntegrationConfirm(it.id, it.name)); actions.appendChild(delBtn);

    header.appendChild(titleArea); header.appendChild(actions);
    card.appendChild(header);

    const meta = document.createElement('div'); meta.className = 'integration-meta'; meta.id = 'integration-meta-' + it.id;
    meta.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg> Sincronizando cada 60 s';
    if (it.last_sync) meta.innerHTML += ' &nbsp;•&nbsp; Última sync: ' + new Date(it.last_sync).toLocaleString('es-ES');
    card.appendChild(meta);

    const contentEl = document.createElement('div');
    contentEl.className = 'uk-monitors-grid';
    contentEl.id = 'uk-monitors-' + it.id;

    let cached = {}; try { cached = JSON.parse(it.cached_data || '{}'); } catch {}

    if (isAdguard) {
        if (cached && cached.total_queries !== undefined) renderAdguardCard(contentEl, cached, it.id);
        else contentEl.innerHTML = '<div class="uk-loading">Sincronizando con AdGuard Home...</div>';
    } else if (isSyncthing) {
        if (cached && cached.folders) renderSyncthingCard(contentEl, cached, it.id);
        else contentEl.innerHTML = '<div class="uk-loading">Sincronizando con Syncthing...</div>';
    } else {
        if (cached && cached.publicGroupList && cached.publicGroupList.length > 0) renderUptimeKumaMonitors(contentEl, cached, it.id);
        else contentEl.innerHTML = '<div class="uk-loading">Sincronizando con Uptime Kuma...</div>';
    }
    card.appendChild(contentEl);
    return card;
}

// -----------------------------------------------
// RENDER: UPTIME KUMA
// -----------------------------------------------
function renderUptimeKumaMonitors(container, data, integrationId) {
    container.innerHTML = '';
    let upCount = 0, downCount = 0;
    const allMonitors = [];
    (data.publicGroupList || []).forEach(grp => {
        (grp.monitorList || []).forEach(m => { allMonitors.push({ ...m, groupName: grp.name }); });
    });
    allMonitors.forEach(m => {
        const st = m.status !== undefined ? m.status : 1;
        if (st === 1) upCount++; else if (st === 0) downCount++;
    });

    const statusClass = downCount > 0 ? 'down' : 'up';
    const statusLabel = downCount > 0 ? downCount + ' caído' + (downCount > 1 ? 's' : '') : 'Todo operativo';

    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'uk-summary';
    summaryDiv.innerHTML =
        '<div class="uk-summary-status ' + statusClass + '"><span class="uk-status-dot ' + statusClass + '"></span>' + statusLabel + '</div>' +
        '<div class="uk-summary-counts">' +
        '<span class="uk-count up"><svg viewBox="0 0 24 24" width="12" height="12"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' + upCount + ' operativos</span>' +
        (downCount > 0 ? '<span class="uk-count down"><svg viewBox="0 0 24 24" width="12" height="12"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>' + downCount + ' caídos</span>' : '') +
        '</div>';
    container.appendChild(summaryDiv);

    const detailId = 'uk-detail-' + (integrationId || Date.now());
    const detailWrapper = document.createElement('div');
    detailWrapper.className = 'int-collapsible collapsed';
    detailWrapper.id = 'collapsible-' + detailId;

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'int-collapse-trigger';
    toggleBtn.onclick = () => toggleIntCollapsible(detailId);
    toggleBtn.innerHTML =
        '<span class="int-collapse-label">Ver monitores (' + allMonitors.length + ')</span>' +
        '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>';
    container.appendChild(toggleBtn);

    const detailEl = document.createElement('div');
    detailEl.className = 'int-collapsible-detail';

    if (data.config && data.config.title) {
        const title = document.createElement('div'); title.className = 'uk-page-title'; title.textContent = data.config.title;
        detailEl.appendChild(title);
    }

    (data.publicGroupList || []).forEach(grp => {
        const groupEl     = document.createElement('div'); groupEl.className = 'uk-group';
        const groupHeader = document.createElement('div'); groupHeader.className = 'uk-group-header';
        groupHeader.innerHTML = '<span class="uk-group-name">' + escapeHtml(grp.name) + '</span><span class="uk-group-count">' + (grp.monitorList || []).length + '</span>';
        groupEl.appendChild(groupHeader);

        const monitorsEl = document.createElement('div'); monitorsEl.className = 'uk-monitors';
        (grp.monitorList || []).forEach(m => {
            const st = m.status !== undefined ? m.status : 1;
            const statusMap  = { 0: 'down', 1: 'up', 2: 'pending', 3: 'maintenance' };
            const labelMap   = { 0: 'Caído', 1: 'Operativo', 2: 'Pendiente', 3: 'Mantenimiento' };
            const statusKey  = statusMap[st]  || 'pending';
            const statusText = labelMap[st] || 'Desconocido';
            const monEl = document.createElement('div'); monEl.className = 'uk-monitor';

            const tags = (m.tags || []).map(t =>
                '<span class="uk-tag" style="background:' + (t.color||'#6b7280') + '22;color:' + (t.color||'#6b7280') + ';border-color:' + (t.color||'#6b7280') + '44;">' + escapeHtml(t.name) + '</span>'
            ).join('');

            let certBadge = '';
            if (m.certExpiryDaysRemaining !== undefined) {
                const days = m.certExpiryDaysRemaining;
                certBadge = '<span class="uk-cert ' + (days < 14 ? 'cert-warn' : 'cert-ok') + '"><svg viewBox="0 0 24 24" width="10" height="10"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg> ' + days + 'd</span>';
            }

            monEl.innerHTML =
                '<div class="uk-monitor-header"><span class="uk-monitor-dot ' + statusKey + '"></span><span class="uk-monitor-name">' + escapeHtml(m.name) + '</span><span class="uk-monitor-status ' + statusKey + '">' + statusText + '</span></div>' +
                (tags || certBadge ? '<div class="uk-monitor-footer">' + tags + certBadge + '</div>' : '');
            monitorsEl.appendChild(monEl);
        });

        groupEl.appendChild(monitorsEl);
        detailEl.appendChild(groupEl);
    });

    if (data.incidents && data.incidents.length > 0) {
        const incSection = document.createElement('div'); incSection.className = 'uk-incidents';
        const incTitle   = document.createElement('div'); incTitle.className   = 'uk-incidents-title';
        incTitle.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg> Incidentes activos';
        incSection.appendChild(incTitle);
        data.incidents.forEach(inc => {
            const incEl = document.createElement('div'); incEl.className = 'uk-incident';
            incEl.innerHTML = '<div class="uk-incident-title">' + escapeHtml(inc.title || 'Incidente') + '</div><div class="uk-incident-content">' + escapeHtml(inc.content || '') + '</div>';
            incSection.appendChild(incEl);
        });
        detailEl.appendChild(incSection);
    }

    detailWrapper.appendChild(detailEl);
    container.appendChild(detailWrapper);
}

// -----------------------------------------------
// RENDER: ADGUARD HOME
// -----------------------------------------------
function renderAdguardCard(container, stats, integrationId) {
    container.innerHTML = '';

    const statsRow = document.createElement('div'); statsRow.className = 'ag-stats-row';
    statsRow.innerHTML =
        '<div class="ag-stat"><div class="ag-stat-value">' + (stats.total_queries||0).toLocaleString() + '</div><div class="ag-stat-label">Consultas totales</div></div>' +
        '<div class="ag-stat"><div class="ag-stat-value ag-blocked">' + (stats.blocked_queries||0).toLocaleString() + '</div><div class="ag-stat-label">Bloqueadas</div></div>' +
        '<div class="ag-stat"><div class="ag-stat-value">' + (stats.blocked_percent||0) + '%</div><div class="ag-stat-label">% Bloqueado</div></div>' +
        '<div class="ag-stat"><div class="ag-stat-value">' + (stats.response_time_ms||0) + ' ms</div><div class="ag-stat-label">Latencia avg</div></div>';
    container.appendChild(statsRow);

    const detailId = 'ag-detail-' + (integrationId || Date.now());
    const detailWrapper = document.createElement('div');
    detailWrapper.className = 'int-collapsible collapsed';
    detailWrapper.id = 'collapsible-' + detailId;

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'int-collapse-trigger';
    toggleBtn.onclick = () => toggleIntCollapsible(detailId);
    toggleBtn.innerHTML =
        '<span class="int-collapse-label">Ver gráfico y dominios</span>' +
        '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>';
    container.appendChild(toggleBtn);

    const detailEl = document.createElement('div');
    detailEl.className = 'int-collapsible-detail';

    if (stats.series && stats.series.length > 0) {
        const chartSection = document.createElement('div'); chartSection.className = 'ag-chart-section';
        const chartTitle   = document.createElement('div'); chartTitle.className   = 'ag-chart-title'; chartTitle.textContent = 'Últimas 24 horas';
        chartSection.appendChild(chartTitle);

        const chart = document.createElement('div'); chart.className = 'ag-chart';
        stats.series.forEach((bar, i) => {
            const wrap    = document.createElement('div'); wrap.className = 'ag-bar-wrap';
            const stack   = document.createElement('div'); stack.className = 'ag-bar-stack';
            const total   = document.createElement('div'); total.className = 'ag-bar-total';
            total.style.height = (bar.percent_total||0) + '%'; total.title = 'Total: ' + (bar.queries||0);
            const blocked = document.createElement('div'); blocked.className = 'ag-bar-blocked';
            blocked.style.height = (bar.percent_blocked||0) + '%'; blocked.title = 'Bloqueadas: ' + (bar.blocked||0);
            stack.appendChild(total); stack.appendChild(blocked); wrap.appendChild(stack);
            if (stats.time_labels && stats.time_labels[i]) {
                const lbl = document.createElement('div'); lbl.className = 'ag-bar-label'; lbl.textContent = stats.time_labels[i];
                wrap.appendChild(lbl);
            }
            chart.appendChild(wrap);
        });
        chartSection.appendChild(chart);

        const legend = document.createElement('div'); legend.className = 'ag-legend';
        legend.innerHTML = '<span class="ag-legend-item"><span class="ag-legend-dot total"></span>Consultas</span><span class="ag-legend-item"><span class="ag-legend-dot blocked"></span>Bloqueadas</span>';
        chartSection.appendChild(legend);
        detailEl.appendChild(chartSection);
    }

    if (stats.top_domains && stats.top_domains.length > 0) {
        const topSection = document.createElement('div'); topSection.className = 'ag-top-section';
        const topTitle   = document.createElement('div'); topTitle.className   = 'ag-top-title';
        topTitle.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg> Top dominios bloqueados';
        topSection.appendChild(topTitle);
        stats.top_domains.forEach(d => {
            const row = document.createElement('div'); row.className = 'ag-domain-row';
            row.innerHTML =
                '<div class="ag-domain-info"><span class="ag-domain-name">' + escapeHtml(d.domain) + '</span><span class="ag-domain-count">' + (d.count||0).toLocaleString() + ' bloqueos</span></div>' +
                '<div class="ag-domain-bar-wrap"><div class="ag-domain-bar" style="width:' + (d.percent||0) + '%"></div><span class="ag-domain-pct">' + (d.percent||0) + '%</span></div>';
            topSection.appendChild(row);
        });
        detailEl.appendChild(topSection);
    }

    detailWrapper.appendChild(detailEl);
    container.appendChild(detailWrapper);
}

// -----------------------------------------------
// RENDER: SYNCTHING
// -----------------------------------------------
function renderSyncthingCard(container, stats, integrationId) {
    container.innerHTML = '';
    if (!stats || !stats.folders) { container.innerHTML = '<div class="uk-loading">Sin datos de Syncthing</div>'; return; }

    const folders     = stats.folders || [];
    const reachable   = folders.filter(f => f.reachable);
    const allSynced   = reachable.length > 0 && reachable.every(f => f.completion && f.completion.completion >= 100);
    const anySyncing  = reachable.some(f => f.completion && f.completion.completion < 100 && f.completion.completion > 0);
    const anyError    = folders.some(f => !f.reachable);

    let overallClass = 'synced', overallLabel = 'Todo sincronizado', overallIcon = '✓';
    if (anyError && reachable.length === 0) { overallClass = 'error';   overallLabel = 'Sin conexión';     overallIcon = '✕'; }
    else if (anyError)                       { overallClass = 'syncing'; overallLabel = 'Algunos errores';  overallIcon = '⚠️'; }
    else if (anySyncing)                     { overallClass = 'syncing'; overallLabel = 'Sincronizando...'; overallIcon = '🔄'; }
    else if (!allSynced && reachable.length > 0) { overallClass = 'syncing'; overallLabel = 'Pendiente'; overallIcon = '⏳'; }

    const header    = document.createElement('div'); header.className = 'st-header';
    const leftGroup = document.createElement('div'); leftGroup.style.cssText = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;';

    if (stats.version) {
        const verEl = document.createElement('div'); verEl.className = 'st-version';
        verEl.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>' + escapeHtml(stats.version);
        leftGroup.appendChild(verEl);
    }
    if (stats.my_id) {
        const idEl = document.createElement('div'); idEl.className = 'st-device-id'; idEl.title = stats.my_id;
        idEl.textContent = stats.my_id.split('-')[0] + '-…';
        leftGroup.appendChild(idEl);
    }

    const badge = document.createElement('div'); badge.className = 'st-overall-badge ' + overallClass;
    badge.innerHTML = '<span style="font-size:0.9em;">' + overallIcon + '</span> ' + escapeHtml(overallLabel) + '<span style="font-weight:400;opacity:0.8;margin-left:4px;">(' + reachable.length + '/' + folders.length + ')</span>';
    header.appendChild(leftGroup); header.appendChild(badge);
    container.appendChild(header);

    if (folders.length === 0) {
        const empty = document.createElement('div'); empty.className = 'st-no-folders'; empty.textContent = 'No se encontraron carpetas en Syncthing.';
        container.appendChild(empty); return;
    }

    const detailId = 'st-detail-' + (integrationId || Date.now());
    const detailWrapper = document.createElement('div');
    detailWrapper.className = 'int-collapsible collapsed';
    detailWrapper.id = 'collapsible-' + detailId;

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'int-collapse-trigger';
    toggleBtn.onclick = () => toggleIntCollapsible(detailId);
    toggleBtn.innerHTML =
        '<span class="int-collapse-label">Ver carpetas (' + folders.length + ')</span>' +
        '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>';
    container.appendChild(toggleBtn);

    const detailEl = document.createElement('div');
    detailEl.className = 'int-collapsible-detail';

    const grid = document.createElement('div'); grid.className = 'st-folders';

    folders.forEach(folder => {
        const comp            = folder.completion || {};
        const pct             = typeof comp.completion === 'number' ? comp.completion : 0;
        const folderReachable = folder.reachable !== false;

        let folderState = 'error', statusLabel = 'No alcanzable';
        if (folderReachable) {
            if (pct >= 100)    { folderState = 'synced';  statusLabel = 'Sincronizado'; }
            else if (pct > 0)  { folderState = 'syncing'; statusLabel = 'Sincronizando'; }
            else               { folderState = 'syncing'; statusLabel = 'Pendiente'; }
        }
        const progressClass = folderState === 'synced' ? 'complete' : folderState === 'error' ? 'error' : 'warning';

        const card    = document.createElement('div'); card.className = 'st-folder st-' + folderState;
        const fHeader = document.createElement('div'); fHeader.className = 'st-folder-header';

        const icon = document.createElement('div'); icon.className = 'st-folder-icon';
        icon.innerHTML = folderState === 'synced'
            ? '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-5 3l4 4-4 4-1.41-1.41L16.17 13H9v-2h7.17l-2.58-2.59L15 9z"/></svg>'
            : folderState === 'syncing'
            ? '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>'
            : '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>';

        const info  = document.createElement('div'); info.className = 'st-folder-info';
        const label = document.createElement('div'); label.className = 'st-folder-label'; label.textContent = folder.label || folder.folder_id; label.title = folder.label || folder.folder_id;
        const idEl  = document.createElement('div'); idEl.className  = 'st-folder-id';    idEl.textContent  = folder.folder_id;
        info.appendChild(label); info.appendChild(idEl);

        const statusEl = document.createElement('div'); statusEl.className = 'st-folder-status ' + folderState; statusEl.textContent = statusLabel;
        fHeader.appendChild(icon); fHeader.appendChild(info); fHeader.appendChild(statusEl);
        card.appendChild(fHeader);

        if (folderReachable) {
            const progressWrap = document.createElement('div'); progressWrap.className = 'st-progress-wrap';
            const track        = document.createElement('div'); track.className = 'st-progress-track';
            const fill         = document.createElement('div'); fill.className  = 'st-progress-fill ' + progressClass;
            fill.style.width = Math.min(100, Math.max(0, pct)) + '%';
            track.appendChild(fill);
            const pctEl = document.createElement('div'); pctEl.className = 'st-progress-pct'; pctEl.textContent = pct.toFixed(1) + '%';
            progressWrap.appendChild(track); progressWrap.appendChild(pctEl);
            card.appendChild(progressWrap);

            const statsRow = document.createElement('div'); statsRow.className = 'st-folder-stats';
            if (comp.globalBytes !== undefined) statsRow.appendChild(buildStFolderStat('Total', formatBytes(comp.globalBytes)));
            if (comp.needBytes   !== undefined && comp.needBytes  > 0) statsRow.appendChild(buildStFolderStat('Pendiente', formatBytes(comp.needBytes), 'warn'));
            if (comp.needFiles   !== undefined && comp.needFiles  > 0) statsRow.appendChild(buildStFolderStat('Archivos', comp.needFiles + ' archivos', 'warn'));
            if (comp.needDeletes !== undefined && comp.needDeletes > 0) statsRow.appendChild(buildStFolderStat('Borrar', comp.needDeletes + ' archivos', 'warn'));
            if (comp.globalBytes !== undefined && comp.needBytes === 0) statsRow.appendChild(buildStFolderStat('Almacenado', formatBytes(comp.localBytes || comp.globalBytes)));
            if (statsRow.children.length > 0) card.appendChild(statsRow);
        } else {
            const errNote = document.createElement('div'); errNote.style.cssText = 'font-size:0.75rem;color:var(--danger,#e74c3c);opacity:0.8;padding:4px 0;'; errNote.textContent = 'No se puede conectar con esta carpeta.';
            card.appendChild(errNote);
        }
        grid.appendChild(card);
    });

    detailEl.appendChild(grid);
    detailWrapper.appendChild(detailEl);
    container.appendChild(detailWrapper);
}

function buildStFolderStat(label, value, cls) {
    const el = document.createElement('div'); el.className = 'st-stat-item';
    el.innerHTML = '<span class="st-stat-label">' + escapeHtml(label) + '</span><span class="st-stat-value' + (cls ? ' ' + cls : '') + '">' + escapeHtml(String(value)) + '</span>';
    return el;
}

// -----------------------------------------------
// SYNC
// -----------------------------------------------
async function syncIntegrationData(id, silent = false) {
    const it         = integrations.find(i => i.id === id);
    const refreshBtn = document.querySelector('#integration-card-' + id + ' .integration-btn.refresh');
    if (refreshBtn && !silent) refreshBtn.classList.add('spinning');

    const metaTemplate = '<svg viewBox="0 0 24 24" width="12" height="12"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg> Sincronizando cada 60 s &nbsp;•&nbsp; Última sync: ';

    try {
        if (it && it.itype === 'adguard') {
            const r = await fetch('/api/adguard/stats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
            if (!r.ok) throw new Error((await r.text()) || 'HTTP ' + r.status);
            const result = await r.json();
            const monitorsEl = document.getElementById('uk-monitors-' + id); if (monitorsEl) renderAdguardCard(monitorsEl, result.stats, id);
            const metaEl = document.getElementById('integration-meta-' + id); if (metaEl) metaEl.innerHTML = metaTemplate + new Date(result.last_sync).toLocaleString('es-ES');
            const idx = integrations.findIndex(i => i.id === id);
            if (idx !== -1) { integrations[idx].last_sync = result.last_sync; integrations[idx].cached_data = JSON.stringify(result.stats); }
            if (!silent) showToast('✓ AdGuard sincronizado');

        } else if (it && it.itype === 'syncthing') {
            const r = await fetch('/api/syncthing/stats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
            if (!r.ok) throw new Error((await r.text()) || 'HTTP ' + r.status);
            const result = await r.json();
            const monitorsEl = document.getElementById('uk-monitors-' + id); if (monitorsEl) renderSyncthingCard(monitorsEl, result.stats, id);
            const metaEl = document.getElementById('integration-meta-' + id); if (metaEl) metaEl.innerHTML = metaTemplate + new Date(result.last_sync).toLocaleString('es-ES');
            const idx = integrations.findIndex(i => i.id === id);
            if (idx !== -1) { integrations[idx].last_sync = result.last_sync; integrations[idx].cached_data = JSON.stringify(result.stats); }
            if (!silent) showToast('✓ Syncthing sincronizado');

        } else {
            const r = await fetch('/api/integrations/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
            if (!r.ok) throw new Error('HTTP ' + r.status);
            const result = await r.json();
            const monitorsEl = document.getElementById('uk-monitors-' + id); if (monitorsEl) renderUptimeKumaMonitors(monitorsEl, result.data, id);
            const metaEl = document.getElementById('integration-meta-' + id); if (metaEl) metaEl.innerHTML = metaTemplate + new Date(result.last_sync).toLocaleString('es-ES');
            const idx = integrations.findIndex(i => i.id === id);
            if (idx !== -1) { integrations[idx].last_sync = result.last_sync; integrations[idx].cached_data = JSON.stringify(result.data); }
            if (!silent) showToast('✓ Integración sincronizada');
        }
    } catch(e) {
        console.error('sync error:', e);
        if (!silent) showToast('✕ Error: ' + e.message);
        const monitorsEl = document.getElementById('uk-monitors-' + id);
        if (monitorsEl && (monitorsEl.innerHTML.includes('Sincronizando') || monitorsEl.innerHTML.includes('Cargando'))) {
            monitorsEl.innerHTML = '<div class="uk-loading" style="color:var(--danger,#e74c3c);opacity:0.8;">Error al conectar. Verifica URL y credenciales.</div>';
        }
    } finally {
        if (refreshBtn) refreshBtn.classList.remove('spinning');
    }
}

// -----------------------------------------------
// MODAL
// -----------------------------------------------
function onIntegrationTypeChange() {
    const type           = document.getElementById('integration-type').value;
    const adguardCreds   = document.getElementById('adguard-credentials');
    const syncthingCreds = document.getElementById('syncthing-credentials');
    const urlLabel       = document.getElementById('integration-url-label');
    const urlInput       = document.getElementById('integration-url');
    const urlHint        = document.getElementById('integration-url-hint');

    if (adguardCreds)   adguardCreds.style.display   = 'none';
    if (syncthingCreds) syncthingCreds.style.display  = 'none';

    if (type === 'adguard') {
        if (adguardCreds) adguardCreds.style.display = 'block';
        urlLabel.textContent = 'URL de AdGuard Home';
        urlInput.placeholder = 'http://192.168.1.1:3000';
        urlHint.innerHTML    = 'URL base sin slash final. Ej: <code style="background:var(--bg-secondary);padding:2px 6px;border-radius:4px;">http://192.168.1.1:3000</code>';
        document.getElementById('integration-name').placeholder = 'Ej: AdGuard Home';
    } else if (type === 'syncthing') {
        if (syncthingCreds) syncthingCreds.style.display = 'block';
        urlLabel.textContent = 'URL de Syncthing';
        urlInput.placeholder = 'http://192.168.1.1:8384';
        urlHint.innerHTML    = 'URL base de la interfaz web. Ej: <code style="background:var(--bg-secondary);padding:2px 6px;border-radius:4px;">http://192.168.1.1:8384</code>';
        document.getElementById('integration-name').placeholder = 'Ej: Mi Syncthing';
    } else {
        urlLabel.textContent = 'URL de la API de Uptime Kuma';
        urlInput.placeholder = 'https://status.tudominio.com/api/status-page/pagina';
        urlHint.innerHTML    = 'Formato: <code style="background:var(--bg-secondary);padding:2px 6px;border-radius:4px;">https://&lt;URL&gt;/api/status-page/&lt;slug&gt;</code>';
        document.getElementById('integration-name').placeholder = 'Ej: Mi Uptime Kuma';
    }
}

function openIntegrationModal() {
    integrationMode = 'add';
    document.getElementById('integrationModalTitle').textContent = 'Nueva Integración';
    document.getElementById('integrationModalSub').textContent   = 'Conecta una herramienta externa';
    document.getElementById('edit-integration-id').value = '';
    document.getElementById('integration-name').value   = '';
    document.getElementById('integration-url').value    = '';
    document.getElementById('integration-type').value   = 'uptime_kuma';
    const u  = document.getElementById('integration-username'); if (u)  u.value  = '';
    const p  = document.getElementById('integration-password');  if (p)  p.value  = '';
    const ak = document.getElementById('syncthing-apikey');      if (ak) ak.value = '';
    const sf = document.getElementById('syncthing-folders');     if (sf) sf.value = '';
    document.getElementById('integrationSubmitBtn').textContent = 'Guardar Integración';
    onIntegrationTypeChange();
    document.getElementById('integrationModal').classList.add('active');
    setTimeout(() => document.getElementById('integration-name').focus(), 100);
}

function openEditIntegration(it) {
    integrationMode = 'edit';
    document.getElementById('integrationModalTitle').textContent = 'Editar Integración';
    document.getElementById('integrationModalSub').textContent   = 'Modificando "' + it.name + '"';
    document.getElementById('edit-integration-id').value = it.id;
    document.getElementById('integration-name').value   = it.name;
    document.getElementById('integration-url').value    = it.url;
    document.getElementById('integration-type').value   = it.itype || 'uptime_kuma';
    document.getElementById('integrationSubmitBtn').textContent = 'Guardar Cambios';
    onIntegrationTypeChange();
    document.getElementById('integrationModal').classList.add('active');
    setTimeout(() => document.getElementById('integration-name').focus(), 100);
}

function closeIntegrationModal() {
    document.getElementById('integrationModal').classList.remove('active');
    document.getElementById('integrationForm').reset();
}

function deleteIntegrationConfirm(id, name) {
    showConfirm('Eliminar integración', '¿Eliminar "' + name + '"?', '🧩', 'Eliminar', async () => {
        try {
            await fetch('/api/integrations', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
            if (integrationSyncIntervals.has(id)) { clearInterval(integrationSyncIntervals.get(id)); integrationSyncIntervals.delete(id); }
            integrations = integrations.filter(i => i.id !== id);
            renderIntegrations(); showToast('🗑️ Integración eliminada');
        } catch { showToast('✕ Error'); }
    });
}

// -----------------------------------------------
// EVENT LISTENERS
// -----------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    const integrationModal = document.getElementById('integrationModal');
    if (integrationModal) integrationModal.addEventListener('click', e => { if (e.target.id === 'integrationModal') closeIntegrationModal(); });

    const integrationForm = document.getElementById('integrationForm');
    if (integrationForm) {
        integrationForm.addEventListener('submit', async e => {
            e.preventDefault();
            const name   = document.getElementById('integration-name').value.trim();
            const url    = document.getElementById('integration-url').value.trim();
            const itype  = document.getElementById('integration-type').value;
            const editId = parseInt(document.getElementById('edit-integration-id').value) || 0;
            const username = document.getElementById('integration-username')?.value.trim() || '';
            const password = document.getElementById('integration-password')?.value || '';
            const apikey   = document.getElementById('syncthing-apikey')?.value.trim() || '';
            const folders  = document.getElementById('syncthing-folders')?.value.trim() || '';
            if (!name || !url) return;

            const payload = itype === 'syncthing'
                ? { name, url, itype, username: apikey, password: folders }
                : { name, url, itype, username, password };

            try {
                if (integrationMode === 'edit' && editId) {
                    await fetch('/api/integrations', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editId, ...payload }) });
                    showToast('✏️ Integración actualizada');
                    await loadIntegrations(); closeIntegrationModal();
                } else {
                    const res   = await fetch('/api/integrations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                    const newIt = await res.json();
                    showToast('✓ Integración guardada');
                    integrations.push(newIt);
                    renderIntegrations(); closeIntegrationModal();
                    startIntegrationSync(newIt.id);
                    await syncIntegrationData(newIt.id, false);
                }
            } catch { showToast('✕ Error al guardar'); }
        });
    }
});
