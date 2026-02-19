<div align="center">

<img src="https://github.com/user-attachments/assets/487387f3-b35e-4a8b-9974-4ebd61947737" width="90" height="94" alt="Dashora logo" />

# Dashora

**El dashboard que tu homelab merece.**  
Organiza, accede y controla todos tus servicios desde un solo lugar — bonito, rápido y sin complicaciones.

[![Docker Pulls](https://img.shields.io/docker/pulls/netosvaltools/dashora?style=flat-square&color=0ea5e9&labelColor=0f172a)](https://hub.docker.com/r/netosvaltools/dashora)
[![License](https://img.shields.io/badge/license-MIT-purple?style=flat-square&labelColor=0f172a)](LICENSE)
[![Version](https://img.shields.io/badge/version-latest-emerald?style=flat-square&color=10b981&labelColor=0f172a)](https://github.com/netosvaltools/dashora/releases)

</div>

---

## ¿Qué es Dashora?

Dashora es un dashboard personal para **homelabs y laboratorios domésticos**. Agrega todos tus servicios autoalojados en una interfaz limpia, personalizable y accesible desde cualquier dispositivo.

Sin dependencias en la nube. Sin telemetría. Solo tú y tus servicios.

---

## Características

- **Modo día y noche** — Cambia de tema con un clic
- **Temas personalizados** — Adapta colores y apariencia a tu gusto
- **Grupos de servicios** — Organiza por categorías (medios, red, almacenamiento, etc.)
- **Pestaña de marcadores** — Tus enlaces guardados, siempre a mano.
- **Lector RSS integrado** — Tu Feeds RSS personalizada.
- **Integraciónes con tus aplicaciones autoalojadas** — Admite integraciones con AdGuardHome, Syncthing y Uptime Kuma
- **Rápido y ligero** — Imagen Docker minimalista, arranca en segundos
- **100% local** — Ningún dato sale de tu red



---

## Instalación

### Con Docker Compose *(recomendado)*

Crea un archivo `docker-compose.yml` con el siguiente contenido:

```yaml
services:
  dashora:
    image: netosvaltools/dashora:latest
    container_name: dashora
    dns:
      - 8.8.8.8
    ports:
      - "8080:8080"
    volumes:
      - ./data:/app/data
    restart: unless-stopped
    environment:
      - DB_PATH=/app/data/dashboard.db
```

Luego ejecuta:

```bash
docker compose up -d
```

Abre tu navegador en **http://localhost:8080** y listo.

### Con Docker directamente

```bash
docker run -d \
  --name dashora \
  --dns 8.8.8.8 \
  -p 8080:8080 \
  -v $(pwd)/data:/app/data \
  -e DB_PATH=/app/data/dashboard.db \
  --restart unless-stopped \
  netosvaltools/dashora:latest
```

---

## Capturas de pantalla

### Modo día

<img src="https://github.com/user-attachments/assets/66747056-ecc2-4d21-a93f-ed52d0eac724" alt="Modo día - vista principal" />

<img src="https://github.com/user-attachments/assets/86f552d0-736b-40f3-aec7-20e17610f307" alt="Modo día - servicios" />

### Modo noche

<img src="https://github.com/user-attachments/assets/331aa432-6b73-4a51-8ef4-ca37934bc5fc" alt="Modo noche" />

### Tema personalizado

<img src="https://github.com/user-attachments/assets/6b693461-ba8e-4c7f-a9ff-2fb81da13873" alt="Tema personalizado" />

### Agregar servicios

<img src="https://github.com/user-attachments/assets/e9309cec-ed25-44e5-accd-d24c8ad58941" alt="Agregar servicios" />

### Agregar grupos

<img src="https://github.com/user-attachments/assets/f614a35b-33fb-4fec-b934-e3fde2d54839" alt="Agregar grupos" />

---

## Configuración

| Variable de entorno | Descripción | Valor por defecto |
|---|---|---|
| `DB_PATH` | Ruta a la base de datos SQLite | `/app/data/dashboard.db` |

Los datos persisten en el volumen `./data`. Haz backup de esa carpeta para no perder tu configuración.

---

## Actualizar

```bash
docker compose pull
docker compose up -d
```

---

