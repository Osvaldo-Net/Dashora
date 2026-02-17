# Dashora

<img width="150" height="158" alt="favicon" src="https://github.com/user-attachments/assets/487387f3-b35e-4a8b-9974-4ebd61947737" />

Dashboard para tu laboratorio domestico. 

## Instalación usando Docker Compose

```
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
## Modo dia

<img width="1365" height="597" alt="image" src="https://github.com/user-attachments/assets/3b14a88d-754c-4e07-9277-26c504872131" />

<img width="1365" height="592" alt="image" src="https://github.com/user-attachments/assets/86f552d0-736b-40f3-aec7-20e17610f307" />

## Modo noche

<img width="1365" height="590" alt="image" src="https://github.com/user-attachments/assets/331aa432-6b73-4a51-8ef4-ca37934bc5fc" />

## Personalizado

<img width="1365" height="596" alt="image" src="https://github.com/user-attachments/assets/6b693461-ba8e-4c7f-a9ff-2fb81da13873" />

## Agregar Servicios

<img width="1365" height="597" alt="image" src="https://github.com/user-attachments/assets/e9309cec-ed25-44e5-accd-d24c8ad58941" />

## Agregar Grupos

<img width="1365" height="595" alt="image" src="https://github.com/user-attachments/assets/f614a35b-33fb-4fea-b934-e3fde2d54839" />




